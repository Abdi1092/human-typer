
// ==========================================
// HUMAN TYPER V2
// Main application engine
// ==========================================

const $ = (id) => document.getElementById(id);

const inputText = $("inputText");
const speed = $("speed");
const speedPreset = $("speedPreset");
const timingMode = $("timingMode");
const punctuation = $("punctuation");

let text = "";
let index = 0;
let timer = null;
let startedAt = 0;
let elapsedBeforePause = 0;
let elapsedTimer = null;

let isRunning = false;
let isPaused = false;

let templates = [];
let history = [];

const DEFAULT_SPEED = 45;

const PRESETS = {
  slow: 25,
  normal: 45,
  fast: 70
};

// ==========================================
// LOCAL STORAGE
// ==========================================

async function loadData() {
  const data = await chrome.storage.local.get([
    "savedText",
    "savedSpeed",
    "savedPreset",
    "savedTiming",
    "savedPunctuation",
    "templates",
    "history"
  ]);

  inputText.value = data.savedText || "";

  speed.value = data.savedSpeed || DEFAULT_SPEED;

  speedPreset.value = data.savedPreset || "normal";

  timingMode.value = data.savedTiming || "varied";

  punctuation.checked = data.savedPunctuation !== false;

  templates = Array.isArray(data.templates)
    ? data.templates
    : [];

  history = Array.isArray(data.history)
    ? data.history
    : [];

  updateCounter();
  updateSpeed();
  renderTemplates();
  renderHistory();
  updateStatistics();
}

async function saveData() {
  await chrome.storage.local.set({
    savedText: inputText.value,
    savedSpeed: speed.value,
    savedPreset: speedPreset.value,
    savedTiming: timingMode.value,
    savedPunctuation: punctuation.checked,
    templates,
    history
  });
}

// ==========================================
// NAVIGATION
// ==========================================

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".nav-btn")
      .forEach(item => item.classList.remove("active"));

    document.querySelectorAll(".page")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");
    $(page).classList.add("active");

    if (page === "templates") renderTemplates();
    if (page === "history") {
      renderHistory();
      updateStatistics();
    }
  });
});

// ==========================================
// STATUS AND COUNTERS
// ==========================================

function setStatus(value) {
  $("status").textContent = value;
}

function updateCounter() {
  const value = inputText.value;

  const characters = value.length;

  const words = value.trim()
    ? value.trim().split(/\s+/).length
    : 0;

  $("charCount").textContent =
    `${characters} characters`;

  $("wordCount").textContent =
    `${words} words`;
}

function updateSpeed() {
  $("speedValue").textContent = `${speed.value} WPM`;
}

