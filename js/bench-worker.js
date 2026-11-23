// Web Worker for non-blocking 5-Model Head-to-Head Neuroevolution Benchmark
importScripts("nn.js", "tracks.js", "car.js");

const { NeuralNetwork, MODEL_SPECS } = self.NeuroNN;
const { Car } = self.NeuroCar;

function pickParent(sortedCars) {
  const poolSize = Math.max(2, Math.floor(sortedCars.length * 0.5));
  let best = sortedCars[Math.floor(Math.random() * poolSize)];
  for (let i = 0; i < 3; i++) {
    const cand = sortedCars[Math.floor(Math.random() * poolSize)];
    if (cand.fitness > best.fitness) best = cand;
  }
  return best;
}

function runSingleModel(modelId, track, gens, pop, mutRate, rewardMode) {
  let brains = Array.from({ length: pop }, () => new NeuralNetwork(modelId));
  const genBestSeries = [];
  let overallBestBrain = brains[0].clone();
  let overallBestFit = -1;
  let overallBestLaps = 0;

  for (let g = 1; g <= gens; g++) {
    const simCars = brains.map((b) => new Car(track.startPos, track.startAngle, b));
    for (let tick = 0; tick < 520; tick++) {
      let alive = 0;
      for (const c of simCars) {
        if (c.alive) {
          c.update(track, rewardMode);
          if (c.alive) alive++;
        }
      }
      if (alive === 0) break;
    }
    simCars.sort((a, b) => b.fitness - a.fitness);
    const top = simCars[0];
    genBestSeries.push(top.fitness);
    if (top.fitness > overallBestFit) {
      overallBestFit = top.fitness;
      overallBestLaps = top.laps;
      overallBestBrain = top.brain.clone();
    }
    const next = [simCars[0].brain.clone(), simCars[1].brain.clone()];
    while (next.length < pop) {
      const p1 = pickParent(simCars);
      const p2 = pickParent(simCars);
      const child =
        Math.random() < 0.65
          ? NeuralNetwork.crossover(p1.brain, p2.brain)
          : p1.brain.clone();
      child.mutate(mutRate, 0.35);
      next.push(child);
    }
    brains = next;
  }

  return {
    genBestSeries,
    overallBestBrainJSON: overallBestBrain.toJSON(),
    overallBestFit,
    overallBestLaps,
  };
}

self.onmessage = function (e) {
  const { track, gens = 8, pop = 24, mutRate = 0.15, rewardMode = "balanced" } = e.data || {};
  const modelIds = Object.keys(MODEL_SPECS);
  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i];
    self.postMessage({ type: "status", modelId, idx: i, total: modelIds.length });
    const res = runSingleModel(modelId, track, gens, pop, mutRate, rewardMode);
    self.postMessage({ type: "result", modelId, idx: i, total: modelIds.length, res });
  }
  self.postMessage({ type: "done" });
};
