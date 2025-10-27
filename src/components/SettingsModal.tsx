'use client';

import React from 'react';
import { DisplayBox, ImageUploadModal } from './';
import { AddButton, ResetButton, PreviewButton } from './ActionButton';
import { Slider } from './Slider';
import { ToggleButtonGroup } from './ToggleButton';
import styles from './SettingsModal.module.css';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedCharacter: string;
  opponentCharacter: string;
  sliderValue: number;
  setSliderValue: (value: number) => void;
  selectedPersonality: string;
  setSelectedPersonality: (value: string) => void;
  selectedImage: string | null;
  onImageSelect: (imageUrl: string) => void;
  onImageReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedCharacter,
  opponentCharacter,
  sliderValue,
  setSliderValue,
  selectedPersonality,
  setSelectedPersonality,
  selectedImage,
  onImageSelect,
  onImageReset
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [addThumb, setAddThumb] = React.useState<string | null>(null); // startPage 3단계와 동일
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    // startPage처럼 시스템 파일 피커 바로 열기
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleReset = () => {
    // startPage 3단계와 동일 동작
    setSliderValue(0);
    setSelectedPersonality('까칠');
    setAddThumb(null);
    onImageReset();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', '/asset/png/work1_default_img.png');
      }
    } catch {}
  };

  const handlePreview = () => {
    console.log('Preview clicked');
  };

  const handleImageSelect = (imageUrl: string) => {
    setAddThumb(imageUrl);
    onImageSelect('/asset/png/work1_girl.png');
    setIsImageModalOpen(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', '/asset/png/work1_girl.png');
      }
    } catch {}
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* 상단 헤더 */}
          <div className={styles.header}>
            <h2 className={styles.headerText}>상대역 수정</h2>
          </div>

          {/* 내용 영역 */}
          <div className={styles.content}>
            {/* 얼굴 설정 */}
            <div className={styles.faceSettings}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>얼굴 설정</h3>
                <button className={styles.resetIconBtn} onClick={handleReset} aria-label="reset">
                  <img src="/asset/svg/reset2.svg" alt="reset" width={29} height={29} />
                </button>
              </div>
              <div className={styles.faceSettingsContent}>
                <p className={styles.sectionSubtitle}>참고 이미지</p>
                <div className={styles.imageUploadArea}>
                  <div className={styles.addButtonWrap}>
                    <AddButton onClick={handleAdd} size="small" />
                    {addThumb && <img className={styles.addThumbOverlay} src={addThumb} alt="썸네일" />}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      // startPage 3단계와 동일: 업로드한 이미지는 work1_girl.png로 변환
                      const result = reader.result as string;
                      setAddThumb(result);
                      onImageSelect('/asset/png/work1_girl.png');
                      try {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('selectedImage', '/asset/png/work1_girl.png');
                        }
                      } catch {}
                    };
                    reader.readAsDataURL(file);
                  }} />
                </div>
              </div>
            </div>

            {/* 목소리 설정 */}
            <div className={styles.voiceSettings}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>목소리 설정</h3>
                <button className={styles.resetIconBtn} onClick={handleReset} aria-label="reset">
                  <img src="/asset/svg/reset2.svg" alt="reset" width={29} height={29} />
                </button>
              </div>
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
                
                <div className={styles.voiceControls}></div>
              </div>
            </div>
            
            {/* 저장 버튼 */}
            <div className={styles.saveButtonContainer}>
              <button className={styles.saveButton} onClick={onSave}>
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 업로드 모달 */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        onImageSelect={handleImageSelect}
        onReset={onImageReset}
      />
    </>
  );
};
