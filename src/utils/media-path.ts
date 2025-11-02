/**
 * 비디오/오디오 경로 생성 유틸리티
 */

interface MediaPathConfig {
  workIndex: number;          // 1 or 2
  opponentGender: 'male' | 'female'; // 상대역 성별
  hasCustomImage: boolean;    // 얼굴 설정 여부 (true: featured, false: basic)
  personality: string;        // 'basic', '까칠', '다정'
  dialogueNumber: number;     // 상대역의 몇 번째 대사인지 (1, 2, 3...)
  speed?: number;             // 슬라이더 값 (-2, -1, 0, 1, 2)
}

/**
 * personality를 폴더명으로 변환
 */
function getToneFolderName(personality: string): string {
  switch (personality) {
    case '까칠':
      return 'grumpy_tone';
    case '다정':
      return 'warm_tone';
    case 'basic':
    default:
      return 'basic_tone';
  }
}

/**
 * 캐릭터 타입 폴더명 생성
 */
function getCharacterFolder(gender: 'male' | 'female', hasCustomImage: boolean, workIndex: number): string {
  const genderSuffix = gender === 'male' ? 'man' : 'woman';
  let typePrefix = hasCustomImage ? 'featured' : 'basic';
  
  // // 임시: work2 basic_man은 featured_man 사용 (1.mp4 파일 누락으로 인해)
  // if (workIndex === 2 && !hasCustomImage && gender === 'male') {
  //   console.warn('⚠️ work2 basic_man missing videos, using featured_man temporarily');
  //   typePrefix = 'featured';
  // }
  
  return `${typePrefix}_${genderSuffix}`;
}

/**
 * 비디오 파일 경로 생성
 */
export function getVideoPath(config: MediaPathConfig): string {
  const { workIndex, opponentGender, hasCustomImage, personality, dialogueNumber } = config;
  
  const characterFolder = getCharacterFolder(opponentGender, hasCustomImage, workIndex);
  const toneFolder = getToneFolderName(personality);
  
  return `/asset/video_voice/work${workIndex}/${characterFolder}/${toneFolder}/${dialogueNumber}.mp4`;
}

/**
 * 오디오 파일 경로 생성
 * - speed === 0: 오디오 없음 (비디오 내장 음성 사용)
 * - speed !== 0: 속도 조절된 별도 MP3 재생
 */
export function getAudioPath(config: MediaPathConfig): string {
  const { workIndex, opponentGender, hasCustomImage, personality, dialogueNumber, speed = 0 } = config;
  
  const characterFolder = getCharacterFolder(opponentGender, hasCustomImage, workIndex);
  const toneFolder = getToneFolderName(personality);
  
  // 속도가 0이면 비디오 내장 음성 사용 (별도 오디오 없음)
  if (speed === 0) {
    return '';
  }
  
  // 속도 값에 따른 파일명 생성
  const speedSuffix = speed > 0 ? `+${speed}` : `${speed}`;
  
  return `/asset/video_voice/work${workIndex}/${characterFolder}/${toneFolder}/${dialogueNumber}_${speedSuffix}.mp3`;
}

/**
 * 비디오와 오디오 경로를 함께 생성
 */
export function getMediaPaths(config: MediaPathConfig): { videoUrl: string; audioUrl: string } {
  return {
    videoUrl: getVideoPath(config),
    audioUrl: getAudioPath(config)
  };
}

