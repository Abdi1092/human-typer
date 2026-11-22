
// ==========================================
// HUMAN TYPER V2
// Main application engine
// ==========================================

const $ = (id) => document.getElementById(id);

// Workspace elements
const inputText = $("inputText");
const speed = $("speed");
const speedValue = $("speedValue");
const speedPreset = $("speedPreset");
const timingMode = $("timingMode");
const punctuation = $("punctuation");

const charCount = $("charCount");
const wordCount = $("wordCount");
const clearBtn = $("clearBtn");

const preview = $("preview");
const progress = $("progress");
const progressBar = $("progressBar");
const typedCount = $("typedCount");
const elapsed = $("elapsed");
const remaining = $("remaining");
const status = $("status");

const startBtn = $("startBtn");
const pauseBtn = $("pauseBtn");
const stopBtn = $("stopBtn");
const copyBtn = $("copyBtn");
const resetBtn = $("resetBtn");
const docsBtn = $("docsBtn");

// Templates
const templateName = $("templateName");
const saveTemplateBtn = $("saveTemplateBtn");
const templateCount = $("templateCount");
const templateList = $("templateList");

// History
const historyList = $("historyList");
const totalSessions = $("totalSessions");
const totalCharacters = $("totalCharacters");
const totalTemplates = $("totalTemplates");
const clearHistoryBtn = $("clearHistoryBtn");

// Navigation
const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

// Application state
let text = "";
let index = 0;
let timer = null;
let elapsedTimer = null;

let isRunning = false;
let isPaused = false;

let startedAt = 0;
let elapsedBeforePause = 0;

let templates = [];
let history = [];

const DEFAULT_SPEED = 45;

const PRESETS = {
  slow: 25,
  normal: 45,
  fast: 70
};

// ==========================================
// STATUS AND DISPLAY
// ==========================================

function updateStatus(message) {
  status.textContent = message;
}

function updateCounter() {
  const count = inputText.value.length;
  const words = inputText.value.trim()
    ? inputText.value.trim().split(/\s+/).length
    : 0;

  charCount.textContent =
    `${count} character${count === 1 ? "" : "s"}`;

  wordCount.textContent =
    `${words} word${words === 1 ? "" : "s"}`;
}

