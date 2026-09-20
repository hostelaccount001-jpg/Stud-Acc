import * as faceapi from '@vladmandic/face-api';

export { faceapi };

let modelsLoadedPromise = null;
let areModelsReady = false;

/**
 * Global singleton promise to ensure models load once and cache in memory.
 * Loads 3 lightweight models locally from /models:
 * 1. tinyFaceDetector (Fast face detection)
 * 2. faceLandmark68Net (Tracks 68 facial points for eyes, nose, mouth)
 * 3. faceRecognitionNet (Generates 128-D vector descriptor)
 */
export const loadFaceApiModels = async () => {
  if (areModelsReady) {
    return true;
  }
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const MODEL_URL = '/models';
      console.log('[FaceAPI Singleton] Loading lightweight models from', MODEL_URL);
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        areModelsReady = true;
        console.log('[FaceAPI Singleton] All 3 models loaded successfully and cached in memory!');
        return true;
      } catch (err) {
        console.error('[FaceAPI Singleton Error] Failed to load models:', err);
        modelsLoadedPromise = null;
        throw err;
      }
    })();
  }
  return modelsLoadedPromise;
};

export const getModelsStatus = () => areModelsReady;

/**
 * Detects a single face and extracts 128-dimensional descriptor
 */
export const detectSingleFaceWithDescriptor = async (videoOrImgElement) => {
  await loadFaceApiModels();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  return await faceapi
    .detectSingleFace(videoOrImgElement, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
};

/**
 * Detects all faces in frame to check for multiple people warning
 */
export const detectAllFacesInFrame = async (videoOrImgElement) => {
  await loadFaceApiModels();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  return await faceapi.detectAllFaces(videoOrImgElement, options);
};

/**
 * Calculates Euclidean Distance between two 128-D feature vectors:
 * Distance = sqrt( sum( (A_i - B_i)^2 ) )
 */
export function calculateEuclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2) return 1.0;
  const len = Math.min(arr1.length, arr2.length);
  if (len === 0) return 1.0;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Plays high-tech melodious success chime when face is verified
 * Built via HTML5 Web Audio API - Zero external asset latency
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First Bell Tone (G5 - 784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second Bell Tone (C6 - 1046.5 Hz) - Chime finish
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('[Audio Feedback Note]', e);
  }
}
