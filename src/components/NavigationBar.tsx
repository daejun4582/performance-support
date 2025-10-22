'use client';

import React from 'react';
import styles from './NavigationBar.module.css';

interface NavigationBarProps {
  steps: string[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  disabledSteps?: number[]; // 비활성화할 단계들
}

export function NavigationBar({ steps, currentStep, onStepChange, disabledSteps = [] }: NavigationBarProps) {
  const handleStepClick = (stepIndex: number) => {
    // 비활성화된 단계는 클릭 무시
    if (disabledSteps.includes(stepIndex)) {
      return;
    }
    onStepChange?.(stepIndex);
  };

  const clampedStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const segmentWidth = 100 / steps.length;

  return (
    <div className={styles.navigationBar}>
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isDisabled = disabledSteps.includes(index);
          const isActive = index === clampedStep;
          const isInactive = !isActive && !isDisabled;
          
          return (
            <div
              key={index}
              className={`${styles.step} ${
                isActive ? styles.active : 
                isDisabled ? styles.disabled : 
                styles.inactive
              }`}
              onClick={() => handleStepClick(index)}
              tabIndex={isDisabled ? -1 : 0}
              role="button"
              aria-pressed={isActive}
              aria-disabled={isDisabled}
            >
              <span className={`${styles.stepText} t-24-bold`}>{step}</span>
            </div>
          );
        })}
      </div>

      {/* 전체 이어진 진행 바 */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBackground} />
        <div
          className={styles.progressSlider}
          style={{
            transform: `translateX(${clampedStep * 100}%)`,
            width: `${segmentWidth}%`,
            left: '0',
          }}
        />
      </div>
    </div>
  );
}
