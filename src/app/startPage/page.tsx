'use client';

import React from 'react';
import { NavigationBar } from '../../components';
import { PracticeStartButton } from '../../components/PrimaryButton';
import SettingComp from './settingComp';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

type WorkInfo = { src: string, alt: string, characters: { male: string, female: string }, sceneInfo: string };
const WORKS: WorkInfo[] = [
  { src: '/asset/png/work1.png', alt: '작품 1', characters: { male: '유진 초이', female: '고애신' }, sceneInfo: '3화 S#40. 양복점/ 재봉실 (낮)' },
  { src: '/asset/png/work2.png', alt: '작품 2', characters: { male: '유시진', female: '강모연' }, sceneInfo: '3화 #36-1. 난파선 안 (낮)' },
  { src: '/asset/png/work3.png', alt: '작품 3', characters: { male: '', female: '' }, sceneInfo: '' },
];

export default function StartPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0); // 작품 선택 단계로 시작
  const [selectedDrama, setSelectedDrama] = React.useState<'left' | 'right' | null>(null);
  const [selectedCharacter, setSelectedCharacter] = React.useState<string | null>(null);
  const [selectedWorkIndex, setSelectedWorkIndex] = React.useState<number | null>(null);
  const [showAnimation, setShowAnimation] = React.useState(false);
  const [cardAnimation, setCardAnimation] = React.useState<'slideIn' | 'slideOut' | null>(null);
  const [showSettingAnimation, setShowSettingAnimation] = React.useState(false);
  const [transitionRect, setTransitionRect] = React.useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [roleReady, setRoleReady] = React.useState(false);
  const [hideWorkCardIndex, setHideWorkCardIndex] = React.useState<number | null>(null);
  const [roleExiting, setRoleExiting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isRoleDragging, setIsRoleDragging] = React.useState(false);
  const worksRef = React.useRef<HTMLDivElement | null>(null);
  const roleRef = React.useRef<HTMLDivElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef<{startX: number; startY: number; scrollLeft: number} | null>(null);
  const roleDragState = React.useRef<{startX: number; startY: number; scrollTop: number} | null>(null);
  const autoScrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrollPositionRef = React.useRef<number>(0);
  const scrollEndTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const navigationSteps = ['작품 선택', '캐릭터 선택', '상대역 설정', '카메라 설정'];
  // Step 3 (index 3): camera check
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  // Setting 값 저장
  const [personalityValue, setPersonalityValue] = React.useState<string>('까칠');
  const [sliderValue, setSliderValue] = React.useState<number>(0);
  
  // 현재 단계보다 앞의 단계들은 비활성화
  const disabledSteps = Array.from({ length: currentStep + 1 }, (_, i) => i).filter(step => step > currentStep);

  const handleCharacterCardClick = (characterName: string) => {
    setSelectedCharacter(characterName);
    setShowSettingAnimation(true);
    setCurrentStep(2); // 상대역 설정 단계로 이동
  };

  const handleStepChange = (step: number) => {
    // 앞의 단계로는 이동 불가능 (화면 인터랙션을 통해서만 진행 가능)
    if (step > currentStep) {
      return; // 앞의 단계로 이동 시도 시 무시
    }
    
    if (step < currentStep) {
      // 이전 단계로 돌아가는 경우만 허용
      setCardAnimation('slideOut');
      
      setTimeout(() => {
        setCurrentStep(step);
        if (step === 0) {
          setSelectedDrama(null);
          setSelectedWorkIndex(null);
          setRoleReady(false);
          setHideWorkCardIndex(null);
          if (worksRef.current) worksRef.current.scrollTo({ left: 0, behavior: 'auto' });
          if (roleRef.current) roleRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
        setShowAnimation(false);
        setCardAnimation(null);
      }, 500);
    }
  };

  // 드래그 스크롤 핸들러 (가로)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = worksRef.current;
    if (!el) return;
    
    // 터치 이벤트인 경우에만 즉시 포인터 캡처 (드래그 가능)
    if (e.pointerType !== 'mouse') {
      setIsDragging(true);
      el.setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft };
      return;
    }
    
    // 마우스 이벤트의 경우: 드래그 상태만 저장하고 포인터 캡처는 하지 않음
    // 실제 이동이 감지되면 onPointerMove에서 포인터 캡처 수행
    dragState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft };
  };
  
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = worksRef.current;
    if (!el || !dragState.current) return;
    
    // 마우스로 5px 이상 이동한 경우에만 드래그 시작
    if (e.pointerType === 'mouse' && !isDragging && dragState.current) {
      const dx = Math.abs(e.clientX - dragState.current.startX);
      const dy = Math.abs(e.clientY - dragState.current.startY);
      if (dx > 5 || dy > 5) {
        setIsDragging(true);
        el.setPointerCapture(e.pointerId);
      }
    }
    
    // 드래그 중인 경우에만 스크롤 수행
    if (isDragging) {
      const dx = e.clientX - dragState.current.startX;
      el.scrollLeft = dragState.current.scrollLeft - dx;
    }
  };
  
  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    const el = worksRef.current;
    if (!el) return;
    
    const wasDragging = isDragging;
    setIsDragging(false);
    
    if (e && wasDragging) {
      el.releasePointerCapture(e.pointerId);
    }
    dragState.current = null;
  };

  // 드래그 스크롤 핸들러 (세로 - 역할 컨테이너)
  const onRolePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = roleRef.current;
    if (!el) return;
    
    // 터치 이벤트인 경우에만 즉시 포인터 캡처 (드래그 가능)
    if (e.pointerType !== 'mouse') {
      setIsRoleDragging(true);
      el.setPointerCapture(e.pointerId);
      roleDragState.current = { startX: e.clientX, startY: e.clientY, scrollTop: el.scrollTop };
      return;
    }
    
    // 마우스 이벤트의 경우: 드래그 상태만 저장하고 포인터 캡처는 하지 않음
    // 실제 이동이 감지되면 onRolePointerMove에서 포인터 캡처 수행
    roleDragState.current = { startX: e.clientX, startY: e.clientY, scrollTop: el.scrollTop };
  };
  
  const onRolePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = roleRef.current;
    if (!el || !roleDragState.current) return;
    
    // 마우스로 5px 이상 이동한 경우에만 드래그 시작
    if (e.pointerType === 'mouse' && !isRoleDragging && roleDragState.current) {
      const dx = Math.abs(e.clientX - roleDragState.current.startX);
      const dy = Math.abs(e.clientY - roleDragState.current.startY);
      if (dx > 5 || dy > 5) {
        setIsRoleDragging(true);
        el.setPointerCapture(e.pointerId);
      }
    }
    
    // 드래그 중인 경우에만 스크롤 수행
    if (isRoleDragging) {
      const dy = e.clientY - roleDragState.current.startY;
      el.scrollTop = roleDragState.current.scrollTop - dy;
    }
  };
  
  const endRoleDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    const el = roleRef.current;
    if (!el) return;
    
    const wasDragging = isRoleDragging;
    setIsRoleDragging(false);
    
    if (e && wasDragging) {
      el.releasePointerCapture(e.pointerId);
    }
    roleDragState.current = null;
  };

  // 선택 애니메이션: 클릭한 카드 위치에서 2단계의 좌측 패널 위치까지 이동
  const startWorkTransition = (index: number, cardEl: HTMLDivElement) => {
    if (!containerRef.current) return;
    const cardRect = cardEl.getBoundingClientRect();
    setTransitionRect(cardRect);
    setIsTransitioning(true);
    setSelectedWorkIndex(index);
    setRoleReady(false); // 역할 카드 지연 시작
    // 2단계로 먼저 전환하여 타깃 패널 렌더
    setSelectedDrama('right');
    setCurrentStep(1);
    setShowAnimation(true);
  };

  // 2단계가 렌더된 후, 타깃(left panel) 위치로 이동 애니메이션
  React.useEffect(() => {
    if (!isTransitioning || currentStep !== 1 || transitionRect == null) return;
    const raf = requestAnimationFrame(() => {
      const target = document.querySelector(`.${styles.selectedWork}`) as HTMLDivElement | null;
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      setTransitionRect(new DOMRect(targetRect.left, targetRect.top, targetRect.width, targetRect.height));
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionRect(null);
        setRoleReady(true); // 이미지 전환이 끝난 뒤 역할 카드 동시 등장
      }, 500);
    });
    return () => cancelAnimationFrame(raf);
  }, [isTransitioning, currentStep, styles.selectedWork, transitionRect]);

  // 자동 스크롤 애니메이션: 작품 선택 단계에서 스크롤이 멈춘 후 3초 뒤 맨 앞으로 스크롤
  React.useEffect(() => {
    if (currentStep !== 0) return; // 작품 선택 단계가 아니면 실행하지 않음
    if (!worksRef.current) return;

    const checkScrollEnd = () => {
      if (!worksRef.current || currentStep !== 0 || isDragging || isTransitioning) return;

      const currentScroll = worksRef.current.scrollLeft;
      
      // 스크롤 위치가 변경되지 않았으면 (스크롤이 멈춘 상태)
      if (scrollPositionRef.current === currentScroll) {
        // 기존 타이머 취소
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
        
        // 1초 후 자동으로 맨 앞으로 스크롤
        autoScrollTimeoutRef.current = setTimeout(() => {
          if (worksRef.current && currentStep === 0 && !isDragging && !isTransitioning) {
            worksRef.current.scrollTo({ 
              left: 0, 
              behavior: 'smooth'
            });
          }
        }, 1000);
      }
      
      // 현재 스크롤 위치 업데이트
      scrollPositionRef.current = currentScroll;
    };

    const handleScroll = () => {
      // 기존 타이머 취소
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      
      // 스크롤이 멈추는 것을 감지하기 위한 debounce
      scrollEndTimeoutRef.current = setTimeout(checkScrollEnd, 150); // 150ms 후에 체크
    };

    const element = worksRef.current;
    element.addEventListener('scroll', handleScroll);

    // 초기 체크
    scrollPositionRef.current = element.scrollLeft;
    checkScrollEnd();

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [currentStep, isDragging, isTransitioning]);

  // 드래그가 끝나면 자동 스크롤 체크
  React.useEffect(() => {
    if (!isDragging && currentStep === 0 && worksRef.current) {
      // 드래그가 끝난 직후 스크롤 위치 체크 및 타이머 시작
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      
      autoScrollTimeoutRef.current = setTimeout(() => {
        if (worksRef.current && currentStep === 0 && !isDragging && !isTransitioning) {
          worksRef.current.scrollTo({ 
            left: 0, 
            behavior: 'smooth'
          });
        }
      }, 1000);
    }
  }, [isDragging, currentStep, isTransitioning]);

  // 선택된 work 카드를 클릭하면 이전 단계(작품 선택)로 복귀 - 역방향 전환 (역할 카드 페이드아웃 후)
  const handleSelectedWorkClick = () => {
    if (isTransitioning || currentStep !== 1 || selectedWorkIndex == null) return;
    // 1) 역할 카드 페이드아웃
    setRoleExiting(true);
    setRoleReady(false);
    setTimeout(() => {
      // 2) 좌측 패널에서 원래 카드 위치로 전환 애니메이션 시작
      const leftPanel = document.querySelector(`.${styles.selectedWork}`) as HTMLDivElement | null;
      if (!leftPanel) return;
      const startRect = leftPanel.getBoundingClientRect();
      setTransitionRect(startRect);
      setIsTransitioning(true);
      setHideWorkCardIndex(selectedWorkIndex);
      // 1단계로 전환하여 대상 카드 렌더링 후 그 위치로 이동
      setCurrentStep(0);
      requestAnimationFrame(() => {
        const CARD_WIDTH = 760;
        const GAP = 24;
        const targetLeft = (selectedWorkIndex - 1) * (CARD_WIDTH + GAP);
        if (worksRef.current) worksRef.current.scrollTo({ left: targetLeft, behavior: 'auto' });
        requestAnimationFrame(() => {
          const targetCard = document.querySelector(`[data-work-index="${selectedWorkIndex}"]`) as HTMLDivElement | null;
          if (!targetCard) return;
          const endRect = targetCard.getBoundingClientRect();
          setTransitionRect(new DOMRect(endRect.left, endRect.top, endRect.width, endRect.height));
          setTimeout(() => {
            setIsTransitioning(false);
            setTransitionRect(null);
            setSelectedDrama(null);
            setSelectedWorkIndex(null);
            setHideWorkCardIndex(null);
            setRoleExiting(false);
          }, 500);
        });
      });
    }, 300); // 역할 카드 페이드아웃 시간과 동일
  };

  return (
    <div ref={containerRef} className={`${styles.container} ${(currentStep === 2 || currentStep === 3) ? styles['container--settingBg'] : ''}`}>
      {/* 왼쪽 위 네비게이션 */}
      <div className={styles.navigationSection}>
        <div className={`${styles.title} t-24-bold`}>연습하기</div>
        <NavigationBar 
          steps={navigationSteps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          disabledSteps={disabledSteps}
        />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className={`${styles.mainContent} ${currentStep === 0 ? styles['mainContent--works'] : ''} ${currentStep === 1 ? styles['mainContent--selection'] : ''} ${(currentStep === 2 || currentStep === 3) ? styles['mainContent--noTopPadding'] : ''} ${currentStep === 1 ? styles['mainContent--step2'] : ''}`}>
        {/* 작품 선택 단계 - 가로 슬라이더 카드 3개 */}
        {currentStep === 0 && (
          <div
            className={`${styles.worksScroll} ${isDragging ? styles.dragging : ''}`}
            ref={worksRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onMouseLeave={() => endDrag()}
          >
            {WORKS.map((work, i) => (
              <div
                key={i}
                className={i === 2 ? `${styles.workCard} ${styles.workCardDisabled}` : styles.workCard}
                data-work-index={i + 1}
                style={{ visibility: isTransitioning && hideWorkCardIndex === i + 1 ? 'hidden' : 'visible' }}
                onClick={(e) => {
                  if (i === 2) return; // work3는 클릭 불가
                  startWorkTransition(i + 1, e.currentTarget as HTMLDivElement);
                }}
              >
                <div className={styles.workImageWrapper}>
                  <img src={work.src} alt={work.alt} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                </div>
                {i < 2 && (
                  <div className={styles.sceneInfoRectangle}>
                    <div className={styles.sceneInfoLeft}>
                      연습 장면
                    </div>
                    <div className={styles.sceneInfoRight}>
                      {work.sceneInfo}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 캐릭터 선택 단계 - 선택된 드라마의 캐릭터 카드들 */}
        {currentStep === 1 && selectedWorkIndex !== null && (
          <>
            {/* 왼쪽: 선택된 작품 이미지 (크기 고정). 전환 중에는 숨김 처리하여 중복 노출 방지 */}
            <div
              className={styles.selectedWork}
              style={{ visibility: isTransitioning ? 'hidden' as const : 'visible' as const, cursor: 'pointer' }}
              onClick={handleSelectedWorkClick}
            >
              <div className={styles.workImageWrapper}>
                <img src={WORKS[selectedWorkIndex - 1].src} alt={WORKS[selectedWorkIndex - 1].alt} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              </div>
              {selectedWorkIndex < 3 && (
                <div className={styles.sceneInfoRectangle}>
                  <div className={styles.sceneInfoLeft}>
                    연습 장면
                  </div>
                  <div className={styles.sceneInfoRight}>
                    {WORKS[selectedWorkIndex - 1].sceneInfo}
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 역할 카드 컨테이너 (동시 등장 애니메이션) */}
            <div
              className={`${styles.roleContainer} ${isRoleDragging ? styles.dragging : ''} ${roleExiting ? styles.roleContainerExit : roleReady ? styles.roleContainerEnter : styles.roleContainerHidden}`}
              ref={roleRef}
              onPointerDown={onRolePointerDown}
              onPointerMove={onRolePointerMove}
              onPointerUp={endRoleDrag}
              onPointerCancel={endRoleDrag}
              onMouseLeave={() => endRoleDrag()}
            >
              <div className={`${styles.characterCard} ${styles.characterCardRight} ${roleExiting ? styles.roleExit : roleReady ? styles.roleEnter : styles.roleHidden}`} onClick={() => handleCharacterCardClick(WORKS[selectedWorkIndex - 1].characters.female)}>
                <div className={styles.characterContent}>
                  <div className={styles.characterLabel}>여자 주인공</div>
                  <div className={styles.characterName}>{WORKS[selectedWorkIndex - 1].characters.female}</div>
                </div>
              </div>
              <div className={`${styles.characterCard} ${styles.characterCardRight} ${roleExiting ? styles.roleExit : roleReady ? styles.roleEnter : styles.roleHidden}`} onClick={() => handleCharacterCardClick(WORKS[selectedWorkIndex - 1].characters.male)}>
                <div className={styles.characterContent}>
                  <div className={styles.characterLabel}>남자 주인공</div>
                  <div className={styles.characterName}>{WORKS[selectedWorkIndex - 1].characters.male}</div>
                </div>
              </div>
              {/* 조연 카드 - 클릭 불가, 배경+오버레이 */}
              <div className={`${styles.characterCard} ${styles.supportingCard} ${styles['characterCard--disabled']} ${roleExiting ? styles.roleExit : roleReady ? styles.roleEnter : styles.roleHidden}`}>
                <div className={styles.supportingCard__overlay}></div>
                <div className={styles.characterContent}>
                  <div className={styles.characterLabel}>조연 A</div>
                  <div className={styles.characterName}>역할 A</div>
                </div>
              </div>
              <div className={`${styles.characterCard} ${styles.supportingCard} ${styles['characterCard--disabled']} ${roleExiting ? styles.roleExit : roleReady ? styles.roleEnter : styles.roleHidden}`}>
                <div className={styles.supportingCard__overlay}></div>
                <div className={styles.characterContent}>
                  <div className={styles.characterLabel}>조연 B</div>
                  <div className={styles.characterName}>역할 B</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 4단계: 카메라 설정 */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '1047px', height: '650px', borderRadius: '16px', border: '1px solid #D0C8FF', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(230,230,230,0.31) -34.29%, rgba(114,114,114,0.31) 100%)' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/asset/svg/face_form.svg" alt="얼굴 가이드" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              </div>
              {cameraError && (
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 8 }}>
                  {cameraError}
                </div>
              )}
            </div>
            <div className={styles.cameraInstruction}>
              카메라 프레임을 확인한 후, 얼굴이 안내선 안에 들어오도록 맞춰주세요!
            </div>
            <div style={{ width: '1800px', margin: '0 auto 0', display: 'flex', justifyContent: 'flex-end' }}>
              <PracticeStartButton onClick={() => {
                try {
                  if (cameraStream) {
                    cameraStream.getTracks().forEach((t) => t.stop());
                  }
                  if (videoRef.current) {
                    (videoRef.current as any).srcObject = null;
                  }
                } catch {}
                // URL 파라미터 전달 (SettingComp에서 저장한 값 사용)
                const params = new URLSearchParams({
                  selectedCharacter: selectedCharacter || '',
                  opponentCharacter: '',
                  selectedPersonality: personalityValue,
                  sliderValue: sliderValue.toString(),
                  workIndex: selectedWorkIndex?.toString() || '1'
                });
                router.push(`/runPage?${params.toString()}`);
              }} />
            </div>
          </div>
        )}

        {/* 상대역 설정 단계 */}
        {currentStep === 2 && selectedCharacter && selectedWorkIndex !== null && (
          <div className={styles.settingRow}>
            <div className={`${showSettingAnimation ? styles.settingSlideIn : ''}`}>
              <SettingComp 
                selectedCharacter={selectedCharacter}
                opponentCharacter={
                  selectedCharacter === WORKS[selectedWorkIndex - 1].characters.male
                    ? WORKS[selectedWorkIndex - 1].characters.female
                    : WORKS[selectedWorkIndex - 1].characters.male
                }
                selectedWorkIndex={selectedWorkIndex}
                onNext={(personality, slider) => {
                  // personality와 slider 값 저장
                  setPersonalityValue(personality);
                  setSliderValue(slider);
                  
                  // 4단계(카메라 설정)로 전환
                  setCurrentStep(3);
                  // 카메라 초기화 시도
                  (async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1026 }, height: { ideal: 650 }, facingMode: 'user' },
                        audio: false,
                      });
                      setCameraStream(stream);
                      setCameraError(null);
                      if (videoRef.current) {
                        videoRef.current.srcObject = stream as any;
                        (videoRef.current as any).play?.().catch(() => {});
                      }
                    } catch (err) {
                      setCameraError('카메라에 접근할 수 없습니다. 카메라 권한을 허용해주세요.');
                    }
                  })();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 전환용 임시 엘리먼트 (shared-element 느낌) */}
      {isTransitioning && selectedWorkIndex !== null && transitionRect && (
        <div
          className={styles.transitionImage}
          style={{
            top: `${transitionRect.top}px`,
            left: `${transitionRect.left}px`,
            width: `${transitionRect.width}px`,
            height: `${transitionRect.height}px`,
          }}
        >
          <img src={WORKS[selectedWorkIndex - 1].src} alt={WORKS[selectedWorkIndex - 1].alt} />
          {selectedWorkIndex < 3 && (
            <div className={styles.sceneInfoRectangle}>
              <div className={styles.sceneInfoLeft}>
                연습 장면
              </div>
              <div className={styles.sceneInfoRight}>
                {WORKS[selectedWorkIndex - 1].sceneInfo}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 해상도 영역 표시 */}
      {/* <div className={styles.resolutionArea}></div> */}
    </div>
  );
}
