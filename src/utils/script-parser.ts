/**
 * Script parser utility to convert text scripts to Cue format
 */

import { Cue, Script } from '../lib/turn-engine';

/**
 * Parse a script text into Cue array
 * Expected format: "Character : Dialogue"
 */
export function parseScript(scriptText: string): Script {
  const lines = scriptText.split('\n').filter(line => line.trim());
  const cues: Cue[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Look for pattern "Character : Dialogue"
    // First, find the colon position
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      console.log('⚠️ Line did not contain colon:', trimmedLine);
      continue;
    }

    const character = trimmedLine.substring(0, colonIndex).trim();
    const dialogue = trimmedLine.substring(colonIndex + 1).trim();

    if (character && dialogue) {
      // 괄호와 특수문자만 있는 대사인지 체크
      // 전체 대사에서 괄호를 제거한 뒤 실제 텍스트가 있는지 확인
      const textWithoutParentheses = dialogue.replace(/\([^)]*\)/g, '').trim();
      // 괄호를 제거한 후에도 특수문자만 남거나 비어있으면 스킵
      const hasRealText = /[가-힣a-zA-Z0-9]/.test(textWithoutParentheses) && textWithoutParentheses.length > 0;
      const isSpecialOnly = !hasRealText;
      
      console.log(`📝 Parsed cue: role="${character}", text="${dialogue}", isSpecialOnly=${isSpecialOnly}`);
      
      cues.push({
        role: character,
        text: dialogue,
        audioUrl: undefined, // No audio files provided in the scripts
        skipRecording: isSpecialOnly // 녹음 스킵 플래그
      });
    }
  }

  return cues;
}

/**
 * Get available scripts
 */
export function getAvailableScripts(): { id: string; name: string; path: string }[] {
  return [
    { id: 'script1', name: 'Script 1 - 고애신 & 유진', path: '/src/scripts/script1.txt' },
    { id: 'script2', name: 'Script 2 - 강모연 & 유시진', path: '/src/scripts/script2.txt' }
  ];
}
