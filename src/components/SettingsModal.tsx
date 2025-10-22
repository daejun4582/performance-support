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

  if (!isOpen) return null;

  const handleAdd = () => {
    setIsImageModalOpen(true);
  };

  const handleReset = () => {
    setSliderValue(0);
    setSelectedPersonality('');
    onImageReset();
  };

  const handlePreview = () => {
    console.log('Preview clicked');
  };

  const handleImageSelect = (imageUrl: string) => {
    onImageSelect(imageUrl);
    setIsImageModalOpen(false);
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
              <h3 className={styles.sectionTitle}>얼굴 설정</h3>
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
              <h3 className={styles.sectionTitle}>목소리 설정</h3>
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
                
                <div className={styles.voiceControls}>
                  <div className={styles.voiceButtonGroup}>
                    <PreviewButton onClick={handlePreview} />
                    <ResetButton onClick={handleReset} size="reset-small" />
                  </div>
                </div>
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
