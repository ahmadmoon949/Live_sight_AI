const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export class CameraController {
  constructor(videoElement, onStreamChange = () => {}) {
    this.video = videoElement;
    this.onStreamChange = onStreamChange;
    this.stream = null;
    this.facingMode = 'environment';
  }

  get isRunning() {
    return Boolean(this.stream);
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available in this browser.');
    }

    this.stop();

    const constraints = this.#buildConstraints();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      throw this.#friendlyCameraError(error);
    }

    this.video.srcObject = this.stream;

    try {
      await this.#waitForMetadata();
      await this.video.play();
      this.onStreamChange(this.stream);
      return this.stream;
    } catch (error) {
      this.stop();
      throw this.#friendlyCameraError(error);
    }
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';

    try {
      return await this.start();
    } catch (error) {
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.video.pause();
    this.video.removeAttribute('src');
    this.video.srcObject = null;
    this.video.load();
    this.onStreamChange(null);
  }

  #buildConstraints() {
    return {
      ...CAMERA_CONSTRAINTS,
      video: {
        ...CAMERA_CONSTRAINTS.video,
        facingMode: { ideal: this.facingMode },
      },
    };
  }

  #waitForMetadata() {
    if (this.video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });
  }

  #friendlyCameraError(error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      return new Error('Camera permission was denied. Allow camera access and try again.');
    }

    if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
      return new Error('No usable camera was found on this device.');
    }

    if (error?.name === 'NotReadableError') {
      return new Error('The camera is already in use by another app or browser tab.');
    }

    return new Error('Unable to start the camera. Check browser permissions and try again.');
  }
}
