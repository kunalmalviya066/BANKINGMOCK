// =======================================
// BankingPrep360° - Smart Exam Platform (Enhanced + Timer + Pause/Resume + Proper Shuffling)
// =======================================

// DOM ELEMENTS
const mainContent = document.getElementById("main-content");
const navButtons = document.querySelectorAll(".nav-btn");

// USE GLOBAL DB VARIABLE
const questionDB = typeof DB !== "undefined" ? DB : {};

// GLOBAL STATE
let currentQuiz = {
  subject: null,
  topics: [],
  questions: [],
  userAnswers: [],
  currentIndex: 0,
  timer: null,
  timeLeft: 0,
  totalQuestions: 0,
  active: false,
  paused: false
};

// =======================================
// UTILITY FUNCTIONS
// =======================================

// Fisher-Yates Shuffle
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Save quiz attempt
function saveAttempt(attempt) {
  const history = JSON.parse(localStorage.getItem("attempts")) || [];
  history.push(attempt);
  localStorage.setItem("attempts", JSON.stringify(history));
}

// Load quiz history
function loadHistory() {
  return JSON.parse(localStorage.getItem("attempts")) || [];
}

// Clear main content
function clearMain() {
  mainContent.innerHTML = "";
}

// Set active nav button
function setActiveNav(buttonId) {
  navButtons.forEach(btn => btn.classList.remove("active"));
  document.getElementById(buttonId)?.classList.add("active");
}

// =======================================
// SAFE NAVIGATION IF QUIZ IS ACTIVE
// =======================================
function safeNavigate(actionFn) {
  if (currentQuiz.active) {
    if (confirm("A quiz is currently active. Are you sure you want to leave and lose progress?")) {
      currentQuiz.active = false;
      clearInterval(currentQuiz.timer);
      actionFn();
    }
  } else actionFn();
}

// =======================================
// HOME PAGE
// =======================================
function renderHome() {
  clearMain();
  setActiveNav("homeBtn");

  const html = `
    <section class="home-section">
      <h2>Welcome to BankingPrep</h2>
      <p>Prepare smartly for your banking exams — take daily quizzes, subject practice, or full mocks.</p>
      <div class="home-buttons">
        <button class="home-btn" id="startDaily">Daily Quiz</button>
        <button class="home-btn" id="startSubject">Subjects</button>
        <button class="home-btn" id="startMock">Full Mock Exam</button>
        <button class="home-btn" id="viewHistory">My Results</button>
      </div>
    </section>
  `;
  mainContent.innerHTML = html;

  document.getElementById("startDaily").addEventListener("click", () => safeNavigate(renderDailyQuiz));
  document.getElementById("startSubject").addEventListener("click", () => safeNavigate(renderSubjectSelection));
  document.getElementById("startMock").addEventListener("click", () => safeNavigate(renderMockOptions));
  document.getElementById("viewHistory").addEventListener("click", () => safeNavigate(renderHistory));
}

