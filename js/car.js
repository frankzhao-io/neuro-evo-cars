// 2D Car Physics, 5-Ray LiDAR Sensors & Checkpoint Fitness
(function (global) {
  const { NeuralNetwork } = global.NeuroNN || require("./nn.js");

  const SENSOR_ANGLES = [-1.05, -0.52, 0, 0.52, 1.05]; // -60, -30, 0, +30, +60 deg
  const SENSOR_RANGE = 165;

  function segIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const rX = bx - ax, rY = by - ay;
    const sX = dx - cx, sY = dy - cy;
    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 1e-8) return null;
    const u = ((cx - ax) * rY - (cy - ay) * rX) / denom;
    const t = ((cx - ax) * sY - (cy - ay) * sX) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { t, x: ax + t * rX, y: ay + t * rY };
    }
    return null;
  }

  class Car {
    constructor(startPos, startAngle, brainOrModelId = "mlp_small") {
      this.x = startPos[0];
      this.y = startPos[1];
      this.angle = startAngle;
      this.speed = 0;
      this.maxSpeed = 4.6;
      this.width = 18;
      this.height = 10;

      this.brain =
        brainOrModelId instanceof NeuralNetwork
          ? brainOrModelId
          : new NeuralNetwork(brainOrModelId);
      this.brain.resetMemory();

      this.alive = true;
      this.nextCheckpoint = 1;
      this.checkpointsPassed = 0;
      this.laps = 0;
      this.ticksAlive = 0;
      this.ticksSinceCheckpoint = 0;
      this.distanceTraveled = 0;
      this.fitness = 0;
      this.lastSteer = 0;
      this.lastThrottle = 0;
      this.steerJerk = 0;
      this.speedSum = 0;
      this.modelColor = null;
      this.label = null;

      this.rays = SENSOR_ANGLES.map(() => ({
        hitX: this.x,
        hitY: this.y,
        dist: SENSOR_RANGE,
      }));
    }

    _getCorners() {
      const hw = this.width / 2;
      const hh = this.height / 2;
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const local = [
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
        [-hw, -hh],
      ];
      return local.map(([lx, ly]) => [
        this.x + lx * cos - ly * sin,
        this.y + lx * sin + ly * cos,
      ]);
    }

    _castSensors(track) {
      const walls = track.walls;
      const boxes = track.wallBoxes;
      const inputs = new Array(6);
      for (let r = 0; r < SENSOR_ANGLES.length; r++) {
        const ang = this.angle + SENSOR_ANGLES[r];
        const ex = this.x + Math.cos(ang) * SENSOR_RANGE;
        const ey = this.y + Math.sin(ang) * SENSOR_RANGE;
        const rMinX = this.x < ex ? this.x : ex;
        const rMaxX = this.x > ex ? this.x : ex;
        const rMinY = this.y < ey ? this.y : ey;
        const rMaxY = this.y > ey ? this.y : ey;
        let minT = 1.0;
        let hitX = ex;
        let hitY = ey;

        for (let w = 0; w < walls.length; w++) {
          if (boxes) {
            const b = boxes[w];
            if (b[2] < rMinX || b[0] > rMaxX || b[3] < rMinY || b[1] > rMaxY) continue;
          }
          const [p1, p2] = walls[w];
          const hit = segIntersect(this.x, this.y, ex, ey, p1[0], p1[1], p2[0], p2[1]);
          if (hit && hit.t < minT) {
            minT = hit.t;
            hitX = hit.x;
            hitY = hit.y;
          }
        }
        this.rays[r].hitX = hitX;
        this.rays[r].hitY = hitY;
        this.rays[r].dist = minT * SENSOR_RANGE;
        inputs[r] = 1.0 - minT;
      }
      inputs[5] = this.speed / this.maxSpeed;
      return inputs;
    }

    update(track, rewardMode = "balanced", manualControl = null) {
      if (!this.alive) return;
      this.ticksAlive++;
      this.ticksSinceCheckpoint++;

      const prevX = this.x;
      const prevY = this.y;

      const inputs = this._castSensors(track);
      const [steer, throttle] = manualControl
        ? [manualControl.steer, manualControl.throttle]
        : this.brain.predict(inputs);

      this.steerJerk += Math.abs(steer - this.lastSteer);
      this.lastSteer = steer;
      this.lastThrottle = throttle;

      // Update speed & steering
      this.speed += throttle * 0.28 + 0.08; // slight forward bias helps early evolution
      this.speed *= 0.96;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
      if (this.speed < 0.25) this.speed = 0.25;
      this.speedSum += this.speed;

      const turnFactor = Math.min(1, this.speed / 1.8);
      this.angle += steer * 0.075 * turnFactor;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.distanceTraveled += Math.hypot(this.x - prevX, this.y - prevY);

      // Check checkpoint crossing
      const cp = track.checkpoints[this.nextCheckpoint];
      if (cp && segIntersect(prevX, prevY, this.x, this.y, cp[0][0], cp[0][1], cp[1][0], cp[1][1])) {
        this.checkpointsPassed++;
        this.ticksSinceCheckpoint = 0;
        this.nextCheckpoint = (this.nextCheckpoint + 1) % track.checkpoints.length;
        if (this.nextCheckpoint === 0) this.laps++;
      }

      // Cull stalled or backwards-circling cars
      if (this.ticksSinceCheckpoint > 140) {
        this.alive = false;
      }

      // Wall collision check using car bounding box edges + AABB broadphase
      if (this.alive) {
        const corners = this._getCorners();
        const cMinX = Math.min(corners[0][0], corners[1][0], corners[2][0], corners[3][0]);
        const cMaxX = Math.max(corners[0][0], corners[1][0], corners[2][0], corners[3][0]);
        const cMinY = Math.min(corners[0][1], corners[1][1], corners[2][1], corners[3][1]);
        const cMaxY = Math.max(corners[0][1], corners[1][1], corners[2][1], corners[3][1]);
        const boxes = track.wallBoxes;
        for (let w = 0; w < track.walls.length; w++) {
          if (boxes) {
            const b = boxes[w];
            if (b[2] < cMinX || b[0] > cMaxX || b[3] < cMinY || b[1] > cMaxY) continue;
          }
          const [w1, w2] = track.walls[w];
          for (let c = 0; c < 4; c++) {
            const a = corners[c];
            const b = corners[(c + 1) % 4];
            if (segIntersect(a[0], a[1], b[0], b[1], w1[0], w1[1], w2[0], w2[1])) {
              this.alive = false;
              break;
            }
          }
          if (!this.alive) break;
        }
      }

      // Fitness rewards checkpoints primarily, shaped by selected reward mode
      const baseFit = this.checkpointsPassed * 100 + this.distanceTraveled * 0.05;
      if (rewardMode === "speed") {
        const avgSpd = this.speedSum / Math.max(1, this.ticksAlive);
        this.fitness = this.checkpointsPassed * 100 + this.distanceTraveled * 0.08 + avgSpd * 12;
      } else if (rewardMode === "smooth") {
        this.fitness = Math.max(0, baseFit - this.steerJerk * 1.4);
      } else {
        this.fitness = baseFit;
      }
    }
  }

  global.NeuroCar = { Car, SENSOR_RANGE };
  if (typeof module !== "undefined" && module.exports) module.exports = global.NeuroCar;
})(typeof window !== "undefined" ? window : globalThis);
