'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// Removed camera step buttons
import { ToggleIconButton } from '../../components/ToggleIconButton';
import { TutorialButton, TutorialActionButton } from '../../components/TutorialButton';
import { SettingsModal } from '../../components/SettingsModal';
import { createTurnEngine, Cue, Script, Phase, SubtitleKind } from '../../lib/turn-engine';
import { parseScript } from '../../utils/script-parser';
import { calculateFrontBiasedSimilarity } from '../../utils/similarity';
import styles from './page.module.css';

// 자막 하이라이트 컴포넌트
const SubtitleHighlight = ({ script, recorded }: { script: string; recorded: string }) => {
  // 앞에서부터 가장 긴 매칭 부분 찾기
  let bestMatch = { start: 0, end: 0 };
  
  // 간단한 매칭: 앞에서부터 일치하는 부분 찾기
  for (let i = 0; i < script.length; i++) {
    const scriptPrefix = script.slice(0, i + 1);
    
    // 녹음된 텍스트에 해당 prefix가 포함되어 있는지 확인
    if (recorded.toLowerCase().includes(scriptPrefix.toLowerCase()) ||
        recorded.toLowerCase().startsWith(scriptPrefix.toLowerCase())) {
      bestMatch.end = i + 1;
    } else {
      break;
    }
  }
  
  const matched = script.slice(0, bestMatch.end);
  const unmatched = script.slice(bestMatch.end);
  
  return (
    <>
      <span style={{ color: '#7560FF' }}>{matched}</span>
      <span style={{ color: '#FFF' }}>{unmatched}</span>
    </>
  );
};