// =======================================
// DAILY QUIZ
// =======================================
function renderDailyQuiz() {
  clearMain();
  setActiveNav("dailyQuizBtn");

  const subjects = Object.keys(questionDB);
  if (!subjects.length) {
    mainContent.innerHTML = `<p>No subjects found in database.</p>`;
    return;
  }

  let html = `<section><h2>Daily Quiz</h2><p>Select Subject</p><div class="home-buttons">`;
  subjects.forEach(sub => html += `<button class="home-btn daily-sub" data-sub="${sub}">${sub}</button>`);
  html += `</div><div id="topicContainer"></div><button class="home-btn" id="startDailyBtn" disabled>Next</button></section>`;
  mainContent.innerHTML = html;

  let selectedSubject = null;
  let selectedTopics = [];

  document.querySelectorAll(".daily-sub").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedSubject = btn.dataset.sub;
      const topics = Object.keys(questionDB[selectedSubject].topics);
      let tHTML = `<h3>Select Topics</h3>`;
      topics.forEach(t => {
        tHTML += `<label><input type="checkbox" value="${t}" class="topicChk"/> ${t}</label><br>`;
      });
      document.getElementById("topicContainer").innerHTML = tHTML;

      document.querySelectorAll(".topicChk").forEach(chk => {
        chk.addEventListener("change", () => {
          selectedTopics = Array.from(document.querySelectorAll(".topicChk:checked")).map(c => c.value);
          document.getElementById("startDailyBtn").disabled = selectedTopics.length === 0;
        });
      });
    });
  });

  document.getElementById("startDailyBtn").addEventListener("click", () => {
    let allQuestions = [];
    selectedTopics.forEach(t => allQuestions.push(...questionDB[selectedSubject].topics[t]));

    const quizOptionsHTML = `
      <div class="quiz-options" style="margin-top:1rem;">
        <p>
          <label>Questions: 
            <input type="number" id="dailyNumQ" value="10" min="1" max="${allQuestions.length}" class="input-box">
          </label>
          <label>Timer (min): 
            <input type="number" id="dailyTimer" value="15" min="1" class="input-box">
          </label>
        </p>
        <button class="home-btn" id="confirmDailyStart">Confirm & Start Quiz</button>
      </div>
    `;
    document.getElementById("topicContainer").insertAdjacentHTML("beforeend", quizOptionsHTML);
    document.getElementById("startDailyBtn").disabled = true;

    document.getElementById("confirmDailyStart").addEventListener("click", () => {
      const numQ = parseInt(document.getElementById("dailyNumQ").value);
      const timer = parseInt(document.getElementById("dailyTimer").value);

      // Use shuffle to avoid repetition
      const quizQuestions = shuffleArray(allQuestions).slice(0, numQ);

      if (confirm(`Start quiz with ${numQ} questions and ${timer} minute(s)?`)) {
        startQuiz(selectedSubject, selectedTopics.join(", "), quizQuestions, timer);
      }
    });
  });
}

// =======================================
// SUBJECT PRACTICE
// =======================================
function renderSubjectSelection() {
  clearMain();
  setActiveNav("subjectBtn");

  const subjects = Object.keys(questionDB);
  let html = `
    <section class="subject-section">
      <h2>Subject-wise Practice</h2>
      <p>Select a Subject to view topics</p>
      <div class="subject-buttons">
        ${subjects.map(sub => `<button class="home-btn subj-btn" data-sub="${sub}">${sub}</button>`).join('')}
      </div>
      <div id="topicContainer" class="topic-container"></div>
    </section>
  `;
  mainContent.innerHTML = html;

  const topicContainer = document.getElementById("topicContainer");

  document.querySelectorAll(".subj-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".subj-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const subject = btn.dataset.sub;
      const topics = Object.keys(questionDB[subject].topics);

      let topicHTML = `
        <div class="topic-box">
          <h3>${subject} Topics</h3>
          <div class="topic-list">
            ${topics.map(t => `<label class="topic-label"><input type="checkbox" class="topicChk" value="${t}"> ${t}</label>`).join('')}
          </div>
          <div class="quiz-options">
            <p>
              <label>Questions: 
                <input type="number" id="numQ" value="10" min="1" max="100" class="input-box">
              </label>
              <label>Timer (min): 
                <input type="number" id="timerMin" value="15" min="1" class="input-box">
              </label>
            </p>
            <button class="home-btn" id="startSubjBtn" disabled>Start Quiz</button>
          </div>
        </div>
      `;
      topicContainer.innerHTML = topicHTML;

      const checkboxes = document.querySelectorAll(".topicChk");
      checkboxes.forEach(chk => {
        chk.addEventListener("change", () => {
          const checked = Array.from(checkboxes).filter(c => c.checked);
          document.getElementById("startSubjBtn").disabled = checked.length === 0;
        });
      });

      document.getElementById("startSubjBtn").addEventListener("click", () => {
        const selectedTopics = Array.from(document.querySelectorAll(".topicChk:checked")).map(c => c.value);
        let allQuestions = [];
        selectedTopics.forEach(t => allQuestions.push(...questionDB[subject].topics[t]));
        const numQ = parseInt(document.getElementById("numQ").value);
        const timer = parseInt(document.getElementById("timerMin").value);

        const quizQuestions = shuffleArray(allQuestions).slice(0, numQ);
        if (confirm(`Start quiz with ${numQ} questions and ${timer} minute(s)?`)) {
          startQuiz(subject, selectedTopics.join(", "), quizQuestions, timer);
        }
      });
    });
  });
}

