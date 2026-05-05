"use strict";

const N_SAMPLES = 10;
const METHODS   = ["mas", "videomdm"];

// ─── Seeded RNG (Park-Miller LCG) ──────────────────────────────────────────
class RNG {
  constructor(seed) {
    this.s = Math.abs(Math.floor(seed * 2147483646)) % 2147483646 + 1;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
}

// ─── Session state ─────────────────────────────────────────────────────────
const state = {
  currentIdx:     0,
  answers:        [],   // [{sampleIdx, methodLeft, methodRight, winner, winnerMethod}]
  pairs:          [],   // pre-computed left/right assignment for all 10 samples
  leftEnded:      false,
  rightEnded:     false,
  completionCode: "",
};

// ─── Completion code ───────────────────────────────────────────────────────
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Session init ──────────────────────────────────────────────────────────
function initSession() {
  let seed = sessionStorage.getItem("survey_seed");
  if (!seed) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    seed = String(arr[0] / 0xFFFFFFFF);
    sessionStorage.setItem("survey_seed", seed);
  }

  let code = sessionStorage.getItem("survey_code");
  if (!code) {
    code = generateCode();
    sessionStorage.setItem("survey_code", code);
  }
  state.completionCode = code;

  const rng = new RNG(parseFloat(seed));

  for (let i = 0; i < N_SAMPLES; i++) {
    const leftIsA = rng.next() > 0.5;
    state.pairs.push({
      sampleIdx:   i,
      methodLeft:  leftIsA ? METHODS[0] : METHODS[1],
      methodRight: leftIsA ? METHODS[1] : METHODS[0],
    });
  }
}

// ─── Screen management ─────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function videoPath(method, sampleIdx) {
  return `videos/${method}/result_${sampleIdx}.mp4`;
}

function setSpinner(side, visible) {
  document.getElementById(`spinner-${side}`).classList.toggle("visible", visible);
}

function updateWaitingMsg() {
  const msg = document.getElementById("waiting-msg");
  if (state.leftEnded && state.rightEnded) {
    msg.classList.add("hidden");
  } else if (state.leftEnded) {
    msg.textContent = "Waiting for Video B to finish…";
    msg.classList.remove("hidden");
  } else if (state.rightEnded) {
    msg.textContent = "Waiting for Video A to finish…";
    msg.classList.remove("hidden");
  } else {
    msg.textContent = "Watch both videos to unlock the choice…";
    msg.classList.remove("hidden");
  }
}

// ─── Comparison screen ─────────────────────────────────────────────────────
function loadComparison(idx) {
  const { sampleIdx, methodLeft, methodRight } = state.pairs[idx];
  state.leftEnded  = false;
  state.rightEnded = false;

  const pct = (idx / N_SAMPLES) * 100;
  document.getElementById("progress-fill").style.width = `${pct}%`;
  document.getElementById("progress-label").textContent = `${idx + 1} / ${N_SAMPLES}`;

  document.getElementById("btn-left").disabled  = true;
  document.getElementById("btn-right").disabled = true;
  updateWaitingMsg();

  loadVideo("left",  methodLeft,  sampleIdx);
  loadVideo("right", methodRight, sampleIdx);
}

function loadVideo(side, method, sampleIdx) {
  const video = document.getElementById(`video-${side}`);
  setSpinner(side, true);

  video.src = videoPath(method, sampleIdx);
  video.load();

  video.oncanplay = () => {
    setSpinner(side, false);
    video.play().catch(() => {});
  };

  video.onended = () => {
    onVideoEnded(side);
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  video.onerror = () => {
    console.error(`Failed to load: ${video.src}`);
    setSpinner(side, false);
    onVideoEnded(side);
  };
}

function onVideoEnded(side) {
  if (side === "left") state.leftEnded  = true;
  else                 state.rightEnded = true;

  updateWaitingMsg();

  if (state.leftEnded && state.rightEnded) {
    document.getElementById("btn-left").disabled  = false;
    document.getElementById("btn-right").disabled = false;
  }
}

function replayVideo(side) {
  if (side === "left") state.leftEnded  = false;
  else                 state.rightEnded = false;

  document.getElementById("btn-left").disabled  = true;
  document.getElementById("btn-right").disabled = true;
  updateWaitingMsg();

  const video = document.getElementById(`video-${side}`);
  video.currentTime = 0;
  video.play().catch(() => {});
}

function recordChoice(winner) {
  const idx = state.currentIdx;
  const { sampleIdx, methodLeft, methodRight } = state.pairs[idx];
  state.answers.push({
    sampleIdx,
    methodLeft,
    methodRight,
    winner,
    winnerMethod: winner === "left" ? methodLeft : methodRight,
  });

  state.currentIdx++;
  if (state.currentIdx < N_SAMPLES) {
    loadComparison(state.currentIdx);
  } else {
    submitSurvey();
  }
}

// ─── Submission ─────────────────────────────────────────────────────────────
async function submitSurvey() {
  showScreen("screen-submitting");

  try {
    await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ answers: state.answers, completionCode: state.completionCode }),
    });
  } catch (e) {
    console.error("Submission error:", e);
  }

  setTimeout(() => {
    document.getElementById("completion-code").textContent = state.completionCode;
    showScreen("screen-done");
  }, 1200);
}

// ─── Entry point ───────────────────────────────────────────────────────────
function init() {
  initSession();

  document.getElementById("consent-checkbox").addEventListener("change", function () {
    document.getElementById("btn-consent").disabled = !this.checked;
  });
  document.getElementById("btn-consent").addEventListener("click", () => showScreen("screen-welcome"));
  document.getElementById("btn-start").addEventListener("click", () => {
    showScreen("screen-comparison");
    loadComparison(0);
  });

  document.getElementById("btn-replay-left").addEventListener("click",  () => replayVideo("left"));
  document.getElementById("btn-replay-right").addEventListener("click", () => replayVideo("right"));
  document.getElementById("btn-left").addEventListener("click",  () => recordChoice("left"));
  document.getElementById("btn-right").addEventListener("click", () => recordChoice("right"));
}

document.addEventListener("DOMContentLoaded", init);
