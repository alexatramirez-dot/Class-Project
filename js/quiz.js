/* ==========================================================
   quiz.js - self-assessment quiz for the Firefox site
   Question types:
     fill   -> text input, case-insensitive match
     single -> radio buttons, exactly one correct choice
     multi  -> checkboxes, all-or-nothing scoring
   ========================================================== */

/* ---- QUESTION DATA (all answers come from the site's pages) ---- */
const QUESTIONS = [
  { type: "fill",
    text: "Firefox's code is public under the Mozilla ________ License.",
    answers: ["public"], display: "Public" },

  { type: "fill",
    text: "Firefox 1.0 launched in November of the year ________.",
    answers: ["2004"], display: "2004" },

  { type: "fill",
    text: "Firefox Quantum (version 57) shipped a faster engine with parts built in the ________ programming language.",
    answers: ["rust"], display: "Rust" },

  { type: "single",
    text: "In 2003, Phoenix was renamed to what?",
    options: ["Firebird", "Firefox", "Quantum", "Navigator"], answer: 0 },

  { type: "single",
    text: "Which company released its browser source code in 1998, starting the Mozilla project?",
    options: ["Microsoft", "Netscape", "Apple", "Opera"], answer: 1 },

  { type: "single",
    text: "According to Table 2 (September 2026), what share of worldwide browser use does Firefox hold?",
    options: ["2.8%", "6.0%", "18.3%", "66.4%"], answer: 0 },

  { type: "single",
    text: "In what year did Enhanced Tracking Protection turn on by default?",
    options: ["2011", "2017", "2019", "2020"], answer: 2 },

  { type: "single",
    text: "AI controls that let users manage or block AI features were added in which Firefox version?",
    options: ["57", "100", "148", "5"], answer: 2 },

  { type: "multi",
    text: "Select ALL of the major browser engines.",
    options: ["Gecko", "Blink", "WebKit", "Turbo"], answer: [0, 1, 2] },

  { type: "multi",
    text: "Select ALL of the Firefox release channels.",
    options: ["Release", "Beta", "Nightly", "Legacy"], answer: [0, 1, 2] }
];

const TIME_LIMIT = 10 * 60;   // quiz limit in seconds
const PASS_PERCENT = 70;
const POINTS_PER_Q = 10;

/* ---- State and DOM references ---- */
const $ = id => document.getElementById(id);
let timerId = null;
let startTime = 0;
let submitted = false;

/* Escape text before putting it into innerHTML */
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---- Build the questions with the right form control for each type ---- */
function renderQuestions() {
  const labels = { fill: "Fill in the blank", single: "Multiple choice", multi: "Select all that apply" };
  $("questions").innerHTML = QUESTIONS.map((q, i) => {
    let body;
    if (q.type === "fill") {
      body = `<input type="text" name="q${i}" autocomplete="off" aria-label="Answer for question ${i + 1}" placeholder="Type your answer">`;
    } else {
      const kind = q.type === "single" ? "radio" : "checkbox";
      body = q.options.map((opt, j) =>
        `<label class="choice"><input type="${kind}" name="q${i}" value="${j}"><span>${esc(opt)}</span></label>`
      ).join("");
    }
    return `<fieldset class="question">
              <legend>${labels[q.type]}</legend>
              <p class="question-text">${i + 1}. ${esc(q.text)}</p>
              ${body}
            </fieldset>`;
  }).join("");
}

/* ---- Read answers ---- */
function getAnswer(q, i) {
  const form = $("quiz-form");
  if (q.type === "fill") return form.elements["q" + i].value.trim();
  const checked = [...form.querySelectorAll(`input[name="q${i}"]:checked`)].map(el => Number(el.value));
  return q.type === "single" ? (checked.length ? checked[0] : null) : checked;
}

function isAnswered(q, i) {
  const a = getAnswer(q, i);
  return q.type === "fill" ? a !== "" : q.type === "single" ? a !== null : a.length > 0;
}

function updateProgress() {
  const n = QUESTIONS.filter(isAnswered).length;
  $("progress").textContent = `Answered ${n} / ${QUESTIONS.length}`;
}

