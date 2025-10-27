'use client';

import React from 'react';
import styles from './PrimaryButton.module.css';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = ''
}) => {
  const buttonClasses = [
    styles['primary-button'],
    styles[`primary-button--${variant}`],
    disabled ? styles['primary-button--disabled'] : '',
    className
  ].filter(Boolean).join(' ');

  const nextIconSrc = '/asset/svg/next_sign.svg';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
      <img src={nextIconSrc} alt="next" className={styles['next-icon']} />
    </button>
  );
};

// 연습 시작하기 버튼 컴포넌트
interface PracticeStartButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const PracticeStartButton: React.FC<PracticeStartButtonProps> = ({
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <PrimaryButton
      onClick={onClick}
      variant="primary"
      disabled={disabled}
      className={className}
    >
      다음으로
    </PrimaryButton>
  );
};
