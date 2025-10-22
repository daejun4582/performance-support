'use client';

import React from 'react';
import styles from './page.module.css';

export default function ResultPage() {
  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        {/* 왼쪽 컨테이너 */}
        <div className={styles.leftContainer}>
          <h2 className={styles.title}>연습 영상 조회/저장하기</h2>
          <div className={styles.qrCodeContainer}>
            <div className={styles.qrCode}></div>
          </div>
        </div>

        {/* 오른쪽 컨테이너 */}
        <div className={styles.rightContainer}>
          {/* 총 연습한 시간 박스 */}
          <div className={styles.infoBox}>
            <div className={styles.infoHeader}>
              <div className={styles.clockIcon}></div>
              <span className={styles.infoLabel}>총 연습한 시간</span>
            </div>
            <div className={styles.infoValue}>1분 22초</div>
          </div>

          {/* 대사 정확도 박스 */}
          <div className={styles.infoBox}>
            <div className={styles.infoHeader}>
              <div className={styles.clockIcon}></div>
              <span className={styles.infoLabel}>대사 정확도</span>
            </div>
            <div className={styles.infoValue}>90%</div>
          </div>

          {/* 연습 상세 정보 박스 */}
          <div className={styles.detailBox}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>연습한 장면</span>
              <span className={styles.detailValue}>도깨비 3화 S#23</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>연습한 역할</span>
              <span className={styles.detailValue}>김신</span>
            </div>
          </div>

          {/* 연습 종료하기 버튼 */}
          <button className={styles.endButton}>
            연습 종료하기
          </button>
        </div>
      </div>
    </div>
  );
}
