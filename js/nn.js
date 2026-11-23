// Neural Network Architectures & Neuroevolution Operators (Zero-Dependency)
(function (global) {
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  class Layer {
    constructor(inputSize, outputSize) {
      this.inputSize = inputSize;
      this.outputSize = outputSize;
      this.weights = Array.from({ length: outputSize }, () =>
        Array.from({ length: inputSize }, () => randn() * Math.sqrt(2 / inputSize))
      );
      this.biases = Array.from({ length: outputSize }, () => 0);
      this.lastOutputs = new Array(outputSize).fill(0);
    }

    forward(inputs, activation = "tanh") {
      const out = new Array(this.outputSize);
      for (let o = 0; o < this.outputSize; o++) {
        let sum = this.biases[o];
        const wRow = this.weights[o];
        for (let i = 0; i < this.inputSize; i++) {
          sum += inputs[i] * wRow[i];
        }
        out[o] = activation === "relu" ? Math.max(0, sum) : activation === "tanh" ? Math.tanh(sum) : sum;
      }
      this.lastOutputs = out;
      return out;
    }

    clone() {
      const copy = new Layer(this.inputSize, this.outputSize);
      copy.weights = this.weights.map((row) => [...row]);
      copy.biases = [...this.biases];
      return copy;
    }
  }

  const MODEL_SPECS = {
    mlp_tiny: {
      id: "mlp_tiny",
      name: "Linear Perceptron (6 -> 2)",
      desc: "No hidden layer — great baseline to see why hidden layers matter",
      layerSizes: [6, 2],
      recurrent: false,
      hiddenAct: "tanh",
    },
    mlp_small: {
      id: "mlp_small",
      name: "Small MLP (6 -> 6 -> 2)",
      desc: "Fastest convergence on standard curves",
      layerSizes: [6, 6, 2],
      recurrent: false,
      hiddenAct: "tanh",
    },
    mlp_wide: {
      id: "mlp_wide",
      name: "Wide ReLU MLP (6 -> 12 -> 2)",
      desc: "Wide ReLU hidden layer for crisp piecewise steering",
      layerSizes: [6, 12, 2],
      recurrent: false,
      hiddenAct: "relu",
    },
    mlp_deep: {
      id: "mlp_deep",
      name: "Deep MLP (6 -> 10 -> 6 -> 2)",
      desc: "Two hidden layers for sharp chicanes",
      layerSizes: [6, 10, 6, 2],
      recurrent: false,
      hiddenAct: "tanh",
    },
    rnn_memory: {
      id: "rnn_memory",
      name: "Memory RNN (6+2 -> 8 -> 2)",
      desc: "Feeds previous steering/throttle back as context",
      layerSizes: [8, 8, 2],
      recurrent: true,
      hiddenAct: "tanh",
    },
  };

  class NeuralNetwork {
    constructor(modelId = "mlp_small") {
      this.modelId = MODEL_SPECS[modelId] ? modelId : "mlp_small";
      const spec = MODEL_SPECS[this.modelId];
      this.recurrent = spec.recurrent;
      this.hiddenAct = spec.hiddenAct || "tanh";
      this.layerSizes = [...spec.layerSizes];
      this.layers = [];
      for (let i = 0; i < this.layerSizes.length - 1; i++) {
        this.layers.push(new Layer(this.layerSizes[i], this.layerSizes[i + 1]));
      }
      this.prevOut = [0, 0];
      this.lastInputs = new Array(this.layerSizes[0]).fill(0);
    }

    predict(sensorInputs) {
      const fullIn = this.recurrent ? [...sensorInputs, ...this.prevOut] : [...sensorInputs];
      this.lastInputs = fullIn;
      let cur = fullIn;
      for (let i = 0; i < this.layers.length; i++) {
        const act = i < this.layers.length - 1 ? this.hiddenAct : "tanh";
        cur = this.layers[i].forward(cur, act);
      }
      this.prevOut = cur;
      return cur; // [steer (-1..1), throttle (-1..1)]
    }

    resetMemory() {
      this.prevOut = [0, 0];
    }

    clone() {
      const copy = new NeuralNetwork(this.modelId);
      copy.layers = this.layers.map((l) => l.clone());
      return copy;
    }

    mutate(rate = 0.15, strength = 0.35) {
      for (const layer of this.layers) {
        for (let o = 0; o < layer.outputSize; o++) {
          if (Math.random() < rate) {
            layer.biases[o] += randn() * strength;
          }
          for (let i = 0; i < layer.inputSize; i++) {
            if (Math.random() < rate) {
              if (Math.random() < 0.08) {
                layer.weights[o][i] = randn();
              } else {
                layer.weights[o][i] += randn() * strength;
              }
            }
          }
        }
      }
    }

    static crossover(parentA, parentB) {
      const child = parentA.clone();
      if (parentA.modelId !== parentB.modelId) return child;
      for (let l = 0; l < child.layers.length; l++) {
        const la = child.layers[l];
        const lb = parentB.layers[l];
        for (let o = 0; o < la.outputSize; o++) {
          if (Math.random() < 0.5) la.biases[o] = lb.biases[o];
          for (let i = 0; i < la.inputSize; i++) {
            if (Math.random() < 0.5) la.weights[o][i] = lb.weights[o][i];
          }
        }
      }
      return child;
    }

    toJSON() {
      return {
        modelId: this.modelId,
        layers: this.layers.map((l) => ({ weights: l.weights, biases: l.biases })),
      };
    }

    static fromJSON(obj) {
      if (!obj || typeof obj !== "object") throw new Error("Invalid brain JSON");
      const nn = new NeuralNetwork(obj.modelId || "mlp_small");
      if (!Array.isArray(obj.layers) || obj.layers.length !== nn.layers.length) {
        throw new Error("Layer count mismatch");
      }
      for (let i = 0; i < nn.layers.length; i++) {
        const src = obj.layers[i];
        const dst = nn.layers[i];
        if (
          !src ||
          !Array.isArray(src.weights) ||
          src.weights.length !== dst.outputSize ||
          !Array.isArray(src.biases) ||
          src.biases.length !== dst.outputSize
        ) {
          throw new Error("Invalid layer dimensions");
        }
        dst.weights = src.weights.map((row) => {
          if (!Array.isArray(row) || row.length !== dst.inputSize || !row.every(Number.isFinite)) {
            throw new Error("Invalid weight row");
          }
          return [...row];
        });
        if (!src.biases.every(Number.isFinite)) throw new Error("Invalid biases");
        dst.biases = [...src.biases];
      }
      return nn;
    }
  }

  global.NeuroNN = { NeuralNetwork, MODEL_SPECS };
  if (typeof module !== "undefined" && module.exports) module.exports = global.NeuroNN;
})(typeof window !== "undefined" ? window : globalThis);
