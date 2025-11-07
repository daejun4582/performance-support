/**
 * Text similarity utilities for turn engine
 */

/**
 * Calculate weighted Levenshtein distance between two strings
 * Common mistakes in Korean have lower penalty
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const charA = a[i - 1];
      const charB = b[j - 1];
      
      if (charA === charB) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        // 유사한 문자의 경우 낮은 penalty
        const weight = getSubstitutionWeight(charA, charB);
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + weight // substitution with weight
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Get substitution weight for common Korean mistakes
 */
function getSubstitutionWeight(charA: string, charB: string): number {
  // 자주 틀리는 한글 쌍들 (가중치 낮게)
  const verySimilarPairs: { [key: string]: string[] } = {
    '소': ['어', '요'],
    '어': ['소', '요'],
    '요': ['소', '어'],
    '헌': ['근'],
    '근': ['헌'],
    '거': ['것'],
    '것': ['거'],
    '는': ['은'],
    '은': ['는'],
    '데': ['대'],
    '대': ['데'],
    '이': ['가'],
    '가': ['이'],
    '을': ['를'],
    '를': ['을'],
    '와': ['과'],
    '과': ['와'],
    '에': ['애'],
    '애': ['에'],
    '예': ['얘'],
    '얘': ['예'],
    '할': ['할'],
    '하오': ['하오'],
  };
  
  // charA가 charB와 매우 유사한지 확인
  if (verySimilarPairs[charA]?.includes(charB)) {
    return 0.3; // 낮은 penalty
  }
  
  return 1; // 일반 penalty
}

/**
 * Calculate normalized similarity between two strings
 * Returns a value between 0 and 1, where 1 is identical
 */
export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Remove parentheses content and special characters from text
 * 개선: 공백은 정규화하되 완전 제거하지 않음
 */
function normalizeForComparison(text: string): string {
  // 괄호와 그 내용 제거
  let normalized = text.replace(/\([^)]*\)/g, '');
  // 특수문자 제거 (한글, 영문, 숫자, 공백만 남김)
  normalized = normalized.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
  // 연속 공백을 하나로 정규화 (완전 제거 대신)
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized.trim();
}

/**
 * Calculate front-biased similarity for Korean text
 * Compares only the first 70% of both texts to be more forgiving and fair
 * 개선: 비대칭 비교 문제 해결 - userText도 70%만 사용
 */
export function calculateFrontBiasedSimilarity(userText: string, cueText: string): number {
  if (!userText || !cueText) return 0;
  
  // 괄호와 특수문자 제거
  const normalizedUserText = normalizeForComparison(userText);
  const normalizedCueText = normalizeForComparison(cueText);
  
  // For Korean text, use 70% of both texts for fair comparison
  const cueCompareLength = Math.ceil(normalizedCueText.length * 0.7);
  const userCompareLength = Math.ceil(normalizedUserText.length * 0.7);
  
  const truncatedCue = normalizedCueText.substring(0, cueCompareLength);
  const truncatedUser = normalizedUserText.substring(0, userCompareLength);
  
  return calculateSimilarity(truncatedUser, truncatedCue);
}

/**
 * Check if similarity meets the main threshold for Korean text
 */
export function meetsMainThreshold(similarity: number): boolean {
  return similarity >= 0.78; // Korean threshold: 0.78-0.80
}

/**
 * Check if similarity meets the variation threshold
 */
export function meetsVariationThreshold(similarity: number): boolean {
  return similarity >= 0.60;
}

/**
 * Calculate match segments using LCS (Longest Common Subsequence) based algorithm
 * Returns array of segments with match information for highlighting
 * 개선: LCS 기반으로 최적 매칭 계산하여 하이라이트에 사용
 */
export interface MatchSegment {
  text: string;
  isMatch: boolean;
}

export function calculateMatchSegments(script: string, recognized: string): MatchSegment[] {
  if (!script || !recognized) {
    return script ? [{ text: script, isMatch: false }] : [];
  }

  const scriptChars = Array.from(script);
  const recognizedChars = Array.from(recognized);
  const segments: MatchSegment[] = [];

  // LCS를 위한 동적 프로그래밍 테이블
  const lcsLength = Array(recognizedChars.length + 1)
    .fill(null)
    .map(() => Array(scriptChars.length + 1).fill(0));

  // LCS 길이 계산
  for (let j = 1; j <= recognizedChars.length; j++) {
    for (let i = 1; i <= scriptChars.length; i++) {
      const scriptChar = scriptChars[i - 1].toLowerCase();
      const recognizedChar = recognizedChars[j - 1].toLowerCase();
      
      // 공백 처리: 둘 다 공백이면 일치로 처리
      const isSpaceMatch = scriptChar.trim() === '' && recognizedChar.trim() === '';
      const isCharMatch = scriptChar === recognizedChar || isSpaceMatch;

      if (isCharMatch) {
        lcsLength[j][i] = lcsLength[j - 1][i - 1] + 1;
      } else {
        lcsLength[j][i] = Math.max(lcsLength[j - 1][i], lcsLength[j][i - 1]);
      }
    }
  }

  // LCS 경로 역추적하여 매칭 구간 찾기
  let i = scriptChars.length;
  let j = recognizedChars.length;
  let currentMatch = '';
  let currentMismatch = '';

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const scriptChar = scriptChars[i - 1].toLowerCase();
      const recognizedChar = recognizedChars[j - 1].toLowerCase();
      const isSpaceMatch = scriptChar.trim() === '' && recognizedChar.trim() === '';
      const isCharMatch = scriptChar === recognizedChar || isSpaceMatch;

      if (isCharMatch && lcsLength[j][i] === lcsLength[j - 1][i - 1] + 1) {
        // 일치하는 경우
        if (currentMismatch) {
          segments.unshift({ text: currentMismatch, isMatch: false });
          currentMismatch = '';
        }
        currentMatch = scriptChars[i - 1] + currentMatch;
        i--;
        j--;
      } else if (lcsLength[j][i] === lcsLength[j][i - 1]) {
        // script에서 삭제된 경우 (불일치)
        if (currentMatch) {
          segments.unshift({ text: currentMatch, isMatch: true });
          currentMatch = '';
        }
        currentMismatch = scriptChars[i - 1] + currentMismatch;
        i--;
      } else {
        // recognized에서 추가된 경우 (무시, script 기준으로만 표시)
        j--;
      }
    } else if (i > 0) {
      // script에 남은 부분
      if (currentMatch) {
        segments.unshift({ text: currentMatch, isMatch: true });
        currentMatch = '';
      }
      currentMismatch = scriptChars[i - 1] + currentMismatch;
      i--;
    } else {
      // recognized에 남은 부분 (무시)
      j--;
    }
  }

  // 남은 부분 처리
  if (currentMatch) {
    segments.unshift({ text: currentMatch, isMatch: true });
  }
  if (currentMismatch) {
    segments.unshift({ text: currentMismatch, isMatch: false });
  }

  return segments;
}
