
const inputText = document.getElementById("inputText");
const speed = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");
const charCount = document.getElementById("charCount");

const preview = document.getElementById("preview");
const progress = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");

const statusIndicator = document.getElementById("statusIndicator");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const docsBtn = document.getElementById("docsBtn");

let text = "";
let index = 0;
let timer = null;
let isRunning = false;
let isPaused = false;

function updateCounter() {
  const count = inputText.value.length;

  charCount.textContent =
    `${count} character${count === 1 ? "" : "s"}`;
}

function updateSpeed() {
  speedValue.textContent = `${speed.value} WPM`;
}

function updateStatus(value) {
  statusIndicator.textContent = value;
}

function updateProgress() {
  const percentage = text.length
    ? Math.floor((index / text.length) * 100)
    : 0;

  progress.textContent = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;
}

function updateButtons() {
  startBtn.disabled = isRunning && !isPaused;
  pauseBtn.disabled = !isRunning;
  stopBtn.disabled = !isRunning;

  pauseBtn.textContent = isPaused ? "RESUME" : "PAUSE";
}

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function getDelay(character) {
  const baseDelay = 60000 / (Number(speed.value) * 5);

  // A small timing variation for the visual simulation.
  const variation = 0.85 + Math.random() * 0.3;

  const punctuationDelay = /[.!?]/.test(character)
    ? 250
    : /[,;:]/.test(character)
      ? 120
      : 0;

  return Math.max(
    10,
    Math.round(baseDelay * variation + punctuationDelay)
  );
}

function finishSimulation() {
  clearTimer();

  isRunning = false;
  isPaused = false;

  updateProgress();
  updateStatus("COMPLETE");
  updateButtons();

  startBtn.disabled = false;
}

function typeNextCharacter() {
  if (!isRunning || isPaused) return;

  if (index >= text.length) {
    finishSimulation();
    return;
  }

  const character = text[index];

  if (index === 0) {
    preview.textContent = "";
  }

  preview.textContent += character;

  index++;

  updateProgress();

  const delay = getDelay(character);

  timer = setTimeout(typeNextCharacter, delay);
}

function startSimulation() {
  if (isRunning && !isPaused) return;

  if (isPaused) {
    isPaused = false;
    updateStatus("RUNNING");
    updateButtons();
    typeNextCharacter();
    return;
  }

  text = inputText.value;

  if (!text.trim()) {
    updateStatus("ENTER TEXT");
    return;
  }

  clearTimer();

  index = 0;
  isRunning = true;
  isPaused = false;

  preview.textContent = "";

  updateStatus("RUNNING");
  updateProgress();
  updateButtons();

  typeNextCharacter();
}

function pauseSimulation() {
  if (!isRunning) return;

  if (!isPaused) {
    isPaused = true;
    clearTimer();

    updateStatus("PAUSED");
    updateButtons();
  } else {
    isPaused = false;

    updateStatus("RUNNING");
    updateButtons();

    typeNextCharacter();
  }
}

function stopSimulation() {
  clearTimer();

  isRunning = false;
  isPaused = false;
  index = 0;

  preview.textContent =
    "Simulation stopped. Press start to begin again.";

  progress.textContent = "0%";
  progressBar.style.width = "0%";

  updateStatus("STOPPED");
  updateButtons();
  startBtn.disabled = false;
}

async function copyText() {
  const value = inputText.value;

  if (!value) {
    updateStatus("NO TEXT");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    updateStatus("COPIED");
  } catch (error) {
    updateStatus("COPY FAILED");
    console.error(error);
  }
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({
      savedText: inputText.value,
      savedSpeed: speed.value
    });
  } catch (error) {
    console.error("Save error:", error);
  }
}

async function loadSettings() {
  try {
    const saved = await chrome.storage.local.get([
      "savedText",
      "savedSpeed"
    ]);

    if (typeof saved.savedText === "string") {
      inputText.value = saved.savedText;
    }

    if (saved.savedSpeed) {
      speed.value = saved.savedSpeed;
    }

    updateCounter();
    updateSpeed();
  } catch (error) {
    console.error("Load error:", error);
  }
}

// Event listeners

startBtn.addEventListener("click", startSimulation);

pauseBtn.addEventListener("click", pauseSimulation);

stopBtn.addEventListener("click", stopSimulation);

copyBtn.addEventListener("click", copyText);

docsBtn.addEventListener("click", copyText);

inputText.addEventListener("input", () => {
  updateCounter();
  saveSettings();

  if (isRunning) {
    stopSimulation();
  }
});

speed.addEventListener("input", () => {
  updateSpeed();
  saveSettings();
});

// Initialize

loadSettings();
updateButtons();
