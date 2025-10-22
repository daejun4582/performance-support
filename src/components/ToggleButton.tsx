'use client';

import React from 'react';
import styles from './ToggleButton.module.css';

interface ToggleButtonProps {
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  isSelected = false,
  onClick,
  className = ''
}) => {
  const buttonClasses = [
    styles['toggle-button'],
    isSelected ? styles['toggle-button--selected'] : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClasses}
    >
      {label}
    </button>
  );
};

interface ToggleButtonGroupProps {
  options: string[];
  selectedOption?: string;
  onSelect?: (option: string) => void;
  className?: string;
}

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  options = ['까칠', '다정', '유쾌', '차분'],
  selectedOption,
  onSelect,
  className = ''
}) => {
  return (
    <div className={`${styles['toggle-button-group']} ${className}`}>
      {options.map((option) => (
        <ToggleButton
          key={option}
          label={option}
          isSelected={selectedOption === option}
          onClick={() => onSelect?.(option)}
        />
      ))}
    </div>
  );
};

// 선택 미리보기 컴포넌트
interface SelectionPreviewProps {
  selectedOption?: string;
  className?: string;
}

export const SelectionPreview: React.FC<SelectionPreviewProps> = ({
  selectedOption,
  className = ''
}) => {
  return (
    <div className={`${styles['selection-preview']} ${className}`}>
      <span className={styles['selection-preview-text']}>→ (선택시)</span>
      <div className={`${styles['toggle-button']} ${styles['toggle-button--selected']}`}>
        {selectedOption || ''}
      </div>
    </div>
  );
};
