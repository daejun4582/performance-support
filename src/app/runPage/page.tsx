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
import { WORKS } from '../../constants/works';
import { getMediaPaths } from '../../utils/media-path';
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
  const [isProcessingComplete, setIsProcessingComplete] = React.useState(false); // Whisper 처리 완료 여부
  const [sceneInfo, setSceneInfo] = React.useState(''); // 연습 장면 정보
  const videoContainerRef = React.useRef<HTMLDivElement>(null); // 비디오 컨테이너 ref
  const idleVideoRef = React.useRef<HTMLVideoElement | null>(null); // 숨쉬는 영상 ref
  
  // 녹화 관련 refs 및 state
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const microphoneStreamRef = React.useRef<MediaStream | null>(null);
  const videoRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<BlobPart[]>([]);
  const animationFrameRef = React.useRef<number | null>(null);
  const screenVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = React.useRef<HTMLVideoElement | null>(null);
  // 녹화 시 사용한 mimeType과 파일 확장자 저장 (MediaRecorder.mimeType은 읽기 전용)
  const recordingMimeTypeRef = React.useRef<string>('video/webm');
  const recordingFileExtensionRef = React.useRef<string>('webm');
  
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
  const initialHasCustomImage = searchParams.get('hasCustomImage') === 'true'; // 얼굴 설정 여부 (초기값)
  
  // 얼굴 설정 여부를 상태로 관리 (설정 모달에서 변경 가능)
  const [hasCustomImage, setHasCustomImage] = React.useState(initialHasCustomImage);
  
  // 최신 설정값을 ref로 저장 (getCurrentSettings 클로저 문제 해결)
  const sliderValueRef = React.useRef(sliderValue);
  const selectedPersonalityRef = React.useRef(selectedPersonality);
  const hasCustomImageRef = React.useRef(hasCustomImage);

  // URL 파라미터로 초기화
  React.useEffect(() => {
    setSelectedPersonality(initialPersonality);
    setSliderValue(initialSliderValue);
    
    // workIndex로 sceneInfo 가져오기
    if (workIndex >= 1 && workIndex <= WORKS.length) {
      const work = WORKS[workIndex - 1];
      setSceneInfo(work.sceneInfo);
    }
  }, [initialPersonality, initialSliderValue, selectedCharacter, workIndex]);
  
  // 숨쉬는 영상 로드 (사용자 턴일 때)
  React.useEffect(() => {
    if (currentPhase === 'user-recording' && idleVideoRef.current && opponentRole) {
      // 상대역의 성별 파악
      const opponentGender = opponentRole.includes('유진 초이') || opponentRole.includes('유시진')
        ? 'male' as const
        : 'female' as const;
      
      let characterType = hasCustomImage ? 'featured' : 'basic';
      
      // // 임시: work2 basic_man은 featured_man 사용 (1.mp4 파일 누락으로 인해)
      // if (workIndex === 2 && !hasCustomImage && opponentGender === 'male') {
      //   console.warn('⚠️ work2 basic_man missing videos, using featured_man temporarily for idle video');
      //   characterType = 'featured';
      // }
      
      const genderSuffix = opponentGender === 'male' ? 'man' : 'woman';
      
      // middle.mp4는 항상 basic_tone 폴더에만 존재
      const idleVideoPath = `/asset/video_voice/work${workIndex}/${characterType}_${genderSuffix}/basic_tone/middle.mp4`;
      
      idleVideoRef.current.src = idleVideoPath;
      idleVideoRef.current.muted = true; // 음소거
      idleVideoRef.current.load();
      
      idleVideoRef.current.onerror = (e) => {
        console.error('❌ Idle video load failed:', e, idleVideoPath);
      };
      
      idleVideoRef.current.play().catch(err => {
        console.warn('⚠️ Idle video autoplay failed:', err);
      });
    }
  }, [currentPhase, opponentRole, hasCustomImage, selectedPersonality, workIndex]);

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

        if (parsedScript.length > 0) {
          // URL 파라미터로 전달받은 selectedCharacter를 사용
          const params = new URLSearchParams(window.location.search);
          const userRoleFromUrl = params.get('selectedCharacter') || '';
          
          
          if (userRoleFromUrl) {
            setUserRole(userRoleFromUrl);
            
            // 상대역 찾기 (첫 번째 등장자가 아닌 다른 등장자)
            const allRoles = [...new Set(parsedScript.map(cue => cue.role))];
            const opponent = allRoles.find(role => role !== userRoleFromUrl) || allRoles[0];
            setOpponentRole(opponent);
            
            // 상대역의 성별 파악 (opponent 이름으로 판별)
            const opponentGender = opponent.includes('유진 초이') || opponent.includes('유시진') 
              ? 'male' as const
              : 'female' as const;
            
            // 상대역 대사에 비디오/오디오 URL 추가 (skipRecording 제외)
            let opponentDialogueCount = 0;
            const scriptWithMedia = parsedScript.map((cue) => {
              if (cue.role === opponent) {
                // skipRecording이 true면 영상이 없으므로 카운트하지 않음
                if (cue.skipRecording) {
                  return cue; // 비디오/오디오 URL 추가 안 함
                }
                
                opponentDialogueCount++;
                
                const { videoUrl, audioUrl } = getMediaPaths({
                  workIndex,
                  opponentGender,
                  hasCustomImage,
                  personality: initialPersonality || 'basic',
                  dialogueNumber: opponentDialogueCount,
                  speed: initialSliderValue
                });
                
                
                return {
                  ...cue,
                  videoUrl,
                  audioUrl
                };
              }
              return cue;
            });
            
            setScript(scriptWithMedia);
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

  // 기본 이미지 경로 생성 (default 이미지)
  const getDefaultImagePath = (): string => {
    if (!workIndex || workIndex < 1 || workIndex > 2) {
      return '/asset/png/work1_default_girl.png'; // fallback
    }
    if (!opponentCharacter) {
      return '/asset/png/work1_default_girl.png'; // fallback
    }
    const work = WORKS[workIndex - 1];
    const isOpponentMale = work.characters.male === opponentCharacter;
    const genderSuffix = isOpponentMale ? 'man' : 'girl';
    return `/asset/png/work${workIndex}_default_${genderSuffix}.png`;
  };

  // Apply background image from startPage selection if available
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        let imageUrl: string;
        
        // URL 파라미터의 hasCustomImage를 우선 확인
        // 이미지 설정 안 했으면 (hasCustomImage === false) 무조건 default 이미지 사용
        if (!initialHasCustomImage) {
          // localStorage 무시하고 무조건 default 이미지
          imageUrl = getDefaultImagePath();
        } else {
          // 이미지 설정 했으면 localStorage에서 가져오기
          const stored = localStorage.getItem('selectedImage');
          imageUrl = stored || getDefaultImagePath();
        }
        
        const root = document.documentElement;
        root.style.setProperty('--practice-bg', `url('${imageUrl}')`);
        setSelectedImage(imageUrl);
        
        // hasCustomImage는 URL 파라미터 값 유지 (localStorage 기준 아님)
        setHasCustomImage(initialHasCustomImage);
      }
    } catch {}
  }, [workIndex, opponentCharacter, initialHasCustomImage]);

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

  // 상태 변경 시 ref 업데이트 (getCurrentSettings 클로저 문제 해결)
  React.useEffect(() => {
    sliderValueRef.current = sliderValue;
    selectedPersonalityRef.current = selectedPersonality;
    hasCustomImageRef.current = hasCustomImage;
  }, [sliderValue, selectedPersonality, hasCustomImage]);

  // Initialize Turn Engine when entering Practice step
  React.useEffect(() => {
    if (currentStep === 2 && script.length > 0 && userRole && turnEngine === null) {
      
      // 상대역 성별 파악
      const opponentGender = opponentRole.includes('유진 초이') || opponentRole.includes('유시진')
        ? 'male' as const
        : 'female' as const;
      
      let engine = createTurnEngine({
        script,
        userRole,
        adlibMode: isAdlibMode,
        videoContainer: videoContainerRef.current, // 비디오 컨테이너 전달
        workIndex,
        opponentGender,
        hasCustomImage,
        getIsPlaying: () => {
          const currentValue = isPlaySelectedRef.current;
          return currentValue;
        },
        getCurrentSettings: () => {
          // ref에서 최신 값을 읽어서 클로저 문제 해결
          const currentSliderValue = sliderValueRef.current;
          const currentPersonality = selectedPersonalityRef.current;
          const currentHasCustomImage = hasCustomImageRef.current;
          
          return { 
            sliderValue: currentSliderValue, 
            selectedPersonality: currentPersonality, 
            hasCustomImage: currentHasCustomImage 
          };
        },
        onPhase: (phase: Phase) => {
          setCurrentPhase(phase);
          // done 시 이동은 별도 effect에서 수행
        },
        onSubtitle: (text: string, kind: SubtitleKind, cueIndex?: number) => {
          
          // 사용자가 녹음한 텍스트인 경우 따로 저장
          if (kind === 'user-final') {
            setUserRecordedText(text);
            
            // 현재 상태에서 직접 가져오기
            setSimilarityData(prev => {
              const currentScript = script;
              
              if (text && currentScript.length > 0 && cueIndex !== undefined) {
                // cueIndex를 사용해 정확한 대사 가져오기
                const expectedLine = currentScript[cueIndex]?.text || '';
                
                if (expectedLine) {
                  const similarity = calculateFrontBiasedSimilarity(text, expectedLine);
                  const percentage = Math.round(similarity * 100);
                  setSimilarityScore(percentage);
                  
                  const existingIndex = prev.findIndex(item => item.cueIndex === cueIndex);
                  const newItem = {
                    cueIndex: cueIndex,
                    script: expectedLine,
                    recognized: text,
                    similarity: percentage
                  };
                  
                  if (existingIndex >= 0) {
                    // 이미 존재하면 업데이트
                    const updated = [...prev];
                    updated[existingIndex] = newItem;
                    return updated;
                  } else {
                    // 없으면 추가
                    const newData = [...prev, newItem];
                    return newData;
                  }
                }
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

      return () => {
        // destroy 시점에는 엔진의 currentIndex를 유지해야 함
        engine?.destroy();
        turnEngineRef.current = null;
      };
    }
  }, [currentStep, script, userRole, isAdlibMode]); // turnEngine은 한 번만 생성

  // Handle play/pause state changes
  React.useEffect(() => {
    if (turnEngine && currentStep === 2) {
      if (isPlaySelected) {
        // AI 턴 중간에 일시정지했다가 재개하는 경우
        if (currentPhase === 'ai-playing' || currentPhase === 'waiting') {
          turnEngine.resume();
        } else {
          turnEngine.start();
        }
      } else {
        turnEngine.pause();
      }
    }
  }, [isPlaySelected, turnEngine, currentStep, currentPhase]);

  // 재생 시작 시 설정 창이 열려있으면 닫기
  React.useEffect(() => {
    if (isPlaySelected && isSettingsModalOpen) {
      setIsSettingsModalOpen(false);
    }
  }, [isPlaySelected, isSettingsModalOpen]);

  // 각 대사의 유사도 저장
  const [similarityData, setSimilarityData] = React.useState<Array<{cueIndex: number, script: string, recognized: string, similarity: number}>>([]);
  
  // done 상태 → 녹화 종료 및 업로드 후 결과 페이지 이동
  React.useEffect(() => {
    if (currentPhase === 'done') {
      setIsProcessingComplete(true); // 로딩 표시
      
      // 녹화 종료 및 업로드 (비동기)
      stopVideoRecording().then((videoUrl) => {
        console.log('✅ Video recording and upload completed:', videoUrl);
        
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('similarityData', JSON.stringify(similarityData));
          }
        } catch (err) {
          console.error('Failed to save similarity data:', err);
        }
        
        // URL 파라미터와 함께 resultPage로 이동
        router.push(`/resultPage?workIndex=${workIndex}&selectedCharacter=${encodeURIComponent(selectedCharacter)}`);
      }).catch((error) => {
        console.error('❌ Video upload failed, still navigating:', error);
        // 업로드 실패해도 페이지 이동
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('similarityData', JSON.stringify(similarityData));
          }
        } catch (err) {
          console.error('Failed to save similarity data:', err);
        }
        router.push(`/resultPage?workIndex=${workIndex}&selectedCharacter=${encodeURIComponent(selectedCharacter)}`);
      });
    }
  }, [currentPhase, router, similarityData, workIndex, selectedCharacter]);

  // 카메라 단계 제거됨

  // 카메라 단계 제거로 Ready 핸들러 불필요

  // 화면 공유 + 웹캠 녹화 시작
  const startVideoRecording = async () => {
    try {
      // 1. 화면 공유 스트림 가져오기
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'browser' as any,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true // 시스템 오디오 포함
      });
      screenStreamRef.current = screenStream;

      // 2. 웹캠 스트림 가져오기
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false // 마이크는 별도로 녹음 중
      });

      // 3. Canvas 크기를 실제 화면 공유 크기에 맞춤
      // 먼저 임시 비디오로 크기 확인
      const tempScreenVideo = document.createElement('video');
      tempScreenVideo.srcObject = screenStream;
      tempScreenVideo.muted = true;
      
      await new Promise<void>((resolve) => {
        tempScreenVideo.onloadedmetadata = () => {
          const screenWidth = tempScreenVideo.videoWidth || 1920;
          const screenHeight = tempScreenVideo.videoHeight || 1080;
          
          if (!canvasRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = screenWidth;
            canvas.height = screenHeight;
            canvas.style.display = 'none';
            canvas.style.position = 'absolute';
            canvas.style.visibility = 'hidden';
            document.body.appendChild(canvas);
            canvasRef.current = canvas;
            console.log(`📐 Canvas created: ${screenWidth}x${screenHeight}`);
          } else {
            canvasRef.current.width = screenWidth;
            canvasRef.current.height = screenHeight;
            console.log(`📐 Canvas resized: ${screenWidth}x${screenHeight}`);
          }
          
          tempScreenVideo.srcObject = null;
          resolve();
        };
      });
      
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // 4. 비디오 엘리먼트 생성 (임시로 Canvas에 그리기 위해)
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.autoplay = true;
      screenVideo.playsInline = true;
      screenVideo.muted = true;
      screenVideoRef.current = screenVideo;

      const cameraVideo = document.createElement('video');
      cameraVideo.srcObject = cameraStream;
      cameraVideo.autoplay = true;
      cameraVideo.playsInline = true;
      cameraVideo.muted = true;
      cameraVideoRef.current = cameraVideo;

      // 5. 비디오가 로드되고 재생될 때까지 대기
      await new Promise<void>((resolve) => {
        let videoReadyCount = 0;
        const checkReady = () => {
          videoReadyCount++;
          if (videoReadyCount === 2) resolve();
        };

        // 각 비디오가 재생 가능해질 때까지 대기
        const waitForVideo = (video: HTMLVideoElement) => {
          const onCanPlay = async () => {
            try {
              await video.play();
              checkReady();
            } catch (err) {
              console.warn('Video play failed, but continuing:', err);
              checkReady(); // 재생 실패해도 계속 진행
            }
          };
          video.oncanplay = onCanPlay;
          // 이미 재생 가능한 상태면 즉시 호출
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            onCanPlay();
          }
        };

        waitForVideo(screenVideo);
        waitForVideo(cameraVideo);
      });

      // 6. Canvas에 합성하여 그리기 (애니메이션 루프)
      // 비디오가 실제로 재생 중인지 확인
      const drawFrame = () => {
        if (!canvasRef.current || !ctx) return;
        
        // 비디오가 준비되지 않았으면 건너뛰기
        if (screenVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
            cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          return;
        }
        
        // Canvas를 먼저 초기화 (검정색 배경 제거)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 화면 공유 전체 영역 그리기
        try {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        } catch (err) {
          console.warn('Failed to draw screen video:', err);
        }
        
        // 웹캠을 오른쪽 하단에 작은 박스로 그리기 (300x225 크기)
        const webcamWidth = 300;
        const webcamHeight = 225;
        const webcamX = canvas.width - webcamWidth - 20;
        const webcamY = canvas.height - webcamHeight - 20;
        
        try {
          ctx.drawImage(
            cameraVideo,
            webcamX,
            webcamY,
            webcamWidth,
            webcamHeight
          );
        } catch (err) {
          console.warn('Failed to draw camera video:', err);
        }
        
        // 웹캠 박스 테두리
        ctx.strokeStyle = '#7560FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(webcamX, webcamY, webcamWidth, webcamHeight);
        
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };
      
      // 약간의 지연 후 그리기 시작 (비디오가 안정화되도록)
      setTimeout(() => {
        drawFrame();
      }, 100);

      // 7. Canvas 스트림을 MediaRecorder로 녹화
      const canvasStream = canvasRef.current!.captureStream(30); // 30fps
      
      // 시스템 오디오를 Canvas 스트림에 추가 (화면 공유 시 선택한 오디오)
      const screenAudioTracks = screenStream.getAudioTracks();
      screenAudioTracks.forEach(track => {
        canvasStream.addTrack(track);
        console.log('🔊 Added system audio track:', track.label);
      });
      
      // 마이크 오디오도 추가 (사용자 목소리)
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      microphoneStreamRef.current = microphoneStream;
      const micAudioTracks = microphoneStream.getAudioTracks();
      micAudioTracks.forEach(track => {
        canvasStream.addTrack(track);
        console.log('🎤 Added microphone audio track:', track.label);
      });
      
      console.log(`✅ Total audio tracks in recording: ${screenAudioTracks.length + micAudioTracks.length}`);

      // mp4 우선 시도, 지원 안 되면 webm
      let mimeType: string;
      let fileExtension: string;
      
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
        mimeType = 'video/mp4;codecs=h264,aac';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
        fileExtension = 'webm';
      } else {
        // 최후의 수단
        mimeType = 'video/webm';
        fileExtension = 'webm';
      }

      console.log('📹 Recording with:', mimeType, `(.${fileExtension})`);

      // mimeType과 확장자를 ref에 저장
      recordingMimeTypeRef.current = mimeType;
      recordingFileExtensionRef.current = fileExtension;

      const recorder = new MediaRecorder(canvasStream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000); // 1초마다 데이터 수집
      videoRecorderRef.current = recorder;
      console.log('✅ Video recording started');

    } catch (error) {
      console.error('❌ Failed to start video recording:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('화면 공유 권한이 필요합니다.');
      }
    }
  };

  // 녹화 종료 및 업로드
  const stopVideoRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!videoRecorderRef.current || videoRecorderRef.current.state === 'inactive') {
        console.log('⚠️ No active recording to stop');
        resolve(null);
        return;
      }

      const recorder = videoRecorderRef.current;
      const screenStream = screenStreamRef.current;

      recorder.onstop = async () => {
        // 애니메이션 루프 정리
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // 스트림 정리
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        
        // 마이크 스트림 정리
        const micStream = microphoneStreamRef.current;
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
          microphoneStreamRef.current = null;
        }
        if (cameraVideoRef.current?.srcObject) {
          const cameraStream = cameraVideoRef.current.srcObject as MediaStream;
          cameraStream.getTracks().forEach(track => track.stop());
        }

        // 비디오 엘리먼트 정리
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
          screenVideoRef.current = null;
        }
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = null;
          cameraVideoRef.current = null;
        }

        // Canvas 정리
        if (canvasRef.current && canvasRef.current.parentNode) {
          document.body.removeChild(canvasRef.current);
          canvasRef.current = null;
        }

        // 녹화 시 사용한 mimeType으로 Blob 생성
        const actualMimeType = recordingMimeTypeRef.current;
        const actualExtension = recordingFileExtensionRef.current;
        const blob = new Blob(recordedChunksRef.current, { type: actualMimeType });
        console.log('📤 Uploading video to Google Drive...', blob.size, `type: ${actualMimeType} (${actualExtension})`);

        if (blob.size === 0) {
          console.warn('⚠️ Empty video blob');
          resolve(null);
          return;
        }

        // Google Drive에 직접 업로드 (Resumable Upload API 사용)
        (async () => {
          try {
            // 1. Access Token 받기
            const tokenResponse = await fetch('/api/get-upload-token');
            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
              console.error('❌ Failed to get upload token:', errorData);
              resolve(null);
              return;
            }
            const tokenData = await tokenResponse.json();
            if (!tokenData.success || !tokenData.accessToken || !tokenData.folderId) {
              console.error('❌ Invalid token response:', tokenData);
              resolve(null);
              return;
            }

            const accessToken = tokenData.accessToken;
            const folderId = tokenData.folderId;

            // 2. Resumable Upload 세션 시작
            const fileName = `${Date.now()}_practice_video.${actualExtension}`;
            const fileMetadata = {
              name: fileName,
              parents: [folderId]
            };

            const initResponse = await fetch(
              `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json; charset=UTF-8'
                },
                body: JSON.stringify(fileMetadata)
              }
            );

            if (!initResponse.ok) {
              const errorText = await initResponse.text();
              console.error('❌ Failed to initialize upload:', errorText);
              resolve(null);
              return;
            }

            const uploadUrl = initResponse.headers.get('Location');
            if (!uploadUrl) {
              console.error('❌ No upload URL received');
              resolve(null);
              return;
            }

            // 3. 파일 업로드
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': actualMimeType,
                'Content-Length': blob.size.toString()
              },
              body: blob
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error('❌ Upload failed:', errorText);
              resolve(null);
              return;
            }

            const uploadedFile = await uploadResponse.json();
            const fileId = uploadedFile.id;

            if (!fileId) {
              console.error('❌ No file ID in upload response');
              resolve(null);
              return;
            }

            // 4. 파일 정보 가져오기 및 공개 권한 설정
            const fileInfoResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );

            if (!fileInfoResponse.ok) {
              console.warn('⚠️ Failed to get file info, but file uploaded');
              // 파일은 업로드되었으므로 기본 URL 사용
              const defaultUrl = `https://drive.google.com/file/d/${fileId}/view`;
              if (typeof window !== 'undefined') {
                localStorage.setItem('practiceVideoUrl', defaultUrl);
              }
              resolve(defaultUrl);
              return;
            }

            const fileInfo = await fileInfoResponse.json();

            // 5. 공개 권한 부여
            try {
              await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                  })
                }
              );
            } catch (permError) {
              console.warn('⚠️ Failed to set public permission:', permError);
              // 권한 설정 실패해도 계속 진행
            }

            const fileUrl = fileInfo.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
            console.log('✅ Video uploaded:', fileUrl);

            // localStorage에 URL 저장
            if (typeof window !== 'undefined') {
              localStorage.setItem('practiceVideoUrl', fileUrl);
            }

            resolve(fileUrl);

          } catch (error) {
            console.error('❌ Upload error:', error);
            resolve(null);
          }
        })();
      };

      recorder.stop();
      videoRecorderRef.current = null;
    });
  };

  const handleAction = async () => {
    // 화면 공유 권한 요청 및 녹화 시작
    await startVideoRecording();

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

  // 눈 버튼 핸들러 (이미지/동영상 숨기기/보이기)
  const handleEyeClick = () => {
    const newState = !isImageHidden;
    setIsImageHidden(newState);
    setIsEyeSelected(newState);
  };

  // 설정 모달 저장 핸들러
  const handleSaveSettings = (settings: { sliderValue: number; selectedPersonality: string; selectedImage: string }) => {
    
    // 전달받은 설정값으로 상태 동기화 (확실한 상태 업데이트)
    setSliderValue(settings.sliderValue);
    setSelectedPersonality(settings.selectedPersonality);
    setSelectedImage(settings.selectedImage);
    
    // hasCustomImage 상태도 함께 업데이트
    const isCustom = settings.selectedImage.includes('work1_girl.png');
    setHasCustomImage(isCustom);
    
    // ref도 즉시 업데이트 (useEffect 대기 없이 즉시 반영 - getCurrentSettings 클로저 문제 해결)
    sliderValueRef.current = settings.sliderValue;
    selectedPersonalityRef.current = settings.selectedPersonality;
    hasCustomImageRef.current = isCustom;
    
    // localStorage도 업데이트
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', settings.selectedImage);
      }
    } catch {}
    
    setIsSettingsModalOpen(false);
    // 설정 모달 닫힐 때 재생 상태 변경 없음
  };

  // 이미지 리셋 핸들러
  const handleImageReset = () => {
    const def = '/asset/png/work1_default_img.png';
    setSelectedImage(def);
    setHasCustomImage(false); // 얼굴 설정 초기화
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
            {sceneInfo}<br/>
            <img className={styles.arrowScene} src="/asset/svg/scene_arrow.svg" alt="setting_arrow" />
            <div className={styles.sceneDescription} style={{transform: 'translateY(-17px)'}}>
            현재 연습 씬을 의미합니다.
            </div>
          </div>

          {/* 오른쪽 위: 재생 버튼 (선택=일시정지 상태) */}
          <div className={styles.iconWrap} style={{ top: 60, right: 60 }}>
            <div className={styles.iconBox}>
              <button
                onClick={() => {}} // 튜토리얼에서는 클릭 불가
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'default' }}
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
          {/* 로딩 오버레이 */}
          {isProcessingComplete && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingContent}>
                <div className={styles.loadingSpinner}></div>
                <div className={styles.loadingText}>결과를 처리하는 중...</div>
              </div>
            </div>
          )}
          
          {/* 연기 페이지 */}
          
          {/* 비디오 컨테이너 - AI 턴일 때만 표시 (눈 버튼으로 숨김 처리) */}
          <div 
            ref={videoContainerRef} 
            className={styles.videoContainer}
            style={{ 
              display: (currentPhase === 'ai-playing' && !isImageHidden) ? 'block' : 'none' 
            }}
          ></div>
          
          {/* 숨쉬는 영상 - 사용자 턴일 때 표시 (눈 버튼으로 숨김 처리) */}
          <div 
            className={styles.idleVideoContainer}
            style={{ 
              display: (currentPhase === 'user-recording' && !isImageHidden) ? 'block' : 'none' 
            }}
          >
            <video
              ref={idleVideoRef}
              className={styles.idleVideo}
              loop
              muted
              autoPlay
              playsInline
            />
          </div>
          
          {/* 왼쪽 위: 씬 정보 */}
          <div className={styles.sceneInfo}>
            {sceneInfo}
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
          
          {/* 녹음 완료 후 확인 UI 제거 - 바로 다음 턴으로 진행 */}

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
        onImageSelect={(imageUrl) => {
          setSelectedImage(imageUrl);
          setHasCustomImage(true); // 커스텀 이미지 선택 시 true로 설정
        }}
        onImageReset={handleImageReset}
      />
    </div>
  );
}
