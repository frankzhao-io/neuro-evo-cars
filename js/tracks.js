// Track Generator (Catmull-Rom Spline -> Inner/Outer Walls + Checkpoints) + 7 Presets
(function (global) {
  let _trackUid = 1;
  function catmullRomClosed(ctrlPts, samplesPerSeg = 6) {
    const n = ctrlPts.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const p0 = ctrlPts[(i - 1 + n) % n];
      const p1 = ctrlPts[i];
      const p2 = ctrlPts[(i + 1) % n];
      const p3 = ctrlPts[(i + 2) % n];
      for (let s = 0; s < samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        const x =
          0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y =
          0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        pts.push([x, y]);
      }
    }
    return pts;
  }

  function buildTrackFromCenterline(centerPts, halfWidth = 46, name = "Track") {
    const n = centerPts.length;
    const outerPts = [];
    const innerPts = [];

    for (let i = 0; i < n; i++) {
      const prev = centerPts[(i - 1 + n) % n];
      const next = centerPts[(i + 1) % n];
      const tx = next[0] - prev[0];
      const ty = next[1] - prev[1];
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;
      outerPts.push([centerPts[i][0] + nx * halfWidth, centerPts[i][1] + ny * halfWidth]);
      innerPts.push([centerPts[i][0] - nx * halfWidth, centerPts[i][1] - ny * halfWidth]);
    }

    const walls = [];
    const wallBoxes = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const o1 = outerPts[i], o2 = outerPts[j];
      walls.push([o1, o2]);
      wallBoxes.push([Math.min(o1[0], o2[0]), Math.min(o1[1], o2[1]), Math.max(o1[0], o2[0]), Math.max(o1[1], o2[1])]);
      const i1 = innerPts[i], i2 = innerPts[j];
      walls.push([i1, i2]);
      wallBoxes.push([Math.min(i1[0], i2[0]), Math.min(i1[1], i2[1]), Math.max(i1[0], i2[0]), Math.max(i1[1], i2[1])]);
    }

    const checkpoints = [];
    for (let i = 0; i < n; i += 2) {
      checkpoints.push([innerPts[i], outerPts[i]]);
    }

    const start = centerPts[0];
    const next = centerPts[1];
    const startAngle = Math.atan2(next[1] - start[1], next[0] - start[0]);

    return {
      id: _trackUid++,
      name,
      halfWidth,
      centerPts,
      outerPts,
      innerPts,
      walls,
      wallBoxes,
      checkpoints,
      startPos: [start[0], start[1]],
      startAngle,
    };
  }

  function resampleClosedStroke(rawPts, targetCount = 36) {
    if (rawPts.length < 6) return null;
    const closed = [...rawPts, rawPts[0]];
    const dists = [0];
    for (let i = 1; i < closed.length; i++) {
      dists.push(dists[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]));
    }
    const total = dists[dists.length - 1];
    if (total < 240) return null;

    const sampled = [];
    for (let k = 0; k < targetCount; k++) {
      const targetD = (k / targetCount) * total;
      let idx = 0;
      while (idx < dists.length - 2 && dists[idx + 1] < targetD) idx++;
      const segLen = dists[idx + 1] - dists[idx] || 1;
      const frac = (targetD - dists[idx]) / segLen;
      sampled.push([
        closed[idx][0] + (closed[idx + 1][0] - closed[idx][0]) * frac,
        closed[idx][1] + (closed[idx + 1][1] - closed[idx][1]) * frac,
      ]);
    }
    // Smooth 2 passes
    let pts = sampled;
    for (let pass = 0; pass < 2; pass++) {
      pts = pts.map((p, i) => {
        const a = pts[(i - 1 + pts.length) % pts.length];
        const b = pts[(i + 1) % pts.length];
        return [0.25 * a[0] + 0.5 * p[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * p[1] + 0.25 * b[1]];
      });
    }
    return buildTrackFromCenterline(pts, 40, "Custom Track");
  }

  const PRESET_DEFS = {
    oval: {
      name: "Oval Speedring (Easy)",
      halfWidth: 52,
      ctrl: [
        [230, 115], [410, 105], [600, 115],
        [705, 210], [705, 350], [600, 445],
        [410, 455], [230, 445], [115, 350], [115, 210],
      ],
    },
    scurve: {
      name: "S-Curve Circuit (Medium)",
      halfWidth: 46,
      ctrl: [
        [150, 130], [360, 105], [560, 140],
        [695, 210], [660, 320], [490, 290],
        [410, 370], [560, 455], [340, 475],
        [145, 425], [110, 275],
      ],
    },
    hairpin: {
      name: "Hairpin Chicane (Hard)",
      halfWidth: 42,
      ctrl: [
        [140, 110], [420, 100], [690, 120],
        [720, 250], [520, 240], [470, 330],
        [690, 370], [680, 470], [410, 465],
        [280, 350], [160, 455], [100, 300],
      ],
    },
    technical: {
      name: "Technical Apex Loop (Expert)",
      halfWidth: 38,
      ctrl: [
        [160, 110], [360, 95], [520, 185],
        [670, 115], [725, 260], [580, 340],
        [685, 450], [450, 475], [360, 360],
        [235, 465], [105, 390], [185, 255], [105, 180],
      ],
    },
    kidney: {
      name: "Kidney Sweeper (Medium)",
      halfWidth: 46,
      ctrl: [
        [200, 110], [420, 100], [630, 120],
        [715, 230], [690, 385], [550, 455],
        [410, 355], [270, 455], [125, 390], [115, 225],
      ],
    },
    monza: {
      name: "Double Chicane GP (Hard)",
      halfWidth: 42,
      ctrl: [
        [140, 115], [320, 115], [380, 175], [460, 115],
        [680, 115], [720, 260], [670, 435],
        [490, 440], [430, 375], [350, 440],
        [145, 435], [105, 270],
      ],
    },
    spiral: {
      name: "Narrow Canyon (Expert)",
      halfWidth: 35,
      ctrl: [
        [135, 105], [390, 100], [675, 105],
        [710, 220], [540, 225], [350, 210],
        [250, 290], [420, 325], [680, 340],
        [695, 465], [390, 470], [125, 455], [105, 280],
      ],
    },
  };

  function getPresetTrack(id) {
    const def = PRESET_DEFS[id] || PRESET_DEFS.oval;
    const smooth = catmullRomClosed(def.ctrl, 5);
    return buildTrackFromCenterline(smooth, def.halfWidth, def.name);
  }

  global.TrackFactory = { PRESET_DEFS, getPresetTrack, resampleClosedStroke, buildTrackFromCenterline };
  if (typeof module !== "undefined" && module.exports) module.exports = global.TrackFactory;
})(typeof window !== "undefined" ? window : globalThis);
