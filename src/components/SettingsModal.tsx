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
  onSave: (settings: { sliderValue: number; selectedPersonality: string; selectedImage: string }) => void;
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
  
  // 로컬 상태로 모달 내부에서 관리 (비동기 업데이트 문제 해결)
  const [localSliderValue, setLocalSliderValue] = React.useState(sliderValue);
  const [localSelectedPersonality, setLocalSelectedPersonality] = React.useState(selectedPersonality);
  const [localSelectedImage, setLocalSelectedImage] = React.useState(selectedImage);

  // 모달이 열릴 때 props 값을 로컬 상태로 동기화
  React.useEffect(() => {
    if (isOpen) {
      setLocalSliderValue(sliderValue);
      setLocalSelectedPersonality(selectedPersonality);
      setLocalSelectedImage(selectedImage);
      console.log('🔄 SettingsModal opened, syncing local state:', {
        sliderValue,
        selectedPersonality,
        selectedImage
      });
    }
  }, [isOpen, sliderValue, selectedPersonality, selectedImage]);

  // 모달이 열릴 때 현재 선택된 이미지가 커스텀 이미지인지 확인하고 썸네일 표시
  React.useEffect(() => {
    if (isOpen && localSelectedImage) {
      if (localSelectedImage.includes('work1_girl.png')) {
        // 커스텀 이미지가 선택되어 있으면 localStorage에서 실제 업로드한 이미지 데이터 로드
        try {
          if (typeof window !== 'undefined') {
            const uploadedImageData = localStorage.getItem('uploadedImageData');
            if (uploadedImageData) {
              setAddThumb(uploadedImageData); // 실제 업로드한 이미지 dataURL 표시
              console.log('📸 Custom image detected, showing uploaded thumbnail');
            } else {
              setAddThumb(null);
            }
          }
        } catch {
          setAddThumb(null);
        }
      } else {
        setAddThumb(null);
      }
    }
  }, [isOpen, localSelectedImage]);

  if (!isOpen) return null;

  const handleAdd = () => {
    // startPage처럼 시스템 파일 피커 바로 열기
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // 얼굴 설정 초기화
  const handleFaceReset = () => {
    setAddThumb(null);
    const def = '/asset/png/work1_default_img.png';
    setLocalSelectedImage(def); // 로컬 상태 업데이트
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', def);
        localStorage.removeItem('uploadedImageData'); // 업로드한 이미지 데이터도 삭제
      }
    } catch {}
    console.log('🔄 Face settings reset, local state:', { localSelectedImage: def });
  };

  // 목소리 설정 초기화
  const handleVoiceReset = () => {
    setLocalSliderValue(0); // 로컬 상태 업데이트
    setLocalSelectedPersonality(''); // 로컬 상태 업데이트 (아무것도 선택 안 된 상태, basic)
    console.log('🔄 Voice settings reset, local state:', { 
      localSliderValue: 0, 
      localSelectedPersonality: '' 
    });
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
                <button className={styles.resetIconBtn} onClick={handleFaceReset} aria-label="reset face">
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
                      // 업로드한 이미지의 dataURL
                      const result = reader.result as string;
                      const imagePath = '/asset/png/work1_girl.png';
                      setAddThumb(result); // 썸네일에 실제 업로드한 이미지 표시
                      setLocalSelectedImage(imagePath); // 로컬 상태 업데이트
                      try {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('selectedImage', imagePath);
                          localStorage.setItem('uploadedImageData', result); // 실제 업로드한 이미지 데이터 저장
                          console.log('💾 Saved uploaded image data to localStorage');
                        }
                      } catch {}
                    };
                    reader.readAsDataURL(file);
                    
                    // 같은 파일을 다시 선택할 수 있도록 input value 초기화
                    if (e.target) {
                      e.target.value = '';
                    }
                  }} />
                </div>
              </div>
            </div>

            {/* 목소리 설정 */}
            <div className={styles.voiceSettings}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>목소리 설정</h3>
                <button className={styles.resetIconBtn} onClick={handleVoiceReset} aria-label="reset voice">
                  <img src="/asset/svg/reset2.svg" alt="reset" width={29} height={29} />
                </button>
              </div>
              <div className={styles.voiceSettingsContent}>
                <p className={styles.sectionSubtitle}>피치</p>
                <div className={styles.sliderContainer}>
                  <Slider
                    value={localSliderValue}
                    onChange={setLocalSliderValue}
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
                    selectedOption={localSelectedPersonality}
                    onSelect={setLocalSelectedPersonality}
                  />
                </div>
                
                <div className={styles.voiceControls}></div>
              </div>
            </div>
            
            {/* 저장 버튼 */}
            <div className={styles.saveButtonContainer}>
              <button className={styles.saveButton} onClick={() => {
                // 로컬 상태의 현재 값을 onSave에 전달 (확실한 상태 동기화)
                const settingsToSave = {
                  sliderValue: localSliderValue,
                  selectedPersonality: localSelectedPersonality,
                  selectedImage: localSelectedImage || '/asset/png/work1_default_img.png'
                };
                console.log('💾 Saving settings from local state:', settingsToSave);
                onSave(settingsToSave);
              }}>
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
