import { CameraController } from './camera.js';
import { ObjectDetector } from './detector.js';
import { DetectionHistory } from './history.js';
import { DetectionOverlay, summarizePredictions } from './overlay.js';
import './styles.css';

const elements = {
  video: document.querySelector('#cameraVideo'),
  canvas: document.querySelector('#detectionCanvas'),
  stage: document.querySelector('#cameraStage'),
  stageEmpty: document.querySelector('#stageEmpty'),
  loadingOverlay: document.querySelector('#loadingOverlay'),
  statusPill: document.querySelector('#statusPill'),
  modelStatusText: document.querySelector('#modelStatusText'),
  startCameraBtn: document.querySelector('#startCameraBtn'),
  stopCameraBtn: document.querySelector('#stopCameraBtn'),
  switchCameraBtn: document.querySelector('#switchCameraBtn'),
  snapshotBtn: document.querySelector('#snapshotBtn'),
  cameraError: document.querySelector('#cameraError'),
  thresholdSlider: document.querySelector('#thresholdSlider'),
  thresholdValue: document.querySelector('#thresholdValue'),
  dashboardThreshold: document.querySelector('#dashboardThreshold'),
  classFilterInput: document.querySelector('#classFilterInput'),
  clearFilterBtn: document.querySelector('#clearFilterBtn'),
  mirrorToggle: document.querySelector('#mirrorToggle'),
  exportCsvBtn: document.querySelector('#exportCsvBtn'),
  clearHistoryBtn: document.querySelector('#clearHistoryBtn'),
  totalObjects: document.querySelector('#totalObjects'),
  fpsValue: document.querySelector('#fpsValue'),
  dashboardModelStatus: document.querySelector('#dashboardModelStatus'),
  detectionStatus: document.querySelector('#detectionStatus'),
  objectCountsList: document.querySelector('#objectCountsList'),
  objectsEmptyText: document.querySelector('#objectsEmptyText'),
  currentDetectionsList: document.querySelector('#currentDetectionsList'),
  currentDetectionsEmptyText: document.querySelector('#currentDetectionsEmptyText'),
  historyTableBody: document.querySelector('#historyTableBody'),
  historyEmptyText: document.querySelector('#historyEmptyText'),
  historyCount: document.querySelector('#historyCount'),
};

const detector = new ObjectDetector({ intervalMs: 180 });
const overlay = new DetectionOverlay(elements.canvas, elements.video);
const history = new DetectionHistory();
const camera = new CameraController(elements.video, updateCameraState);

let animationFrameId = null;
let latestPredictions = [];
let latestCounts = {};
let latestFps = 0;
let frameCount = 0;
let fpsWindowStart = performance.now();
let lastHistoryAt = 0;
let isLoopRunning = false;
let modelReady = false;

init();

function init() {
  bindEvents();
  renderThreshold();
  renderDashboard([], 0);
  renderHistory();
  setModelStatus('Loading AI model...', 'loading');

  detector
    .load((status) => setModelStatus(status, 'loading'))
    .then(() => {
      modelReady = true;
      elements.loadingOverlay.hidden = true;
      setModelStatus('Model ready', 'ready');
      updateDetectionStatus(camera.isRunning ? 'Ready to detect' : 'Camera off');
    })
    .catch((error) => {
      elements.loadingOverlay.hidden = true;
      setModelStatus('Model failed', 'error');
      updateDetectionStatus('Model unavailable');
      showError(error.message || 'The AI model could not be loaded.');
    });
}

