import React from 'react';
import { calculateFrontBiasedSimilarity, meetsMainThreshold, meetsVariationThreshold } from '../utils/similarity';

export type Cue = { role: string; text: string; audioUrl?: string; skipRecording?: boolean };
export type Script = Cue[];
export type Phase = 'idle' | 'entry' | 'ai-playing' | 'waiting' | 'user-recording' | 'waiting-for-confirmation' | 'done';
export type SubtitleKind = 'ai' | 'user-partial' | 'user-final' | null;

export interface TurnEngineConfig {
  script: Script;
  userRole: string;
  adlibMode: boolean;
  getIsPlaying: () => boolean;
  onPhase: (phase: Phase) => void;
  onSubtitle: (text: string, kind: SubtitleKind) => void;
  onError: (type: string, detail?: unknown) => void;
}

export interface TurnEngine {
  load: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  getIndex: () => number;
  manualNext: () => void;
  confirmAndNext: () => void;
}

// Constants
const VAD_SILENCE_THRESHOLD = 700; // ms
const VAD_CALIBRATION_TIME = 500; // ms (단축)
const VAD_ADAPTIVE_MULTIPLIER = 1.5; // 감소
const VAD_MIN_THRESHOLD = 0.01; // 최소 임계값
const SIMILARITY_THRESHOLD = 0.78;
const VARIATION_THRESHOLD = 0.60;

  // Global state
let currentIndex = 0;
let currentPhase: Phase = 'idle';
let isDestroyed = false;
let isPaused = false; // 초기값은 false (재생 상태)
let lastPlayState = false; // 마지막 재생 상태 추적
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let audioStream: MediaStream | null = null;
let dataArray: Uint8Array | null = null;
let vadInterval: NodeJS.Timeout | null = null;
let vadSilenceStart: number | null = null;
let noiseFloor = 0;
let vadCalibrationSamples: number[] = [];
let isVADCalibrated = false;
let currentUserText = '';
let isRecording = false;
let mediaRecorder: MediaRecorder | null = null;
let recordingTimeout: NodeJS.Timeout | null = null;
let config: TurnEngineConfig | null = null;
let isStoppedByUser = false; // 사용자가 수동으로 정지했는지 추적
let hasVoiceStarted = false; // 음성이 시작되었는지 추적
let voiceEndTime: number | null = null; // 마지막 음성이 감지된 시간

// Recording buffer for Whisper
let recordedChunks: BlobPart[] = [];