function updateProgress() {
  const percentage = text.length
    ? Math.floor(index / text.length * 100)
    : 0;

  $("progress").textContent = `${percentage}%`;

  $("progressBar").style.width = `${percentage}%`;

  $("typedCount").textContent = index;

  $("remaining").textContent =
    Math.max(0, text.length - index);
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsed() {
  if (!isRunning) return elapsedBeforePause;

  if (isPaused) return elapsedBeforePause;

  return elapsedBeforePause + Date.now() - startedAt;
}

function updateElapsed() {
  $("elapsed").textContent =
    formatTime(getElapsed());
}

// ==========================================
// BUTTON STATES
// ==========================================

function updateButtons() {
  $("startBtn").disabled =
    isRunning && !isPaused;

  $("pauseBtn").disabled = !isRunning;

  $("stopBtn").disabled = !isRunning;

  $("pauseBtn").textContent =
    isPaused ? "RESUME" : "PAUSE";
}

// ==========================================
// SIMULATION ENGINE
// ==========================================

function clearSimulationTimers() {
  clearTimeout(timer);
  clearInterval(elapsedTimer);

  timer = null;
  elapsedTimer = null;
}

function getCharacterDelay(character) {
  const base = 60000 / (Number(speed.value) * 5);

  let variation = 1;

  if (timingMode.value === "varied") {
    variation = 0.85 + Math.random() * 0.3;
  }

  let pause = 0;

  if (punctuation.checked) {
    if (/[.!?]/.test(character)) {
      pause = 350;
    } else if (/[,;:]/.test(character)) {
      pause = 150;
    }
  }

  return Math.max(10, base * variation + pause);
}

function startElapsedClock() {
  clearInterval(elapsedTimer);

  elapsedTimer = setInterval(updateElapsed, 250);
}

function stopElapsedClock() {
  clearInterval(elapsedTimer);
  elapsedTimer = null;
}

function typeNextCharacter() {
  if (!isRunning || isPaused) return;

  if (index >= text.length) {
    completeSimulation();
    return;
  }

  if (index === 0) {
    $("preview").textContent = "";
  }

  const character = text[index];

  $("preview").textContent += character;

  index++;

  updateProgress();

  if (index >= text.length) {
    completeSimulation();
    return;
  }

  timer = setTimeout(
    typeNextCharacter,
    getCharacterDelay(character)
  );
}

function startSimulation() {
  if (isRunning && !isPaused) return;

  if (isPaused) {
    isPaused = false;

    startedAt = Date.now();

    setStatus("RUNNING");

    startElapsedClock();

    updateButtons();

    typeNextCharacter();

    return;
  }

  text = inputText.value;

  if (!text.trim()) {
    setStatus("ENTER TEXT");
    return;
  }

  clearSimulationTimers();

  index = 0;

  elapsedBeforePause = 0;

  startedAt = Date.now();

  isRunning = true;
  isPaused = false;

  $("preview").textContent = "";

  updateProgress();
  updateElapsed();
  updateButtons();

  setStatus("RUNNING");

  startElapsedClock();

  typeNextCharacter();
}

function pauseSimulation() {
  if (!isRunning) return;

  if (!isPaused) {
    elapsedBeforePause += Date.now() - startedAt;

    isPaused = true;

    clearTimeout(timer);
    timer = null;

    stopElapsedClock();

    updateElapsed();

    setStatus("PAUSED");
  } else {
    isPaused = false;

    startedAt = Date.now();

    startElapsedClock();

    setStatus("RUNNING");

    typeNextCharacter();
  }

  updateButtons();
}

function stopSimulation() {
  if (!isRunning) return;

  clearSimulationTimers();

  isRunning = false;
  isPaused = false;

  index = 0;
  elapsedBeforePause = 0;

  $("preview").textContent =
    "Simulation stopped.";

  updateProgress();
  updateElapsed();
  updateButtons();

  setStatus("STOPPED");
}

function resetPreview() {
  if (isRunning) {
    stopSimulation();
  }

  index = 0;
  text = "";

  $("preview").innerHTML =
    '<span class="placeholder">Your simulation will appear here...</span>';

  elapsedBeforePause = 0;

  updateProgress();
  updateElapsed();

  setStatus("READY");
  updateButtons();
}

async function completeSimulation() {
  clearSimulationTimers();

  const duration = getElapsed();

  isRunning = false;
  isPaused = false;

  index = text.length;

  const session = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    characters: text.length,
    words: text.trim().split(/\s+/).length,
    duration: Math.round(duration),
    speed: Number(speed.value)
  };

  history.unshift(session);

  history = history.slice(0, 30);

  elapsedBeforePause = duration;

  await saveData();

  updateProgress();
  updateElapsed();
  updateButtons();

  setStatus("COMPLETE");

  renderHistory();
  updateStatistics();
}

// ==========================================
// TEXT CONTROLS
// ==========================================

async function copyText() {
  if (!inputText.value) {
    setStatus("NO TEXT");
    return;
  }

  try {
    await navigator.clipboard.writeText(inputText.value);

    setStatus("COPIED");
  } catch (error) {
    console.error(error);
    setStatus("COPY FAILED");
  }
}

$("clearBtn").addEventListener("click", async () => {
  if (isRunning) stopSimulation();

  inputText.value = "";

  updateCounter();

  await saveData();

  setStatus("CLEARED");
});

inputText.addEventListener("input", async () => {
  if (isRunning) stopSimulation();

  updateCounter();

  await saveData();
});

$("copyBtn").addEventListener("click", copyText);

$("docsBtn").addEventListener("click", copyText);

// ==========================================
// SPEED SETTINGS
// ==========================================

speed.addEventListener("input", async () => {
  speedPreset.value = "custom";

  updateSpeed();

  await saveData();
});