// =======================================
// MOCK EXAM
// =======================================
function renderMockOptions() {
  clearMain();
  setActiveNav("mockBtn");

  const html = `
    <section>
      <h2>Full Mock Exam</h2>
      <p>Customize total questions and timer:</p>
      <p>Questions: <input type="number" id="mockNumQ" value="100" min="10" max="500" style="width:60px;">
      Timer (min): <input type="number" id="mockTimer" value="120" min="10" style="width:60px;"></p>
      <button class="home-btn" id="startMockBtn">Start Mock Exam</button>
    </section>`;
  mainContent.innerHTML = html;

  document.getElementById("startMockBtn").addEventListener("click", () => {
    const numQ = parseInt(document.getElementById("mockNumQ").value);
    const timer = parseInt(document.getElementById("mockTimer").value);

    if (!confirm(`Start full mock with ${numQ} questions and ${timer} minute(s)?`)) return;

    let all = [];
    Object.keys(questionDB).forEach(sub =>
      Object.values(questionDB[sub].topics).forEach(qs => all.push(...qs))
    );

    const quizQuestions = shuffleArray(all).slice(0, numQ);
    startQuiz("Full Mock", "All Topics", quizQuestions, timer);
  });
}

// =======================================
// START QUIZ
// =======================================
function startQuiz(subject, topics, questionsArray, timerMinutes) {
  currentQuiz.active = true;
  currentQuiz.paused = false;
  clearMain();
  currentQuiz.subject = subject;
  currentQuiz.topics = topics;
  currentQuiz.questions = [...questionsArray];
  currentQuiz.userAnswers = new Array(questionsArray.length).fill(null);
  currentQuiz.currentIndex = 0;
  currentQuiz.totalQuestions = questionsArray.length;
  currentQuiz.timeLeft = timerMinutes * 60;

  renderQuizPage();
  startTimer();
}

