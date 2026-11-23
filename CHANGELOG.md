# Changelog

All notable changes to `neuro-evo-cars` will be documented in this file.

## [0.1.2] - 2026-11-24

### Added
- Added GitHub Pages `Live Demo` link to `README.md`.

## [0.1.1] - 2026-11-23

### Added
- Preview screenshot (`assets/preview.jpg`) embedded in `README.md`.

## [0.1.0] - 2026-11-23

### Added
- Zero-dependency 2D autonomous racing sandbox (`index.html`, `css/style.css`, `js/app.js`, `js/car.js`, `js/visualizer.js`) with real-time neuroevolution and 5-ray LiDAR sensors.
- 5 neural network architectures (`js/nn.js`): Linear Perceptron, Small MLP, Wide ReLU MLP, Deep MLP, and Memory RNN.
- 7 built-in Catmull-Rom spline tracks plus custom canvas track drawing and `.json` import/export (`js/tracks.js`).
- Head-to-head 5-model Web Worker benchmark (`js/bench-worker.js`), interactive decision probe, cross-track generalization test, All-Star Race, Human PK mode, and Node.js benchmark script (`scripts/benchmark.js`).
- Bilingual `EN / 繁中` UI and Light/Dark themes, with `localStorage` and `.json` brain persistence.
