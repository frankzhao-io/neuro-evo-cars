// Automated Node.js Benchmark & Smoke Verification (5 Models x 7 Preset Tracks)
const { NeuralNetwork, MODEL_SPECS } = require("../js/nn.js");
const { PRESET_DEFS, getPresetTrack } = require("../js/tracks.js");
const { Car } = require("../js/car.js");

function pickParent(sortedCars) {
  const poolSize = Math.max(2, Math.floor(sortedCars.length * 0.5));
  let best = sortedCars[Math.floor(Math.random() * poolSize)];
  for (let i = 0; i < 3; i++) {
    const cand = sortedCars[Math.floor(Math.random() * poolSize)];
    if (cand.fitness > best.fitness) best = cand;
  }
  return best;
}

function evolveModel(modelId, track, gens = 10, pop = 24, rewardMode = "balanced") {
  let brains = Array.from({ length: pop }, () => new NeuralNetwork(modelId));
  let bestFit = 0;
  let bestLaps = 0;
  for (let g = 1; g <= gens; g++) {
    const cars = brains.map((b) => new Car(track.startPos, track.startAngle, b));
    for (let tick = 0; tick < 520; tick++) {
      let alive = 0;
      for (const c of cars) {
        if (c.alive) {
          c.update(track, rewardMode);
          if (c.alive) alive++;
        }
      }
      if (alive === 0) break;
    }
    cars.sort((a, b) => b.fitness - a.fitness);
    if (cars[0].fitness > bestFit) {
      bestFit = cars[0].fitness;
      bestLaps = cars[0].laps;
    }
    const next = [cars[0].brain.clone(), cars[1].brain.clone()];
    while (next.length < pop) {
      const p1 = pickParent(cars);
      const p2 = pickParent(cars);
      const child = Math.random() < 0.65 ? NeuralNetwork.crossover(p1.brain, p2.brain) : p1.brain.clone();
      child.mutate(0.15, 0.35);
      next.push(child);
    }
    brains = next;
  }
  return { bestFit: Math.round(bestFit), bestLaps };
}

const modelIds = Object.keys(MODEL_SPECS);
const trackIds = Object.keys(PRESET_DEFS);

console.log("| Track | " + modelIds.map((id) => id).join(" | ") + " |");
console.log("|---" + modelIds.map(() => "|---:").join("") + "|");

for (const tId of trackIds) {
  const track = getPresetTrack(tId);
  const scores = modelIds.map((mId) => {
    const res = evolveModel(mId, track, 10, 24, "balanced");
    return `${res.bestFit} (${res.bestLaps}L)`;
  });
  console.log(`| ${tId} | ${scores.join(" | ")} |`);
}

// Verify all 3 reward modes run cleanly without NaN
for (const mode of ["balanced", "speed", "smooth"]) {
  const res = evolveModel("mlp_small", getPresetTrack("oval"), 2, 10, mode);
  if (!Number.isFinite(res.bestFit)) {
    throw new Error(`Invalid fitness in rewardMode=${mode}`);
  }
}
console.log("\nAll 35 track x model combinations + 3 reward modes verified OK.");