function bindEvents() {
  elements.startCameraBtn.addEventListener('click', startCamera);
  elements.stopCameraBtn.addEventListener('click', stopCamera);
  elements.switchCameraBtn.addEventListener('click', switchCamera);
  elements.snapshotBtn.addEventListener('click', downloadSnapshot);
  elements.thresholdSlider.addEventListener('input', renderThreshold);
  elements.classFilterInput.addEventListener('input', () => renderDashboard(latestPredictions, latestFps));
  elements.clearFilterBtn.addEventListener('click', () => {
    elements.classFilterInput.value = '';
    elements.classFilterInput.focus();
    renderDashboard(latestPredictions, latestFps);
  });
  elements.mirrorToggle.addEventListener('change', applyMirrorMode);
  elements.exportCsvBtn.addEventListener('click', exportHistory);
  elements.clearHistoryBtn.addEventListener('click', () => {
    history.clear();
    renderHistory();
  });

  elements.video.addEventListener('resize', () => overlay.resize());
  window.addEventListener('beforeunload', () => camera.stop());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) overlay.clear();
  });
}

async function startCamera() {
  clearError();
  elements.startCameraBtn.disabled = true;
  updateDetectionStatus('Starting camera');

  try {
    await camera.start();
    applyMirrorMode();
    elements.stageEmpty.hidden = true;
    elements.snapshotBtn.disabled = false;
    elements.switchCameraBtn.disabled = false;
    elements.stopCameraBtn.disabled = false;
    updateDetectionStatus(modelReady ? 'Detecting' : 'Waiting for model');
    startDetectionLoop();
  } catch (error) {
    showError(error.message);
    updateDetectionStatus('Camera unavailable');
    elements.startCameraBtn.disabled = false;
  }
}

function stopCamera() {
  camera.stop();
  stopDetectionLoop();
  latestPredictions = [];
  latestCounts = {};
  latestFps = 0;
  overlay.clear();
  renderDashboard([], 0);
  updateDetectionStatus('Camera off');
}

async function switchCamera() {
  clearError();
  elements.switchCameraBtn.disabled = true;
  updateDetectionStatus('Switching camera');

  try {
    await camera.switchCamera();
    applyMirrorMode();
    updateDetectionStatus(modelReady ? 'Detecting' : 'Waiting for model');
  } catch (error) {
    showError(error.message);
    updateDetectionStatus('Camera unavailable');
  } finally {
    elements.switchCameraBtn.disabled = !camera.isRunning;
  }
}

function startDetectionLoop() {
  if (isLoopRunning) return;

  isLoopRunning = true;
  fpsWindowStart = performance.now();
  frameCount = 0;
  detectionLoop();
}

