'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DisplayBox, ImageUploadModal } from '../../components';
import { AddButton, ResetButton, PreviewButton, ApplyButton } from '../../components/ActionButton';
import { Slider } from '../../components/Slider';
import { ToggleButtonGroup, SelectionPreview } from '../../components/ToggleButton';
import { PracticeStartButton } from '../../components/PrimaryButton';
import styles from './settingComp.module.css';

interface SettingCompProps {
  selectedCharacter: string;
  opponentCharacter: string;
}

export default function SettingComp({ selectedCharacter, opponentCharacter }: SettingCompProps) {
  const router = useRouter();
  const [sliderValue, setSliderValue] = React.useState(0);
  const [selectedPersonality, setSelectedPersonality] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // 설정 완료 상태 확인
  const isImageSettingComplete = selectedImage !== null && !isLoading;
  const isVoiceSettingComplete = selectedPersonality !== '';
  const isAllSettingsComplete = isImageSettingComplete && isVoiceSettingComplete;

  const handleReset = () => {
    setSliderValue(0);
    setSelectedPersonality('');
    setSelectedImage(null); // 이미지도 초기화
  };

  const handleAdd = () => {
    setIsModalOpen(true);
  };

  const handleImageSelect = (imageUrl: string) => {
    setIsLoading(true);
    setSelectedImage(imageUrl);
    
    // 5초 후 로딩 완료
    setTimeout(() => {
      setIsLoading(false);
    }, 5000);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePreview = () => {
    console.log('Preview clicked');
  };

  const handleApply = () => {
    console.log('Apply clicked');
  };

  const handleStartPractice = () => {
    console.log('Start practice clicked');
    console.log('Settings:', {
      selectedCharacter,
      opponentCharacter,
      selectedPersonality,
      sliderValue
    });
    
    // runPage로 이동하면서 설정값들 전달 (이미지 제외)
    const params = new URLSearchParams({
      selectedCharacter: selectedCharacter,
      opponentCharacter: opponentCharacter,
      selectedPersonality: selectedPersonality,
      sliderValue: sliderValue.toString()
    });
    
    const url = `/runPage?${params.toString()}`;
    console.log('Navigating to:', url);
    
    // router.push 사용
    router.push(url);
  };

  return (
    <div className={styles.container}>
      {/* 1번 사각형 - 캐릭터 선택 영역 */}
      <div className={styles.characterSection}>
        <div className={styles.characterContent}>
          <DisplayBox 
            showNaButton={true}
          >
            {selectedCharacter}
          </DisplayBox>
          <DisplayBox 
            characterName={opponentCharacter}
            role=""
            isSelected={false}
            variant="purple"
          />
        </div>
      </div>

      {/* 2번 사각형 - 중앙 영역 */}
      <div className={styles.centerSection}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            {/* 말풍선 */}
            <div className={styles.speechBubble}>
              <span className={styles.speechText}>캐릭터 생성 중</span>
            </div>
            
            {/* 로딩 이미지와 그림자 */}
            <div className={styles.loadingImageContainer}>
              <img 
                src="/asset/png/loading.png" 
                alt="로딩 중" 
                className={styles.loadingImage}
              />
              <div className={styles.loadingShadow}></div>
            </div>
          </div>
        ) : selectedImage ? (
          <img 
            src={selectedImage} 
            alt="참고 이미지" 
            className={styles.referenceImage}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span className={styles.placeholderText}>이미지를 선택해주세요</span>
          </div>
        )}
      </div>

      {/* 3번 사각형 - 설정 및 시작 버튼 영역 */}
      <div className={styles.settingsSection}>
        {/* 설정 패널 */}
        <div className={styles.settingsPanel}>
          {/* 얼굴 설정 */}
                <div className={styles.faceSettings}>
                  <h3 className={styles.sectionTitle}>
                    얼굴 설정
                  </h3>
                  <div className={styles.faceSettingsContent}>
                  <p className={styles.sectionSubtitle}>참고 이미지</p>
                  <div className={styles.imageUploadArea}>
                    <AddButton onClick={handleAdd} size="small" />
                    <ResetButton onClick={handleReset} size="reset-small" />
                  </div>
                  </div>
                </div>

          {/* 목소리 설정 */}
          <div className={styles.voiceSettings}>
            <h3 className={styles.sectionTitle}>
              목소리 설정
            </h3>
            <div className={styles.voiceSettingsContent}>
            <p className={styles.sectionSubtitle}>피치</p>
            <div className={styles.sliderContainer}>
              <Slider
                value={sliderValue}
                onChange={setSliderValue}
                min={-2}
                max={2}
                step={1}
                marks={[-2, 0, 2]}
              />
            </div>
            
            <p className={styles.sectionSubtitle}>말투 프롬프트</p>
            <div className={styles.toneButtons}>
              <ToggleButtonGroup
                options={['까칠', '다정']}
                selectedOption={selectedPersonality}
                onSelect={setSelectedPersonality}
              />
            </div>
            
            <div className={`${styles.voiceControls} ${styles['form-actions']}`}>
              <div className={styles['form-button-group']}>
                <PreviewButton onClick={handlePreview} />
                <ResetButton onClick={handleReset} size="reset-small" />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* 연습 시작 버튼 */}
        <PracticeStartButton 
          onClick={handleStartPractice} 
          disabled={!isAllSettingsComplete}
        />
      </div>

      {/* 이미지 업로드 모달 */}
      <ImageUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onImageSelect={handleImageSelect}
        onReset={handleReset}
      />
    </div>
  );
}
