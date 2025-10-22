'use client';

import React from 'react';
import styles from './DisplayBox.module.css';

interface DisplayBoxProps {
  children?: React.ReactNode;
  variant?: 'default' | 'purple';
  showNaButton?: boolean;
  className?: string;
  characterName?: string;
  role?: string;
  isSelected?: boolean;
}

export const DisplayBox: React.FC<DisplayBoxProps> = ({
  children,
  variant = 'default',
  showNaButton = false,
  className = '',
  characterName,
  role,
  isSelected = false
}) => {
  const boxClasses = [
    styles['input-field'],
    variant === 'purple' ? styles['input-field--purple'] : '',
    showNaButton ? styles['input-field--with-button'] : '',
    className
  ].filter(Boolean).join(' ');

  // 캐릭터 정보가 있는 경우 캐릭터 카드 렌더링
  if (characterName) {
    return (
      <div className={`${styles.characterCard} ${isSelected ? styles.selected : ''} ${!role ? styles.opponent : ''}`}>
        <div className={styles.characterInfo}>
          <span className={styles.characterName}>{characterName}</span>
          {role && <span className={styles.characterRole}>{role}</span>}
        </div>
      </div>
    );
  }

  // 기본 DisplayBox 렌더링
  return (
    <div className={styles['input-field-container']}>
      <div className={boxClasses}>
        {children}
      </div>
      {showNaButton && (
        <button
          type="button"
          className={styles['na-button']}
        >
          나
        </button>
      )}
    </div>
  );
};