function stopDetectionLoop() {
  isLoopRunning = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

async function detectionLoop(now = performance.now()) {
  if (!isLoopRunning || !camera.isRunning) return;

  overlay.resize();
  updateFps(now);

  if (detector.shouldDetect(now) && elements.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const predictions = await detector.detect(elements.video, {
      threshold: Number(elements.thresholdSlider.value),
      classFilter: elements.classFilterInput.value,
    });

    if (!isLoopRunning || !camera.isRunning) return;

    if (predictions) {
      latestPredictions = predictions;
      latestCounts = summarizePredictions(predictions);
      overlay.draw(predictions);
      renderDashboard(predictions, latestFps);
      maybeSaveHistory(now);
    }
  }

  if (isLoopRunning && camera.isRunning) {
    animationFrameId = requestAnimationFrame(detectionLoop);
  }
}

function updateFps(now) {
  frameCount += 1;
  const elapsed = now - fpsWindowStart;

  if (elapsed >= 1000) {
    latestFps = (frameCount * 1000) / elapsed;
    frameCount = 0;
    fpsWindowStart = now;
    elements.fpsValue.textContent = latestFps.toFixed(1);
  }
}

function maybeSaveHistory(now) {
  const hasObjects = latestPredictions.length > 0;
  if (!hasObjects || now - lastHistoryAt < 2000) return;

  history.add({
    counts: latestCounts,
    total: latestPredictions.length,
    fps: latestFps,
  });
  lastHistoryAt = now;
  renderHistory();
}

function renderThreshold() {
  const percent = `${Math.round(Number(elements.thresholdSlider.value) * 100)}%`;
  elements.thresholdValue.textContent = percent;
  elements.dashboardThreshold.textContent = percent;
}

function renderDashboard(predictions, fps) {
  const counts = summarizePredictions(predictions);
  const total = predictions.length;
  latestCounts = counts;

  elements.totalObjects.textContent = String(total);
  elements.fpsValue.textContent = fps.toFixed(1);
  elements.objectCountsList.replaceChildren();
  elements.currentDetectionsList.replaceChildren();

  Object.entries(counts)
    .sort(([labelA], [labelB]) => labelA.localeCompare(labelB))
    .forEach(([label, count]) => {
      const item = document.createElement('li');
      const labelSpan = document.createElement('span');
      const countSpan = document.createElement('strong');
      labelSpan.textContent = label;
      countSpan.textContent = String(count);
      item.append(labelSpan, countSpan);
      elements.objectCountsList.append(item);
    });

  elements.objectsEmptyText.hidden = total > 0;
  renderCurrentDetections(predictions);

  if (camera.isRunning && modelReady) {
    updateDetectionStatus(total ? 'Detecting objects' : 'No supported objects visible');
  }
}

function renderCurrentDetections(predictions) {
  const totals = summarizePredictions(predictions);
  const seen = {};

  predictions
    .slice()
    .sort((first, second) => second.score - first.score)
    .forEach((prediction) => {
      seen[prediction.class] = (seen[prediction.class] || 0) + 1;

      const item = document.createElement('li');
      const labelSpan = document.createElement('span');
      const scoreSpan = document.createElement('strong');
      const suffix = totals[prediction.class] > 1 ? ` #${seen[prediction.class]}` : '';

      labelSpan.textContent = `${prediction.class}${suffix}`;
      scoreSpan.textContent = `${Math.round(prediction.score * 100)}%`;
      item.append(labelSpan, scoreSpan);
      elements.currentDetectionsList.append(item);
    });

  elements.currentDetectionsEmptyText.hidden = predictions.length > 0;
}

function renderHistory() {
  elements.historyTableBody.replaceChildren();
  history.all.slice(0, 20).forEach((item) => {
    const row = document.createElement('tr');
    const time = document.createElement('td');
    const objects = document.createElement('td');
    const total = document.createElement('td');
    const fps = document.createElement('td');

    time.textContent = new Date(item.timestamp).toLocaleString();
    objects.textContent = history.describeObjects(item.objects);
    total.textContent = String(item.total);
    fps.textContent = String(item.fps);
    row.append(time, objects, total, fps);
    elements.historyTableBody.append(row);
  });

  elements.historyEmptyText.hidden = history.all.length > 0;
  elements.historyCount.textContent = `${history.all.length} saved`;
}

function downloadSnapshot() {
  if (!camera.isRunning) return;

  const snapshotCanvas = overlay.drawSnapshot(
    elements.video,
    latestPredictions,
    elements.mirrorToggle.checked
  );
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z');
  link.download = `livesight-ai-${timestamp}.png`;
  link.href = snapshotCanvas.toDataURL('image/png');
  link.click();
}

function exportHistory() {
  const blob = new Blob([history.toCsv()], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z');
  link.download = `livesight-ai-history-${timestamp}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function applyMirrorMode() {
  const mirrored = elements.mirrorToggle.checked;
  elements.stage.classList.toggle('is-mirrored', mirrored);
  overlay.setMirrored(mirrored);
  overlay.draw(latestPredictions);
}

function updateCameraState(stream) {
  const isRunning = Boolean(stream);
  elements.startCameraBtn.disabled = isRunning;
  elements.stopCameraBtn.disabled = !isRunning;
  elements.switchCameraBtn.disabled = !isRunning;
  elements.snapshotBtn.disabled = !isRunning;
  elements.stageEmpty.hidden = isRunning;
}

function setModelStatus(text, state) {
  elements.modelStatusText.textContent = text;
  elements.dashboardModelStatus.textContent = text;
  elements.statusPill.dataset.state = state;
}

function updateDetectionStatus(text) {
  elements.detectionStatus.textContent = text;
}

function showError(message) {
  elements.cameraError.textContent = message;
}

function clearError() {
  elements.cameraError.textContent = '';
}
