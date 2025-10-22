'use client';

import React from 'react';
import styles from './TutorialButton.module.css';

export interface TutorialButtonProps {
  type: 'cc' | 'eye' | 'settings' | 'play' | 'adlib';
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({
  type,
  isSelected = false,
  onClick,
  className = ''
}) => {
  const buttonClasses = [
    styles['tutorial-button'],
    styles[`tutorial-button--${type}`],
    isSelected ? styles['tutorial-button--selected'] : '',
    className
  ].filter(Boolean).join(' ');

  const renderContent = () => {
    switch (type) {
      case 'cc':
        return <span className={styles['cc-text']}>CC</span>;
      case 'eye':
        return <div className={styles['eye-icon']}></div>;
      case 'settings':
        return <div className={styles['settings-icon']}></div>;
      case 'play':
        return <div className={styles['play-icon']}></div>;
      case 'adlib':
        return (
          <>
            <div className={styles['adlib-toggle']}></div>
            <span className={styles['adlib-text']}>
              {isSelected ? '대본\n모드' : '애드립\n모드'}
            </span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={type === 'adlib' ? onClick : undefined}
      className={buttonClasses}
      disabled={type !== 'adlib'}
    >
      {renderContent()}
    </button>
  );
};

export interface TutorialActionButtonProps {
  onClick: () => void;
  className?: string;
}

export const TutorialActionButton: React.FC<TutorialActionButtonProps> = ({
  onClick,
  className = ''
}) => {
  const buttonClasses = [
    styles['tutorial-action-button'],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClasses}
    >
      액션!
    </button>
  );
};
