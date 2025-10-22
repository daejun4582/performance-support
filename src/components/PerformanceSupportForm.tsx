'use client';

import React from 'react';
import { DisplayBox } from './DisplayBox';
import { AddButton, ResetButton, PreviewButton, ApplyButton } from './ActionButton';
import { Slider } from './Slider';
import { ToggleButtonGroup, SelectionPreview } from './ToggleButton';
import { PracticeStartButton } from './PrimaryButton';
import styles from './PerformanceSupportForm.module.css';

export const PerformanceSupportForm: React.FC = () => {
  const [input1, setInput1] = React.useState('');
  const [input2, setInput2] = React.useState('');
  const [sliderValue, setSliderValue] = React.useState(0);
  const [selectedPersonality, setSelectedPersonality] = React.useState<string>('');

  const handleReset = () => {
    setInput1('');
    setInput2('');
    setSliderValue(0);
    setSelectedPersonality('');
  };

  const handleAdd = () => {
    console.log('Add clicked');
  };

  const handlePreview = () => {
    console.log('Preview clicked');
  };

  const handleApply = () => {
    console.log('Apply clicked');
  };

  const handleStartPractice = () => {
    console.log('Start practice clicked');
  };

  return (
    <div className={styles['form-container']}>
      {/* 상단 입력 필드와 버튼들 */}
      <div className={styles['form-section']}>
        <div className={`${styles['form-row']} ${styles['form-row--inputs']}`}>
          <div className={styles['form-input-group']}>
            <DisplayBox showNaButton={true}>
              첫 번째 입력
            </DisplayBox>
          </div>
          <div className={styles['form-button-group']}>
            <AddButton onClick={handleAdd} />
            <ResetButton onClick={handleReset} />
          </div>
        </div>
        
        <DisplayBox variant="purple">
          두 번째 입력
        </DisplayBox>
      </div>

      {/* 슬라이더 섹션 */}
      <div className={styles['form-section']}>
        <Slider
          value={sliderValue}
          onChange={setSliderValue}
          min={-2}
          max={2}
          step={1}
          marks={[-2, 0, 2]}
        />
      </div>

      {/* 토글 버튼과 선택 미리보기 */}
      <div className={styles['form-section']}>
        <div className={styles['form-toggle-section']}>
          <div className={styles['form-toggle-group']}>
            <ToggleButtonGroup
              options={['까칠', '다정', '유쾌', '차분']}
              selectedOption={selectedPersonality}
              onSelect={setSelectedPersonality}
            />
          </div>
          <div className={styles['form-preview']}>
            <SelectionPreview selectedOption={selectedPersonality} />
          </div>
        </div>
      </div>

      {/* 하단 액션 버튼들 */}
      <div className={styles['form-section']}>
        <div className={styles['form-actions']}>
          <ResetButton onClick={handleReset} />
          <PreviewButton onClick={handlePreview} />
          <ApplyButton onClick={handleApply} />
        </div>
      </div>

      {/* 주요 버튼들 */}
      <div className={styles['form-primary-buttons']}>
        <PracticeStartButton onClick={handleStartPractice} />
        <PracticeStartButton onClick={handleStartPractice} disabled={true} />
      </div>
    </div>
  );
};
