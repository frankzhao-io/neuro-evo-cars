// Main Simulation & Neuroevolution Controller
(function () {
  const { NeuralNetwork, MODEL_SPECS } = window.NeuroNN;
  const { getPresetTrack, resampleClosedStroke, buildTrackFromCenterline, PRESET_DEFS } = window.TrackFactory;
  const { Car } = window.NeuroCar;
  const { drawTrackAndCars, drawNetwork, drawFitnessChart, drawMultiModelChart, MODEL_COLORS } = window.NeuroViz;

  const trackCanvas = document.getElementById("track-canvas");
  const trackCtx = trackCanvas.getContext("2d");
  const nnCanvas = document.getElementById("nn-canvas");
  const nnCtx = nnCanvas.getContext("2d");
  const chartCanvas = document.getElementById("chart-canvas");
  const chartCtx = chartCanvas.getContext("2d");
  const benchChartCanvas = document.getElementById("bench-chart-canvas");
  const benchChartCtx = benchChartCanvas.getContext("2d");
  const btnRunBench = document.getElementById("btn-run-bench");
  const benchStatusEl = document.getElementById("bench-status");
  const benchLegendEl = document.getElementById("bench-legend");
  const btnHelpBench = document.getElementById("btn-help-bench");
  const helpBenchBox = document.getElementById("help-bench-box");

  const statGen = document.getElementById("stat-gen");
  const statAlive = document.getElementById("stat-alive");
  const statBest = document.getElementById("stat-best");
  const statLaps = document.getElementById("stat-laps");

  const btnToggleRun = document.getElementById("btn-toggle-run");
  const btnNextGen = document.getElementById("btn-next-gen");
  const btnReset = document.getElementById("btn-reset");
  const btnAllStar = document.getElementById("btn-allstar");
  const btnHumanPk = document.getElementById("btn-human-pk");
  const selSpeed = document.getElementById("sel-speed");
  const chkRays = document.getElementById("chk-rays");
  const chkCp = document.getElementById("chk-cp");
  const chkTrails = document.getElementById("chk-trails");

  const selTrack = document.getElementById("sel-track");
  const btnDrawTrack = document.getElementById("btn-draw-track");
  const btnExportTrack = document.getElementById("btn-export-track");
  const btnImportTrack = document.getElementById("btn-import-track");
  const fileImportTrack = document.getElementById("file-import-track");
  const drawBanner = document.getElementById("draw-banner");
  const selModel = document.getElementById("sel-model");
  const selReward = document.getElementById("sel-reward");
  const selBenchGens = document.getElementById("sel-bench-gens");
  const modelDesc = document.getElementById("model-desc");
  const rngPop = document.getElementById("rng-pop");
  const lblPop = document.getElementById("lbl-pop");
  const rngMut = document.getElementById("rng-mut");
  const lblMut = document.getElementById("lbl-mut");
  const btnSaveBrain = document.getElementById("btn-save-brain");
  const btnLoadBrain = document.getElementById("btn-load-brain");
  const btnExportBrain = document.getElementById("btn-export-brain");
  const btnImportBrain = document.getElementById("btn-import-brain");
  const fileImportBrain = document.getElementById("file-import-brain");
  const brainStatus = document.getElementById("brain-status");
  const probeSlidersEl = document.getElementById("probe-sliders");
  const btnRunGenTest = document.getElementById("btn-run-gen-test");
  const genTestOutputEl = document.getElementById("gen-test-output");
  const logListEl = document.getElementById("log-list");
  const btnExportLog = document.getElementById("btn-export-log");
  const btnClearLog = document.getElementById("btn-clear-log");

  const btnGuide = document.getElementById("btn-guide");
  const btnTheme = document.getElementById("btn-theme");
  const pageLangEn = document.getElementById("page-lang-en");
  const pageLangZh = document.getElementById("page-lang-zh");
  const guideModal = document.getElementById("guide-modal");
  const btnCloseGuide = document.getElementById("btn-close-guide");
  const guideLangEn = document.getElementById("guide-lang-en");
  const guideLangZh = document.getElementById("guide-lang-zh");
  const guideTitle = document.getElementById("guide-title");
  const guideBody = document.getElementById("guide-body");
  const liveCoach = document.getElementById("live-coach");
  const btnHelpBrain = document.getElementById("btn-help-brain");
  const helpBrainBox = document.getElementById("help-brain-box");
  const btnHelpChart = document.getElementById("btn-help-chart");
  const helpChartBox = document.getElementById("help-chart-box");

  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSetStorage(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  let currentTheme = safeGetStorage("neuro_evo_theme") === "dark" ? "dark" : "light";
  let currentLang = safeGetStorage("neuro_evo_lang") === "zh" ? "zh" : "en";

  const PAGE_I18N = {
    en: {
      subtitle: "2D autonomous racing trained in real time via neuroevolution + 5-ray LiDAR",
      statGen: "GEN", statAlive: "ALIVE", statBest: "BEST", statLaps: "LAPS",
      pause: "Pause", resume: "Resume", nextGen: "Next Gen", reset: "Reset",
      allStar: "All-Star Race", allStarOn: "Exit All-Star",
      humanPk: "Human PK", humanPkOn: "Exit PK",
      speed: "Speed", lidar: "LiDAR", checkpoints: "Checkpoints", trails: "Trails",
      drawBanner: "Draw a closed loop on the canvas, then release to generate track",
      cardTrack: "Track & Map", drawCustom: "Draw Custom",
      exportTrack: "Export Track", importTrack: "Import Track",
      rewardTxt: "Reward Strategy",
      rewards: {
        balanced: "Balanced (Checkpoints + Distance)",
        speed: "Speed Focus (High-Speed Bonus)",
        smooth: "Smooth Apex (Penalize Zig-Zag)",
      },
      exportBtn: "Export", importBtn: "Import",
      exportedBrain: "Exported {model} JSON",
      exportedTrack: "Exported track JSON",
      importedTrack: "Imported custom track",
      invalidTrack: "Invalid track JSON",
      allStarCoach: "All-Star Race (5 Models Live): {summary}",
      humanPkCoach: "Human PK Active — Use WASD or Arrow Keys to race against AI!",
      insGen: "Cross-Track Generalization Test",
      insGenDesc: "Evaluate the current champion (or active model) on all 7 preset tracks to test if it truly learned wall avoidance vs. memorizing one map.",
      runGenTestBtn: "Test All 7 Tracks",
      genTestEmpty: "Click 'Test All 7 Tracks' to measure cross-track generalization.",
      customProbeVerdict: "Custom LiDAR vector — compare steer/throttle spread across models",
      tracks: {
        oval: "Oval Speedring (Easy)",
        kidney: "Kidney Sweeper (Medium)",
        scurve: "S-Curve Circuit (Medium)",
        monza: "Double Chicane GP (Hard)",
        hairpin: "Hairpin Chicane (Hard)",
        technical: "Technical Apex Loop (Expert)",
        spiral: "Narrow Canyon (Expert)",
        custom: "Custom Track",
      },
      cardModel: "Neural Network Model",
      models: {
        mlp_tiny: "Linear Perceptron (6 -> 2)",
        mlp_small: "Small MLP (6 -> 6 -> 2)",
        mlp_wide: "Wide ReLU MLP (6 -> 12 -> 2)",
        mlp_deep: "Deep MLP (6 -> 10 -> 6 -> 2)",
        rnn_memory: "Memory RNN (6+2 -> 8 -> 2)",
      },
      modelDesc: {
        mlp_tiny: "No hidden layer — great baseline to see why hidden layers matter",
        mlp_small: "Fastest convergence on standard curves",
        mlp_wide: "Wide ReLU hidden layer for crisp piecewise steering",
        mlp_deep: "Two hidden layers for sharp chicanes",
        rnn_memory: "Feeds previous steering/throttle back as context",
      },
      pop: "Population", mut: "Mutation Rate",
      cardBrain: "Champion Brain (Live)", save: "Save", load: "Load",
      brainHint: "Green = positive activation, Red = negative",
      cardChart: "Fitness History (Best vs. Avg)",
      cardLog: "Training Log", clearLog: "Clear", logEmpty: "No events recorded yet.",
      guideBtn: "Guide", closeBtn: "Close",
      themeToLight: "Theme: Dark", themeToDark: "Theme: Light",
      helpBrain: "Left (L60..SPD): 5 LiDAR wall sensors + speed. Middle: hidden neurons. Right (STEER / THROT): steering left/right and gas/brake.",
      helpChart: "Fitness = checkpoints passed x 100 + distance. Green line = best car per generation; gray line = population average.",
      helpBench: "X-axis: Generation (1 -> 8). Y-axis: Best Fitness (checkpoints x 100 + distance). Steep early climb = fast convergence; higher peak = stronger cornering ceiling (Linear Perceptron usually plateaus early on sharp turns).",
      coachGen1: "Gen 1: Cars start with random weights. Switch Speed to 5x or 15x to watch them learn.",
      coachLearning: "Gen {gen}: Evolution in progress (best fitness {fit}). Cars are learning to stay off walls.",
      coachCornering: "Gen {gen}: Leading car is smoothly navigating corners (best fitness {fit}).",
      coachLap: "Gen {gen}: Complete lap achieved ({laps} laps). Try Save -> switch to a harder track -> Load!",
      waitingChart: "Waiting for generation 1...",
      savedBrain: "Saved {model} (Gen {gen})",
      noSavedBrain: "No saved brain found",
      loadedBrain: "Loaded saved {model}",
      invalidBrain: "Failed to parse saved brain",
      strokeTooShort: "Stroke too short — draw a larger closed loop",
      tabSim: "Simulation", tabInsights: "Model Insights",
      insModels: "Model Architectures & Behavior",
      insProbe: "Side-by-Side Decision Probe (All Models)",
      insProbeDesc: "Compare how each model reacts to the same synthetic LiDAR scenario (run the 5-Model Benchmark above to test trained brains side-by-side):",
      insBench: "Model Comparison Leaderboard",
      benchTitle: "Head-to-Head 5-Model Benchmark",
      benchSub: "Train all 5 architectures side-by-side on the current track (8 generations each) and compare curves & steering decisions.",
      runBenchBtn: "Run 5-Model Benchmark",
      runningBench: "Running {cur}/5: {model}...",
      benchDone: "Done ({track})",
      benchWait: "Click 'Run 5-Model Benchmark' to compare all 5 models on this track.",
      probeLeft: "Left Wall Close", probeRight: "Right Wall Close",
      probeFront: "Front Wall Ahead", probeOpen: "Open Straight",
      lbEmpty: "Run at least 1 generation (or switch models) to record benchmark stats.",
      lbHeaders: ["Model", "Track", "Best Fit", "Laps", "Gen"],
      activeTag: "Active",
      paramsLabel: "params",
      steerOut: "Steer", throtOut: "Throttle",
      steerLeft: "Turn Left", steerRight: "Turn Right", steerStraight: "Straight",
      throtAccel: "Accelerate", throtBrake: "Slow / Brake",
      insightsDetail: {
        mlp_tiny: "Computes a single weighted sum of the 6 inputs. Because steering decisions in S-curves and hairpins are non-linear (e.g., high speed + front wall requires sharper turn than low speed), it often hits walls on complex tracks.",
        mlp_small: "Adds one 6-neuron tanh hidden layer. Smoothly combines left/right LiDAR asymmetry with current speed, making it the fastest model to learn standard tracks in 3-6 generations.",
        mlp_wide: "Uses 12 ReLU hidden neurons (clamp negative values to 0). Creates sharper piecewise-linear decision boundaries, ideal for sudden chicanes like Double Chicane GP.",
        mlp_deep: "Stacks two hidden layers (10 -> 6). Higher capacity allows composing multi-step strategies (brake early before a hairpin, then accelerate out), though it needs a few more generations to converge.",
        rnn_memory: "Feeds its previous steering & throttle output back into the input layer. This short-term memory helps maintain smooth turn arcs when passing narrow canyon walls.",
      },
      modelTags: {
        mlp_tiny: "Convergence: Fast | Nonlinear: None | Best for: Oval",
        mlp_small: "Convergence: Fastest | Nonlinear: 1-Layer tanh | Best for: All-round",
        mlp_wide: "Convergence: Fast | Nonlinear: 12x ReLU | Best for: Double Chicane",
        mlp_deep: "Convergence: Slower | Nonlinear: 2-Layer tanh | Best for: Hairpins",
        rnn_memory: "Convergence: Medium | Memory: Yes (RNN) | Best for: Narrow Canyon",
      },
      verdicts: {
        leftOk: "Correct: steering right away from left wall",
        leftWarn: "Not learned yet: still steering toward left wall",
        rightOk: "Correct: steering left away from right wall",
        rightWarn: "Not learned yet: still steering toward right wall",
        frontOk: "Correct: slowing and turning away from front wall",
        frontMid: "Turning away, though throttle remains high",
        frontWarn: "Not learned yet: heading toward front wall",
        openOk: "Correct: holding straight and accelerating",
        openWarn: "Wandering or slowing on an open straight",
      },
    },
    zh: {
      subtitle: "結合神經網路進化與 5 束 LiDAR 雷射的即時 2D 自駕賽車沙盒",
      statGen: "世代", statAlive: "存活", statBest: "最高分", statLaps: "圈數",
      pause: "暫停", resume: "繼續", nextGen: "下一代", reset: "重設",
      allStar: "5 模型競速", allStarOn: "退出競速",
      humanPk: "玩家 PK", humanPkOn: "退出 PK",
      speed: "速度", lidar: "雷射線", checkpoints: "檢查點", trails: "軌跡熱圖",
      drawBanner: "在畫布上畫一個封閉圈，放開滑鼠即可生成賽道",
      cardTrack: "賽道與地圖", drawCustom: "手繪賽道",
      exportTrack: "匯出賽道", importTrack: "匯入賽道",
      rewardTxt: "獎勵函數策略",
      rewards: {
        balanced: "均衡模式（檢查點＋距離）",
        speed: "極速優先（高車速額外加分）",
        smooth: "平順切彎（懲罰左右蛇行抖動）",
      },
      exportBtn: "匯出", importBtn: "匯入",
      exportedBrain: "已匯出 {model} JSON",
      exportedTrack: "已匯出賽道 JSON",
      importedTrack: "已匯入自訂賽道",
      invalidTrack: "賽道 JSON 格式無效",
      allStarCoach: "5 模型同場競速中：{summary}",
      humanPkCoach: "玩家 PK 模式：用 WASD 或方向鍵親自駕駛與 AI 同場對決！",
      insGen: "跨賽道泛化能力測試",
      insGenDesc: "把目前冠軍（或使用中模型）直接丟到全 7 張預設賽道實測，檢驗它是「真正學會避障」還是只會死背單一地圖。",
      runGenTestBtn: "一鍵測試全 7 條賽道",
      genTestEmpty: "點擊「一鍵測試全 7 條賽道」檢視跨賽道完成率。",
      customProbeVerdict: "自訂感測器數值 — 直接觀察各模型轉向與油門差異",
      tracks: {
        oval: "橢圓高速環道（簡單）",
        kidney: "不對稱大彎環道（中等）",
        scurve: "S 型連續彎道（中等）",
        monza: "雙減速彎 GP 賽道（困難）",
        hairpin: "髮夾急彎挑戰（困難）",
        technical: "複合技術彎道（專家）",
        spiral: "窄道蛇行峽谷（專家）",
        custom: "自訂手繪賽道",
      },
      cardModel: "神經網路模型",
      models: {
        mlp_tiny: "線性感知器 (6 -> 2)",
        mlp_small: "輕量 MLP (6 -> 6 -> 2)",
        mlp_wide: "寬層 ReLU MLP (6 -> 12 -> 2)",
        mlp_deep: "雙層深層 MLP (6 -> 10 -> 6 -> 2)",
        rnn_memory: "記憶型 RNN (6+2 -> 8 -> 2)",
      },
      modelDesc: {
        mlp_tiny: "無隱藏層，用來觀察為何需要非線性隱藏層",
        mlp_small: "單隱藏層，標準彎道收斂最快",
        mlp_wide: "12 顆 ReLU 隱藏神經元，轉向切線更銳利",
        mlp_deep: "雙隱藏層，適合處理連續急彎",
        rnn_memory: "把上一幀轉向與油門作為記憶回饋",
      },
      pop: "族群數量", mut: "變異率",
      cardBrain: "冠軍大腦（即時）", save: "儲存", load: "載入",
      brainHint: "綠色＝正激發，紅色＝負抑制",
      cardChart: "適應度進化曲線（最高 vs. 平均）",
      cardLog: "訓練紀錄 Log", clearLog: "清除", logEmpty: "尚無訓練紀錄。",
      guideBtn: "說明", closeBtn: "關閉",
      themeToLight: "主題：深色", themeToDark: "主題：淺色",
      helpBrain: "左側 (L60..SPD) 為 5 條雷射牆距與車速；中間是隱藏層神經元；右側輸出 STEER (左/右轉) 與 THROT (加速/減速)。",
      helpChart: "適應度分數＝通過檢查點數 × 100 ＋ 距離。綠線為每代冠軍最高分，灰線為全體平均分。",
      helpBench: "橫軸為進化世代（Gen 1 → 8），縱軸為每代最高適應度（檢查點 × 100 ＋ 距離）。線越早往上衝＝收斂越快；終點越高＝過彎策略上限越高（線性感知器通常會在急彎處提早卡平）。",
      coachGen1: "第 1 代：目前是隨機大腦探索中，建議把上方 Speed 切到 5x 或 15x 加速觀察進化。",
      coachLearning: "第 {gen} 代：正在淘汰撞牆車隊並保留優秀基因（目前最高分 {fit}）。",
      coachCornering: "第 {gen} 代：領先車已經開始穩定過彎（最高分 {fit}），綠線正在爬升！",
      coachLap: "第 {gen} 代：已成功跑完完整賽道（累積 {laps} 圈）！可按 Save 存下大腦並換更難地圖按 Load 測試。",
      waitingChart: "等待第 1 代結算...",
      savedBrain: "已儲存 {model}（第 {gen} 代）",
      noSavedBrain: "找不到已儲存的大腦",
      loadedBrain: "已載入 {model}",
      invalidBrain: "無法讀取已儲存的大腦",
      strokeTooShort: "線段太短，請畫一個更大的封閉圈",
      tabSim: "模擬訓練", tabInsights: "模型解析與對比",
      insModels: "各模型架構原理與判斷差異",
      insProbe: "多模型同場決策對比探測器",
      insProbeDesc: "比較不同模型面對同一路況時的轉向與油門判斷（先按上方「一鍵 5 模型對比測試」，即可同時比較 5 個訓練後的大腦）：",
      insBench: "模型效能對比排行榜",
      benchTitle: "5 模型同場對比測試（Head-to-Head）",
      benchSub: "在目前這張賽道上，讓 5 種神經網路各跑 8 代進化，直接對比收斂曲線與過彎決策差異。",
      runBenchBtn: "一鍵 5 模型對比測試",
      runningBench: "測試中 {cur}/5：{model}...",
      benchDone: "測試完成（{track}）",
      benchWait: "點擊上方「一鍵 5 模型對比測試」，即可繪製 5 種模型的收斂曲線對比。",
      probeLeft: "左側牆壁逼近", probeRight: "右側牆壁逼近",
      probeFront: "前方死路逼近", probeOpen: "筆直開闊大道",
      lbEmpty: "跑完第 1 代或切換不同模型後，這裡會自動記錄各模型的最高分與圈數。",
      lbHeaders: ["模型", "賽道", "最高分", "圈數", "世代"],
      activeTag: "使用中",
      paramsLabel: "參數",
      steerOut: "轉向輸出", throtOut: "油門輸出",
      steerLeft: "向左轉", steerRight: "向右轉", steerStraight: "直行",
      throtAccel: "加速", throtBrake: "減速煞車",
      insightsDetail: {
        mlp_tiny: "沒有隱藏層，只是 6 個輸入直接線性加權。在橢圓賽道能跑，但在 S 型彎或髮夾彎（需要同時考量「車速＋前牆距離」的非線性組合）很容易撞牆，最適合拿來理解為什麼深度學習需要隱藏層。",
        mlp_small: "加入 6 顆 tanh 隱藏神經元，能平滑結合左右牆距差與車速，在多數賽道只要 3～6 代就能最快收斂。",
        mlp_wide: "採用 12 顆 ReLU 隱藏神經元（負值歸零），能切出更銳利的分段轉向邊界，適合雙減速彎（Double Chicane）這種需要果斷切彎的賽道。",
        mlp_deep: "雙隱藏層（10 -> 6）表達能力最強，能學出「入髮夾彎前先收油減速、出彎再加速」的多段策略，但因參數較多，通常需要多幾代進化才會穩定。",
        rnn_memory: "把上一幀的轉向與油門輸出回饋到下一幀輸入。這層短期記憶能幫助車子在窄道蛇行（Narrow Canyon）中維持穩定的過彎弧度，不易左右劇烈抖動。",
      },
      modelTags: {
        mlp_tiny: "收斂：極快 | 非線性：無 | 適合：橢圓環道",
        mlp_small: "收斂：最快 | 非線性：單層 tanh | 適合：通用入門",
        mlp_wide: "收斂：快 | 非線性：12×ReLU | 適合：雙減速彎",
        mlp_deep: "收斂：較慢 | 非線性：雙層 tanh | 適合：髮夾／複合彎",
        rnn_memory: "收斂：中等 | 記憶：有 (RNN) | 適合：窄道蛇行",
      },
      verdicts: {
        leftOk: "判斷正確：偵測左牆逼近，向右閃避",
        leftWarn: "尚未學會：左牆很近卻仍往左轉／直衝",
        rightOk: "判斷正確：偵測右牆逼近，向左閃避",
        rightWarn: "尚未學會：右牆很近卻仍往右轉／直衝",
        frontOk: "判斷正確：前方逼近時減速並轉向閃避",
        frontMid: "有轉向閃避前牆，但油門仍偏高",
        frontWarn: "尚未學會：面對前牆仍直衝（未明顯轉向）",
        openOk: "判斷正確：開闊直道穩定直行並加速",
        openWarn: "直道上方向仍會偏擺或過慢",
      },
    },
  };

  function applyTheme(theme) {
    currentTheme = theme === "light" ? "light" : "dark";
    safeSetStorage("neuro_evo_theme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
    const t = PAGE_I18N[currentLang];
    btnTheme.textContent = currentTheme === "light" ? t.themeToDark : t.themeToLight;
    drawFitnessChart(chartCtx, chartCanvas.width, chartCanvas.height, fitnessHistory, currentTheme, t.waitingChart);
  }

  function applyPageLang(lang) {
    currentLang = lang === "zh" ? "zh" : "en";
    safeSetStorage("neuro_evo_lang", currentLang);
    document.documentElement.lang = currentLang === "zh" ? "zh-Hant" : "en";
    pageLangEn.classList.toggle("active", currentLang === "en");
    pageLangZh.classList.toggle("active", currentLang === "zh");
    const t = PAGE_I18N[currentLang];
    document.getElementById("txt-subtitle").textContent = t.subtitle;
    document.getElementById("lbl-stat-gen").textContent = t.statGen;
    document.getElementById("lbl-stat-alive").textContent = t.statAlive;
    document.getElementById("lbl-stat-best").textContent = t.statBest;
    document.getElementById("lbl-stat-laps").textContent = t.statLaps;
    btnToggleRun.textContent = running ? t.pause : t.resume;
    btnNextGen.textContent = t.nextGen;
    btnReset.textContent = t.reset;
    btnAllStar.textContent = allStarMode ? t.allStarOn : t.allStar;
    btnHumanPk.textContent = humanPkMode ? t.humanPkOn : t.humanPk;
    document.getElementById("lbl-speed").textContent = t.speed;
    document.getElementById("lbl-lidar").textContent = t.lidar;
    document.getElementById("lbl-cp").textContent = t.checkpoints;
    document.getElementById("lbl-trails").textContent = t.trails;
    drawBanner.textContent = t.drawBanner;
    document.getElementById("lbl-card-track").textContent = t.cardTrack;
    btnDrawTrack.textContent = t.drawCustom;
    btnExportTrack.textContent = t.exportTrack;
    btnImportTrack.textContent = t.importTrack;
    for (const opt of selTrack.options) {
      if (t.tracks[opt.value]) opt.textContent = t.tracks[opt.value];
    }
    document.getElementById("lbl-card-model").textContent = t.cardModel;
    for (const opt of selModel.options) {
      if (t.models[opt.value]) opt.textContent = t.models[opt.value];
    }
    document.getElementById("lbl-reward-txt").textContent = t.rewardTxt;
    for (const opt of selReward.options) {
      if (t.rewards[opt.value]) opt.textContent = t.rewards[opt.value];
    }
    modelDesc.textContent = t.modelDesc[currentModelId] || "";
    document.getElementById("lbl-pop-txt").textContent = t.pop;
    document.getElementById("lbl-mut-txt").textContent = t.mut;
    document.getElementById("lbl-card-brain").textContent = t.cardBrain;
    btnSaveBrain.textContent = t.save;
    btnLoadBrain.textContent = t.load;
    btnExportBrain.textContent = t.exportBtn;
    btnImportBrain.textContent = t.importBtn;
    brainStatus.textContent = t.brainHint;
    document.getElementById("lbl-card-chart").textContent = t.cardChart;
    document.getElementById("lbl-card-log").textContent = t.cardLog;
    btnExportLog.textContent = t.exportBtn;
    btnClearLog.textContent = t.clearLog;
    renderLogs();
    btnGuide.textContent = t.guideBtn;
    btnCloseGuide.textContent = t.closeBtn;
    btnTheme.textContent = currentTheme === "light" ? t.themeToDark : t.themeToLight;
    helpBrainBox.textContent = t.helpBrain;
    helpChartBox.textContent = t.helpChart;
    helpBenchBox.textContent = t.helpBench;
    document.getElementById("tab-btn-sim").textContent = t.tabSim;
    document.getElementById("tab-btn-insights").textContent = t.tabInsights;
    document.getElementById("lbl-ins-models").textContent = t.insModels;
    document.getElementById("lbl-ins-probe").textContent = t.insProbe;
    document.getElementById("lbl-ins-probe-desc").textContent = t.insProbeDesc;
    document.getElementById("lbl-ins-gen").textContent = t.insGen;
    document.getElementById("lbl-ins-gen-desc").textContent = t.insGenDesc;
    btnRunGenTest.textContent = t.runGenTestBtn;
    document.getElementById("lbl-ins-bench").textContent = t.insBench;
    document.getElementById("lbl-bench-title").textContent = t.benchTitle;
    document.getElementById("lbl-bench-sub").textContent = t.benchSub;
    if (!benchRunning) btnRunBench.textContent = t.runBenchBtn;
    document.getElementById("probe-btn-left").textContent = t.probeLeft;
    document.getElementById("probe-btn-right").textContent = t.probeRight;
    document.getElementById("probe-btn-front").textContent = t.probeFront;
    document.getElementById("probe-btn-open").textContent = t.probeOpen;
    renderGuide(currentLang);
    renderInsights();
  }

  const GUIDE_HTML = {
    zh: {
      title: "操作說明",
      html: `
        <h3>1. 快速加速看進化</h3>
        <ul>
          <li>打開網頁即自動從 <code>GEN 1</code> 開始，初期 50 台車權重隨機、容易撞牆屬正常現象。</li>
          <li>將上方 <code>Speed</code> 切換為 <code>5x</code> 或 <code>15x Turbo</code>，約 3～8 代就會看到車群學會順暢過彎並開始累積圈數（<code>LAPS</code>）。</li>
        </ul>
        <h3>2. 畫面資訊解讀</h3>
        <ul>
          <li><strong>綠色車 + 5 條雷射線（LiDAR）</strong>：目前表現最佳的冠軍車，偵測左 60°、左 30°、正前、右 30°、右 60° 牆壁距離。</li>
          <li><strong>Champion Brain (Live)</strong>：即時神經網路激發圖（綠色＝正激發、紅色＝負抑制），右側輸出 <code>STEER</code>（轉向）與 <code>THROT</code>（油門）。</li>
          <li><strong>Fitness History</strong>：綠線為每代最高分、灰線為全體平均分。</li>
        </ul>
        <h3>3. 模型比較、跨地圖遷移與「模型解析」分頁</h3>
        <ul>
          <li><strong>5 種模型</strong>：可在 <code>Linear Perceptron</code>（無隱藏層基準）、<code>Small MLP</code>、<code>Wide ReLU MLP</code>、<code>Deep MLP</code> 與 <code>Memory RNN</code> 間切換。</li>
          <li><strong>Model Insights 分頁</strong>：切換上方 <code>模型解析與對比</code> 分頁，可即時測試冠軍大腦對不同路況的轉向／油門判斷，並查看本次訓練排行榜。</li>
          <li><strong>跨地圖遷移（Save / Load）</strong>：在簡單賽道練出冠軍車後按 <code>Save</code>，切到難度更高的地圖再按 <code>Load</code>，即可載入既有大腦繼續微調。</li>
          <li><strong>手繪賽道（Draw Custom）</strong>：點 <code>Draw Custom</code> 後在畫布畫出一個封閉圈，放開滑鼠即自動生成賽道與檢查點。</li>
        </ul>
        <h3>4. 卡關調整技巧</h3>
        <ul>
          <li>若車隊卡在特定急彎，可將 <code>Mutation Rate</code> 調高至 <code>0.25–0.30</code> 或將 <code>Population</code> 拉高至 <code>80–100</code>，並善用 <code>Next Gen</code> 跳代。</li>
        </ul>
      `,
    },
    en: {
      title: "Quick Guide",
      html: `
        <h3>1. Fast-Forward Early Generations</h3>
        <ul>
          <li>Simulation starts automatically at <code>GEN 1</code> with random weights, so early crashes are expected.</li>
          <li>Switch <code>Speed</code> to <code>5x</code> or <code>15x Turbo</code>—cars usually learn smooth cornering and complete laps (<code>LAPS</code>) within 3–8 generations.</li>
        </ul>
        <h3>2. Reading the HUD &amp; Visualizers</h3>
        <ul>
          <li><strong>Green Car + 5 LiDAR Rays</strong>: Current leading car sensing wall distances at -60°, -30°, 0°, +30°, and +60°.</li>
          <li><strong>Champion Brain (Live)</strong>: Real-time neuron activations (green = positive, red = negative) driving <code>STEER</code> and <code>THROT</code>.</li>
          <li><strong>Fitness History</strong>: Green line = best fitness per generation; gray line = population average.</li>
        </ul>
        <h3>3. 5 Models, Transfer Learning &amp; Model Insights Tab</h3>
        <ul>
          <li><strong>Switch Models</strong>: Compare <code>Linear Perceptron</code>, <code>Small MLP</code>, <code>Wide ReLU MLP</code>, <code>Deep MLP</code>, and <code>Memory RNN</code>.</li>
          <li><strong>Model Insights Tab</strong>: Open <code>Model Insights</code> to probe how the current champion steers on synthetic LiDAR inputs and compare session leaderboard scores.</li>
          <li><strong>Transfer Learning (Save / Load)</strong>: Click <code>Save</code> on an easy track, switch to a harder map, and click <code>Load</code> to fine-tune the trained brain.</li>
          <li><strong>Draw Custom</strong>: Click <code>Draw Custom</code>, draw a closed loop on the canvas, and release to generate walls and checkpoints.</li>
        </ul>
        <h3>4. Tuning Tips</h3>
        <ul>
          <li>If cars stall at a hairpin, raise <code>Mutation Rate</code> to <code>0.25–0.30</code> or increase <code>Population</code> to <code>80–100</code>.</li>
        </ul>
      `,
    },
  };

  function renderGuide(lang) {
    guideLangEn.classList.toggle("active", lang === "en");
    guideLangZh.classList.toggle("active", lang === "zh");
    guideTitle.textContent = GUIDE_HTML[lang].title;
    guideBody.innerHTML = GUIDE_HTML[lang].html;
  }

  btnGuide.addEventListener("click", () => {
    renderGuide(currentLang);
    guideModal.classList.remove("hidden");
  });
  btnCloseGuide.addEventListener("click", () => guideModal.classList.add("hidden"));
  guideModal.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.classList.add("hidden");
  });
  guideLangEn.addEventListener("click", () => renderGuide("en"));
  guideLangZh.addEventListener("click", () => renderGuide("zh"));
  pageLangEn.addEventListener("click", () => applyPageLang("en"));
  pageLangZh.addEventListener("click", () => applyPageLang("zh"));
  btnTheme.addEventListener("click", () => applyTheme(currentTheme === "dark" ? "light" : "dark"));
  btnHelpBrain.addEventListener("click", () => helpBrainBox.classList.toggle("hidden"));
  btnHelpChart.addEventListener("click", () => helpChartBox.classList.toggle("hidden"));
  btnHelpBench.addEventListener("click", () => helpBenchBox.classList.toggle("hidden"));

  let currentTrack = getPresetTrack("oval");
  let currentModelId = "mlp_small";
  let rewardMode = "balanced";
  let popSize = 50;
  let mutRate = 0.15;
  let generation = 1;
  let running = true;
  let allStarMode = false;
  let allStarTicks = 0;
  let humanPkMode = false;
  let humanCar = null;
  const keysDown = new Set();
  let cars = [];
  let savedChampion = null;
  let fitnessHistory = [];
  let championTrails = [];
  let crashPoints = [];
  let activeView = "sim";
  let activeProbe = "left_wall";
  let customProbeVec = [0.85, 0.70, 0.25, 0.10, 0.05, 0.65];
  let genTestResults = null;
  let benchRunning = false;
  let benchSeries = {};
  let benchChampions = {};
  const sessionBench = new Map();

  let trainingLogs = [];
  try {
    const rawLogs = safeGetStorage("neuro_evo_logs");
    if (rawLogs) trainingLogs = JSON.parse(rawLogs);
    if (!Array.isArray(trainingLogs)) trainingLogs = [];
  } catch {
    trainingLogs = [];
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderLogs() {
    if (!logListEl) return;
    const t = PAGE_I18N[currentLang];
    if (trainingLogs.length === 0) {
      logListEl.innerHTML = `<div class="muted-note" style="margin-top:0;">${t.logEmpty}</div>`;
      return;
    }
    logListEl.innerHTML = trainingLogs
      .map((entry) => `<div class="log-entry"><span class="log-time">[${escapeHtml(entry.time)}]</span>${escapeHtml(entry.msg)}</div>`)
      .join("");
  }

  function addLog(msg) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    trainingLogs.unshift({ time: `${hh}:${mm}:${ss}`, msg });
    if (trainingLogs.length > 200) trainingLogs.length = 200;
    safeSetStorage("neuro_evo_logs", JSON.stringify(trainingLogs));
    renderLogs();
  }

  function countModelParams(modelId) {
    const sizes = MODEL_SPECS[modelId].layerSizes;
    let total = 0;
    for (let i = 0; i < sizes.length - 1; i++) {
      total += sizes[i] * sizes[i + 1] + sizes[i + 1];
    }
    return total;
  }

  function recordBenchEntry(fit, laps) {
    const trackKey = currentTrack.name;
    const key = `${currentModelId}::${trackKey}`;
    const prev = sessionBench.get(key);
    if (!prev || fit > prev.bestFit) {
      sessionBench.set(key, {
        modelId: currentModelId,
        trackId: selTrack.value,
        trackName: trackKey,
        bestFit: Math.round(fit),
        laps,
        gen: generation,
      });
    }
  }

  const PROBE_INPUTS = {
    left_wall: [0.85, 0.70, 0.25, 0.10, 0.05, 0.65],
    right_wall: [0.05, 0.10, 0.25, 0.70, 0.85, 0.65],
    dead_end: [0.40, 0.75, 0.90, 0.75, 0.40, 0.80],
    straight: [0.15, 0.10, 0.05, 0.10, 0.15, 0.50],
  };

  function renderInsights() {
    const t = PAGE_I18N[currentLang];
    const cardsEl = document.getElementById("insights-model-cards");
    if (cardsEl) {
      cardsEl.innerHTML = Object.keys(MODEL_SPECS)
        .map((id) => {
          const isCur = id === currentModelId;
          const params = countModelParams(id);
          return `
            <div class="model-info-card ${isCur ? "current" : ""}" data-pick-model="${id}" title="Click to switch to this model">
              <div class="model-info-head">
                <span>${t.models[id]}${isCur ? ` (${t.activeTag})` : ""}</span>
                <span class="model-params">${params} ${t.paramsLabel}</span>
              </div>
              <div class="model-tags">${t.modelTags[id] || ""}</div>
              <div class="model-info-body">${t.insightsDetail[id]}</div>
            </div>
          `;
        })
        .join("");
      cardsEl.querySelectorAll("[data-pick-model]").forEach((card) => {
        card.addEventListener("click", () => {
          const picked = card.dataset.pickModel;
          if (picked && picked !== currentModelId) {
            currentModelId = picked;
            selModel.value = picked;
            modelDesc.textContent = t.modelDesc[picked] || "";
            resetEvolution(false);
          }
          document.getElementById("tab-btn-sim").click();
        });
      });
    }

    document.querySelectorAll("[data-probe]").forEach((btn) => {
      btn.classList.toggle("btn-active", btn.dataset.probe === activeProbe);
    });

    const probeEl = document.getElementById("probe-output");
    if (probeEl) {
      const probeVec = activeProbe === "custom" ? customProbeVec : (PROBE_INPUTS[activeProbe] || PROBE_INPUTS.left_wall);
      const modelIdsToProbe = Object.keys(benchChampions).length > 0 ? Object.keys(MODEL_SPECS) : [currentModelId];
      const rowsHtml = modelIdsToProbe
        .map((mId) => {
          let brain = benchChampions[mId];
          let tag = "Bench";
          if (!brain && mId === currentModelId) {
            const best = getBestCar();
            brain = best ? best.brain : new NeuralNetwork(mId);
            tag = `Gen ${generation} / Best ${best ? Math.round(best.fitness) : 0}`;
          }
          if (!brain) return "";
          const testBrain = brain.clone();
          testBrain.resetMemory();
          const [steer, throttle] = testBrain.predict(probeVec);
          const steerWidth = Math.min(50, Math.abs(steer) * 50);
          const steerLeft = steer >= 0 ? 50 : 50 - steerWidth;
          const throtWidth = Math.min(50, Math.abs(throttle) * 50);
          const throtLeft = throttle >= 0 ? 50 : 50 - throtWidth;
          const steerText = steer < -0.15 ? t.steerLeft : steer > 0.15 ? t.steerRight : t.steerStraight;
          const throtText = throttle >= 0 ? t.throtAccel : t.throtBrake;

          let verdictOk = false;
          let verdictMsg = "";
          if (activeProbe === "custom") {
            verdictOk = true;
            verdictMsg = t.customProbeVerdict;
          } else if (activeProbe === "left_wall") {
            verdictOk = steer > 0.12;
            verdictMsg = verdictOk ? t.verdicts.leftOk : t.verdicts.leftWarn;
          } else if (activeProbe === "right_wall") {
            verdictOk = steer < -0.12;
            verdictMsg = verdictOk ? t.verdicts.rightOk : t.verdicts.rightWarn;
          } else if (activeProbe === "dead_end") {
            if (Math.abs(steer) > 0.25 && throttle < 0.2) {
              verdictOk = true; verdictMsg = t.verdicts.frontOk;
            } else if (Math.abs(steer) > 0.25) {
              verdictOk = false; verdictMsg = t.verdicts.frontMid;
            } else {
              verdictOk = false; verdictMsg = t.verdicts.frontWarn;
            }
          } else {
            verdictOk = Math.abs(steer) <= 0.25 && throttle > 0.1;
            verdictMsg = verdictOk ? t.verdicts.openOk : t.verdicts.openWarn;
          }

          return `
            <div class="probe-compare-row">
              <div><strong>${t.models[mId]}</strong> · <span class="mono">${tag}</span></div>
              <div class="meter-row">
                <span>${t.steerOut}</span>
                <div class="meter-track"><div class="meter-center"></div><div class="meter-fill ${steer < 0 ? "neg" : ""}" style="left:${steerLeft}%;width:${steerWidth}%"></div></div>
                <span class="mono">${steer.toFixed(2)} (${steerText})</span>
              </div>
              <div class="meter-row">
                <span>${t.throtOut}</span>
                <div class="meter-track"><div class="meter-center"></div><div class="meter-fill ${throttle < 0 ? "neg" : ""}" style="left:${throtLeft}%;width:${throtWidth}%"></div></div>
                <span class="mono">${throttle.toFixed(2)} (${throtText})</span>
              </div>
              <div class="probe-verdict ${verdictOk ? "ok" : "warn"}">${verdictMsg}</div>
            </div>
          `;
        })
        .join("");

      probeEl.innerHTML = `
        ${rowsHtml}
        <div class="probe-inputs mono">Inputs [L60, L30, FWD, R30, R60, SPD]: [${probeVec.map((v) => v.toFixed(2)).join(", ")}]</div>
      `;
    }

    drawMultiModelChart(benchChartCtx, benchChartCanvas.width, benchChartCanvas.height, benchSeries, currentTheme, t.benchWait);
    if (benchLegendEl) {
      benchLegendEl.innerHTML = Object.keys(MODEL_SPECS)
        .map((id) => `<span class="legend-item"><span class="legend-swatch" style="background:${MODEL_COLORS[id]}"></span>${t.models[id]}</span>`)
        .join("");
    }

    const lbEl = document.getElementById("insights-leaderboard");
    if (lbEl) {
      const rows = Array.from(sessionBench.values()).sort((a, b) => b.bestFit - a.bestFit);
      if (rows.length === 0) {
        lbEl.innerHTML = `<div class="muted-note">${t.lbEmpty}</div>`;
      } else {
        lbEl.innerHTML = `
          <table class="lb-table">
            <thead><tr>${t.lbHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${t.models[r.modelId] || r.modelId}</td>
                  <td>${t.tracks[r.trackId] || r.trackName}</td>
                  <td class="mono">${r.bestFit}</td>
                  <td class="mono">${r.laps}</td>
                  <td class="mono">${r.gen}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        `;
      }
    }
    renderGenTest();
  }

  document.querySelectorAll(".main-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeView = btn.dataset.view;
      document.querySelectorAll(".main-tab").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("view-sim").classList.toggle("hidden", activeView !== "sim");
      document.getElementById("view-insights").classList.toggle("hidden", activeView !== "insights");
      if (activeView === "insights") renderInsights();
    });
  });

  const PROBE_LABELS = ["L60", "L30", "FWD", "R30", "R60", "SPD"];
  function renderProbeSliders() {
    if (!probeSlidersEl) return;
    probeSlidersEl.innerHTML = PROBE_LABELS.map((lbl, idx) => `
      <label class="probe-slider-item">
        <span><strong>${lbl}</strong><em>${customProbeVec[idx].toFixed(2)}</em></span>
        <input type="range" min="0" max="1" step="0.05" value="${customProbeVec[idx]}" data-probe-slider="${idx}" />
      </label>
    `).join("");
    probeSlidersEl.querySelectorAll("[data-probe-slider]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const idx = parseInt(inp.dataset.probeSlider, 10);
        customProbeVec[idx] = parseFloat(inp.value);
        activeProbe = "custom";
        inp.previousElementSibling.querySelector("em").textContent = customProbeVec[idx].toFixed(2);
        renderInsights();
      });
    });
  }

  function renderGenTest() {
    if (!genTestOutputEl) return;
    const t = PAGE_I18N[currentLang];
    if (!genTestResults) {
      genTestOutputEl.innerHTML = `<div class="muted-note">${t.genTestEmpty}</div>`;
      return;
    }
    genTestOutputEl.innerHTML = genTestResults.map((r) => `
      <div class="gen-bar-row">
        <span>${t.tracks[r.trackId] || r.trackId}</span>
        <div class="gen-bar-track"><div class="gen-bar-fill" style="width:${r.pct}%"></div></div>
        <span class="mono">${r.pct}% (${r.laps}L)</span>
      </div>
    `).join("");
  }

  document.querySelectorAll("[data-probe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeProbe = btn.dataset.probe;
      if (PROBE_INPUTS[activeProbe]) {
        customProbeVec = [...PROBE_INPUTS[activeProbe]];
        renderProbeSliders();
      }
      renderInsights();
    });
  });

  btnRunGenTest.addEventListener("click", () => {
    const best = getBestCar();
    const brain = benchChampions[currentModelId] || (best ? best.brain : savedChampion) || new NeuralNetwork(currentModelId);
    genTestResults = Object.keys(PRESET_DEFS).map((trackId) => {
      const tr = getPresetTrack(trackId);
      const car = new Car(tr.startPos, tr.startAngle, brain.clone());
      for (let tick = 0; tick < 520 && car.alive; tick++) {
        car.update(tr, rewardMode);
      }
      const totalCp = Math.max(1, tr.checkpoints.length);
      const pct = Math.min(100, Math.round((car.checkpointsPassed / totalCp) * 100));
      return { trackId, pct, laps: car.laps, fit: Math.round(car.fitness) };
    });
    const avgPct = Math.round(genTestResults.reduce((s, r) => s + r.pct, 0) / genTestResults.length);
    addLog(`Generalization Test (${currentModelId}): avg ${avgPct}% across 7 tracks`);
    renderGenTest();
  });

  function runSingleModelHeadless(modelId, track, gens = 8, pop = 24) {
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
        const child = Math.random() < 0.65 ? NeuralNetwork.crossover(p1.brain, p2.brain) : p1.brain.clone();
        child.mutate(mutRate, 0.35);
        next.push(child);
      }
      brains = next;
    }
    return { genBestSeries, overallBestBrain, overallBestFit, overallBestLaps };
  }

  btnRunBench.addEventListener("click", () => {
    if (benchRunning) return;
    benchRunning = true;
    btnRunBench.disabled = true;
    benchSeries = {};
    benchChampions = {};
    const trackSnapshot = currentTrack;
    const trackIdSnapshot = selTrack.value;
    const benchGens = parseInt(selBenchGens.value, 10) || 8;
    const modelIds = Object.keys(MODEL_SPECS);

    function finishBench() {
      const t = PAGE_I18N[currentLang];
      benchRunning = false;
      btnRunBench.disabled = false;
      btnRunBench.textContent = t.runBenchBtn;
      benchStatusEl.textContent = t.benchDone.replace("{track}", t.tracks[trackIdSnapshot] || trackSnapshot.name);
      addLog(`Benchmark ${benchGens}G done on ${trackSnapshot.name}`);
      renderInsights();
    }

    function recordBenchModel(mId, res) {
      benchSeries[mId] = res.genBestSeries;
      benchChampions[mId] = res.overallBestBrainJSON
        ? NeuralNetwork.fromJSON(res.overallBestBrainJSON)
        : res.overallBestBrain;
      sessionBench.set(`${mId}::${trackSnapshot.name}`, {
        modelId: mId,
        trackId: trackIdSnapshot,
        trackName: trackSnapshot.name,
        bestFit: Math.round(res.overallBestFit),
        laps: res.overallBestLaps,
        gen: benchGens,
      });
      renderInsights();
    }

    let usedWorker = false;
    if (typeof Worker !== "undefined") {
      try {
        const worker = new Worker("js/bench-worker.js");
        usedWorker = true;
        worker.onmessage = (ev) => {
          const msg = ev.data;
          const t = PAGE_I18N[currentLang];
          if (msg.type === "status") {
            benchStatusEl.textContent = t.runningBench.replace("{cur}", msg.idx + 1).replace("{model}", t.models[msg.modelId]);
          } else if (msg.type === "result") {
            recordBenchModel(msg.modelId, msg.res);
          } else if (msg.type === "done") {
            worker.terminate();
            finishBench();
          }
        };
        worker.onerror = () => {
          worker.terminate();
          runMainThreadFallback();
        };
        worker.postMessage({ track: trackSnapshot, gens: benchGens, pop: 24, mutRate, rewardMode });
      } catch {
        usedWorker = false;
      }
    }

    function runMainThreadFallback() {
      let idx = 0;
      function runNext() {
        const t = PAGE_I18N[currentLang];
        if (idx >= modelIds.length) {
          finishBench();
          return;
        }
        const mId = modelIds[idx];
        benchStatusEl.textContent = t.runningBench.replace("{cur}", idx + 1).replace("{model}", t.models[mId]);
        setTimeout(() => {
          const res = runSingleModelHeadless(mId, trackSnapshot, benchGens, 24);
          recordBenchModel(mId, res);
          idx++;
          runNext();
        }, 20);
      }
      runNext();
    }

    if (!usedWorker) runMainThreadFallback();
  });

  // Custom track drawing state
  let drawMode = false;
  let drawingStroke = false;
  let strokePts = [];

  const MODEL_SHORT = {
    mlp_tiny: "TINY",
    mlp_small: "SMALL",
    mlp_wide: "WIDE",
    mlp_deep: "DEEP",
    rnn_memory: "RNN",
  };

  function spawnHumanCar() {
    if (!humanPkMode) {
      humanCar = null;
      return;
    }
    humanCar = new Car(currentTrack.startPos, currentTrack.startAngle, "mlp_tiny");
    humanCar.modelColor = "#06b6d4";
    humanCar.label = "YOU";
  }

  function startAllStarRace(brainsByModel = null) {
    championTrails = [];
    allStarTicks = 0;
    const perModel = 10;
    cars = [];
    for (const mId of Object.keys(MODEL_SPECS)) {
      const provided = brainsByModel && brainsByModel[mId];
      for (let i = 0; i < perModel; i++) {
        let brain;
        if (provided && provided[i]) {
          brain = provided[i];
        } else if (i === 0 && benchChampions[mId]) {
          brain = benchChampions[mId].clone();
        } else {
          brain = new NeuralNetwork(mId);
        }
        const c = new Car(currentTrack.startPos, currentTrack.startAngle, brain);
        c.modelColor = MODEL_COLORS[mId] || "#22c55e";
        c.label = null;
        cars.push(c);
      }
    }
    spawnHumanCar();
  }

  function evolveAllStarGeneration() {
    const byModel = {};
    for (const mId of Object.keys(MODEL_SPECS)) byModel[mId] = [];
    for (const c of cars) {
      if (byModel[c.brain.modelId]) byModel[c.brain.modelId].push(c);
    }

    const nextByModel = {};
    let overallBestFit = 0;
    let overallBestModel = "";
    let overallTopLaps = 0;
    let totalFit = 0;

    for (const mId of Object.keys(MODEL_SPECS)) {
      const group = byModel[mId].sort((a, b) => b.fitness - a.fitness);
      if (group.length === 0) continue;
      const top = group[0];
      totalFit += group.reduce((s, c) => s + c.fitness, 0);
      if (top.fitness > overallBestFit) {
        overallBestFit = top.fitness;
        overallBestModel = MODEL_SHORT[mId] || mId;
        overallTopLaps = top.laps;
      }
      if (!benchSeries[mId]) benchSeries[mId] = [];
      benchSeries[mId].push(top.fitness);
      if (benchSeries[mId].length > 60) benchSeries[mId].shift();
      benchChampions[mId] = top.brain.clone();
      sessionBench.set(`${mId}::${currentTrack.name}`, {
        modelId: mId,
        trackId: selTrack.value,
        trackName: currentTrack.name,
        bestFit: Math.round(top.fitness),
        laps: top.laps,
        gen: generation,
      });

      const next = [top.brain.clone()];
      if (group[1]) next.push(group[1].brain.clone());
      while (next.length < group.length) {
        const p1 = pickParent(group);
        const p2 = pickParent(group);
        const child = Math.random() < 0.65 ? NeuralNetwork.crossover(p1.brain, p2.brain) : p1.brain.clone();
        child.mutate(mutRate, 0.35);
        next.push(child);
      }
      nextByModel[mId] = next;
    }

    const avgFit = totalFit / Math.max(1, cars.length);
    fitnessHistory.push({ gen: generation, best: overallBestFit, avg: avgFit });
    if (fitnessHistory.length > 60) fitnessHistory.shift();
    addLog(`All-Star Gen ${generation} [${selTrack.value}] Leader: ${overallBestModel} (${Math.round(overallBestFit)}, ${overallTopLaps}L)`);
    generation++;
    startAllStarRace(nextByModel);
    drawFitnessChart(chartCtx, chartCanvas.width, chartCanvas.height, fitnessHistory, currentTheme);
  }

  function spawnPopulation(brains = null) {
    cars = [];
    for (let i = 0; i < popSize; i++) {
      const brain = brains && brains[i] ? brains[i] : new NeuralNetwork(currentModelId);
      cars.push(new Car(currentTrack.startPos, currentTrack.startAngle, brain));
    }
    spawnHumanCar();
  }

  function resetEvolution(keepHistory = false) {
    const best = getBestCar();
    if (best && best.fitness > 0 && !allStarMode) {
      recordBenchEntry(best.fitness, best.laps);
    }
    generation = 1;
    championTrails = [];
    crashPoints = [];
    if (!keepHistory) fitnessHistory = [];
    if (allStarMode) {
      startAllStarRace();
    } else {
      spawnPopulation();
    }
    drawFitnessChart(
      chartCtx,
      chartCanvas.width,
      chartCanvas.height,
      fitnessHistory,
      currentTheme,
      PAGE_I18N[currentLang].waitingChart
    );
  }

  function pickParent(sortedCars) {
    // Tournament selection (k = 4) among top 50%
    const poolSize = Math.max(2, Math.floor(sortedCars.length * 0.5));
    let best = sortedCars[Math.floor(Math.random() * poolSize)];
    for (let i = 0; i < 3; i++) {
      const cand = sortedCars[Math.floor(Math.random() * poolSize)];
      if (cand.fitness > best.fitness) best = cand;
    }
    return best;
  }

  function evolveNextGeneration() {
    const sorted = [...cars].sort((a, b) => b.fitness - a.fitness);
    const bestFit = sorted[0] ? sorted[0].fitness : 0;
    const avgFit = sorted.reduce((acc, c) => acc + c.fitness, 0) / Math.max(1, sorted.length);
    const topLaps = sorted[0] ? sorted[0].laps : 0;
    recordBenchEntry(bestFit, topLaps);
    addLog(`Gen ${generation} [${currentModelId}/${selTrack.value}] Best: ${Math.round(bestFit)}, Avg: ${Math.round(avgFit)}, Laps: ${topLaps}`);
    fitnessHistory.push({ gen: generation, best: bestFit, avg: avgFit });
    if (fitnessHistory.length > 60) fitnessHistory.shift();

    savedChampion = sorted[0].brain.clone();
    const nextBrains = [];
    // Elitism: keep top 2 unchanged
    nextBrains.push(sorted[0].brain.clone());
    if (popSize > 1 && sorted[1]) nextBrains.push(sorted[1].brain.clone());

    while (nextBrains.length < popSize) {
      const p1 = pickParent(sorted);
      const p2 = pickParent(sorted);
      const child =
        Math.random() < 0.65
          ? NeuralNetwork.crossover(p1.brain, p2.brain)
          : p1.brain.clone();
      child.mutate(mutRate, 0.35);
      nextBrains.push(child);
    }

    generation++;
    spawnPopulation(nextBrains);
    drawFitnessChart(chartCtx, chartCanvas.width, chartCanvas.height, fitnessHistory, currentTheme);
  }

  function getBestCar() {
    let bestAlive = null;
    let bestAny = cars[0] || null;
    for (const c of cars) {
      if (!bestAny || c.fitness > bestAny.fitness) bestAny = c;
      if (c.alive && (!bestAlive || c.fitness > bestAlive.fitness)) bestAlive = c;
    }
    return bestAlive || bestAny;
  }

  function getHumanManualControl() {
    let steer = 0;
    let throttle = 0;
    if (keysDown.has("ArrowLeft") || keysDown.has("KeyA")) steer -= 1;
    if (keysDown.has("ArrowRight") || keysDown.has("KeyD")) steer += 1;
    if (keysDown.has("ArrowUp") || keysDown.has("KeyW")) throttle += 1;
    if (keysDown.has("ArrowDown") || keysDown.has("KeyS")) throttle -= 1;
    return { steer, throttle };
  }

  function stepSimulation() {
    if (!running || drawMode) return;
    const steps = humanPkMode ? 1 : (parseInt(selSpeed.value, 10) || 1);
    for (let s = 0; s < steps; s++) {
      let aliveCount = 0;
      for (const c of cars) {
        if (c.alive) {
          c.update(currentTrack, rewardMode);
          if (c.alive) {
            aliveCount++;
          } else if (crashPoints.length < 150) {
            crashPoints.push({ x: c.x, y: c.y });
          }
        }
      }
      if (humanCar && humanCar.alive) {
        humanCar.update(currentTrack, rewardMode, getHumanManualControl());
      }
      if (allStarMode) allStarTicks++;
      const lead = getBestCar();
      if (lead && lead.alive && lead.ticksAlive % 2 === 0) {
        championTrails.push({ x: lead.x, y: lead.y, throttle: lead.lastThrottle });
        if (championTrails.length > 450) championTrails.shift();
      }
      if (aliveCount === 0 || (allStarMode && !humanPkMode && allStarTicks >= 520)) {
        if (allStarMode) {
          evolveAllStarGeneration();
        } else {
          championTrails = [];
          evolveNextGeneration();
        }
        break;
      }
    }
  }

  let frameCounter = 0;
  function renderFrame() {
    stepSimulation();
    frameCounter++;

    let aliveCount = 0;
    let maxLaps = 0;
    for (const c of cars) {
      if (c.alive) aliveCount++;
      if (c.laps > maxLaps) maxLaps = c.laps;
    }
    const bestCar = getBestCar();

    statGen.textContent = String(generation);
    statAlive.textContent = `${aliveCount}/${cars.length}`;
    const bestFit = bestCar ? Math.round(bestCar.fitness) : 0;
    statBest.textContent = String(bestFit);
    statLaps.textContent = String(maxLaps);

    if (activeView === "insights" && frameCounter % 15 === 0) {
      if (bestCar && bestCar.fitness > 0) recordBenchEntry(bestCar.fitness, bestCar.laps);
      renderInsights();
    }

    const t = PAGE_I18N[currentLang];
    if (allStarMode) {
      const modelLeaders = {};
      for (const c of cars) {
        c.label = null;
        const mId = c.brain.modelId;
        if (!modelLeaders[mId] || (c.alive && !modelLeaders[mId].alive) || (c.alive === modelLeaders[mId].alive && c.fitness > modelLeaders[mId].fitness)) {
          modelLeaders[mId] = c;
        }
      }
      for (const mId of Object.keys(modelLeaders)) {
        modelLeaders[mId].label = MODEL_SHORT[mId] || mId;
      }
      const sortedStar = Object.values(modelLeaders).sort((a, b) => b.fitness - a.fitness);
      const summary = sortedStar
        .slice(0, 3)
        .map((c, idx) => `#${idx + 1} ${c.label || ""} (${c.laps}L/${Math.round(c.fitness)})`)
        .join(" · ");
      liveCoach.textContent = t.allStarCoach.replace("{summary}", summary);
    } else if (humanPkMode) {
      liveCoach.textContent = t.humanPkCoach;
    } else if (maxLaps >= 1) {
      liveCoach.textContent = t.coachLap.replace("{gen}", generation).replace("{laps}", maxLaps);
    } else if (bestFit >= 600) {
      liveCoach.textContent = t.coachCornering.replace("{gen}", generation).replace("{fit}", bestFit);
    } else if (generation === 1) {
      liveCoach.textContent = t.coachGen1;
    } else {
      liveCoach.textContent = t.coachLearning.replace("{gen}", generation).replace("{fit}", bestFit);
    }

    const renderCars = humanCar ? [...cars, humanCar] : cars;
    drawTrackAndCars(trackCtx, trackCanvas.width, trackCanvas.height, currentTrack, renderCars, bestCar, {
      showRays: chkRays.checked,
      showCheckpoints: chkCp.checked,
      showTrails: chkTrails.checked,
      trails: championTrails,
      crashPoints,
      drawStroke: drawMode ? strokePts : null,
      theme: currentTheme,
    });
    drawNetwork(nnCtx, nnCanvas.width, nnCanvas.height, bestCar ? bestCar.brain : null, currentTheme);

    requestAnimationFrame(renderFrame);
  }

  // Controls
  btnToggleRun.addEventListener("click", () => {
    running = !running;
    const t = PAGE_I18N[currentLang];
    btnToggleRun.textContent = running ? t.pause : t.resume;
  });

  btnNextGen.addEventListener("click", () => {
    if (allStarMode) {
      evolveAllStarGeneration();
    } else {
      evolveNextGeneration();
    }
  });

  btnReset.addEventListener("click", () => {
    resetEvolution(false);
  });

  btnAllStar.addEventListener("click", () => {
    allStarMode = !allStarMode;
    const t = PAGE_I18N[currentLang];
    btnAllStar.classList.toggle("btn-active", allStarMode);
    btnAllStar.textContent = allStarMode ? t.allStarOn : t.allStar;
    resetEvolution(false);
  });

  btnHumanPk.addEventListener("click", () => {
    humanPkMode = !humanPkMode;
    const t = PAGE_I18N[currentLang];
    btnHumanPk.classList.toggle("btn-active", humanPkMode);
    btnHumanPk.textContent = humanPkMode ? t.humanPkOn : t.humanPk;
    spawnHumanCar();
  });

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
      keysDown.add(e.code);
      if (humanPkMode && activeView === "sim") e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keysDown.delete(e.code);
  });

  function exitDrawMode() {
    drawMode = false;
    drawingStroke = false;
    strokePts = [];
    btnDrawTrack.classList.remove("btn-active");
    trackCanvas.classList.remove("drawing");
    drawBanner.classList.add("hidden");
    drawBanner.textContent = PAGE_I18N[currentLang].drawBanner;
  }

  selTrack.addEventListener("change", () => {
    if (drawMode) exitDrawMode();
    currentTrack = getPresetTrack(selTrack.value);
    addLog(`Track -> ${selTrack.value}`);
    resetEvolution(false);
  });

  selModel.addEventListener("change", () => {
    currentModelId = selModel.value;
    modelDesc.textContent = PAGE_I18N[currentLang].modelDesc[currentModelId] || "";
    addLog(`Model -> ${currentModelId}`);
    resetEvolution(false);
  });

  selReward.addEventListener("change", () => {
    rewardMode = selReward.value;
    addLog(`Reward -> ${rewardMode}`);
    resetEvolution(false);
  });

  rngPop.addEventListener("input", () => {
    popSize = parseInt(rngPop.value, 10);
    lblPop.textContent = String(popSize);
  });
  rngPop.addEventListener("change", () => resetEvolution(false));

  rngMut.addEventListener("input", () => {
    mutRate = parseFloat(rngMut.value);
    lblMut.textContent = mutRate.toFixed(2);
  });

  btnSaveBrain.addEventListener("click", () => {
    const best = getBestCar();
    const brain = best ? best.brain : savedChampion;
    if (!brain) return;
    const t = PAGE_I18N[currentLang];
    safeSetStorage("neuro_evo_champion", JSON.stringify(brain.toJSON()));
    addLog(`Saved brain: ${brain.modelId} (Gen ${generation})`);
    brainStatus.textContent = t.savedBrain
      .replace("{model}", t.models[brain.modelId] || MODEL_SPECS[brain.modelId].name)
      .replace("{gen}", generation);
  });

  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyLoadedBrain(loaded) {
    const t = PAGE_I18N[currentLang];
    currentModelId = loaded.modelId;
    selModel.value = currentModelId;
    modelDesc.textContent = t.modelDesc[currentModelId] || "";
    const brains = [loaded.clone()];
    for (let i = 1; i < popSize; i++) {
      const b = loaded.clone();
      b.mutate(mutRate, 0.25);
      brains.push(b);
    }
    generation = 1;
    fitnessHistory = [];
    allStarMode = false;
    btnAllStar.classList.remove("btn-active");
    btnAllStar.textContent = t.allStar;
    spawnPopulation(brains);
    drawFitnessChart(chartCtx, chartCanvas.width, chartCanvas.height, fitnessHistory, currentTheme, t.waitingChart);
    brainStatus.textContent = t.loadedBrain.replace("{model}", t.models[currentModelId] || MODEL_SPECS[currentModelId].name);
  }

  btnLoadBrain.addEventListener("click", () => {
    const t = PAGE_I18N[currentLang];
    const raw = safeGetStorage("neuro_evo_champion");
    if (!raw) {
      brainStatus.textContent = t.noSavedBrain;
      return;
    }
    try {
      applyLoadedBrain(NeuralNetwork.fromJSON(JSON.parse(raw)));
    } catch {
      brainStatus.textContent = t.invalidBrain;
    }
  });

  btnExportBrain.addEventListener("click", () => {
    const best = getBestCar();
    const brain = best ? best.brain : savedChampion;
    if (!brain) return;
    const t = PAGE_I18N[currentLang];
    downloadJSON(`neuro-evo-${brain.modelId}-gen${generation}.json`, brain.toJSON());
    brainStatus.textContent = t.exportedBrain.replace("{model}", t.models[brain.modelId] || brain.modelId);
  });

  btnImportBrain.addEventListener("click", () => fileImportBrain.click());
  fileImportBrain.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyLoadedBrain(NeuralNetwork.fromJSON(JSON.parse(reader.result)));
      } catch {
        brainStatus.textContent = PAGE_I18N[currentLang].invalidBrain;
      }
      fileImportBrain.value = "";
    };
    reader.readAsText(file);
  });

  btnExportTrack.addEventListener("click", () => {
    downloadJSON(`neuro-evo-track-${selTrack.value}.json`, {
      name: currentTrack.name,
      halfWidth: currentTrack.halfWidth,
      centerPts: currentTrack.centerPts,
    });
    brainStatus.textContent = PAGE_I18N[currentLang].exportedTrack;
  });

  btnImportTrack.addEventListener("click", () => fileImportTrack.click());
  fileImportTrack.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || !Array.isArray(obj.centerPts) || obj.centerPts.length < 10) {
          throw new Error("Invalid track");
        }
        currentTrack = buildTrackFromCenterline(obj.centerPts, obj.halfWidth || 46, obj.name || "Imported Track");
        selTrack.value = "custom";
        resetEvolution(false);
        brainStatus.textContent = PAGE_I18N[currentLang].importedTrack;
      } catch {
        brainStatus.textContent = PAGE_I18N[currentLang].invalidTrack;
      }
      fileImportTrack.value = "";
    };
    reader.readAsText(file);
  });

  // Custom track drawing (Pointer Events support both mouse and touch)
  function toCanvasCoords(clientX, clientY) {
    const rect = trackCanvas.getBoundingClientRect();
    return [
      ((clientX - rect.left) / rect.width) * trackCanvas.width,
      ((clientY - rect.top) / rect.height) * trackCanvas.height,
    ];
  }

  btnDrawTrack.addEventListener("click", () => {
    if (drawMode) {
      exitDrawMode();
      return;
    }
    drawMode = true;
    btnDrawTrack.classList.add("btn-active");
    trackCanvas.classList.add("drawing");
    drawBanner.textContent = PAGE_I18N[currentLang].drawBanner;
    drawBanner.classList.remove("hidden");
    strokePts = [];
  });

  trackCanvas.addEventListener("pointerdown", (e) => {
    if (!drawMode) return;
    drawingStroke = true;
    strokePts = [toCanvasCoords(e.clientX, e.clientY)];
  });

  window.addEventListener("pointermove", (e) => {
    if (!drawMode || !drawingStroke) return;
    const pt = toCanvasCoords(e.clientX, e.clientY);
    const last = strokePts[strokePts.length - 1];
    if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 10) {
      strokePts.push(pt);
    }
  });

  window.addEventListener("pointerup", () => {
    if (!drawMode || !drawingStroke) return;
    drawingStroke = false;
    const custom = resampleClosedStroke(strokePts);
    if (custom) {
      currentTrack = custom;
      selTrack.value = "custom";
      exitDrawMode();
      resetEvolution(false);
    } else {
      strokePts = [];
      drawBanner.textContent = PAGE_I18N[currentLang].strokeTooShort;
    }
  });

  window.addEventListener("pointercancel", () => {
    if (drawingStroke) {
      drawingStroke = false;
      strokePts = [];
    }
  });

  btnClearLog.addEventListener("click", () => {
    trainingLogs = [];
    safeSetStorage("neuro_evo_logs", "[]");
    renderLogs();
  });

  btnExportLog.addEventListener("click", () => {
    const text = trainingLogs
      .slice()
      .reverse()
      .map((e) => `[${e.time}] ${e.msg}`)
      .join("\n");
    const blob = new Blob([text || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuro-evo-training-log.txt";
    a.click();
    URL.revokeObjectURL(url);
  });

  renderProbeSliders();
  applyPageLang(currentLang);
  applyTheme(currentTheme);
  resetEvolution(false);
  renderFrame();
})();