speedPreset.addEventListener("change", async () => {
  if (speedPreset.value === "custom") return;

  speed.value = PRESETS[speedPreset.value];

  updateSpeed();

  await saveData();
});

timingMode.addEventListener("change", saveData);

punctuation.addEventListener("change", saveData);

// ==========================================
// TEMPLATE SYSTEM
// ==========================================

async function saveTemplate() {
  const name = $("templateName").value.trim();

  const content = inputText.value;

  if (!name || !content.trim()) {
    setStatus("ENTER NAME AND TEXT");
    return;
  }

  if (templates.some(item =>
    item.name.toLowerCase() === name.toLowerCase()
  )) {
    setStatus("NAME ALREADY EXISTS");
    return;
  }

  templates.unshift({
    id: crypto.randomUUID(),
    name,
    content,
    created: new Date().toISOString()
  });

  templates = templates.slice(0, 50);

  $("templateName").value = "";

  await saveData();

  renderTemplates();
  updateStatistics();

  setStatus("TEMPLATE SAVED");
}

function renderTemplates() {
  const container = $("templateList");

  $("templateCount").textContent =
    `${templates.length} saved`;

  if (!templates.length) {
    container.innerHTML =
      '<p class="empty-state">No templates saved yet.</p>';

    return;
  }

  container.replaceChildren();

  templates.forEach(template => {
    const card = document.createElement("div");

    card.className = "item-card";

    const title = document.createElement("strong");
    title.textContent = template.name;

    const description = document.createElement("small");
    description.textContent =
      `${template.content.length} characters`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const loadButton = document.createElement("button");
    loadButton.textContent = "LOAD";

    loadButton.addEventListener("click", async () => {
      if (isRunning) stopSimulation();

      inputText.value = template.content;

      updateCounter();

      await saveData();

      document.querySelector('[data-page="workspace"]').click();

      setStatus("TEMPLATE LOADED");
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "DELETE";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", async () => {
      templates = templates.filter(
        item => item.id !== template.id
      );

      await saveData();

      renderTemplates();
      updateStatistics();

      setStatus("TEMPLATE DELETED");
    });

    actions.append(loadButton, deleteButton);

    card.append(title, description, actions);

    container.append(card);
  });
}

$("saveTemplateBtn").addEventListener(
  "click",
  saveTemplate
);

// ==========================================
// SESSION HISTORY
// ==========================================

function renderHistory() {
  const container = $("historyList");

  if (!history.length) {
    container.innerHTML =
      '<p class="empty-state">No completed sessions yet.</p>';

    return;
  }

  container.replaceChildren();

  history.forEach(session => {
    const card = document.createElement("div");

    card.className = "item-card";

    const title = document.createElement("strong");
    title.textContent =
      `${session.characters.toLocaleString()} characters`;

    const date = document.createElement("small");

    date.textContent =
      new Date(session.date).toLocaleString();

    const details = document.createElement("small");

    details.textContent =
      `${session.words} words · ${formatTime(session.duration)} · ${session.speed} WPM`;

    card.append(title, date, details);

    container.append(card);
  });
}

function updateStatistics() {
  const totalCharacters = history.reduce(
    (sum, session) => sum + session.characters,
    0
  );

  $("totalSessions").textContent = history.length;

  $("totalCharacters").textContent =
    totalCharacters.toLocaleString();

  $("totalTemplates").textContent = templates.length;
}

$("clearHistoryBtn").addEventListener("click", async () => {
  if (!history.length) return;

  if (!confirm("Delete all session history?")) return;

  history = [];

  await saveData();

  renderHistory();
  updateStatistics();

  setStatus("HISTORY CLEARED");
});

// ==========================================
// MAIN EVENT LISTENERS
// ==========================================

$("startBtn").addEventListener(
  "click",
  startSimulation
);

$("pauseBtn").addEventListener(
  "click",
  pauseSimulation
);

$("stopBtn").addEventListener(
  "click",
  stopSimulation
);

$("resetBtn").addEventListener(
  "click",
  resetPreview
);

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

async function initialize() {
  try {
    await loadData();

    updateButtons();
    updateProgress();
    updateElapsed();

    setStatus("READY");
  } catch (error) {
    console.error("Initialization failed:", error);

    setStatus("STORAGE ERROR");
  }
}

initialize();
