// Canvas Renderers: 2D Track & Cars, Live Neural Network Topology, and Fitness Chart
(function (global) {
  const PALETTES = {
    dark: {
      grid: "#18181b",
      asphalt: "#18181b",
      wall: "#52525b",
      carFill: "rgba(161, 161, 170, 0.45)",
      carStroke: "rgba(250, 250, 250, 0.4)",
      deadFill: "rgba(239, 68, 68, 0.14)",
      deadStroke: "rgba(239, 68, 68, 0.2)",
      champStroke: "#fafafa",
      champFront: "#09090b",
      nodeStroke: "#d4d4d8",
      nodeLabel: "#a1a1aa",
      axis: "#27272a",
      axisText: "#71717a",
      avgLine: "#71717a",
    },
    light: {
      grid: "#f1f5f9",
      asphalt: "#e2e8f0",
      wall: "#475569",
      carFill: "rgba(71, 85, 105, 0.45)",
      carStroke: "rgba(15, 23, 42, 0.55)",
      deadFill: "rgba(239, 68, 68, 0.16)",
      deadStroke: "rgba(239, 68, 68, 0.3)",
      champStroke: "#0f172a",
      champFront: "#ffffff",
      nodeStroke: "#475569",
      nodeLabel: "#475569",
      axis: "#cbd5e1",
      axisText: "#64748b",
      avgLine: "#64748b",
    },
  };

  function getPal(theme) {
    return PALETTES[theme === "light" ? "light" : "dark"];
  }

  function syncCanvasHiDPI(ctx, fallbackW, fallbackH) {
    const canvas = ctx && ctx.canvas;
    if (!canvas) return { width: fallbackW, height: fallbackH };
    if (!canvas._logicalW) {
      canvas._logicalW = fallbackW;
      canvas._logicalH = fallbackH;
    }
    const lw = canvas._logicalW;
    const lh = canvas._logicalH;
    const dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
    const cssW = Math.max(lw, canvas.clientWidth || lw);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round((cssW * (lh / lw)) * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(targetW / lw, 0, 0, targetH / lh, 0, 0);
    return { width: lw, height: lh };
  }

  let _trackCache = null;
  let _cacheKey = "";

  function _getStaticTrackLayer(width, height, track, pal, theme, showCheckpoints) {
    const key = `${track ? track.id : "none"}|${theme}|${!!showCheckpoints}|${width}x${height}`;
    if (_trackCache && _cacheKey === key) return _trackCache;

    if (!_trackCache) {
      _trackCache = document.createElement("canvas");
    }
    _trackCache.width = width;
    _trackCache.height = height;
    const octx = _trackCache.getContext("2d");

    octx.clearRect(0, 0, width, height);
    octx.strokeStyle = pal.grid;
    octx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, height); octx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      octx.beginPath(); octx.moveTo(0, y); octx.lineTo(width, y); octx.stroke();
    }

    if (track) {
      octx.save();
      octx.beginPath();
      track.outerPts.forEach((p, i) => (i === 0 ? octx.moveTo(p[0], p[1]) : octx.lineTo(p[0], p[1])));
      octx.closePath();
      track.innerPts.forEach((p, i) => (i === 0 ? octx.moveTo(p[0], p[1]) : octx.lineTo(p[0], p[1])));
      octx.closePath();
      octx.fillStyle = pal.asphalt;
      octx.fill("evenodd");
      octx.restore();

      if (showCheckpoints) {
        octx.strokeStyle = "rgba(113, 113, 122, 0.3)";
        octx.lineWidth = 1;
        for (let i = 0; i < track.checkpoints.length; i++) {
          const [a, b] = track.checkpoints[i];
          octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke();
        }
      }

      if (track.checkpoints.length > 0) {
        const [s1, s2] = track.checkpoints[0];
        octx.strokeStyle = "#16a34a";
        octx.lineWidth = 3;
        octx.beginPath(); octx.moveTo(s1[0], s1[1]); octx.lineTo(s2[0], s2[1]); octx.stroke();
      }

      octx.strokeStyle = pal.wall;
      octx.lineWidth = 2;
      octx.beginPath();
      for (const [p1, p2] of track.walls) {
        octx.moveTo(p1[0], p1[1]);
        octx.lineTo(p2[0], p2[1]);
      }
      octx.stroke();
    }

    _cacheKey = key;
    return _trackCache;
  }

  function drawTrackAndCars(ctx, width, height, track, cars, bestCar, options = {}) {
    ({ width, height } = syncCanvasHiDPI(ctx, width, height));
    const pal = getPal(options.theme);
    ctx.clearRect(0, 0, width, height);
    const staticLayer = _getStaticTrackLayer(
      width,
      height,
      track,
      pal,
      options.theme || "dark",
      options.showCheckpoints
    );
    ctx.drawImage(staticLayer, 0, 0);

    // Crash heatmap markers
    if (options.showTrails && options.crashPoints && options.crashPoints.length > 0) {
      for (const pt of options.crashPoints) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Champion racing line (colored by throttle: green = accel, red = brake)
    if (options.showTrails && options.trails && options.trails.length > 1) {
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      for (let i = 1; i < options.trails.length; i++) {
        const p0 = options.trails[i - 1];
        const p1 = options.trails[i];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > 40) continue;
        ctx.strokeStyle = p1.throttle >= 0 ? "rgba(34, 197, 94, 0.65)" : "rgba(239, 68, 68, 0.75)";
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // Custom drawing stroke preview
    if (options.drawStroke && options.drawStroke.length > 1) {
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      options.drawStroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.stroke();
    }

    // Draw population cars (dead faded, alive crisp, or custom modelColor in All-Star / Human PK)
    for (const car of cars) {
      if (car === bestCar) continue;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      if (car.modelColor) {
        ctx.fillStyle = car.alive ? car.modelColor : "rgba(239, 68, 68, 0.28)";
        ctx.strokeStyle = pal.champStroke;
      } else if (car.alive) {
        ctx.fillStyle = pal.carFill;
        ctx.strokeStyle = pal.carStroke;
      } else {
        ctx.fillStyle = pal.deadFill;
        ctx.strokeStyle = pal.deadStroke;
      }
      ctx.lineWidth = car.modelColor ? 1.4 : 1;
      ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
      ctx.strokeRect(-car.width / 2, -car.height / 2, car.width, car.height);
      if (car.modelColor) {
        ctx.fillStyle = pal.champFront;
        ctx.fillRect(car.width / 2 - 4, -3, 3, 6);
      }
      ctx.restore();
      if (car.label && car.alive) {
        ctx.fillStyle = pal.champStroke;
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.label, car.x, car.y - 10);
      }
    }

    // Champion car + LiDAR rays
    if (bestCar) {
      if (bestCar.alive && options.showRays) {
        for (const ray of bestCar.rays) {
          ctx.strokeStyle = "rgba(22, 163, 74, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bestCar.x, bestCar.y);
          ctx.lineTo(ray.hitX, ray.hitY);
          ctx.stroke();

          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.arc(ray.hitX, ray.hitY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.save();
      ctx.translate(bestCar.x, bestCar.y);
      ctx.rotate(bestCar.angle);
      ctx.fillStyle = bestCar.alive ? (bestCar.modelColor || "#22c55e") : "#ef4444";
      ctx.strokeStyle = pal.champStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bestCar.width / 2, -bestCar.height / 2, bestCar.width, bestCar.height);
      ctx.strokeRect(-bestCar.width / 2, -bestCar.height / 2, bestCar.width, bestCar.height);
      // Front indicator
      ctx.fillStyle = pal.champFront;
      ctx.fillRect(bestCar.width / 2 - 4, -3, 3, 6);
      ctx.restore();
      if (bestCar.label && bestCar.alive) {
        ctx.fillStyle = pal.champStroke;
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(bestCar.label, bestCar.x, bestCar.y - 10);
      }
    }
  }

  function drawNetwork(ctx, width, height, brain, theme = "dark") {
    ({ width, height } = syncCanvasHiDPI(ctx, width, height));
    const pal = getPal(theme);
    ctx.clearRect(0, 0, width, height);
    if (!brain) return;

    const layerSizes = brain.layerSizes;
    const cols = layerSizes.length;
    const padLeft = 36;
    const padRight = 48;
    const padY = 18;
    const colGap = (width - padLeft - padRight) / Math.max(1, cols - 1);

    const nodePositions = [];
    for (let c = 0; c < cols; c++) {
      const count = layerSizes[c];
      const x = padLeft + c * colGap;
      const availH = height - padY * 2;
      const stepY = count > 1 ? availH / (count - 1) : 0;
      const ys = [];
      for (let r = 0; r < count; r++) {
        const y = count === 1 ? height / 2 : padY + r * stepY;
        ys.push([x, y]);
      }
      nodePositions.push(ys);
    }

    // Draw edges
    for (let l = 0; l < brain.layers.length; l++) {
      const layer = brain.layers[l];
      const fromPts = nodePositions[l];
      const toPts = nodePositions[l + 1];
      for (let o = 0; o < layer.outputSize; o++) {
        for (let i = 0; i < layer.inputSize; i++) {
          const w = layer.weights[o][i];
          const alpha = Math.min(0.85, Math.abs(w) * 0.45 + 0.05);
          ctx.strokeStyle = w >= 0 ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = Math.min(2.2, Math.abs(w) * 0.9 + 0.4);
          ctx.beginPath();
          ctx.moveTo(fromPts[i][0], fromPts[i][1]);
          ctx.lineTo(toPts[o][0], toPts[o][1]);
          ctx.stroke();
        }
      }
    }

    // Draw nodes with live activation
    const inLabels = brain.recurrent
      ? ["L60", "L30", "FWD", "R30", "R60", "SPD", "M_S", "M_T"]
      : ["L60", "L30", "FWD", "R30", "R60", "SPD"];
    const outLabels = ["STEER", "THROT"];

    for (let c = 0; c < cols; c++) {
      const vals = c === 0 ? brain.lastInputs : brain.layers[c - 1].lastOutputs;
      const radius = layerSizes[c] >= 9 ? 5.2 : 6.5;
      for (let r = 0; r < layerSizes[c]; r++) {
        const [x, y] = nodePositions[c][r];
        const act = vals[r] || 0;
        const mag = Math.min(1, Math.abs(act));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = act >= 0 ? `rgba(34, 197, 94, ${0.2 + mag * 0.8})` : `rgba(239, 68, 68, ${0.2 + mag * 0.8})`;
        ctx.fill();
        ctx.strokeStyle = pal.nodeStroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = pal.nodeLabel;
        ctx.font = "9px ui-monospace, monospace";
        if (c === 0 && inLabels[r]) {
          ctx.textAlign = "right";
          ctx.fillText(inLabels[r], x - 9, y + 3);
        } else if (c === cols - 1 && outLabels[r]) {
          ctx.textAlign = "left";
          ctx.fillText(outLabels[r], x + 9, y + 3);
        }
      }
    }
  }

  function drawFitnessChart(ctx, width, height, history, theme = "dark", waitingText = "Waiting for generation 1...") {
    ({ width, height } = syncCanvasHiDPI(ctx, width, height));
    const pal = getPal(theme);
    ctx.clearRect(0, 0, width, height);
    if (history.length === 0) {
      ctx.fillStyle = pal.axisText;
      ctx.font = "11px ui-sans-serif, sans-serif";
      ctx.fillText(waitingText, 12, height / 2);
      return;
    }

    const pad = { l: 48, r: 10, t: 10, b: 18 };
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    const maxFit = Math.max(100, ...history.map((d) => d.best));

    ctx.strokeStyle = pal.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + h);
    ctx.lineTo(pad.l + w, pad.t + h);
    ctx.stroke();

    ctx.fillStyle = pal.axisText;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxFit)), pad.l - 5, pad.t + 8);
    ctx.fillText("0", pad.l - 5, pad.t + h);
    ctx.textAlign = "left";

    const plotLine = (key, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      history.forEach((d, idx) => {
        const x = pad.l + (history.length === 1 ? w / 2 : (idx / (history.length - 1)) * w);
        const y = pad.t + h - (d[key] / maxFit) * h;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    plotLine("avg", pal.avgLine);
    plotLine("best", "#16a34a");
  }

  const MODEL_COLORS = {
    mlp_tiny: "#94a3b8",
    mlp_small: "#22c55e",
    mlp_wide: "#3b82f6",
    mlp_deep: "#f59e0b",
    rnn_memory: "#ec4899",
  };

  function drawMultiModelChart(ctx, width, height, seriesMap, theme = "dark", waitingText = "Click 'Run 5-Model Benchmark' to compare curves") {
    ({ width, height } = syncCanvasHiDPI(ctx, width, height));
    const pal = getPal(theme);
    ctx.clearRect(0, 0, width, height);
    const entries = Object.entries(seriesMap || {}).filter(([, arr]) => arr && arr.length > 0);
    if (entries.length === 0) {
      ctx.fillStyle = pal.axisText;
      ctx.font = "12px ui-sans-serif, sans-serif";
      ctx.fillText(waitingText, 16, height / 2);
      return;
    }

    const pad = { l: 48, r: 14, t: 14, b: 22 };
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    let maxFit = 200;
    let maxGens = 2;
    for (const [, arr] of entries) {
      if (arr.length > maxGens) maxGens = arr.length;
      for (const v of arr) if (v > maxFit) maxFit = v;
    }

    ctx.strokeStyle = pal.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + h);
    ctx.lineTo(pad.l + w, pad.t + h);
    ctx.stroke();

    ctx.fillStyle = pal.axisText;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxFit)), pad.l - 5, pad.t + 8);
    ctx.fillText("0", pad.l - 5, pad.t + h);
    ctx.textAlign = "left";
    ctx.fillText("Gen 1", pad.l, height - 6);
    ctx.textAlign = "right";
    ctx.fillText(`Gen ${maxGens}`, pad.l + w, height - 6);
    ctx.textAlign = "left";

    for (const [modelId, arr] of entries) {
      ctx.strokeStyle = MODEL_COLORS[modelId] || "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      arr.forEach((val, idx) => {
        const x = pad.l + (maxGens === 1 ? w / 2 : (idx / (maxGens - 1)) * w);
        const y = pad.t + h - (val / maxFit) * h;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  global.NeuroViz = { drawTrackAndCars, drawNetwork, drawFitnessChart, drawMultiModelChart, MODEL_COLORS };
})(window);
