const STORAGE_KEY = 'liveSightAiDetectionHistory';
const MAX_HISTORY_ITEMS = 60;

export class DetectionHistory {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.items = this.#load();
  }

  get all() {
    return [...this.items];
  }

  add({ counts, total, fps }) {
    const item = {
      id: crypto.randomUUID?.() || String(Date.now()),
      timestamp: new Date().toISOString(),
      objects: { ...counts },
      total,
      fps: Number(fps.toFixed(1)),
    };

    this.items = [item, ...this.items].slice(0, MAX_HISTORY_ITEMS);
    this.#save();
    return item;
  }

  clear() {
    this.items = [];
    this.#save();
  }

  toCsv() {
    const rows = [
      ['timestamp', 'detected_objects', 'total_count', 'fps'],
      ...this.items.map((item) => [
        item.timestamp,
        this.describeObjects(item.objects),
        String(item.total),
        String(item.fps),
      ]),
    ];

    return rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n');
  }

  describeObjects(objects) {
    const entries = Object.entries(objects || {});
    if (!entries.length) return 'None';
    return entries.map(([label, count]) => `${label}: ${count}`).join('; ');
  }

  #load() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  #save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // History is helpful, but live detection should keep running if storage fails.
    }
  }
}
