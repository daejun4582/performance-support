'use client';

import React from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: number[];
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value = 0,
  onChange,
  min = -2,
  max = 2,
  step = 1,
  marks = [-2, 0, 2],
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newValue = min + (percentage / 100) * (max - min);
    
    // marks 배열에 있는 값 중에서 가장 가까운 값 찾기
    let closestValue = marks[0];
    let minDistance = Math.abs(newValue - marks[0]);
    
    for (let i = 1; i < marks.length; i++) {
      const distance = Math.abs(newValue - marks[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestValue = marks[i];
      }
    }
    
    onChange?.(closestValue);
  };

  const getPercentage = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  return (
    <div 
      className={`${styles['slider-container']} ${className}`}
      onClick={handleClick}
    >
      {/* 활성 트랙 */}
      <div
        className={styles['slider-track']}
        style={{ width: `${getPercentage(value)}%` }}
      />
      
      {/* 마커들 */}
      {marks.map((mark, index) => {
        let markerClass = styles['slider-marker'];
        
        // 위치에 따른 클래스 분기
        if (index === 0) {
          markerClass += ` ${styles['slider-marker--left']}`;
        } else if (index === marks.length - 1) {
          markerClass += ` ${styles['slider-marker--right']}`;
        } else {
          markerClass += ` ${styles['slider-marker--center']}`;
        }
        
        return (
          <div
            key={mark}
            className={markerClass}
            style={{ left: `${getPercentage(mark)}%` }}
          >
            <span className={styles['slider-marker-label']}>
              {mark}
            </span>
          </div>
        );
      })}
      
      {/* 현재 값 표시 */}
      <div
        className={styles['slider-thumb']}
        style={{ left: `${getPercentage(value)}%` }}
      />
      
      {/* 우측 보라색 점 */}
      <div className={styles['slider-dot']} />
    </div>
  );
};
