'use client';

import React from 'react';
import { 
  DisplayBox, 
  AddButton, 
  ResetButton, 
  PreviewButton, 
  ApplyButton,
  Slider,
  ToggleButtonGroup,
  SelectionPreview,
  PracticeStartButton,
  PerformanceSupportForm,
  NavigationBar
} from '../../components';
import styles from './page.module.css';

export default function ComponentsDemo() {
  const [inputValue, setInputValue] = React.useState('');
  const [sliderValue, setSliderValue] = React.useState(0);
  const [selectedPersonality, setSelectedPersonality] = React.useState<string>('다정');
  const [currentStep, setCurrentStep] = React.useState(1);

  const navigationSteps = ['작품 선택', '캐릭터 선택', '상대역 설정'];

  return (
    <div className={styles['demo-page']}>
      <div className={styles['demo-container']}>
        <h1 className={styles['demo-title']}>
          Performance Support Components Demo
        </h1>
        
        {/* 전체 폼 컴포넌트 */}
        <section className={styles['demo-section']}>
          <h2 className={styles['demo-section-title']}>Complete Form</h2>
          <PerformanceSupportForm />
        </section>

        {/* Navigation Bar */}
        <section className={styles['demo-section']}>
          <h2 className={styles['demo-section-title']}>Navigation Bar</h2>
          <NavigationBar 
            steps={navigationSteps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        </section>

        {/* 개별 컴포넌트 데모 */}
        <section className={styles['demo-section']}>
          <h2 className={styles['demo-section-title']}>Individual Components</h2>
          
          <div className={styles['demo-grid']}>
            {/* 입력 필드 데모 */}
            <div className={styles['demo-card']}>
              <h3 className={styles['demo-card-title']}>Display Boxes</h3>
              <div className={`${styles['demo-card-content']} ${styles['demo-card-content--horizontal']}`}>
                <DisplayBox>
                  기본 박스
                </DisplayBox>
                <DisplayBox showNaButton={true}>
                  나 버튼이 있는 박스
                </DisplayBox>
                <DisplayBox variant="purple">
                  보라색 변형 박스
                </DisplayBox>
              </div>
            </div>

            {/* 액션 버튼 데모 */}
            <div className={styles['demo-card']}>
              <h3 className={styles['demo-card-title']}>Action Buttons</h3>
              <div className={styles['demo-card-content']}>
                <div className={`${styles['demo-card-row']} ${styles['demo-card-row--buttons']}`}>
                  <AddButton onClick={() => console.log('Add clicked')} />
                  <ResetButton onClick={() => console.log('Reset clicked')} />
                </div>
                <div className={`${styles['demo-card-row']} ${styles['demo-card-row--buttons']}`}>
                  <PreviewButton onClick={() => console.log('Preview clicked')} />
                  <ApplyButton onClick={() => console.log('Apply clicked')} />
                </div>
              </div>
            </div>

            {/* 슬라이더 데모 */}
            <div className={styles['demo-card']}>
              <h3 className={styles['demo-card-title']}>Slider</h3>
              <div className={styles['demo-card-content']}>
                <Slider
                  value={sliderValue}
                  onChange={setSliderValue}
                  min={-2}
                  max={2}
                  step={2}
                  marks={[-2, 0, 2]}
                />
                <p className={styles['demo-card-info']}>현재 값: {sliderValue}</p>
              </div>
            </div>

            {/* 토글 버튼 데모 */}
            <div className={styles['demo-card']}>
              <h3 className={styles['demo-card-title']}>Toggle Buttons</h3>
              <div className={styles['demo-card-content']}>
                <ToggleButtonGroup
                  options={['까칠', '다정', '유쾌', '차분']}
                  selectedOption={selectedPersonality}
                  onSelect={setSelectedPersonality}
                />
                <SelectionPreview selectedOption={selectedPersonality} />
              </div>
            </div>

            {/* 주요 버튼 데모 */}
            <div className={`${styles['demo-card']} ${styles['demo-card-wide']}`}>
              <h3 className={styles['demo-card-title']}>Primary Buttons</h3>
              <div className={`${styles['demo-card-content']} ${styles['demo-card-wide-content']}`}>
                <PracticeStartButton onClick={() => console.log('Start practice')} />
                <PracticeStartButton onClick={() => console.log('Start practice')} disabled={true} />
              </div>
            </div>

            {/* 로딩 애니메이션 데모 */}
            <div className={`${styles['demo-card']} ${styles['demo-card-wide']}`}>
              <h3 className={styles['demo-card-title']}>Loading Animation</h3>
              <div className={styles['loading-demo-container']}>
                <div className={styles['loading-demo']}>
                  {/* 말풍선 */}
                  <div className={styles['loading-speech-bubble']}>
                    <span className={styles['loading-speech-text']}>캐릭터 생성 중</span>
                  </div>
                  
                  {/* 로딩 이미지와 그림자 */}
                  <div className={styles['loading-image-container']}>
                    <img 
                      src="/asset/png/loading.png" 
                      alt="로딩 중" 
                      className={styles['loading-image']}
                    />
                    <div className={styles['loading-shadow']}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 사용법 가이드 */}
        <section className={styles['demo-guide']}>
          <h2 className={styles['demo-guide-title']}>Usage Guide</h2>
          <div className={styles['demo-guide-grid']}>
            <div>
              <h3 className={styles['demo-guide-section-title']}>Available Components</h3>
              <ul className={styles['demo-guide-list']}>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>DisplayBox</span> - 다양한 스타일의 표시 박스
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>AddButton</span> - 추가 버튼 (+ 아이콘)
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>ResetButton</span> - 초기화 버튼
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>PreviewButton</span> - 미리듣기 버튼
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>ApplyButton</span> - 적용하기 버튼
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>Slider</span> - 커스텀 슬라이더
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>ToggleButtonGroup</span> - 토글 버튼 그룹
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>PracticeStartButton</span> - 연습 시작 버튼
                </li>
                <li className={styles['demo-guide-item']}>
                  • <span className={styles['demo-guide-code']}>PerformanceSupportForm</span> - 전체 폼 컴포넌트
                </li>
              </ul>
            </div>
            <div>
              <h3 className={styles['demo-guide-section-title']}>Features</h3>
              <ul className={styles['demo-guide-list']}>
                <li className={styles['demo-guide-item']}>• 반응형 디자인</li>
                <li className={styles['demo-guide-item']}>• 접근성 지원</li>
                <li className={styles['demo-guide-item']}>• TypeScript 지원</li>
                <li className={styles['demo-guide-item']}>• 커스터마이징 가능한 스타일</li>
                <li className={styles['demo-guide-item']}>• 호버 및 포커스 효과</li>
                <li className={styles['demo-guide-item']}>• 상태 관리 지원</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
