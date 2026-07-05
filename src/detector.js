import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export class ObjectDetector {
  constructor({ intervalMs = 180 } = {}) {
    this.intervalMs = intervalMs;
    this.model = null;
    this.isLoading = false;
    this.isDetecting = false;
    this.lastDetectionAt = 0;
  }

  async load(onStatus = () => {}) {
    if (this.model) return this.model;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return this.model;
    }

    this.isLoading = true;
    onStatus('Loading AI model...');

    try {
      this.model = await cocoSsd.load();
      onStatus('Model ready');
      return this.model;
    } finally {
      this.isLoading = false;
    }
  }

  shouldDetect(now = performance.now()) {
    return Boolean(
      this.model &&
        !this.isDetecting &&
        now - this.lastDetectionAt >= this.intervalMs
    );
  }

  async detect(video, { threshold = 0.5, classFilter = '' } = {}) {
    if (!this.model || this.isDetecting) return null;

    this.isDetecting = true;
    this.lastDetectionAt = performance.now();

    try {
      const predictions = await this.model.detect(video);
      const normalizedFilter = classFilter.trim().toLowerCase();

      return predictions.filter((prediction) => {
        const passesScore = prediction.score >= threshold;
        const passesFilter =
          !normalizedFilter || prediction.class.toLowerCase() === normalizedFilter;
        return passesScore && passesFilter;
      });
    } finally {
      this.isDetecting = false;
    }
  }
}
