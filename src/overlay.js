const COLORS = [
  '#14b8a6',
  '#f97316',
  '#60a5fa',
  '#f43f5e',
  '#a3e635',
  '#facc15',
  '#c084fc',
  '#22c55e',
  '#fb7185',
  '#38bdf8',
];

export class DetectionOverlay {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.video = video;
    this.ctx = canvas.getContext('2d');
    this.labelColors = new Map();
    this.mirrored = false;
  }

  setMirrored(mirrored) {
    this.mirrored = mirrored;
  }

  resize() {
    const width = this.video.videoWidth || this.video.clientWidth;
    const height = this.video.videoHeight || this.video.clientHeight;

    if (!width || !height) return false;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    return true;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(predictions) {
    if (!this.resize()) return;

    this.clear();
    this.ctx.lineWidth = Math.max(3, Math.round(this.canvas.width / 360));
    this.ctx.font = `${Math.max(14, Math.round(this.canvas.width / 55))}px Inter, system-ui, sans-serif`;
    this.ctx.textBaseline = 'top';

    this.#withInstanceNumbers(predictions).forEach((item) =>
      this.#drawPrediction(this.ctx, item, this.mirrored)
    );
  }

  drawSnapshot(video, predictions, mirrored) {
    this.resize();

    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = this.canvas.width;
    snapshotCanvas.height = this.canvas.height;

    const snapshotCtx = snapshotCanvas.getContext('2d');
    snapshotCtx.lineWidth = Math.max(3, Math.round(snapshotCanvas.width / 360));
    snapshotCtx.font = `${Math.max(14, Math.round(snapshotCanvas.width / 55))}px Inter, system-ui, sans-serif`;
    snapshotCtx.textBaseline = 'top';

    if (mirrored) {
      snapshotCtx.translate(snapshotCanvas.width, 0);
      snapshotCtx.scale(-1, 1);
    }

    snapshotCtx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    if (mirrored) snapshotCtx.setTransform(1, 0, 0, 1, 0, 0);

    this.#withInstanceNumbers(predictions).forEach((item) =>
      this.#drawPrediction(snapshotCtx, item, mirrored)
    );

    return snapshotCanvas;
  }

  #drawPrediction(ctx, item, mirrored) {
    const { prediction, instanceNumber, instanceTotal } = item;
    const [sourceX, y, width, height] = prediction.bbox;
    const x = mirrored ? this.canvas.width - sourceX - width : sourceX;
    const color = this.#colorForLabel(prediction.class);
    const suffix = instanceTotal > 1 ? ` #${instanceNumber}` : '';
    const label = `${prediction.class}${suffix} ${Math.round(prediction.score * 100)}%`;
    const labelMetrics = ctx.measureText(label);
    const labelHeight = parseInt(ctx.font, 10) + 10;
    const labelWidth = labelMetrics.width + 14;
    const labelY = Math.max(0, y - labelHeight);
    const labelX = Math.min(Math.max(0, x), Math.max(0, this.canvas.width - labelWidth));

    ctx.strokeStyle = '#071014';
    ctx.lineWidth += 2;
    ctx.strokeRect(x, y, width, height);
    ctx.lineWidth -= 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.strokeRect(x, y, width, height);
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.fillStyle = '#071014';
    ctx.fillText(label, labelX + 7, labelY + 5);
  }

  #withInstanceNumbers(predictions) {
    const totals = predictions.reduce((summary, prediction) => {
      summary[prediction.class] = (summary[prediction.class] || 0) + 1;
      return summary;
    }, {});
    const seen = {};

    return predictions.map((prediction) => {
      seen[prediction.class] = (seen[prediction.class] || 0) + 1;
      return {
        prediction,
        instanceNumber: seen[prediction.class],
        instanceTotal: totals[prediction.class],
      };
    });
  }

  #colorForLabel(label) {
    if (this.labelColors.has(label)) return this.labelColors.get(label);

    let hash = 0;
    for (let index = 0; index < label.length; index += 1) {
      hash = label.charCodeAt(index) + ((hash << 5) - hash);
    }

    const color = COLORS[Math.abs(hash) % COLORS.length];
    this.labelColors.set(label, color);
    return color;
  }
}

export function summarizePredictions(predictions) {
  return predictions.reduce((summary, prediction) => {
    summary[prediction.class] = (summary[prediction.class] || 0) + 1;
    return summary;
  }, {});
}
