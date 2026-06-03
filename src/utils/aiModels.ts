import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const loadFaceApiModels = async () => {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log('AI Models initialized successfully');
    } catch (err) {
      console.error('Error loading AI models:', err);
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
};

export const areModelsLoaded = () => modelsLoaded;

export const calculateEAR = (eyePoints: { x: number; y: number }[]) => {
  const dist = (pt1: any, pt2: any) => Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));

  const v1 = dist(eyePoints[1], eyePoints[5]);
  const v2 = dist(eyePoints[2], eyePoints[4]);
  const h = dist(eyePoints[0], eyePoints[3]);

  return (v1 + v2) / (2.0 * h);
};

export const detectBlinkLiveness = (
  videoEl: HTMLVideoElement,
  onStatusUpdate: (msg: string) => void,
  timeoutMs: number = 15000
): Promise<boolean> => {
  return new Promise((resolve) => {
    let blinkDetected = false;
    let framesBelowThreshold = 0;
    const EAR_THRESHOLD = 0.25;
    let isTimedOut = false;

    const timeout = setTimeout(() => {
      isTimedOut = true;
      resolve(false);
    }, timeoutMs);

    const checkFrame = async () => {
      if (isTimedOut || blinkDetected) return;

      try {
        const detection = await faceapi.detectSingleFace(videoEl).withFaceLandmarks();
        if (detection) {
          const landmarks = detection.landmarks.positions;
          const leftEye = landmarks.slice(36, 42);
          const rightEye = landmarks.slice(42, 48);

          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const ear = (leftEAR + rightEAR) / 2.0;

          if (ear < EAR_THRESHOLD) {
            framesBelowThreshold++;
          } else {
            // If they were below threshold for a brief moment, it's a blink
            if (framesBelowThreshold > 0 && framesBelowThreshold < 15) {
              blinkDetected = true;
              clearTimeout(timeout);
              resolve(true);
              return;
            }
            framesBelowThreshold = 0;
          }
        }
      } catch (e) {
        // Ignore detection errors during loop
      }

      if (!blinkDetected && !isTimedOut) {
        requestAnimationFrame(checkFrame);
      }
    };

    checkFrame();
  });
};
