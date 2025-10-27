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
  const similarPairs: { [key: string]: string[] } = {
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
    '할': ['할'],
    '하오': ['하오'],
  };
  
  // charA가 charB와 유사한지 확인
  if (similarPairs[charA]?.includes(charB)) {
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
 */
function normalizeForComparison(text: string): string {
  // 괄호와 그 내용 제거
  let normalized = text.replace(/\([^)]*\)/g, '');
  // 특수문자 제거 (한글, 영문, 숫자, 공백만 남김)
  normalized = normalized.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
  // 모든 공백 제거 (띄어쓰기 차이 무시)
  normalized = normalized.replace(/\s+/g, '');
  return normalized.trim();
}

/**
 * Calculate front-biased similarity for Korean text
 * Compares only the first 60-70% of the cue text to be more forgiving
 */
export function calculateFrontBiasedSimilarity(userText: string, cueText: string): number {
  if (!userText || !cueText) return 0;
  
  // 괄호와 특수문자 제거
  const normalizedUserText = normalizeForComparison(userText);
  const normalizedCueText = normalizeForComparison(cueText);
  
  // For Korean text, use 70% of cue length for comparison
  const compareLength = Math.ceil(normalizedCueText.length * 0.7);
  const truncatedCue = normalizedCueText.substring(0, compareLength);
  
  return calculateSimilarity(normalizedUserText, truncatedCue);
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