/* ---- Grading ---- */
function isCorrect(q, a) {
  if (q.type === "fill") return q.answers.includes(a.toLowerCase());
  if (q.type === "single") return a === q.answer;
  return a.length === q.answer.length && q.answer.every(x => a.includes(x));
}

function correctText(q) {
  if (q.type === "fill") return q.display;
  if (q.type === "single") return q.options[q.answer];
  return q.answer.map(j => q.options[j]).join(", ");
}

function userText(q, a) {
  if (q.type === "fill") return a || "(no answer)";
  if (q.type === "single") return a === null ? "(no answer)" : q.options[a];
  return a.length ? a.map(j => q.options[j]).join(", ") : "(no answer)";
}

/* ---- Timer ---- */
function formatTime(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function tick() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const left = Math.max(TIME_LIMIT - elapsed, 0);
  $("time-left").textContent = formatTime(left);
  $("time-left").classList.toggle("low", left <= 60);
  if (left === 0) submitQuiz(true);   // auto-submit when time is up
}

/* ---- Start ---- */
function startQuiz() {
  renderQuestions();
  submitted = false;
  $("quiz-intro").hidden = true;
  $("results").hidden = true;
  $("quiz-area").hidden = false;
  updateProgress();
  startTime = Date.now();
  tick();
  timerId = setInterval(tick, 500);
  window.scrollTo({ top: 0 });
}

/* ---- Submit: grade, show score, per-question review, and time spent ---- */
function submitQuiz(timedOut) {
  if (submitted) return;
  submitted = true;
  clearInterval(timerId);

  const elapsed = Math.min(Math.floor((Date.now() - startTime) / 1000), TIME_LIMIT);
  let score = 0;

  const review = QUESTIONS.map((q, i) => {
    const a = getAnswer(q, i);
    const ok = isCorrect(q, a);
    const pts = ok ? POINTS_PER_Q : 0;
    score += pts;
    return `<div class="review-item ${ok ? "correct" : "incorrect"}">
              <h4>Q${i + 1}. ${esc(q.text)}
                <span class="badge">${ok ? "&#10003; Correct" : "&#10007; Incorrect"} (${pts}/${POINTS_PER_Q})</span></h4>
              <p><strong>Your answer:</strong> ${esc(userText(q, a))}</p>
              <p><strong>Correct answer:</strong> ${esc(correctText(q))}</p>
            </div>`;
  }).join("");

  const total = QUESTIONS.length * POINTS_PER_Q;
  const percent = Math.round(score / total * 100);
  const passed = percent >= PASS_PERCENT;

  const summary = $("summary");
  summary.className = passed ? "pass" : "fail";
  summary.innerHTML = `
    <div class="verdict">${passed ? "PASS" : "FAIL"}</div>
    <div class="big-score">${score} / ${total} (${percent}%)</div>
    <div class="stats">
      <span>Time spent: <strong>${formatTime(elapsed)}</strong>${timedOut ? " (time limit reached)" : ""}</span>
      <span>Passing score: ${PASS_PERCENT}%</span>
    </div>`;
  $("review").innerHTML = review;

  $("quiz-area").hidden = true;
  $("results").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---- Retake: clear every input, the results, and the timer ---- */
function resetQuiz() {
  clearInterval(timerId);
  $("quiz-form").reset();
  $("questions").innerHTML = "";
  $("summary").innerHTML = "";
  $("summary").className = "";
  $("review").innerHTML = "";
  $("results").hidden = true;
  $("quiz-area").hidden = true;
  $("time-left").textContent = formatTime(TIME_LIMIT);
  $("time-left").classList.remove("low");
  $("quiz-intro").hidden = false;
  window.scrollTo({ top: 0 });
}

/* ---- Event listeners ---- */
document.addEventListener("DOMContentLoaded", () => {
  $("start-btn").addEventListener("click", startQuiz);
  $("retake-btn").addEventListener("click", resetQuiz);
  $("quiz-form").addEventListener("input", updateProgress);
  $("quiz-form").addEventListener("submit", e => { e.preventDefault(); submitQuiz(false); });
});
