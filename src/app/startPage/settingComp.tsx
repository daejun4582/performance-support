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
  selectedWorkIndex: number | null;
  onNext?: (personality: string, slider: number) => void; // 4단계(카메라 설정)로 이동 등 외부 전환용, personality와 slider 값 전달
}

export default function SettingComp({ selectedCharacter, opponentCharacter, selectedWorkIndex, onNext }: SettingCompProps) {
  const router = useRouter();
  const [sliderValue, setSliderValue] = React.useState(0); // 디폴트 0
  const [selectedPersonality, setSelectedPersonality] = React.useState<string | null>(null); // 초기값: 선택되지 않음
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null); // 초기값: null (사용자가 선택한 이미지)
  const [hasSelectedCustomImage, setHasSelectedCustomImage] = React.useState(false); // 사용자가 커스텀 이미지를 선택했는지 추적
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [addThumb, setAddThumb] = React.useState<string | null>(null);

  const isImageSettingComplete = !isLoading; // 이미지 선택 여부와 관계없이 로딩만 확인
  const isVoiceSettingComplete = true; // 디폴트 제공으로 항상 OK
  const isAllSettingsComplete = true; // 디폴트 값으로 바로 진행 가능

  // 디폴트 값은 useState 초기값으로 설정함

  const handleReset = () => {
    setSliderValue(0);
    setSelectedPersonality(null); // 초기화 시 선택 해제
    setSelectedImage(null); // 이미지 선택 해제
    setHasSelectedCustomImage(false);
    setAddThumb(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedImage');
      }
    } catch {}
  };

  const handleAdd = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAddThumb(result);
      setIsLoading(true);
      setSelectedImage('/asset/png/work1_girl.png');
      setHasSelectedCustomImage(true);
      setTimeout(() => setIsLoading(false), 3000);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedImage', '/asset/png/work1_girl.png');
        }
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (imageUrl: string) => {
    setAddThumb(imageUrl);
    setIsLoading(true);
    setSelectedImage('/asset/png/work1_girl.png');
    setHasSelectedCustomImage(true);
    setTimeout(() => { setIsLoading(false); }, 3000);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', '/asset/png/work1_girl.png');
      }
    } catch {}
  };

  const handleCloseModal = () => { setIsModalOpen(false); };
  const handlePreview = () => { console.log('Preview clicked'); };
  const handleApply = () => { console.log('Apply clicked'); };

  const handleStartPractice = () => {
    // personality가 선택되지 않았으면 기본값 '까칠'로 설정
    const finalPersonality = selectedPersonality || '까칠';
    
    // 사용자가 커스텀 이미지를 선택하지 않았으면 localStorage에서 제거
    if (!hasSelectedCustomImage) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedImage');
        }
      } catch {}
    }
    
    // 외부에서 단계 전환을 처리하도록 콜백이 제공되면 사용
    if (onNext) {
      onNext(finalPersonality, sliderValue);
      return;
    }
    const params = new URLSearchParams({
      selectedCharacter,
      opponentCharacter,
      selectedPersonality: finalPersonality,
      sliderValue: sliderValue.toString(),
      workIndex: selectedWorkIndex?.toString() || '1' // 작품 인덱스 전달
    });
    router.push(`/runPage?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />

      <div className={styles.characterSection}>
        <div className={styles.characterContent}>
          <DisplayBox showNaButton={true}>{selectedCharacter}</DisplayBox>
          <DisplayBox characterName={opponentCharacter} role="" isSelected={false} variant="purple" />
          <div className={styles.supportingChips}>
            <div className={styles.chipWrapper}>
              <div className={styles.chip}><span className={styles.chipText}>조연 A</span></div>
              <div className={styles.chipOverlay}></div>
            </div>
            <div className={styles.chipWrapper}>
              <div className={styles.chip}><span className={styles.chipText}>조연 B</span></div>
              <div className={styles.chipOverlay}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.centerSection}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.speechBubble}><span className={styles.speechText}>캐릭터 생성 중</span></div>
            <div className={styles.loadingImageContainer}>
              <img src="/asset/png/loading.png" alt="로딩 중" className={styles.loadingImage} />
              <div className={styles.loadingShadow}></div>
            </div>
          </div>
        ) : (
          <img src={selectedImage || '/asset/png/work1_default_img.png'} alt="참고 이미지" className={styles.referenceImage} />
        )}
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.faceBox}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>얼굴 설정</h3>
            <button className={styles.resetIconBtn} onClick={handleReset} aria-label="reset"><img src="/asset/svg/reset2.svg" alt="reset" /></button>
          </div>
          <div className={styles.faceSettingsContent}>
            <p className={styles.sectionSubtitle}>참고 이미지</p>
            <div className={styles.imageUploadArea}>
              <div className={styles.addButtonWrap}>
                <AddButton onClick={handleAdd} size="small" />
                {addThumb && <img className={styles.addThumbOverlay} src={addThumb} alt="선택 이미지" />}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.voiceBox}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>목소리 설정</h3>
            <button className={styles.resetIconBtn} onClick={handleReset} aria-label="reset"><img src="/asset/svg/reset2.svg" alt="reset" /></button>
          </div>
          <div className={styles.voiceSettingsContent}>
            <p className={styles.sectionSubtitle}>피치</p>
            <div className={styles.sliderContainer}><Slider value={sliderValue} onChange={setSliderValue} min={-2} max={2} step={1} marks={[-2, 0, 2]} /></div>
            <p className={styles.sectionSubtitle}>말투 프롬프트</p>
            <div className={styles.toneButtons}><ToggleButtonGroup options={['까칠', '다정']} selectedOption={selectedPersonality || undefined} onSelect={setSelectedPersonality} /></div>
            <div className={`${styles.voiceControls} ${styles['form-actions']}`}>
              <div className={styles['form-button-group']}>
                <PreviewButton onClick={handlePreview} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <PracticeStartButton onClick={handleStartPractice} disabled={!isAllSettingsComplete} />
        </div>
      </div>

      <ImageUploadModal isOpen={isModalOpen} onClose={handleCloseModal} onImageSelect={handleImageSelect} onReset={handleReset} />
    </div>
  );
}
