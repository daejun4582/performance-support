'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DisplayBox, ImageUploadModal } from '../../components';
import { AddButton, ResetButton, PreviewButton, ApplyButton } from '../../components/ActionButton';
import { Slider } from '../../components/Slider';
import { ToggleButtonGroup, SelectionPreview } from '../../components/ToggleButton';
import { PracticeStartButton } from '../../components/PrimaryButton';
import { WORKS } from '../../constants/works';
import styles from './settingComp.module.css';

interface SettingCompProps {
  selectedCharacter: string;
  opponentCharacter: string;
  selectedWorkIndex: number | null;
  onNext?: (personality: string, slider: number, hasCustomImage: boolean) => void; // 4단계(카메라 설정)로 이동 등 외부 전환용
}

export default function SettingComp({ selectedCharacter, opponentCharacter, selectedWorkIndex, onNext }: SettingCompProps) {
  const router = useRouter();
  const [sliderValue, setSliderValue] = React.useState(0); // 디폴트 0
  const [selectedPersonality, setSelectedPersonality] = React.useState<string | null>(null); // 초기값: 선택되지 않음
  
  // Debug: Props 확인
  React.useEffect(() => {
    console.log('🎭 SettingComp props:', { selectedCharacter, opponentCharacter, selectedWorkIndex });
  }, [selectedCharacter, opponentCharacter, selectedWorkIndex]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null); // 초기값: null (사용자가 선택한 이미지)
  const [hasSelectedCustomImage, setHasSelectedCustomImage] = React.useState(false); // 사용자가 커스텀 이미지를 선택했는지 추적
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [addThumb, setAddThumb] = React.useState<string | null>(null); // feature_img 썸네일

  // 기본 이미지 경로 생성 (default 이미지)
  const getDefaultImagePath = (): string => {
    if (!selectedWorkIndex || selectedWorkIndex < 1 || selectedWorkIndex > 2) {
      return '/asset/png/work1_default_girl.png'; // fallback
    }
    const work = WORKS[selectedWorkIndex - 1];
    const isOpponentMale = work.characters.male === opponentCharacter;
    const genderSuffix = isOpponentMale ? 'man' : 'girl';
    return `/asset/png/work${selectedWorkIndex}_default_${genderSuffix}.png`;
  };

  // 변경된 이미지 경로 생성 (man/girl 이미지)
  const getChangedImagePath = (): string => {
    if (!selectedWorkIndex || selectedWorkIndex < 1 || selectedWorkIndex > 2) {
      return '/asset/png/work1_girl.png'; // fallback
    }
    const work = WORKS[selectedWorkIndex - 1];
    const isOpponentMale = work.characters.male === opponentCharacter;
    const genderSuffix = isOpponentMale ? 'man' : 'girl';
    return `/asset/png/work${selectedWorkIndex}_${genderSuffix}.png`;
  };

  const isImageSettingComplete = !isLoading; // 이미지 선택 여부와 관계없이 로딩만 확인
  const isVoiceSettingComplete = true; // 디폴트 제공으로 항상 OK
  const isAllSettingsComplete = true; // 디폴트 값으로 바로 진행 가능

  // selectedWorkIndex나 opponentCharacter가 변경되면 이미지 상태 초기화
  React.useEffect(() => {
    // 처음 진입 시 항상 초기 상태로 시작 (썸네일 없음, default 이미지만)
    setSelectedImage(null);
    setHasSelectedCustomImage(false);
    setAddThumb(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedWorkIndex, opponentCharacter]);

  // 얼굴 설정만 초기화
  const handleResetFace = () => {
    setSelectedImage(null); // 이미지 선택 해제
    setHasSelectedCustomImage(false);
    setAddThumb(null);
    setIsLoading(false);
    // file input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedImage');
        localStorage.removeItem('uploadedImageData'); // feature_img 데이터도 제거
      }
    } catch {}
  };

  // 목소리 설정만 초기화
  const handleResetVoice = () => {
    setSliderValue(0);
    setSelectedPersonality(null); // 초기화 시 선택 해제
  };

  // 목소리 설정 토글 핸들러 (이미 선택된 버튼 재클릭 시 초기화)
  const handlePersonalityToggle = (option: string) => {
    if (selectedPersonality === option) {
      // 이미 선택된 버튼을 다시 클릭 → 초기화와 동일하게 null 설정
      setSelectedPersonality(null);
    } else {
      // 다른 버튼 클릭 또는 선택 안 된 상태에서 클릭 → 해당 값 설정
      setSelectedPersonality(option);
    }
  };

  const handleAdd = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // feature_img 썸네일로 사용
      setAddThumb(result);
      setIsLoading(true);
      // 변경된 이미지는 man/girl 이미지 사용
      const changedImagePath = getChangedImagePath();
      setSelectedImage(changedImagePath);
      setHasSelectedCustomImage(true);
      setTimeout(() => setIsLoading(false), 3000);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedImage', changedImagePath);
          localStorage.setItem('uploadedImageData', result); // feature_img 데이터 저장
        }
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (imageUrl: string) => {
    // feature_img 썸네일로 사용
    setAddThumb(imageUrl);
    setIsLoading(true);
    // 변경된 이미지는 man/girl 이미지 사용
    const changedImagePath = getChangedImagePath();
    setSelectedImage(changedImagePath);
    setHasSelectedCustomImage(true);
    setTimeout(() => { setIsLoading(false); }, 3000);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedImage', changedImagePath);
        localStorage.setItem('uploadedImageData', imageUrl); // feature_img 데이터 저장
      }
    } catch {}
  };

  const handleCloseModal = () => { setIsModalOpen(false); };
  const handlePreview = () => { console.log('Preview clicked'); };
  const handleApply = () => { console.log('Apply clicked'); };

  const handleStartPractice = () => {
    // personality가 선택되지 않았으면 기본값 'basic'로 설정 (변경됨: 까칠 → basic)
    const finalPersonality = selectedPersonality || 'basic';
    
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
      onNext(finalPersonality, sliderValue, hasSelectedCustomImage); // hasSelectedCustomImage 추가
      return;
    }
    const params = new URLSearchParams({
      selectedCharacter,
      opponentCharacter,
      selectedPersonality: finalPersonality,
      sliderValue: sliderValue.toString(),
      workIndex: selectedWorkIndex?.toString() || '1', // 작품 인덱스 전달
      hasCustomImage: hasSelectedCustomImage.toString() // 얼굴 설정 여부 전달
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
          <img src={selectedImage || getDefaultImagePath()} alt="참고 이미지" className={styles.referenceImage} />
        )}
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.faceBox}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>얼굴 설정</h3>
            <button className={styles.resetIconBtn} onClick={handleResetFace} aria-label="reset"><img src="/asset/svg/reset2.svg" alt="reset" /></button>
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
            <button className={styles.resetIconBtn} onClick={handleResetVoice} aria-label="reset"><img src="/asset/svg/reset2.svg" alt="reset" /></button>
          </div>
          <div className={styles.voiceSettingsContent}>
            <p className={styles.sectionSubtitle}>피치</p>
            <div className={styles.sliderContainer}><Slider value={sliderValue} onChange={setSliderValue} min={-2} max={2} step={1} marks={[-2, 0, 2]} /></div>
            <p className={styles.sectionSubtitle}>말투 프롬프트</p>
            <div className={styles.toneButtons}><ToggleButtonGroup options={['까칠', '다정']} selectedOption={selectedPersonality || undefined} onSelect={handlePersonalityToggle} /></div>
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

      <ImageUploadModal isOpen={isModalOpen} onClose={handleCloseModal} onImageSelect={handleImageSelect} onReset={handleResetFace} />
    </div>
  );
}
