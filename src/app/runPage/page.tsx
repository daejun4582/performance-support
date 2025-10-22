'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PracticeStartButton, PrimaryButton } from '../../components/PrimaryButton';
import { ToggleIconButton } from '../../components/ToggleIconButton';
import { TutorialButton, TutorialActionButton } from '../../components/TutorialButton';
import { SettingsModal } from '../../components/SettingsModal';
import styles from './page.module.css';

export default function RunPage() {
  const [currentStep, setCurrentStep] = React.useState(0); // 0: 카메라 확인, 1: 튜토리얼, 2: 연기
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // 토글 버튼 상태들
  const [isPlaySelected, setIsPlaySelected] = React.useState(false);
  const [isCCSelected, setIsCCSelected] = React.useState(false);
  const [isEyeSelected, setIsEyeSelected] = React.useState(false);
  const [isAdlibMode, setIsAdlibMode] = React.useState(false);
  
  // 설정 모달 상태
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isImageHidden, setIsImageHidden] = React.useState(false);
  
  // 설정값들 (startPage에서 전달받은 값들)
  const [sliderValue, setSliderValue] = React.useState(0);
  const [selectedPersonality, setSelectedPersonality] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  
  // searchParams를 안전하게 처리
  let selectedCharacter = '';
  let opponentCharacter = '';
  let initialPersonality = '';
  let initialSliderValue = 0;

  try {
    const searchParams = useSearchParams();
    selectedCharacter = searchParams.get('selectedCharacter') || '';
    opponentCharacter = searchParams.get('opponentCharacter') || '';
    initialPersonality = searchParams.get('selectedPersonality') || '';
    initialSliderValue = parseInt(searchParams.get('sliderValue') || '0');
  } catch (error) {
    console.error('Error getting search params:', error);
  }

  // URL 파라미터로 초기화
  React.useEffect(() => {
    setSelectedPersonality(initialPersonality);
    setSliderValue(initialSliderValue);
  }, [initialPersonality, initialSliderValue]);

  // 카메라 초기화
  React.useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1026 },
            height: { ideal: 657 },
            facingMode: 'user' // 전면 카메라
          },
          audio: false
        });
        
        setCameraStream(stream);
        setCameraError(null);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('카메라 접근 오류:', error);
        setCameraError('카메라에 접근할 수 없습니다. 카메라 권한을 허용해주세요.');
      }
    };

    if (currentStep === 0) {
      initCamera();
    }

    // 컴포넌트 언마운트 시 카메라 정리
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentStep]);

  // 디버깅 로그
  React.useEffect(() => {
    console.log('RunPage loaded with settings:', {
      selectedCharacter,
      opponentCharacter,
      selectedPersonality,
      sliderValue
    });
  }, [selectedCharacter, opponentCharacter, selectedPersonality, sliderValue]);

  const handleReady = () => {
    setCurrentStep(1); // 튜토리얼 페이지로 이동
  };

  const handleAction = () => {
    setCurrentStep(2); // 연기 페이지로 이동
  };

  // 설정 버튼 핸들러
  const handleSettingsClick = () => {
    const newModalState = !isSettingsModalOpen;
    setIsSettingsModalOpen(newModalState);
    
    // 설정 모달이 열릴 때: 일시정지 상태면 재생으로 변경
    if (newModalState && !isPlaySelected) {
      setIsPlaySelected(true);
    }
    // 설정 모달이 닫힐 때: 재생 중이면 일시정지로 변경
    else if (!newModalState && isPlaySelected) {
      setIsPlaySelected(false);
    }
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
    
    // 저장 후 모달이 닫히므로 재생 중이면 일시정지로 변경
    if (isPlaySelected) {
      setIsPlaySelected(false);
    }
  };

  // 이미지 리셋 핸들러
  const handleImageReset = () => {
    setSelectedImage(null);
  };

  return (
    <div className={styles.container}>
      {currentStep === 0 && (
        <div className={styles.cameraStep}>
          <h1 className={styles.instructionText}>
            카메라 프레임을 확인한 후, 얼굴이 안내선 안에 들어오도록 맞춰주세요!
          </h1>
          
          <div className={styles.cameraPreview}>
            {/* 카메라 비디오 */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.cameraVideo}
            />
            
            {/* 얼굴 가이드라인 오버레이 */}
            <div className={styles.faceGuide}>
              <img 
                src="/asset/svg/face_form.svg" 
                alt="얼굴 가이드라인" 
                className={styles.faceGuideSvg}
              />
            </div>
            
            {/* 카메라 에러 메시지 */}
            {cameraError && (
              <div className={styles.cameraError}>
                <p>{cameraError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className={styles.retryButton}
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>

          <div className={styles.readyButtonContainer}>
            <PrimaryButton 
              onClick={handleReady}
              variant="secondary"
            >
              Ready
            </PrimaryButton>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className={styles.tutorialStep}>
          {/* 왼쪽 위: 연습 씬 정보 */}
          <div className={styles.sceneInfo}>
            S#40. 양복점/재봉실 (낮)
            <div className={styles.sceneDescription}>
              현재 연습 씬을 의미합니다.
            </div>
          </div>

          {/* 오른쪽 위: 재생/일시정지 버튼 */}
          <div style={{ position: 'absolute', top: '60px', right: '60px' }}>
            <TutorialButton
              type="play"
              isSelected={isPlaySelected}
              onClick={() => setIsPlaySelected(!isPlaySelected)}
            />
          </div>

          {/* 중앙: 안내 텍스트와 액션 버튼 */}
          <h1 className={styles.tutorialText}>
            연습 화면의 각 기능을 안내해드릴게요.<br />
            준비됐다면 아래 버튼을 눌러 연습을 시작하세요!
          </h1>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateX(-50%)', marginTop: '70px' }}>
            <TutorialActionButton onClick={handleAction} />
          </div>

          {/* 왼쪽 아래: CC 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', left: '60px' }}>
            <TutorialButton
              type="cc"
              isSelected={isCCSelected}
              onClick={() => setIsCCSelected(!isCCSelected)}
            />
          </div>

          {/* 왼쪽 아래: 애드립 모드 토글 */}
          <div style={{ position: 'absolute', bottom: '60px', left: '172px' }}>
            <TutorialButton
              type="adlib"
              isSelected={isAdlibMode}
              onClick={() => {}} // 비활성화
            />
          </div>

          {/* 오른쪽 아래: 눈 아이콘 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', right: '172px' }}>
            <TutorialButton
              type="eye"
              isSelected={isEyeSelected}
              onClick={() => setIsEyeSelected(!isEyeSelected)}
            />
          </div>

          {/* 오른쪽 아래: 설정 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', right: '60px' }}>
            <TutorialButton
              type="settings"
              isSelected={false}
              onClick={() => {}}
            />
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
              현재 연습 씬을 의미합니다.
            </div>
          </div>

          {/* 오른쪽 위: 재생/일시정지 버튼 */}
          <div style={{ position: 'absolute', top: '60px', right: '60px' }}>
            <ToggleIconButton
              type="play"
              isSelected={isPlaySelected}
              onClick={() => setIsPlaySelected(!isPlaySelected)}
            />
          </div>

          {/* 중앙: 연기 안내 텍스트 제거됨 */}

          {/* 왼쪽 아래: CC 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', left: '60px' }}>
            <ToggleIconButton
              type="cc"
              isSelected={isCCSelected}
              onClick={() => setIsCCSelected(!isCCSelected)}
            />
          </div>

          {/* 왼쪽 아래: 애드립 모드 토글 */}
          <div style={{ position: 'absolute', bottom: '60px', left: '172px' }}>
            <TutorialButton
              type="adlib"
              isSelected={isAdlibMode}
              onClick={() => setIsAdlibMode(!isAdlibMode)}
            />
          </div>

          {/* 오른쪽 아래: 눈 아이콘 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', right: '172px' }}>
            <ToggleIconButton
              type="eye"
              isSelected={isEyeSelected}
              onClick={handleEyeClick}
            />
          </div>

          {/* 오른쪽 아래: 설정 버튼 */}
          <div style={{ position: 'absolute', bottom: '60px', right: '60px' }}>
            <ToggleIconButton
              type="settings"
              isSelected={isSettingsModalOpen}
              onClick={handleSettingsClick}
            />
          </div>
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
