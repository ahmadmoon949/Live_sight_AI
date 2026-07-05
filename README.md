# LiveSight AI

LiveSight AI is a browser-based real-time object detection camera. It opens the user's webcam, runs the COCO-SSD object detection model directly in the browser with TensorFlow.js, and draws labeled bounding boxes over supported objects.

No paid APIs, API keys, Python backend, or database are required.

## Features

- Live webcam start, stop, and camera switching where the browser and device support it
- COCO-SSD model loaded once and reused for continuous detection
- Bounding boxes with object label and confidence score
- Stable label colors for readable live overlays
- Confidence threshold slider from 20% to 90%
- Optional single-class filter, such as `person`, `bottle`, `laptop`, `dog`, or `car`
- Mirror preview toggle
- Snapshot download with current bounding boxes
- Detection dashboard with total visible objects, grouped counts, FPS, status, and selected threshold
- Rolling detection history saved in `localStorage`
- CSV export and clear-history controls
- Responsive dark dashboard layout for desktop and mobile

## Architecture

```text
Webcam → Video Frame → COCO-SSD → Bounding Boxes + Dashboard + Local History
```

The browser camera stream is displayed in a video element. TensorFlow.js passes video frames to the pretrained COCO-SSD model on a safe interval. The returned predictions are filtered by confidence and class, then rendered to a canvas overlay and summarized in the dashboard. Detection history is stored locally in the browser.

## Technologies Used

- Vite
- Vanilla JavaScript
- HTML
- CSS
- TensorFlow.js
- `@tensorflow-models/coco-ssd`
- Browser Camera API: `navigator.mediaDevices.getUserMedia()`
- `localStorage`

## Installation

Install Node.js LTS first if `npm` is not available on your machine.

On Windows, switch to the project folder with `/d` so Command Prompt changes drives correctly:

```bat
cd /d D:\SightSpeak\live-sight-ai
```

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

To open the app from a phone on the same Wi-Fi network:

```bash
npm run dev:network
```

Use the `Network:` URL printed by Vite, not the `Local:` URL.

## Deploy To GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Create a GitHub repository.
2. Upload or push the contents of this `live-sight-ai` folder to that repository.
3. In GitHub, open **Settings → Pages**.
4. Set **Build and deployment → Source** to **GitHub Actions**.
5. Push to the `main` branch.
6. Open the deployed `https://...github.io/...` URL from your phone.

The HTTPS GitHub Pages URL is the recommended way to test the mobile camera because phone browsers commonly block camera access on plain local `http://192.168...` links.

## How To Use

1. Click **Start Camera** and approve the browser camera permission.
2. Wait for **Model ready** in the status indicator.
3. Hold a supported object in front of the camera.
4. Adjust the confidence threshold if the app is too sensitive or too strict.
5. Type one supported class name into the filter field to focus on one class.
6. Use **Snapshot** to download the current frame with bounding boxes.
7. Use **Export CSV** to download saved detection history.

## Supported-Object Limitation

LiveSight AI uses the pretrained COCO-SSD model. It can only identify the fixed object classes included in that model. It cannot identify every object in the world, custom products, unknown tools, text, brand names, or fine-grained categories unless those are represented by a supported COCO class.

Example supported categories include people, bicycles, cars, motorcycles, buses, trucks, traffic lights, stop signs, birds, cats, dogs, horses, sheep, cows, backpacks, umbrellas, handbags, bottles, cups, forks, knives, spoons, bowls, bananas, apples, sandwiches, oranges, broccoli, carrots, pizza, donuts, cake, chairs, couches, beds, dining tables, TVs, laptops, mice, remotes, keyboards, cell phones, books, clocks, scissors, teddy bears, hair dryers, and toothbrushes.

## Privacy

All detection runs in the browser. This app does not upload camera video to a server and does not use a backend or database. Browser and model dependencies are loaded as part of the web app, and detection results are stored only in the user's browser `localStorage` unless the user exports a CSV or downloads a snapshot.

## Known Limitations

- Crowded scenes can reduce accuracy.
- Poor lighting can produce missed or incorrect detections.
- Motion blur can lower confidence scores.
- Overlapping objects may be counted incorrectly.
- Unsupported object classes will not be recognized.
- Counts are estimates based on current model predictions.
- Camera switching depends on browser and device support.

## Future Improvements

- Custom YOLO model support for project-specific classes
- Object tracking to reduce flicker between frames
- Line-crossing counts for entrances, shelves, or zones
- Deployment workflow for GitHub Pages or another static host
- Optional on-device performance tuning controls

## Screenshots

Desktop dashboard screenshot placeholder:

```text
[Add desktop screenshot here]
```

Mobile dashboard screenshot placeholder:

```text
[Add mobile screenshot here]
```
