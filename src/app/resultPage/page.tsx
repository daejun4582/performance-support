'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { WORKS } from '../../constants/works';
import styles from './page.module.css';

interface SimilarityData {
  cueIndex: number;
  script: string;
  recognized: string;
  similarity: number;
}

// 대사 일치 부분 하이라이트 컴포넌트
const DialogueMatch = ({ script, recognized }: { script: string; recognized: string }) => {
  // 앞에서부터 가장 긴 매칭 부분 찾기 (LCS 방식)
  const findMatches = (script: string, recognized: string) => {
    const scriptChars = Array.from(script);
    const recognizedChars = Array.from(recognized);
    const matches: Array<{ text: string; isMatch: boolean }> = [];

    let scriptIdx = 0;
    let recognizedIdx = 0;
    let currentMatch = '';
    let currentMismatch = '';

    while (scriptIdx < scriptChars.length && recognizedIdx < recognizedChars.length) {
      const scriptChar = scriptChars[scriptIdx].toLowerCase();
      const recognizedChar = recognizedChars[recognizedIdx].toLowerCase();

      if (scriptChar === recognizedChar || scriptChar.trim() === '') {
        if (currentMismatch) {
          matches.push({ text: currentMismatch, isMatch: false });
          currentMismatch = '';
        }
        currentMatch += scriptChars[scriptIdx];
        scriptIdx++;
        recognizedIdx++;
      } else {
        if (currentMatch) {
          matches.push({ text: currentMatch, isMatch: true });
          currentMatch = '';
        }
        currentMismatch += scriptChars[scriptIdx];
        scriptIdx++;
      }
    }

    // 남은 부분 처리
    if (currentMatch) matches.push({ text: currentMatch, isMatch: true });
    if (currentMismatch) matches.push({ text: currentMismatch, isMatch: false });

    // script에 남은 부분 추가
    while (scriptIdx < scriptChars.length) {
      matches.push({ text: scriptChars[scriptIdx], isMatch: false });
      scriptIdx++;
    }

    return matches;
  };

  const matches = findMatches(script, recognized);

  return (
    <span>
      {matches.map((match, idx) => (
        <span
          key={idx}
          style={{
            color: match.isMatch ? '#00C851' : '#666',
            fontWeight: match.isMatch ? '600' : 'normal'
          }}
        >
          {match.text}
        </span>
      ))}
    </span>
  );
};

// useSearchParams를 사용하는 컴포넌트
function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [similarityData, setSimilarityData] = React.useState<SimilarityData[]>([]);
  const [averageSimilarity, setAverageSimilarity] = React.useState<number>(0);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = React.useState<number | null>(null);
  
  // URL 파라미터로 전달받은 정보
  const workIndex = parseInt(searchParams.get('workIndex') || '1');
  const selectedCharacter = searchParams.get('selectedCharacter') || '';
  
  // WORKS 배열에서 정보 가져오기
  const currentWork = WORKS[workIndex - 1] || WORKS[0];
  const sceneInfo = currentWork.sceneInfo;
  const workTitle = currentWork.title;

  // 초를 "X분 Y초" 형식으로 변환하는 함수
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}초`;
    } else if (remainingSeconds === 0) {
      return `${minutes}분`;
    } else {
      return `${minutes}분 ${remainingSeconds}초`;
    }
  };

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('similarityData');
      if (stored) {
        const data = JSON.parse(stored) as SimilarityData[];
        // cueIndex 기준으로 정렬 (비동기 응답 순서 보장)
        const sortedData = data.sort((a, b) => a.cueIndex - b.cueIndex);
        setSimilarityData(sortedData);

        if (data.length > 0) {
          const total = data.reduce((sum, item) => sum + item.similarity, 0);
          const avg = Math.round(total / data.length);
          setAverageSimilarity(avg);
        }
      }
    } catch (err) {
      console.error('Failed to load similarity data:', err);
    }

    // Google Drive URL 가져오기
    try {
      const storedVideoUrl = localStorage.getItem('practiceVideoUrl');
      if (storedVideoUrl) {
        setVideoUrl(storedVideoUrl);
      }
    } catch (err) {
      console.error('Failed to load video URL:', err);
    }

    // 녹화 시간 가져오기
    try {
      const storedDuration = localStorage.getItem('recordingDuration');
      if (storedDuration) {
        const durationInSeconds = parseInt(storedDuration, 10);
        if (!isNaN(durationInSeconds)) {
          setRecordingDuration(durationInSeconds);
          console.log('✅ Loaded recording duration:', durationInSeconds, 'seconds');
        }
      }
    } catch (err) {
      console.error('Failed to load recording duration:', err);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        {/* 왼쪽 컨테이너 */}
        <div className={styles.leftContainer}>
          <h2 className={styles.title}>연습 영상 조회/저장하기</h2>
          <div className={styles.qrCodeContainer}>
            <div className={styles.qrCode}>
              {videoUrl ? (
                <QRCodeSVG
                  value={videoUrl}
                  size={245}
                  level="H"
                  includeMargin={false}
                  fgColor="#8876FF"
                />
              ) : (
                <span style={{ color: '#7560FF', fontSize: '24px', fontWeight: 'bold' }}>
                  영상을 불러올 수 없습니다
                </span>
              )}
            </div>
          </div>
          {/* 연습 상세 정보 박스 - QR코드 아래로 이동 */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span className={styles.detailLabel}>연습한 장면</span>
              <div style={{width: '25px'}}></div>
              <span className={styles.detailValue}>{workTitle} {sceneInfo}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span className={styles.detailLabel}>연습한 역할</span>
              <div style={{width: '25px'}}></div>
              <span className={styles.detailValue}>{selectedCharacter}</span>
            </div>
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
            <div className={styles.infoValue}>
              {recordingDuration !== null 
                ? formatDuration(recordingDuration)
                : '--'}
            </div>
          </div>

          {/* 대사 정확도 박스 + 각 대사별 정확도 */}
          <div className={styles.dialogueList}>
            <div className={styles.infoBox2} style={{ width: '512px', height: 'auto', padding: '20px' }}>
              <div className={styles.infoHeader}>
                <div className={styles.clockIcon}></div>
                <span className={styles.infoLabel}>대사 정확도</span>
              </div>
              <div className={styles.infoValue}>{averageSimilarity}%</div>
            </div>

            <h3 className={styles.dialogueListTitle}>각 대사별 정확도</h3>
            <div className={styles.dialogueItems}>
              {similarityData.map((item, idx) => (
                <div key={idx} className={styles.dialogueItem}>
                  <div className={styles.dialogueItemHeader}>
                    <span className={styles.dialogueItemLabel}>대사 {idx + 1}</span>
                    <span className={styles.dialogueItemAccuracy}>{item.similarity}%</span>
                  </div>
                  <div className={styles.dialogueItemScript}>
                    <DialogueMatch script={item.script} recognized={item.recognized} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 연습 종료하기 버튼 */}
          <button
            className={styles.endButton}
            onClick={() => {
              // localStorage의 similarityData 초기화
              try {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('similarityData');
                }
              } catch (err) {
                console.error('Failed to clear similarity data:', err);
              }
              // logoPage로 이동
              window.location.href = '/logoPage';
            }}
          >
            연습 종료하기
          </button>
        </div>
      </div>
    </div>
  );
}

// Suspense로 감싼 메인 컴포넌트
export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.mainCard}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            로딩 중...
          </div>
        </div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