// Whisper 호출 헬퍼
async function transcribeWithWhisper(blob: Blob, lang: string = 'ko'): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'speech.webm');
  form.append('lang', lang);
  const res = await fetch('/api/stt', { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`STT API failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.text || '';
}

// Audio playback or simulation
async function playOrSimulate(cue: Cue): Promise<void> {
  return new Promise((resolve) => {
    if (cue.audioUrl) {
      // Real audio playback
      const audio = new Audio(cue.audioUrl);
      audio.onloadeddata = () => {
        audio.play();
        audio.onended = () => resolve();
      };
      audio.onerror = () => {
        console.warn('Audio load failed, falling back to simulation');
        // Fallback to simulation
        const duration = Math.max(2000, cue.text.length * 100);
        setTimeout(resolve, duration);
      };
    } else {
      // Time simulation based on text length
      const duration = Math.max(2000, cue.text.length * 100);
      setTimeout(resolve, duration);
    }
  });
}

// Start recording with MediaRecorder + Whisper
async function startRecording(): Promise<void> {
  try {
    console.log('🎤 Starting voice recording with MediaRecorder + Whisper...');
    
    // 1. 녹음 시작 시 플래그 올리기
    isRecording = true;

    // Ensure AudioContext exists before any VAD work
    try {
      if (!audioContext) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContext = new AC();
        console.log('🔊 AudioContext created', { sampleRate: audioContext?.sampleRate, state: audioContext?.state });
      } else if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('🔊 AudioContext resumed (pre-recording)');
      }
    } catch (e) {
      console.warn('⚠️ Failed to create/resume AudioContext', e);
    }

    // Request microphone access with detailed logging
    console.log('🔍 Requesting microphone access...');
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } 
    });
    console.log('✅ Microphone access granted, setting up recording...');

    // MediaRecorder 설정 및 시작
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    mediaRecorder = new MediaRecorder(audioStream, { mimeType: mime });
    recordedChunks = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.onstart = () => {
      console.log('✅ MediaRecorder started', { mimeType: mime });
    };
    
    mediaRecorder.onerror = (e: any) => {
      console.warn('⚠️ MediaRecorder error', e);
    };
    
    mediaRecorder.onstop = async () => {
      console.log('⏹️ MediaRecorder stopped, sending to Whisper...', { chunks: recordedChunks.length, isStoppedByUser });
      const blob = new Blob(recordedChunks, { type: mime });
      try {
        const text = await transcribeWithWhisper(blob, 'ko');
        currentUserText = text || '';
        console.log('✅ Whisper transcription result:', currentUserText);
        
        if (currentUserText) {
          config?.onSubtitle(currentUserText, 'user-final');
        }
        
        // 녹음 정리
        cleanupRecording();
        isRecording = false;
        
        // 모두 waiting-for-confirmation 상태로 설정 (결과 표시)
        currentPhase = 'waiting-for-confirmation';
        config?.onPhase('waiting-for-confirmation');
        console.log('✅ Recording completed, showing result to user');
        
        // 사용자가 수동으로 정지한 경우만 대기, 자동 종료는 4초 후 진행
        if (!isStoppedByUser) {
          // 자동 종료된 경우 → 결과를 4초간 표시 후 자동으로 다음 턴으로
          console.log('▶️ Auto-stopped, showing result for 4 seconds then proceeding...');
          setTimeout(() => {
            if (!isDestroyed && currentPhase === 'waiting-for-confirmation') {
              console.log('✅ Auto-advancing to next cue');
              // waiting 단계 생략하고 바로 다음 cue로
              nextCue();
            }
          }, 4000);
        } else {
          console.log('⏸️ Waiting for user confirmation (manual stop)');
        }
      } catch (err) {
        console.error('❌ Whisper transcription failed', err);
        config?.onError('stt-failed', err);
        // 에러 발생 시에도 결과를 표시하고 waiting-for-confirmation 상태 유지
        cleanupRecording();
        isRecording = false;
        currentPhase = 'waiting-for-confirmation';
        config?.onPhase('waiting-for-confirmation');
        // 에러 메시지도 표시하고 4초 후 자동 진행
        setTimeout(() => {
          if (!isDestroyed && currentPhase === 'waiting-for-confirmation') {
            console.log('✅ Auto-advancing to next cue after error');
            currentPhase = 'waiting';
            config?.onPhase('waiting');
            nextCue();
          }
        }, 4000);
      }
    };
    
    mediaRecorder.start();
    console.log('✅ Recording started successfully (MediaRecorder)');

    // 음성 감지 시작 및 침묵 타이머 초기화
    hasVoiceStarted = false;
    voiceEndTime = null;

    // VAD는 음성을 감지한 후 3초 침묵 시 자동 종료
    await setupVAD(true); // 자동 종료 활성화

  } catch (error) {
    console.error('❌ Recording setup failed:', error);
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        config?.onError('mic-permission-denied');
      } else if (error.name === 'NotFoundError') {
        config?.onError('mic-permission-denied');
      } else {
        config?.onError('recording-setup-failed', error.message);
      }
    }
    throw error;
  }
}

// Enhanced VAD setup with time domain and better debugging
async function setupVAD(enableAutoStop: boolean = true): Promise<void> {
  try {
    console.log('🔍 Setting up Voice Activity Detection (Time Domain)...', { enableAutoStop });

    if (!audioContext) {
      throw new Error('AudioContext is not initialized. Create it in startRecording() before setupVAD().');
    }
    
    // AudioContext 상태 확인 및 재개
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
      console.log('🔊 AudioContext resumed');
    }
    
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(audioStream!);

    // VAD 설정 최적화
    analyser.fftSize = 1024; // 2048에서 1024로 감소 (더 빠른 처리)
    analyser.smoothingTimeConstant = 0.1; // 0.3에서 0.1로 감소 (더 민감)
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    
    // 오디오 파이프 연결 확인
    microphone.connect(analyser);
    console.log('🔗 Audio pipeline connected:', {
      sourceNode: !!microphone,
      analyserNode: !!analyser,
      audioContextState: audioContext?.state,
      sampleRate: audioContext?.sampleRate
    });

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    vadCalibrationSamples = [];
    isVADCalibrated = false;
    const calibrationStartTime = Date.now();

    console.log('🎯 VAD calibration started (500ms)...');

    vadInterval = setInterval(() => {
      if (!analyser || !dataArray || isDestroyed) {
        return;
      }

      if (currentPhase !== 'user-recording' || !isRecording) {
        // phase가 변경되면 interval은 계속 실행되지만 early return
        return;
      }

      // 시간 도메인 데이터 사용 (더 정확한 음성 감지)
      analyser.getByteTimeDomainData(dataArray as any);

      // RMS 계산 (시간 도메인)
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
        peak = Math.max(peak, Math.abs(normalized));
      }
      const rms = Math.sqrt(sum / dataArray.length);

      const currentTime = Date.now();
      const isCalibrating = currentTime - calibrationStartTime < VAD_CALIBRATION_TIME;

      if (isCalibrating) {
        vadCalibrationSamples.push(rms);
        console.log('🎯 VAD calibrating...', { 
          rms: rms.toFixed(4), 
          peak: peak.toFixed(4),
          samples: vadCalibrationSamples.length,
          timeRemaining: VAD_CALIBRATION_TIME - (currentTime - calibrationStartTime),
          rawData: Array.from(dataArray.slice(0, 10)) // 처음 10개 샘플 확인
        });
      } else if (!isVADCalibrated) {
        if (vadCalibrationSamples.length > 0) {
          noiseFloor = vadCalibrationSamples.reduce((a, b) => a + b, 0) / vadCalibrationSamples.length;
          // 최소 임계값 보장
          noiseFloor = Math.max(noiseFloor, VAD_MIN_THRESHOLD);
          isVADCalibrated = true;
          console.log('✅ VAD calibrated:', { 
            noiseFloor: noiseFloor.toFixed(4), 
            threshold: (noiseFloor * VAD_ADAPTIVE_MULTIPLIER).toFixed(4),
            minThreshold: VAD_MIN_THRESHOLD,
            samples: vadCalibrationSamples.length,
            calibrationData: vadCalibrationSamples.slice(0, 5) // 처음 5개 샘플 확인
          });
        } else {
          console.warn('⚠️ No calibration samples collected, using default threshold');
          noiseFloor = VAD_MIN_THRESHOLD;
          isVADCalibrated = true;
        }
      } else {
        const threshold = Math.max(noiseFloor * VAD_ADAPTIVE_MULTIPLIER, VAD_MIN_THRESHOLD);
        const isVoiceDetected = rms > threshold;

        // 디버깅을 위한 상세 로그 (처음 몇 번만)
        if (Math.random() < 0.1) { // 10% 확률로만 로그
          console.log('🎯 VAD check:', { 
            rms: rms.toFixed(4), 
            peak: peak.toFixed(4),
            threshold: threshold.toFixed(4), 
            isVoiceDetected, 
            noiseFloor: noiseFloor.toFixed(4),
            silenceDuration: vadSilenceStart ? Date.now() - vadSilenceStart : 0,
            rawSample: dataArray[0] // 첫 번째 샘플 값
          });
        }

        // enableAutoStop이 false면 자동 종료하지 않음
        if (!enableAutoStop) {
          return; // 실시간 레벨 표시만을 위해 VAD 계속 실행
        }
        
        if (isVoiceDetected) {
          // 음성 감지됨
          hasVoiceStarted = true; // 음성이 시작되었다고 표시
          voiceEndTime = null; // 침묵 시간 리셋
          vadSilenceStart = null;
        } else {
          // 침묵 감지됨
          if (hasVoiceStarted) {
            // 이미 음성이 시작된 적이 있으면, 침묵 시간 카운트 시작
            if (voiceEndTime === null) {
              voiceEndTime = Date.now();
              console.log('🔇 Silence started after voice, starting 2 second timer...');
            } else if (Date.now() - voiceEndTime >= 2000) {
              // 2초 침묵 지속 → 자동 종료
              console.log('🔇 2 seconds of silence after voice detected — stopping recorder for STT');
              if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              } else {
                checkRecordingCompletion();
              }
            }
          }
        }
      }
    }, 50); // 100ms에서 50ms로 감소 (더 빠른 반응)

    console.log('✅ VAD setup completed');

  } catch (error) {
    console.warn('⚠️ VAD setup failed:', error);
  }
}

// Cleanup recording resources
function cleanupRecording(): void {
  console.log('🧹 Cleaning up recording...');
  
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
  }

  // MediaRecorder 정리
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { 
      mediaRecorder.stop(); 
    } catch (e) {
      console.warn('⚠️ Error stopping MediaRecorder:', e);
    }
    mediaRecorder = null;
  }
  recordedChunks = [];

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  microphone = null;
  dataArray = null;
  isRecording = false;
  vadSilenceStart = null;
  noiseFloor = 0;
  vadCalibrationSamples = [];
  isVADCalibrated = false;
  
  console.log('✅ Recording cleanup completed');
}

// Cleanup audio resources
function cleanupAudio(): void {
  console.log('🧹 Cleaning up audio...');
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  console.log('✅ Audio cleanup completed');
}

// Check if recording should be completed
function checkRecordingCompletion(): void {
  console.log('🔍 CheckRecordingCompletion called:', {
    isRecording,
    currentUserText: currentUserText || '(empty)',
    currentPhase
  });

  if (!isRecording) {
    console.log('⏭️ CheckRecordingCompletion skipped: not recording');
    return;
  }

  if (!currentUserText || !currentUserText.trim()) {
    console.log('⚠️ No STT text returned (empty). Staying in waiting-for-confirmation to show result.');
    return; // completeRecording을 호출하지 않음 - 이미 mediaRecorder.onstop에서 처리됨
  }

  console.log('✅ checkRecordingCompletion: User speech received from Whisper');
  console.log('🎯 User said:', currentUserText.trim());
  // completeRecording을 호출하지 않음 - mediaRecorder.onstop에서 처리
}

// Complete recording
function completeRecording(): void {
  console.log('✅ Completing recording with text:', currentUserText || '(empty)');
  
  // 실제 녹음된 텍스트를 계속 보여줌 (하드코딩된 '사용자 대사 완료' 텍스트 제거)
  // 현재 자막은 이미 onSubtitle로 설정되었으므로 그대로 유지

  // VAD 인터벌을 먼저 정리 (무한 루프 방지)
  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
    console.log('🛑 VAD interval cleared');
  }

  cleanupRecording();
  
  // isPaused 상태를 확인하고 재생 중이면 다음 cue로 진행
  console.log('🎯 Complete recording - checking state:', { isPaused, getIsPlaying: config?.getIsPlaying?.() });
  
  if (!isPaused && config?.getIsPlaying()) {
    console.log('✅ Recording completed, advancing to next cue');
    setTimeout(() => {
      setPhase('waiting'); // waiting으로 전환하면 setPhase에서 nextCue 호출
    }, 100);
  } else {
    console.log('⏸️ Recording completed but paused, staying in waiting');
    setPhase('waiting');
  }
}

// Trigger ad-lib mode
async function triggerAdlib(): Promise<void> {
  console.log('🎭 Triggering ad-lib mode...');
  
  try {
    const response = await fetch('/api/next-lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: config?.script.slice(0, currentIndex + 1),
        userText: currentUserText
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('🎭 Ad-lib response:', data);
      // Add new lines to script
      if (data.lines && Array.isArray(data.lines)) {
        config?.script.push(...data.lines);
      }
    }
  } catch (error) {
    console.warn('⚠️ Ad-lib request failed:', error);
  }

  completeRecording();
}

// Move to next cue
function nextCue(): void {
  console.log('⏭️ nextCue() called, currentIndex:', currentIndex, 'currentPhase:', currentPhase);
  
  if (currentIndex >= (config?.script.length || 0) - 1) {
    console.log('🏁 Script completed, setting phase to done');
    setPhase('done');
    return;
  }

  currentIndex++;
  console.log('⏭️ Processing next cue, new index:', currentIndex);
  processCurrentCue();
}

// Process current cue
function processCurrentCue(): void {
  const cue = config?.script[currentIndex];
  if (!cue) {
    console.log('❌ No cue found at index:', currentIndex);
    return;
  }

  console.log('🎬 Processing cue', currentIndex, ':', {
    role: cue.role,
    text: cue.text,
    userRole: config?.userRole
  });
  
  console.log(`🔍 Role comparison: cue.role="${cue.role}", userRole="${config?.userRole}", match=${cue.role === config?.userRole}`);

  if (cue.role === config?.userRole) {
    // 특수문자만 있는 대사는 녹음 스킵
    if (cue.skipRecording) {
      console.log('👤 User turn (special character only) - skipping recording');
      setPhase('user-recording'); // 내 차례 디자인 유지
      config?.onSubtitle(cue.text, 'ai');
      
      // 2초 대기 후 다음 턴으로 (waiting 단계 없이 바로)
      setTimeout(() => {
        console.log('✅ Special character turn completed, moving to next...');
        if (!isDestroyed && !isPaused) {
          nextCue();
        }
      }, 2000);
    } else {
      console.log('👤 User turn starting...');
      setPhase('user-recording');
      config?.onSubtitle(cue.text, 'ai');
      // 자동으로 녹음 시작
      startRecording().catch(error => {
        console.error('❌ Recording start failed:', error);
        setPhase('waiting');
      });
    }
  } else {
    console.log('🤖 AI turn starting...');
    setPhase('ai-playing');
    config?.onSubtitle(cue.text, 'ai');
    
    playOrSimulate(cue).then(() => {
      console.log('🤖 AI turn completed, moving to next...');
      // 일시정지 상태가 아니면 다음으로 진행
      if (!isDestroyed && !isPaused) {
        setTimeout(() => {
          if (!isDestroyed && !isPaused) {
            nextCue();
          }
        }, 200);
      } else {
        console.log('⏸️ AI turn ended but paused, not moving to next');
      }
    });
  }
}

// Check play state and handle accordingly
function checkPlayState(): void {
  if (!config) return;
  
  const shouldBePlaying = config.getIsPlaying();
  console.log('🎮 Play state check:', { shouldBePlaying, currentPhase });
  
  if (shouldBePlaying && currentPhase === 'idle') {
    console.log('▶️ Starting from idle state');
    setPhase('entry');
  } else if (!shouldBePlaying && currentPhase !== 'idle' && currentPhase !== 'done') {
    console.log('⏸️ Pausing from active state');
    setPhase('waiting');
  }
}

// Set phase with logging
function setPhase(phase: Phase): void {
  console.log('🔄 Phase change:', currentPhase, '->', phase);
  currentPhase = phase;
  config?.onPhase(phase);

  // When entering 'waiting', schedule next cue automatically if playing
  if (phase === 'waiting') {
    setTimeout(() => {
      if (isDestroyed) return;
      console.log('⏸️ Waiting state entered, checking conditions:', { 
        isPaused, 
        getIsPlaying: config?.getIsPlaying?.(), 
        shouldAdvance: !isPaused && config?.getIsPlaying?.() 
      });
      
      if (!config?.getIsPlaying() || isPaused) {
        console.log('⏸️ Still paused; not advancing from waiting.');
        return;
      }
      console.log('⏭️ Advancing from waiting to next cue...');
      nextCue();
    }, 200); // small cushion between phases
  }
}

// Create Turn Engine
export function createTurnEngine(engineConfig: TurnEngineConfig): TurnEngine {
  config = engineConfig;
  currentIndex = 0; // 새로 시작할 때는 0부터
  currentPhase = 'idle';
  isDestroyed = false;
  isPaused = false; // 여기서 초기화

  console.log('🚀 Turn Engine created with config:', {
    scriptLength: config.script.length,
    userRole: config.userRole,
    adlibMode: config.adlibMode,
    currentIndex: currentIndex // 현재 위치 로깅
  });

  return {
    load: () => {
      console.log('📥 Turn Engine load called');
      if (currentPhase === 'idle') {
        setPhase('entry');
      }
    },

    start: () => {
      console.log('▶️ Turn Engine start called, current phase:', currentPhase);
      
      isPaused = false;
      
      if (currentPhase === 'idle') {
        console.log('🚀 Starting from idle, setting phase to entry');
        setPhase('entry');
        // entry에서 바로 첫 번째 cue 처리
        setTimeout(() => {
          console.log('🎬 Processing first cue after entry');
          processCurrentCue();
        }, 100);
      } else if (currentPhase === 'waiting') {
        console.log('🎬 Resuming from waiting state');
        processCurrentCue();
      } else {
        console.log('⚠️ Start called but phase is not idle or waiting:', currentPhase);
      }
    },

    pause: () => {
      console.log('⏸️ Turn Engine pause called, current phase:', currentPhase);
      
      isPaused = true;
      
      if (currentPhase === 'user-recording') {
        cleanupRecording();
        setPhase('waiting');
      } else if (currentPhase === 'ai-playing') {
        // AI 차례가 끝날 때까지 기다렸다가 일시정지
        console.log('⏸️ Waiting for AI turn to complete before pausing...');
        // playOrSimulate이 끝나면 waiting 상태로 전환되는데, isPaused 플래그로 인해 자동으로 정지됨
      } else if (currentPhase === 'waiting') {
        // 이미 대기 상태이면 그대로 유지 (아무것도 하지 않음)
        console.log('⏸️ Already in waiting state');
      } else if (currentPhase === 'entry') {
        // entry 상태에서 일시정지하면 idle로
        setPhase('idle');
      }
      // idle이나 done 상태는 이미 일시정지 상태
    },

    resume: () => {
      console.log('▶️ Turn Engine resume called');
      if (currentPhase === 'waiting') {
        processCurrentCue();
      }
    },

    destroy: () => {
      console.log('💥 Turn Engine destroy called');
      isDestroyed = true;
      cleanupRecording();
      cleanupAudio();
      currentPhase = 'idle';
    },

    getIndex: () => currentIndex,

    manualNext: () => {
      console.log('👆 Manual next called');
      if (currentPhase === 'user-recording') {
        completeRecording();
      }
      nextCue();
    },
    
    confirmAndNext: () => {
      console.log('✅ User confirmed, moving to next cue');
      if (currentPhase === 'waiting-for-confirmation') {
        isStoppedByUser = false;
        nextCue(); // waiting 단계 생략하고 바로 다음으로
      }
    }
  };
}

// React hook for Turn Engine
export function useTurnEngine(config: TurnEngineConfig) {
  const engineRef = React.useRef<TurnEngine | null>(null);
  const lastPlayStateRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    engineRef.current = createTurnEngine(config);
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // 이벤트 기반 play state 모니터링 (폴링 제거)
  React.useEffect(() => {
    if (!engineRef.current) return;

    const shouldBePlaying = config.getIsPlaying();
    const lastPlayState = lastPlayStateRef.current;

    // 상태가 변경되었을 때만 반응
    if (shouldBePlaying !== lastPlayState) {
      console.log('🎮 Play state changed:', { from: lastPlayState, to: shouldBePlaying });

      if (shouldBePlaying) {
        engineRef.current.start();
      } else {
        engineRef.current.pause();
      }

      lastPlayStateRef.current = shouldBePlaying;
    }
  }, [config.getIsPlaying]); // config.getIsPlaying이 변경될 때만 실행

  return engineRef.current;
}