// =======================================
// TIMER
// =======================================
function startTimer() {
  const el = document.getElementById("quiz-timer");
  clearInterval(currentQuiz.timer);
  currentQuiz.timer = setInterval(() => {
    if (!currentQuiz.paused) {
      if (--currentQuiz.timeLeft <= 0) {
        clearInterval(currentQuiz.timer);
        confirmSubmission();
      } else if (el) {
        const m = Math.floor(currentQuiz.timeLeft / 60);
        const s = currentQuiz.timeLeft % 60;
        el.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
    }
  }, 1000);
}

// =======================================
// QUIZ UI
// =======================================
function renderQuizPage() {
  const q = currentQuiz.questions[currentQuiz.currentIndex];
  if (!q) return;

  // If quiz container does not exist yet, create it
  let container = document.getElementById("quiz-container");
  if (!container) {
    container = document.createElement("section");
    container.id = "quiz-container";
    container.innerHTML = `
      <div class="quiz-header">
        <h3 id="quiz-subject"></h3>
        <div id="quiz-timer">--:--</div>
      </div>
      <div class="question"></div>
      <ul class="options"></ul>
      <div class="quiz-controls">
        <button class="home-btn" id="prevBtn">Prev</button>
        <button class="home-btn" id="clearBtn">Clear</button>
        <button class="home-btn" id="nextBtn">Next</button>
        <button class="home-btn" id="pauseResumeBtn">Pause</button>
      </div>
      <div class="quiz-submit">
        <button class="home-btn" id="submitBtn">Submit Quiz</button>
      </div>
      <div id="palette"></div>
    `;
    mainContent.innerHTML = "";
    mainContent.appendChild(container);

    // Bind static buttons once
    document.getElementById("nextBtn").onclick = () => {
      if (currentQuiz.currentIndex < currentQuiz.totalQuestions - 1) {
        currentQuiz.currentIndex++;
        renderQuizPage();
      } else confirmSubmission();
    };
    document.getElementById("prevBtn").onclick = () => {
      if (currentQuiz.currentIndex > 0) {
        currentQuiz.currentIndex--;
        renderQuizPage();
      }
    };
    document.getElementById("clearBtn").onclick = () => {
      currentQuiz.userAnswers[currentQuiz.currentIndex] = null;
      renderQuizPage();
    };
    document.getElementById("pauseResumeBtn").onclick = () => {
      currentQuiz.paused = !currentQuiz.paused;
      document.getElementById("pauseResumeBtn").textContent = currentQuiz.paused ? "Resume" : "Pause";
    };
    document.getElementById("submitBtn").onclick = confirmSubmission;
  }

  // Update subject header
  document.getElementById("quiz-subject").textContent = `${currentQuiz.subject} - ${currentQuiz.topics}`;

  // Update question
  document.querySelector(".question").innerHTML = `<strong>Q${currentQuiz.currentIndex + 1}:</strong> ${q.question}`;

  // Update options
  const optionsEl = document.querySelector(".options");
  optionsEl.innerHTML = q.options.map((opt, i) =>
    `<li data-i="${i}" class="${currentQuiz.userAnswers[currentQuiz.currentIndex] === i ? 'selected':''}">${opt}</li>`
  ).join("");

  // Bind option clicks
  document.querySelectorAll(".options li").forEach(li => {
    li.onclick = () => {
      currentQuiz.userAnswers[currentQuiz.currentIndex] = parseInt(li.dataset.i);
      renderQuizPage();
    };
  });

  // Update palette
  const paletteEl = document.getElementById("palette");
  paletteEl.innerHTML = currentQuiz.questions.map((_, i) =>
    `<div class="q-num ${i === currentQuiz.currentIndex ? 'current':''} ${currentQuiz.userAnswers[i] !== null ? 'answered':''}">${i + 1}</div>`
  ).join("");
  document.querySelectorAll("#palette .q-num").forEach((qNum, i) => {
    qNum.onclick = () => {
      currentQuiz.currentIndex = i;
      renderQuizPage();
    };
  });

  // Update next button text
  document.getElementById("nextBtn").textContent = currentQuiz.currentIndex === currentQuiz.totalQuestions - 1 ? "Finish" : "Next";
}


// =======================================
// SUBMISSION + RESULTS
// =======================================
function confirmSubmission() {
  if (confirm("Do you want to finish and submit this quiz? You can recheck before confirming.")) {
    submitQuiz();
  }
}

function submitQuiz() {
  clearInterval(currentQuiz.timer);
  currentQuiz.active = false;

  let correct = 0, attempted = 0;
  currentQuiz.questions.forEach((q, i) => {
    const ans = currentQuiz.userAnswers[i];
    if (ans !== null) attempted++;
    if (ans !== null && ans === q.answer) correct++;
  });

  saveAttempt({
    id: Date.now(),
    subject: currentQuiz.subject,
    topics: currentQuiz.topics,
    total: currentQuiz.totalQuestions,
    attempted, correct,
    date: new Date().toISOString()
  });

  renderResults(correct, attempted, currentQuiz.totalQuestions);
}

function renderResults(correct, attempted, total) {
  clearMain();
  const html = `
    <section class="results">
      <h2>Results Summary</h2>
      <p>Total: ${total} | Attempted: ${attempted} | Correct: ${correct}</p>
      <p>Score: ${((correct/total)*100).toFixed(2)}%</p>
      <button class="home-btn" id="backHome">Back to Home</button>
    </section>
  `;
  mainContent.innerHTML = html;
  document.getElementById("backHome").addEventListener("click", renderHome);
}

// =======================================
// HISTORY
// =======================================
function renderHistory() {
  clearMain();
  setActiveNav("historyBtn");
  const data = loadHistory().reverse();
  if (!data.length) {
    mainContent.innerHTML = "<p>No past results found.</p>";
    return;
  }

  let html = `<section><h2>My Results</h2>`;
  data.forEach(a => {
    html += `<p>${a.subject} (${a.topics}) → ${a.correct}/${a.total} correct on ${new Date(a.date).toLocaleString()}</p>`;
  });
  html += `<button class="home-btn" id="backHome">Back</button></section>`;
  mainContent.innerHTML = html;
  document.getElementById("backHome").addEventListener("click", renderHome);
}

// =======================================
// NAV BUTTONS
// =======================================
document.getElementById("homeBtn").addEventListener("click", () => safeNavigate(renderHome));
document.getElementById("dailyQuizBtn").addEventListener("click", () => safeNavigate(renderDailyQuiz));
document.getElementById("subjectBtn").addEventListener("click", () => safeNavigate(renderSubjectSelection));
document.getElementById("mockBtn").addEventListener("click", () => safeNavigate(renderMockOptions));
document.getElementById("historyBtn").addEventListener("click", () => safeNavigate(renderHistory));

// =======================================
// AUTO-PAUSE ON TAB SWITCH
// =======================================
document.addEventListener("visibilitychange", () => {
  if (currentQuiz.active) {
    if (document.hidden) {
      currentQuiz.paused = true;
      const btn = document.getElementById("pauseResumeBtn");
      if (btn) btn.textContent = "Resume";
    }
  }
});

// =======================================
// INITIALIZE
// =======================================
renderHome();

