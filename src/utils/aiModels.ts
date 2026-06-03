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