export default function RunPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1); // 1: 튜토리얼, 2: 연기
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [micError, setMicError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // 토글 버튼 상태들
  const [isPlaySelected, setIsPlaySelected] = React.useState(false);
  const isPlaySelectedRef = React.useRef(false);
  const [isCCSelected, setIsCCSelected] = React.useState(true); // 기본적으로 CC 켜짐
  const [isEyeSelected, setIsEyeSelected] = React.useState(false);
  const [isAdlibMode, setIsAdlibMode] = React.useState(false);
  
  // isPlaySelected 변경 시 ref 업데이트
  React.useEffect(() => {
    isPlaySelectedRef.current = isPlaySelected;
  }, [isPlaySelected]);
  
  // 설정 모달 상태
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isImageHidden, setIsImageHidden] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null); // 3..2..1
  const [showAction, setShowAction] = React.useState(false);
  
  // 설정값들 (startPage에서 전달받은 값들)
  const [sliderValue, setSliderValue] = React.useState(0);
  const [selectedPersonality, setSelectedPersonality] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  
  // Turn Engine state
  const [turnEngine, setTurnEngine] = React.useState<any>(null);
  const turnEngineRef = React.useRef<any>(null);
  const [currentPhase, setCurrentPhase] = React.useState<Phase>('idle');
  const [subtitleText, setSubtitleText] = React.useState('');
  const [subtitleKind, setSubtitleKind] = React.useState<SubtitleKind>(null);
  const [script, setScript] = React.useState<Script>([]);
  const [userRole, setUserRole] = React.useState('');
  const [opponentRole, setOpponentRole] = React.useState('');
  const [subtitleFontSize, setSubtitleFontSize] = React.useState(80);
  const subtitleRef = React.useRef<HTMLDivElement>(null);
  const [userRecordedText, setUserRecordedText] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [similarityScore, setSimilarityScore] = React.useState<number | null>(null);
  
  // 자막 텍스트가 변경될 때 폰트 크기 조정
  React.useEffect(() => {
    if (!subtitleRef.current || !subtitleText || !isCCSelected) return;
    
    const element = subtitleRef.current;
    const container = element.parentElement;
    if (!container) return;
    
    // 초기값으로 리셋
    let fontSize = 80;
    element.style.fontSize = `${fontSize}px`;
    
    // 컨테이너 너비 확인
    const containerWidth = container.offsetWidth;
    
    // 한 줄에 맞지 않으면 폰트 크기 줄이기
    const checkFit = () => {
      const elementWidth = element.scrollWidth;
      if (elementWidth > containerWidth && fontSize > 20) {
        fontSize -= 2;
        element.style.fontSize = `${fontSize}px`;
        
        // 다음 프레임에 다시 확인
        requestAnimationFrame(checkFit);
      } else {
        setSubtitleFontSize(fontSize);
      }
    };
    
    // 리플로우를 위해 약간의 지연
    setTimeout(checkFit, 0);
  }, [subtitleText, isCCSelected]);
  
  // searchParams 처리
  const searchParams = useSearchParams();
  const selectedCharacter = searchParams.get('selectedCharacter') || '';
  const opponentCharacter = searchParams.get('opponentCharacter') || '';
  const initialPersonality = searchParams.get('selectedPersonality') || '';
  const initialSliderValue = parseInt(searchParams.get('sliderValue') || '0');
  const workIndex = parseInt(searchParams.get('workIndex') || '1');

  // URL 파라미터로 초기화
  React.useEffect(() => {
    setSelectedPersonality(initialPersonality);
    setSliderValue(initialSliderValue);
  }, [initialPersonality, initialSliderValue, selectedCharacter]);

  // Load script when component mounts
  React.useEffect(() => {
    const loadScript = async () => {
      try {
        // 우선순위: URL ?script => localStorage.scriptPath => workIndex에 따라 자동 선택
        const params = new URLSearchParams(window.location.search);
        const paramPath = params.get('script');
        const storedPath = typeof window !== 'undefined' ? localStorage.getItem('scriptPath') : null;
        
        // workIndex에 따라 script1.txt 또는 script2.txt 선택 (기본값 workIndex=1로 script1)
        const scriptFileName = workIndex === 2 ? 'script2.txt' : 'script1.txt';
        const scriptPath = paramPath || storedPath || `/scripts/${scriptFileName}`;

        const response = await fetch(scriptPath, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to fetch script: ${response.status}`);
        const scriptText = await response.text();
        const parsedScript = parseScript(scriptText);
        setScript(parsedScript);

        if (parsedScript.length > 0) {
          // URL 파라미터로 전달받은 selectedCharacter를 사용
          const params = new URLSearchParams(window.location.search);
          const userRoleFromUrl = params.get('selectedCharacter') || '';
          
          console.log('📝 Parsed script:', parsedScript);
          console.log('👤 URL parameter selectedCharacter:', userRoleFromUrl);
          
          if (userRoleFromUrl) {
            setUserRole(userRoleFromUrl);
            
            // 상대역 찾기 (첫 번째 등장자가 아닌 다른 등장자)
            const allRoles = [...new Set(parsedScript.map(cue => cue.role))];
            const opponent = allRoles.find(role => role !== userRoleFromUrl) || allRoles[0];
            setOpponentRole(opponent);
            console.log('🔍 Roles detected:', { userRole: userRoleFromUrl, opponentRole: opponent, allRoles });
            console.log('📋 First cue:', parsedScript[0]);
          } else {
            console.error('⚠️ No selectedCharacter found in URL parameters!');
          }
        }
      } catch (error) {
        console.error('Failed to load script:', error);
        setScript([]); // 실패 시 빈 스크립트 유지 (사용자 파일 이슈를 드러내기 위함)
      }
    };

    loadScript();
  }, [workIndex]);

  // Apply background image from startPage selection if available
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('selectedImage');
        const imageUrl = stored || '/asset/png/work1_default_img.png';
        const root = document.documentElement;
        root.style.setProperty('--practice-bg', `url('${imageUrl}')`);
        setSelectedImage(imageUrl);
      }
    } catch {}
  }, []);

  // Keep CSS background and storage in sync with current selectedImage
  React.useEffect(() => {
    if (!selectedImage) return;
    try {
      const root = document.documentElement;
      root.style.setProperty('--practice-bg', `url('${selectedImage}')`);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', selectedImage);
      }
    } catch {}
  }, [selectedImage]);

  // Initialize Turn Engine when entering Practice step
  React.useEffect(() => {
    if (currentStep === 2 && script.length > 0 && userRole && turnEngine === null) {
      console.log('Creating turn engine with:', { scriptLength: script.length, userRole, isAdlibMode });
      
      let engine = createTurnEngine({
        script,
        userRole,
        adlibMode: isAdlibMode,
        getIsPlaying: () => {
          const currentValue = isPlaySelectedRef.current;
          console.log('🔍 getIsPlaying called, returning:', currentValue);
          return currentValue;
        },
        onPhase: (phase: Phase) => {
          console.log('Phase changed to:', phase);
          setCurrentPhase(phase);
          // done 시 이동은 별도 effect에서 수행
        },
        onSubtitle: (text: string, kind: SubtitleKind) => {
          console.log('Subtitle:', { text, kind });
          
          // 사용자가 녹음한 텍스트인 경우 따로 저장
          if (kind === 'user-final') {
            setUserRecordedText(text);
            console.log('🎤 user-final received:', { text });
            
            // 현재 상태에서 직접 가져오기
            setSimilarityData(prev => {
              // turnEngine과 script는 ref로 접근
              const currentEngine = turnEngineRef.current;
              const currentScript = script;
              
              if (text && currentScript.length > 0 && currentEngine) {
                const currentIndex = currentEngine.getIndex();
                const expectedLine = currentScript[currentIndex]?.text || '';
                console.log('📝 Checking similarity:', { currentIndex, expectedLine, text });
                
                if (expectedLine) {
                  const similarity = calculateFrontBiasedSimilarity(text, expectedLine);
                  const percentage = Math.round(similarity * 100);
                  setSimilarityScore(percentage);
                  console.log('🎯 Similarity calculated:', { text, expectedLine, similarity: percentage + '%' });
                  
                  const existingIndex = prev.findIndex(item => item.cueIndex === currentIndex);
                  const newItem = {
                    cueIndex: currentIndex,
                    script: expectedLine,
                    recognized: text,
                    similarity: percentage
                  };
                  
                  if (existingIndex >= 0) {
                    // 이미 존재하면 업데이트
                    const updated = [...prev];
                    updated[existingIndex] = newItem;
                    console.log('📊 Updated similarity data:', updated);
                    return updated;
                  } else {
                    // 없으면 추가
                    const newData = [...prev, newItem];
                    console.log('📊 Added similarity data:', newData);
                    return newData;
                  }
                }
              } else {
                console.log('⚠️ Cannot calculate similarity:', { 
                  text: !!text, 
                  scriptLength: currentScript.length, 
                  hasTurnEngine: !!currentEngine 
                });
              }
              
              return prev;
            });
          } else {
            // 스크립트 대사인 경우
            setSubtitleText(text);
            setSubtitleKind(kind);
            // AI 대사로 바뀔 때 녹음 텍스트 초기화
            if (kind === 'ai') {
              setUserRecordedText('');
              setSimilarityScore(null);
            }
          }
        },
        onError: (type: string, detail?: unknown) => {
          console.error('Turn Engine Error:', type, detail);
          if (type === 'mic-permission-denied') {
            setMicError('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
          } else if (type === 'stt-unsupported') {
            setMicError('음성 인식이 지원되지 않는 환경입니다.');
          } else if (type === 'stt-failed') {
            setMicError('음성 인식에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
          }
        }
      });

      setTurnEngine(engine);
      turnEngineRef.current = engine;
      console.log('Turn engine created, current index:', engine.getIndex());

      return () => {
        // destroy 시점에는 엔진의 currentIndex를 유지해야 함
        console.log('💥 Destroying turn engine, last index:', engine.getIndex());
        engine?.destroy();
        turnEngineRef.current = null;
      };
    }
  }, [currentStep, script, userRole, isAdlibMode]); // turnEngine은 한 번만 생성

  // Handle play/pause state changes
  React.useEffect(() => {
    if (turnEngine && currentStep === 2) {
      if (isPlaySelected) {
        console.log('🎮 User clicked Play - starting turn engine...');
        turnEngine.start();
      } else {
        console.log('⏸️ User clicked Pause - pausing turn engine...');
        turnEngine.pause();
      }
    }
  }, [isPlaySelected, turnEngine, currentStep]);

  // 재생 시작 시 설정 창이 열려있으면 닫기
  React.useEffect(() => {
    if (isPlaySelected && isSettingsModalOpen) {
      setIsSettingsModalOpen(false);
    }
  }, [isPlaySelected, isSettingsModalOpen]);

  // 각 대사의 유사도 저장
  const [similarityData, setSimilarityData] = React.useState<Array<{cueIndex: number, script: string, recognized: string, similarity: number}>>([]);
  
  // done 상태 → 결과 페이지 이동
  React.useEffect(() => {
    if (currentPhase === 'done') {
      console.log('💾 Saving similarity data to localStorage:', similarityData);
      // 유사도 데이터를 localStorage에 저장하고 결과 페이지로 이동
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('similarityData', JSON.stringify(similarityData));
          console.log('✅ Similarity data saved to localStorage');
        }
      } catch (err) {
        console.error('Failed to save similarity data:', err);
      }
      
      router.push('/resultPage');
    }
  }, [currentPhase, router, similarityData]);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 Debug state:', {
      currentStep,
      scriptLength: script.length,
      userRole,
      isPlaySelected,
      currentPhase,
      subtitleText,
      turnEngineExists: !!turnEngine,
      script: script.slice(0, 3) // 처음 3개 대사만 로그
    });
  }, [currentStep, script.length, userRole, isPlaySelected, currentPhase, subtitleText, turnEngine]);

  // 카메라 단계 제거됨

  // 디버깅 로그
  React.useEffect(() => {
    console.log('RunPage loaded with settings:', {
      selectedCharacter,
      opponentCharacter,
      selectedPersonality,
      sliderValue
    });
  }, [selectedCharacter, opponentCharacter, selectedPersonality, sliderValue]);

  // 카메라 단계 제거로 Ready 핸들러 불필요

  const handleAction = () => {
    // 3-2-1-Action! 오버레이를 연기 페이지 위에 표시하도록 먼저 페이지 이동
    setCurrentStep(2);
    setCountdown(3);
    setShowAction(false);
    let n = 3;
    const tick = () => {
      if (n > 1) {
        n -= 1;
        setCountdown(n);
        setTimeout(tick, 1000);
      } else {
        setCountdown(null);
        setShowAction(true);
        // Action! 창을 1초 표시 후 사라지고 그 다음에 재생 시작
        setTimeout(() => {
          setShowAction(false);
          // Action 창이 완전히 사라진 후 재생 시작
          setTimeout(() => {
            setIsPlaySelected(true);
          }, 100);
        }, 1000);
      }
    };
    setTimeout(tick, 1000);
  };

  // 설정 버튼 핸들러
  const handleSettingsClick = () => {
    const newModalState = !isSettingsModalOpen;
    setIsSettingsModalOpen(newModalState);
    
    // 설정 모달이 열릴 때: 재생 중이면 일시정지로 변경
    if (newModalState && isPlaySelected) {
      setIsPlaySelected(false);
    }
    // 설정 모달이 닫힐 때: 재생 상태 변경 없음
  };

  // 눈 버튼 핸들러 (이미지 숨기기/보이기)
  const handleEyeClick = () => {
    setIsImageHidden(!isImageHidden);
  };

  // 설정 모달 저장 핸들러
  const handleSaveSettings = () => {
    console.log('Settings saved:', {
      sliderValue,
      selectedPersonality,
      selectedImage
    });
    setIsSettingsModalOpen(false);
    // 설정 모달 닫힐 때 재생 상태 변경 없음
  };

  // 이미지 리셋 핸들러
  const handleImageReset = () => {
    const def = '/asset/png/work1_default_img.png';
    setSelectedImage(def);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', def);
      }
    } catch {}
  };

  return (
    <div className={styles.container}>
      {/* 카메라 단계 제거됨 */}

      {currentStep === 1 && (
        <div className={styles.tutorialStep}>
          {/* 왼쪽 위: 연습 씬 정보 */}
          <div className={styles.sceneInfo}>
            S#40. 양복점/재봉실 (낮)<br/>
            <img className={styles.arrowScene} src="/asset/svg/scene_arrow.svg" alt="setting_arrow" />
            <div className={styles.sceneDescription} style={{transform: 'translateY(-17px)'}}>
            현재 연습 씬을 의미합니다.
            </div>
          </div>

          {/* 오른쪽 위: 재생 버튼 (선택=일시정지 상태) */}
          <div className={styles.iconWrap} style={{ top: 60, right: 60 }}>
            <div className={styles.iconBox}>
              <button
                onClick={() => setIsPlaySelected(!isPlaySelected)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="재생"
              >
                <img className={styles.iconImg} src={`/asset/svg/${isPlaySelected ? 'play' : 'play_selected'}.svg`} alt="play" />
              </button>
            </div>
            <img className={styles.arrowLeft} src="/asset/svg/play_arrow.svg" alt="play_arrow" />
            <div className={`${styles.iconLabel} ${styles.labelPlay}`}>연습을 재생/일시정지합니다.</div>
          </div>

          {/* 중앙: 안내 텍스트와 액션 버튼 */}
          {(
            !countdown && !showAction
          ) && (
            <>
              <h1 className={styles.tutorialText}>
                연습 화면의 각 기능을 안내해드릴게요.<br />
                준비됐다면 아래 버튼을 눌러 연습을 시작하세요!
              </h1>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateX(-50%)', marginTop: '70px' }}>
                <TutorialActionButton onClick={handleAction} />
              </div>
            </>
          )}

          {/* 왼쪽 아래: CC 버튼 */}
          <div className={styles.iconWrap} style={{ bottom: 60, left: 60 }}>
            <div className={styles.iconBox}>
              <button
                onClick={() => setIsCCSelected(!isCCSelected)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="자막 토글"
              >
                <img className={styles.iconImg} src="/asset/svg/cc.svg" alt="cc" />
              </button>
            </div>
            <img className={styles.arrowTop} src="/asset/svg/cc_arrow.svg" alt="cc_arrow" />
            <div className={`${styles.iconLabel} ${styles.labelCC}`}>대사를 화면에 표시/숨깁니다.</div>
          </div>

          {/* 왼쪽 아래: 애드립 모드 (아이콘 래핑 + 배경 + 라벨) */}
          <div className={styles.iconWrap} style={{ bottom: 60, left: 172 }}>
            
              <TutorialButton
              type="adlib"
              isSelected={isAdlibMode}
              onClick={() => {}} // 비활성화
            />
            
            <img className={styles.arrowLeftEnd} src="/asset/svg/mode_convert_arrow.svg" alt="mode_convert_arrow" />
            <div className={`${styles.iconLabel} ${styles.labelModeConver}`}>AI가 변형된 대사를 주고받는 애드립 모드를 활성화합니다.</div>
          </div>

          {/* 오른쪽 아래: 눈 아이콘 (오른쪽 끝이 중앙에 맞도록) */}
          <div className={styles.iconWrap} style={{ bottom: 60, right: 172 }}>
            <div className={styles.iconBox}>
              <button
                onClick={() => setIsEyeSelected(!isEyeSelected)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="이미지 토글"
              >
                <img className={styles.iconImg} src="/asset/svg/view_img.svg" alt="view_img" />
              </button>
            </div>
            <img className={styles.arrowRightEnd} src="/asset/svg/view_img_arrow.svg" alt="view_img_arrow" />
            <div className={`${styles.iconLabel} ${styles.labelView}`}>인물 얼굴을 화면에 표시/숨깁니다.</div>
          </div>

          {/* 오른쪽 아래: 설정 버튼 */}
          <div className={styles.iconWrap} style={{ bottom: 60, right: 60 }}>
            <div className={`${styles.iconBox} ${styles.iconBoxSettings}`}>
              <button
                onClick={() => {}}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="설정"
              >
                <img className={styles.iconImg} src="/asset/svg/setting.svg" alt="setting" />
              </button>
            </div>
            <img className={styles.arrowTop} src="/asset/svg/setting_arrow.svg" alt="setting_arrow" />
            <div className={`${styles.iconLabel} ${styles.labelSettings}`}>얼굴 및 음성을 재설정 할 수 있습니다.</div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className={`${styles.practiceStep} ${isImageHidden ? styles.hideImage : ''}`}>
          {/* 연기 페이지 */}
          
          {/* 왼쪽 위: 씬 정보 */}
          <div className={styles.sceneInfo}>
            S#40. 양복점/재봉실 (낮)
            <div className={styles.sceneDescription}>
               
            </div>
          </div>



          {/* 상단 오버레이 (내/상대) */}
          {currentPhase === 'user-recording' && <div className={styles.topOverlayMe} />}
          {((currentPhase === 'waiting' || currentPhase === 'waiting-for-confirmation') && userRecordedText) && (
            <div className={styles.topOverlayMeStopped} />
          )}
          {/* AI 차례 - 상단 오버레이 */}
          {currentPhase === 'ai-playing' && <div className={styles.topOverlayOpp} />}

          {/* 자막과 좌측 배지 컨테이너 */}
          {isCCSelected && subtitleText && (
            <div className={styles.subtitleContainer}>
              {/* 좌측 배지 */}
              {currentPhase === 'user-recording' && (
                <div className={styles.leftBadgeMe}>나</div>
              )}
              {currentPhase === 'ai-playing' && opponentRole && (
                <div className={styles.leftBadgeOpp}>{opponentRole}</div>
              )}
              {currentPhase === 'ai-playing' && !opponentRole && (
                <div className={styles.leftBadgeOpp}>상대</div>
              )}
              
              {/* 자막 */}
              <div 
                ref={subtitleRef}
                className={styles.subtitle}
              >
                {currentPhase === 'user-recording' && userRecordedText ? (
                  <SubtitleHighlight 
                    script={subtitleText} 
                    recorded={userRecordedText} 
                  />
                ) : (
                  subtitleText
                )}
              </div>
            </div>
          )}

          {/* 사용자 차례일 때 마이크 에러만 표시 */}
          {currentPhase === 'user-recording' && micError && (
            <div className={styles.manualControl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div className={styles.cameraError}>
                <p>{micError}</p>
                <button 
                  onClick={() => setMicError(null)}
                  className={styles.retryButton}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
          
          {/* 녹음 완료 후 확인 UI */}
          {(currentPhase === 'waiting' || currentPhase === 'waiting-for-confirmation') && userRecordedText && (
            <div className={styles.manualControl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div className={styles.userTranscript}>
                📝 인식된 대사: {userRecordedText}
              </div>
              
              {similarityScore !== null && (
                <div className={styles.similarityScore}>
                  일치율: {similarityScore}%
                </div>
              )}
              
              <button 
                className={styles.confirmButton}
                onClick={() => {
                  if (turnEngine) {
                    turnEngine.confirmAndNext();
                    setUserRecordedText(''); // 초기화
                    setSimilarityScore(null); // 일치율 초기화
                    setIsRecording(false); // 녹음 상태 초기화
                  }
                }}
              >
                확인
              </button>
            </div>
          )}

          {/* 오른쪽 위: 재생/일시정지 버튼 (SVG 교체 + _selected) */}
          <div style={{ position: 'absolute', top: '60px', right: '60px' }}>
            <button
              onClick={() => setIsPlaySelected(!isPlaySelected)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="재생/일시정지"
            >
              <img src={`/asset/svg/${isPlaySelected ? 'play' : 'play_selected'}.svg`} alt="play" />
            </button>
          </div>

          {/* 중앙: 연기 안내 텍스트 제거됨 */}

          {/* 왼쪽 아래: CC 버튼 (SVG 교체 + _selected) */}
          <div style={{ position: 'absolute', bottom: '60px', left: '60px' }}>
            <button
              onClick={() => setIsCCSelected(!isCCSelected)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="자막 토글"
            >
              <img src={`/asset/svg/${isCCSelected ? 'cc_selected' : 'cc'}.svg`} alt="cc" />
            </button>
          </div>

          {/* 왼쪽 아래: 애드립 모드 토글 */}
          <div style={{ position: 'absolute', bottom: '60px', left: '172px' }}>
            <TutorialButton
              type="adlib"
              isSelected={isAdlibMode}
              onClick={() => setIsAdlibMode(!isAdlibMode)}
            />
          </div>

          {/* 오른쪽 아래: 눈 아이콘 버튼 (SVG 교체 + _selected) */}
          <div style={{ position: 'absolute', bottom: '60px', right: '172px' }}>
            <button
              onClick={handleEyeClick}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="이미지 토글"
            >
              <img src={`/asset/svg/${isEyeSelected ? 'view_img_selected' : 'view_img'}.svg`} alt="view_img" />
            </button>
          </div>

          {/* 오른쪽 아래: 설정 버튼 (SVG 교체 + _selected) */}
          <div style={{ position: 'absolute', bottom: '60px', right: '60px' }}>
            <button
              onClick={handleSettingsClick}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="설정"
            >
              <img src={`/asset/svg/${isSettingsModalOpen ? 'setting_selected' : 'setting'}.svg`} alt="setting" />
            </button>
          </div>
          {(countdown !== null || showAction) && (
            <div className={styles.countdownOverlay}>
              {countdown !== null && <div className={styles.countNumber}>{countdown}</div>}
              {countdown === null && showAction && <div className={styles.actionText}>Action!</div>}
            </div>
          )}
        </div>
      )}

      {/* 설정 모달 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        selectedCharacter={selectedCharacter}
        opponentCharacter={opponentCharacter}
        sliderValue={sliderValue}
        setSliderValue={setSliderValue}
        selectedPersonality={selectedPersonality}
        setSelectedPersonality={setSelectedPersonality}
        selectedImage={selectedImage}
        onImageSelect={setSelectedImage}
        onImageReset={handleImageReset}
      />
    </div>
  );
}