function updateSpeed() {
  speedValue.textContent = `${speed.value} WPM`;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedTime() {
  if (isRunning && !isPaused) {
    return elapsedBeforePause + (Date.now() - startedAt);
  }

  return elapsedBeforePause;
}

function updateElapsed() {
  elapsed.textContent = formatTime(getElapsedTime());
}

function updateProgress() {
  const percentage = text.length
    ? Math.floor((index / text.length) * 100)
    : 0;

  progress.textContent = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;

  typedCount.textContent = index;
  remaining.textContent = Math.max(0, text.length - index);
}

function updateButtons() {
  startBtn.disabled = isRunning && !isPaused;
  pauseBtn.disabled = !isRunning;
  stopBtn.disabled = !isRunning;

  pauseBtn.textContent = isPaused ? "RESUME" : "PAUSE";
}

// ==========================================
// TIMER
// ==========================================

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function clearElapsedTimer() {
  if (elapsedTimer !== null) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

function startElapsedTimer() {
  clearElapsedTimer();

  elapsedTimer = setInterval(() => {
    updateElapsed();
  }, 500);
}

function getDelay(character) {
  const baseDelay = 60000 / (Number(speed.value) * 5);

  let variation = 1;

  if (timingMode.value === "varied") {
    variation = 0.85 + Math.random() * 0.3;
  }

  let punctuationDelay = 0;

  if (punctuation.checked) {
    if (/[.!?]/.test(character)) {
      punctuationDelay = 250;
    } else if (/[,;:]/.test(character)) {
      punctuationDelay = 120;
    }
  }

  return Math.max(
    10,
    Math.round(baseDelay * variation + punctuationDelay)
  );
}

// ==========================================
// SIMULATION
// ==========================================

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

  timer = setTimeout(
    typeNextCharacter,
    getDelay(character)
  );
}

async function finishSimulation() {
  clearTimer();
  clearElapsedTimer();

  isRunning = false;
  isPaused = false;

  elapsedBeforePause = getElapsedTime();

  updateProgress();
  updateElapsed();
  updateStatus("COMPLETE");
  updateButtons();

  startBtn.disabled = false;

  await saveCompletedSession();
}

function startSimulation() {
  if (isRunning && !isPaused) return;

  if (isPaused) {
    isPaused = false;
    startedAt = Date.now();

    updateStatus("RUNNING");
    updateButtons();

    startElapsedTimer();
    typeNextCharacter();

    return;
  }

  text = inputText.value;

  if (!text.trim()) {
    updateStatus("ENTER TEXT");
    return;
  }

  clearTimer();
  clearElapsedTimer();

  index = 0;
  elapsedBeforePause = 0;

  isRunning = true;
  isPaused = false;

  startedAt = Date.now();

  preview.textContent = "";

  updateProgress();
  updateElapsed();
  updateStatus("RUNNING");
  updateButtons();

  startElapsedTimer();
  typeNextCharacter();
}

function pauseSimulation() {
  if (!isRunning) return;

  if (!isPaused) {
    isPaused = true;

    clearTimer();
    clearElapsedTimer();

    elapsedBeforePause += Date.now() - startedAt;

    updateElapsed();
    updateStatus("PAUSED");
    updateButtons();
  } else {
    isPaused = false;
    startedAt = Date.now();

    updateStatus("RUNNING");
    updateButtons();

    startElapsedTimer();
    typeNextCharacter();
  }
}

function stopSimulation() {
  clearTimer();
  clearElapsedTimer();

  isRunning = false;
  isPaused = false;

  index = 0;
  elapsedBeforePause = 0;

  preview.textContent =
    "Simulation stopped. Press start to begin again.";

  progress.textContent = "0%";
  progressBar.style.width = "0%";

  typedCount.textContent = "0";
  remaining.textContent = text.length;

  elapsed.textContent = "00:00";

  updateStatus("STOPPED");
  updateButtons();

  startBtn.disabled = false;
}

function resetPreview() {
  clearTimer();
  clearElapsedTimer();

  isRunning = false;
  isPaused = false;

  text = "";
  index = 0;
  elapsedBeforePause = 0;

  preview.textContent =
    "Your simulation will appear here...";

  progress.textContent = "0%";
  progressBar.style.width = "0%";

  typedCount.textContent = "0";
  remaining.textContent = "0";
  elapsed.textContent = "00:00";

  updateStatus("READY");
  updateButtons();

  startBtn.disabled = false;
}

// ==========================================
// CLIPBOARD
// ==========================================

async function copyText() {
  const value = inputText.value;

  if (!value.trim()) {
    updateStatus("NO TEXT");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    updateStatus("COPIED");
  } catch (error) {
    updateStatus("COPY FAILED");
    console.error("Clipboard error:", error);
  }
}

// ==========================================
// SETTINGS STORAGE
// ==========================================

async function saveSettings() {
  try {
    await chrome.storage.local.set({
      savedText: inputText.value,
      savedSpeed: speed.value,
      savedTimingMode: timingMode.value,
      savedPunctuation: punctuation.checked
    });
  } catch (error) {
    console.error("Settings save error:", error);
  }
}

async function loadSettings() {
  try {
    const saved = await chrome.storage.local.get([
      "savedText",
      "savedSpeed",
      "savedTimingMode",
      "savedPunctuation",
      "templates",
      "history"
    ]);

    if (typeof saved.savedText === "string") {
      inputText.value = saved.savedText;
    }

    if (saved.savedSpeed) {
      speed.value = saved.savedSpeed;
    }

    if (saved.savedTimingMode) {
      timingMode.value = saved.savedTimingMode;
    }

    if (typeof saved.savedPunctuation === "boolean") {
      punctuation.checked = saved.savedPunctuation;
    }

    templates = Array.isArray(saved.templates)
      ? saved.templates
      : [];

    history = Array.isArray(saved.history)
      ? saved.history
      : [];

    updateCounter();
    updateSpeed();
    updatePresetSelection();

    renderTemplates();
    renderHistory();
  } catch (error) {
    console.error("Settings load error:", error);
  }
}

// ==========================================
// SPEED PRESETS
// ==========================================

function updatePresetSelection() {
  const matchingPreset = Object.keys(PRESETS).find(
    key => PRESETS[key] === Number(speed.value)
  );

  speedPreset.value = matchingPreset || "custom";
}

speedPreset.addEventListener("change", () => {
  if (PRESETS[speedPreset.value]) {
    speed.value = PRESETS[speedPreset.value];
    updateSpeed();
    saveSettings();
  }
});

speed.addEventListener("input", () => {
  updateSpeed();
  updatePresetSelection();
  saveSettings();
});

// ==========================================
// TEMPLATES
// ==========================================

async function saveTemplates() {
  try {
    await chrome.storage.local.set({ templates });
  } catch (error) {
    console.error("Template save error:", error);
  }
}

function renderTemplates() {
  templateList.replaceChildren();

  templateCount.textContent =
    `${templates.length} saved`;

  totalTemplates.textContent = templates.length;

  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No templates saved yet.";
    templateList.appendChild(empty);
    return;
  }

  templates.forEach(template => {
    const item = document.createElement("div");
    item.className = "list-item";

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = template.name;

    const description = document.createElement("p");
    description.textContent =
      `${template.text.length} characters`;

    info.append(name, description);

    const actions = document.createElement("div");

    const loadButton = document.createElement("button");
    loadButton.textContent = "LOAD";

    loadButton.addEventListener("click", () => {
      inputText.value = template.text;
      updateCounter();
      saveSettings();
      showPage("workspace");
      updateStatus("TEMPLATE LOADED");
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "DELETE";

    deleteButton.addEventListener("click", async () => {
      templates = templates.filter(
        item => item.id !== template.id
      );

      await saveTemplates();
      renderTemplates();
    });

    actions.append(loadButton, deleteButton);
    item.append(info, actions);

    templateList.appendChild(item);
  });
}

async function createTemplate() {
  const name = templateName.value.trim();
  const value = inputText.value.trim();

  if (!name) {
    updateStatus("ENTER TEMPLATE NAME");
    return;
  }

  if (!value) {
    updateStatus("ENTER TEXT FIRST");
    return;
  }

  templates.unshift({
    id: Date.now(),
    name,
    text: value,
    createdAt: new Date().toISOString()
  });

  await saveTemplates();

  templateName.value = "";

  renderTemplates();
  updateStatus("TEMPLATE SAVED");
}

// ==========================================
// SESSION HISTORY
// ==========================================

async function saveHistory() {
  try {
    await chrome.storage.local.set({ history });
  } catch (error) {
    console.error("History save error:", error);
  }
}

async function saveCompletedSession() {
  history.unshift({
    id: Date.now(),
    text,
    characters: text.length,
    speed: Number(speed.value),
    duration: getElapsedTime(),
    date: new Date().toISOString()
  });

  history = history.slice(0, 50);

  await saveHistory();
  renderHistory();
}

function renderHistory() {
  historyList.replaceChildren();

  totalSessions.textContent = history.length;

  totalCharacters.textContent = history.reduce(
    (total, session) => total + session.characters,
    0
  );

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No completed sessions yet.";
    historyList.appendChild(empty);
    return;
  }

  history.forEach(session => {
    const item = document.createElement("div");
    item.className = "list-item";

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent =
      `${session.characters} characters`;

    const description = document.createElement("p");
    description.textContent =
      `${new Date(session.date).toLocaleString()} · ${session.speed} WPM · ${formatTime(session.duration)}`;

    info.append(name, description);

    const loadButton = document.createElement("button");
    loadButton.textContent = "LOAD";

    loadButton.addEventListener("click", () => {
      inputText.value = session.text;
      updateCounter();
      saveSettings();
      showPage("workspace");
      updateStatus("HISTORY LOADED");
    });

    item.append(info, loadButton);
    historyList.appendChild(item);
  });
}

async function clearHistory() {
  history = [];

  await saveHistory();
  renderHistory();

  updateStatus("HISTORY CLEARED");
}

// ==========================================
// NAVIGATION
// ==========================================

function showPage(pageName) {
  pages.forEach(page => {
    page.classList.toggle("active", page.id === pageName);
  });

  navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// ==========================================
// EVENT LISTENERS
// ==========================================

startBtn.addEventListener("click", startSimulation);
pauseBtn.addEventListener("click", pauseSimulation);
stopBtn.addEventListener("click", stopSimulation);

copyBtn.addEventListener("click", copyText);
docsBtn.addEventListener("click", copyText);

resetBtn.addEventListener("click", resetPreview);

clearBtn.addEventListener("click", () => {
  if (isRunning) {
    stopSimulation();
  }

  inputText.value = "";

  updateCounter();
  saveSettings();

  updateStatus("TEXT CLEARED");
});

inputText.addEventListener("input", () => {
  updateCounter();

  if (isRunning) {
    stopSimulation();
  }

  saveSettings();
});

timingMode.addEventListener("change", saveSettings);
punctuation.addEventListener("change", saveSettings);

saveTemplateBtn.addEventListener("click", createTemplate);
clearHistoryBtn.addEventListener("click", clearHistory);

// ==========================================
// INITIALIZE
// ==========================================

async function initializeApp() {
  await loadSettings();

  updateButtons();
  updateCounter();
  updateSpeed();
  updateProgress();
  updateElapsed();

  updateStatus("READY");
}

initializeApp();
