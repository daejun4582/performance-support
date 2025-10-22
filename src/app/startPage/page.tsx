'use client';

import React from 'react';
import { NavigationBar } from '../../components';
import SettingComp from './settingComp';
import styles from './page.module.css';

export default function StartPage() {
  const [currentStep, setCurrentStep] = React.useState(0); // 작품 선택 단계로 시작
  const [selectedDrama, setSelectedDrama] = React.useState<'left' | 'right' | null>(null);
  const [selectedCharacter, setSelectedCharacter] = React.useState<string | null>(null);
  const [showAnimation, setShowAnimation] = React.useState(false);
  const [cardAnimation, setCardAnimation] = React.useState<'slideIn' | 'slideOut' | null>(null);
  const [showSettingAnimation, setShowSettingAnimation] = React.useState(false);
  const navigationSteps = ['작품 선택', '캐릭터 선택', '상대역 설정'];
  
  // 현재 단계보다 앞의 단계들은 비활성화
  const disabledSteps = Array.from({ length: currentStep + 1 }, (_, i) => i).filter(step => step > currentStep);

  const handleDramaCardClick = (drama: 'left' | 'right') => {
    if (currentStep === 0) {
      // 작품 선택 단계에서 드라마 카드 클릭
      setSelectedDrama(drama);
      setCurrentStep(1); // 캐릭터 선택 단계로 이동
      setShowAnimation(true);
    } else if (currentStep === 1) {
      // 캐릭터 선택 단계에서 드라마 카드 클릭 - 이전 단계로 돌아가기
      setCardAnimation('slideOut');
      
      // 애니메이션 완료 후 상태 변경
      setTimeout(() => {
        setCurrentStep(0);
        setSelectedDrama(null);
        setShowAnimation(false);
        setCardAnimation(null);
      }, 500);
    }
  };

  const handleCharacterCardClick = (characterName: string) => {
    setSelectedCharacter(characterName);
    setShowSettingAnimation(true);
    setCurrentStep(2); // 상대역 설정 단계로 이동
  };

  const handleStepChange = (step: number) => {
    // 앞의 단계로는 이동 불가능 (화면 인터랙션을 통해서만 진행 가능)
    if (step > currentStep) {
      return; // 앞의 단계로 이동 시도 시 무시
    }
    
    if (step < currentStep) {
      // 이전 단계로 돌아가는 경우만 허용
      setCardAnimation('slideOut');
      
      setTimeout(() => {
        setCurrentStep(step);
        // 2단계로 돌아갈 때는 selectedDrama를 유지
        if (step === 1) {
          // selectedDrama는 그대로 유지
        } else if (step === 0) {
          setSelectedDrama(null);
        }
        setShowAnimation(false);
        setCardAnimation(null);
      }, 500);
    }
  };

  // 애니메이션 완료 후 상태 초기화
  React.useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 500); // 애니메이션 지속 시간과 동일
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);


  // 카드 애니메이션 완료 후 상태 초기화
  React.useEffect(() => {
    if (cardAnimation) {
      const timer = setTimeout(() => {
        setCardAnimation(null);
      }, 500); // 애니메이션 지속 시간과 동일
      return () => clearTimeout(timer);
    }
  }, [cardAnimation]);

  // 설정 애니메이션 완료 후 상태 초기화
  React.useEffect(() => {
    if (showSettingAnimation) {
      const timer = setTimeout(() => {
        setShowSettingAnimation(false);
      }, 800); // 애니메이션 지속 시간
      return () => clearTimeout(timer);
    }
  }, [showSettingAnimation]);

  return (
    <div className={`${styles.container} ${currentStep === 2 ? styles['container--settingBg'] : ''}`}>
      {/* 왼쪽 위 네비게이션 */}
      <div className={styles.navigationSection}>
        <div className={`${styles.title} t-24-bold`}>연습하기</div>
        <NavigationBar 
          steps={navigationSteps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          disabledSteps={disabledSteps}
        />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className={`${styles.mainContent} ${currentStep === 2 ? styles['mainContent--noTopPadding'] : ''}`}>
        {/* 작품 선택 단계 - 두 개의 드라마 카드 */}
        {currentStep === 0 && (
          <>
            {/* 왼쪽 드라마 카드 */}
            <div className={`${styles.card} ${styles.dramaCard}`} onClick={() => handleDramaCardClick('left')}>
              <div className={styles.cardContent}>
                <div className={styles.titleSection}>
                  <h2 className={styles.mainTitle}>미스터 션샤인</h2>
                  <div className={`${styles.circle} ${styles.circleLeft}`}></div>
                </div>
                <div className={styles.subtitle}>연습 장면 3화 S#40. 양복점/재봉실 (낮)</div>
                <div className={styles.description}>
                  신미양요(1871년) 때 군함에 승선해 미국에 떨어진 한 소년이 미국 군인 신분으로 자신을 버린 조국인 조선으로 돌아와 주둔하며 벌어지는 일을 그린 드라마
                </div>
              </div>
            </div>

            {/* 오른쪽 드라마 카드 */}
            <div className={`${styles.card} ${styles.dramaCardRight}`} onClick={() => handleDramaCardClick('right')}>
              <div className={styles.cardContent}>
                <div className={styles.titleSection}>
                  <h2 className={styles.mainTitle}>태양의 후예</h2>
                  <div className={`${styles.circle} ${styles.circleRight}`}></div>
                </div>
                <div className={styles.subtitle}>연습 장면 3화 #36-1. 난파선 안 (낮)</div>
                <div className={styles.description}>
                  낯선 땅 극한의 환경 속에서 사랑과 성공을 꿈꾸는 젊은 군인과 의사들을 통해 삶의 가치를 담아낼 블록버스터급 휴먼 멜로 드라마.
                </div>
              </div>
            </div>
          </>
        )}

        {/* 캐릭터 선택 단계 - 선택된 드라마의 캐릭터 카드들 */}
        {currentStep === 1 && selectedDrama && (
          <>
            {/* 왼쪽 드라마 카드 선택 시 */}
            {selectedDrama === 'left' && (
              <>
                {/* 선택된 드라마 정보 카드 */}
                <div className={`${styles.card} ${styles.dramaCard} ${styles.clickable}`} onClick={() => handleDramaCardClick('left')}>
                  <div className={styles.cardContent}>
                    <div className={styles.titleSection}>
                      <h2 className={styles.mainTitle}>미스터 션샤인</h2>
                      <div className={`${styles.circle} ${styles.circleLeft}`}></div>
                    </div>
                    <div className={styles.subtitle}>연습 장면 3화 S#40. 양복점/재봉실 (낮)</div>
                    <div className={styles.description}>
                      신미양요(1871년) 때 군함에 승선해 미국에 떨어진 한 소년이 미국 군인 신분으로 자신을 버린 조국인 조선으로 돌아와 주둔하며 벌어지는 일을 그린 드라마
                    </div>
                  </div>
                </div>

                {/* 캐릭터 카드들 - 오른쪽에 배치 */}
                <div className={`${styles.rightCardsContainer} ${showAnimation ? styles.slideIn : ''} ${cardAnimation === 'slideOut' ? styles.slideOut : ''}`}>
                  {/* 여자 주인공 카드 */}
                  <div className={`${styles.characterCard} ${styles.characterCardLeft}`} onClick={() => handleCharacterCardClick('강모연')}>
                    <div className={styles.characterContent}>
                      <div className={styles.characterLabel}>여자 주인공</div>
                      <div className={styles.characterName}>강모연</div>
                    </div>
                  </div>

                  {/* 남자 주인공 카드 */}
                  <div className={`${styles.characterCard} ${styles.characterCardLeft}`} onClick={() => handleCharacterCardClick('유시진')}>
                    <div className={styles.characterContent}>
                      <div className={styles.characterLabel}>남자 주인공</div>
                      <div className={styles.characterName}>유시진</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 오른쪽 드라마 카드 선택 시 */}
            {selectedDrama === 'right' && (
              <>
                {/* 캐릭터 카드들 - 왼쪽에 배치 */}
                <div className={`${styles.leftCardsContainer} ${showAnimation ? styles.slideIn : ''} ${cardAnimation === 'slideOut' ? styles.slideOut : ''}`}>
                  {/* 여자 주인공 카드 */}
                  <div className={`${styles.characterCard} ${styles.characterCardRight}`} onClick={() => handleCharacterCardClick('강모연')}>
                    <div className={styles.characterContent}>
                      <div className={styles.characterLabel}>여자 주인공</div>
                      <div className={styles.characterName}>강모연</div>
                    </div>
                  </div>

                  {/* 남자 주인공 카드 */}
                  <div className={`${styles.characterCard} ${styles.characterCardRight}`} onClick={() => handleCharacterCardClick('유시진')}>
                    <div className={styles.characterContent}>
                      <div className={styles.characterLabel}>남자 주인공</div>
                      <div className={styles.characterName}>유시진</div>
                    </div>
                  </div>
                </div>

                {/* 선택된 드라마 정보 카드 - 오른쪽에 그대로 유지 */}
                <div className={`${styles.card} ${styles.dramaCardRight} ${styles.clickable}`} onClick={() => handleDramaCardClick('right')}>
                  <div className={styles.cardContent}>
                    <div className={styles.titleSection}>
                      <h2 className={styles.mainTitle}>태양의 후예</h2>
                      <div className={`${styles.circle} ${styles.circleRight}`}></div>
                    </div>
                    <div className={styles.subtitle}>연습 장면 3화 #36-1. 난파선 안 (낮)</div>
                    <div className={styles.description}>
                      낯선 땅 극한의 환경 속에서 사랑과 성공을 꿈꾸는 젊은 군인과 의사들을 통해 삶의 가치를 담아낼 블록버스터급 휴먼 멜로 드라마.
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* 상대역 설정 단계 */}
        {currentStep === 2 && selectedCharacter && (
          <div className={`${showSettingAnimation ? styles.settingSlideIn : ''}`}>
            <SettingComp 
              selectedCharacter={selectedCharacter}
              opponentCharacter={selectedCharacter === '강모연' ? '유시진' : '강모연'}
            />
          </div>
        )}
      </div>

      {/* 해상도 영역 표시 */}
      {/* <div className={styles.resolutionArea}></div> */}
    </div>
  );
}
