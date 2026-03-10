// Pomodoro 番茄钟核心逻辑
// 说明：
// - 纯前端实现，无需后端，可以直接部署到 GitHub Pages。
// - 为了保证简单易用，这里只提供「专注 25 分钟」和「休息 5 分钟」两种固定时长。
// - 所有关键步骤都写了中文注释，方便你阅读和修改。

(function () {
  /** 模式配置（秒） */
  const MODES = {
    focus: {
      label: "专注",
      duration: 25 * 60, // 25 分钟
    },
    break: {
      label: "休息",
      duration: 5 * 60, // 5 分钟
    },
  };

  /** DOM 元素获取 */
  const focusTab = document.getElementById("focus-tab");
  const breakTab = document.getElementById("break-tab");
  const timeEl = document.getElementById("time-remaining");
  const statusEl = document.getElementById("status-text");
  const progressFillEl = document.getElementById("progress-fill");
  const startBtn = document.getElementById("start-button");
  const pauseBtn = document.getElementById("pause-button");
  const resetBtn = document.getElementById("reset-button");

  /** 当前状态 */
  let currentMode = "focus"; // "focus" | "break"
  let remainingSeconds = MODES[currentMode].duration;
  let timerId = null;
  let isRunning = false;

  /** 将秒数格式化成 MM:SS */
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  /** 更新界面上的时间和进度条 */
  function renderTimeAndProgress() {
    const modeConfig = MODES[currentMode];
    timeEl.textContent = formatTime(remainingSeconds);

    const total = modeConfig.duration;
    const progress = Math.min(
      100,
      Math.max(0, ((total - remainingSeconds) / total) * 100)
    );
    progressFillEl.style.width = `${progress}%`;
  }

  /** 更新状态文字 */
  function renderStatusText(customText) {
    if (customText) {
      statusEl.textContent = customText;
      return;
    }

    if (!isRunning) {
      statusEl.textContent =
        currentMode === "focus" ? "准备开始专注" : "准备开始休息";
      return;
    }

    statusEl.textContent =
      currentMode === "focus" ? "专注进行中…" : "休息进行中…";
  }

  /** 控制按钮可用状态 */
  function updateButtonStates() {
    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;
    // 重置按钮始终可用（允许随时中断）
    resetBtn.disabled = false;
  }

  /** 切换模式（专注/休息） */
  function switchMode(mode) {
    if (!MODES[mode]) return;

    currentMode = mode;
    remainingSeconds = MODES[mode].duration;

    // 视觉高亮当前模式
    if (mode === "focus") {
      focusTab.classList.add("mode-button--active");
      focusTab.setAttribute("aria-selected", "true");
      breakTab.classList.remove("mode-button--active");
      breakTab.setAttribute("aria-selected", "false");
    } else {
      breakTab.classList.add("mode-button--active");
      breakTab.setAttribute("aria-selected", "true");
      focusTab.classList.remove("mode-button--active");
      focusTab.setAttribute("aria-selected", "false");
    }

    // 停止当前计时并重置界面
    stopTimer();
    renderTimeAndProgress();
    renderStatusText();
    updateButtonStates();
  }

  /** 启动计时 */
  function startTimer() {
    if (isRunning) return;

    isRunning = true;
    updateButtonStates();
    renderStatusText();

    // 这里使用 setInterval，每 1 秒更新一次界面
    timerId = window.setInterval(() => {
      remainingSeconds -= 1;

      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        renderTimeAndProgress();
        handleTimerEnd();
        return;
      }

      renderTimeAndProgress();
    }, 1000);
  }

  /** 暂停计时 */
  function pauseTimer() {
    if (!isRunning) return;
    stopTimer();
    renderStatusText(
      currentMode === "focus" ? "已暂停专注" : "已暂停休息"
    );
    updateButtonStates();
  }

  /** 停止计时（内部使用） */
  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
    isRunning = false;
  }

  /** 重置当前模式计时 */
  function resetTimer() {
    remainingSeconds = MODES[currentMode].duration;
    stopTimer();
    renderTimeAndProgress();
    renderStatusText();
    updateButtonStates();
  }

  /** 计时结束时的处理逻辑 */
  function handleTimerEnd() {
    stopTimer();
    playNotificationSound();

    const finishedMode = currentMode;

    if (finishedMode === "focus") {
      renderStatusText("专注结束！可以休息一下了～");
      // 自动切换到休息模式，但不自动开始，避免打扰
      window.setTimeout(() => {
        switchMode("break");
        renderStatusText("上一轮专注已完成，开始休息吧～");
      }, 600);
    } else {
      renderStatusText("休息结束！准备进入下一轮专注～");
      window.setTimeout(() => {
        switchMode("focus");
        renderStatusText("准备开始新一轮专注");
      }, 600);
    }

    updateButtonStates();
  }

  /** 播放提示音（非常短的“滴”声） */
  function playNotificationSound() {
    try {
      const ctx =
        window.audioContext ||
        window.webkitAudioContext ||
        window.AudioContext ||
        null;

      // 如果浏览器不支持 Web Audio，就直接返回，保持静默
      if (!ctx) return;

      const audioCtx = new ctx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880; // 高频一点，更清晰

      // 音量淡出，避免突兀
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.35
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // 如果出现任何错误，静默失败即可，不影响计时功能
      console.warn("提示音播放失败：", e);
    }
  }

  /** 绑定按钮事件 */
  function bindEvents() {
    focusTab.addEventListener("click", () => {
      if (currentMode === "focus") return;
      switchMode("focus");
    });

    breakTab.addEventListener("click", () => {
      if (currentMode === "break") return;
      switchMode("break");
    });

    startBtn.addEventListener("click", () => {
      startTimer();
    });

    pauseBtn.addEventListener("click", () => {
      pauseTimer();
    });

    resetBtn.addEventListener("click", () => {
      resetTimer();
    });
  }

  /** 初始化函数：页面加载完成后执行一次 */
  function init() {
    renderTimeAndProgress();
    renderStatusText();
    updateButtonStates();
    bindEvents();
  }

  // DOM 加载完成后启动初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

