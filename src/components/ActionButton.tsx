'use client';

import React from 'react';
import styles from './ActionButton.module.css';

interface ActionButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'add' | 'reset' | 'preview' | 'apply';
  size?: 'small' | 'medium' | 'large' | 'reset-small';
  disabled?: boolean;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  variant = 'add',
  size = 'medium',
  disabled = false,
  className = ''
}) => {
  const buttonClasses = [
    styles['action-button'],
    styles[`action-button--${size}`],
    styles[`action-button--${variant}`],
    disabled ? styles['action-button--disabled'] : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
    </button>
  );
};

// Add Button 컴포넌트
export const AddButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton {...props} variant="add" size="small">
    <img 
      src="/asset/svg/add.svg" 
      alt="추가" 
      className={styles['add-icon']}
    />
  </ActionButton>
);

// Reset Button 컴포넌트
export const ResetButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton {...props} variant="reset" size={props.size || "small"}>
    <div className={styles['reset-button-content']}>
      <img 
        src="/asset/svg/reset.svg" 
        alt="초기화" 
        className={styles['reset-icon']}
      />
      <span className={styles['reset-text']}>초기화</span>
    </div>
  </ActionButton>
);

// Preview Button 컴포넌트
export const PreviewButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton {...props} variant="preview" size="medium">
    <div className={styles['preview-button-content']}>
      <img 
        src="/asset/svg/speaker.svg" 
        alt="미리듣기" 
        className={styles['preview-icon']}
      />
      <span style={{ paddingTop: '4px' }}>미리듣기</span>
    </div>
  </ActionButton>
);

// Apply Button 컴포넌트
export const ApplyButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton {...props} variant="apply" size="medium">
    적용하기
  </ActionButton>
);
