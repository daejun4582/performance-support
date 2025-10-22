'use client';

import React from 'react';
import styles from './ToggleIconButton.module.css';

export interface ToggleIconButtonProps {
  isSelected: boolean;
  onClick: () => void;
  type: 'play' | 'settings' | 'cc' | 'eye';
  className?: string;
}

export const ToggleIconButton: React.FC<ToggleIconButtonProps> = ({
  isSelected,
  onClick,
  type,
  className = ''
}) => {
  const buttonClasses = [
    styles['toggle-button'],
    isSelected ? styles['toggle-button--selected'] : styles['toggle-button--unselected'],
    className
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    switch (type) {
      case 'play':
        return isSelected ? (
          <div className={styles['play-icon']}></div>
        ) : (
          <div className={styles['pause-icon']}></div>
        );
      case 'settings':
        return <div className={styles['settings-icon']}></div>;
      case 'cc':
        return <div className={styles['cc-text']}>CC</div>;
      case 'eye':
        return <div className={styles['eye-icon']}></div>;
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClasses}
    >
      {renderIcon()}
    </button>
  );
};
