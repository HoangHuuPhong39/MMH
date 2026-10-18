// ============================================================
// NMMMH Web Test Application Logic
// ============================================================

// State
let allQuestions = [];
let currentPracticeList = [];
let currentPracticeIndex = 0;
let userPracticeAnswers = {}; // { qId: selectedOptionIndex }
let bookmarkedIds = new Set();
let mistakeIds = new Set();
let currentPracticeTypeFilter = "all";
let currentSearchTypeFilter = "all";

// Exam State
let examQuestions = [];
let currentExamIndex = 0;
let examUserAnswers = {}; // { qId: selectedOptionIndex }
let examFlaggedIds = new Set();
let examTimerInterval = null;
let examTimeRemaining = 50 * 60; // 50 minutes in seconds
let isExamActive = false;
let currentExamConfig = { name: "Đề Thi Chuẩn", count: 40 };

// Audio Context for sound effects
let soundEnabled = true;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'correct') {
      // Pleasant dual tone chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'incorrect') {
      // Low subtle buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(164.81, now + 0.1); // E3
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.warn("Audio feedback error:", e);
  }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  // Load questions from global variable
  if (typeof QUESTIONS_DATABASE !== "undefined" && Array.isArray(QUESTIONS_DATABASE)) {
    allQuestions = QUESTIONS_DATABASE;
  } else {
    showToast("Không tìm thấy dữ liệu QUESTIONS_DATABASE. Đang tải từ questions.json...");
    fetch("questions.json")
      .then(r => r.json())
      .then(data => {
        allQuestions = data;
        initApp();
      })
      .catch(err => {
        showToast("Lỗi khi tải questions.json: " + err.message);
      });
    return;
  }

  initApp();
});

function initApp() {
  loadLocalState();
  renderDashboard();
  setupPracticeTopicsFilter();
  startPracticeExam("all", false); // prep practice view
  setupKeyboardNavigation();

  // Update navbar mistake counter
  updateMistakesCounter();
}

function loadLocalState() {
  try {
    const savedBookmarks = localStorage.getItem("nmmmh_bookmarks");
    if (savedBookmarks) {
      bookmarkedIds = new Set(JSON.parse(savedBookmarks));
    }
    const savedMistakes = localStorage.getItem("nmmmh_mistakes");
    if (savedMistakes) {
      mistakeIds = new Set(JSON.parse(savedMistakes));
    }
    const savedPracticeAnswers = localStorage.getItem("nmmmh_practice_answers");
    if (savedPracticeAnswers) {
      userPracticeAnswers = JSON.parse(savedPracticeAnswers);
    }
    const savedTheme = localStorage.getItem("nmmmh_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) themeBtn.textContent = savedTheme === "dark" ? "🌙" : "☀️";
  } catch (e) {
    console.error("Local storage load error:", e);
  }
}

function saveLocalState() {
  try {
    localStorage.setItem("nmmmh_bookmarks", JSON.stringify(Array.from(bookmarkedIds)));
    localStorage.setItem("nmmmh_mistakes", JSON.stringify(Array.from(mistakeIds)));
    localStorage.setItem("nmmmh_practice_answers", JSON.stringify(userPracticeAnswers));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
}

// ==================== VIEW SWITCHING ====================
function switchView(viewName) {
  // Remove active from all tabs & views
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${viewName}`);
  const targetView = document.getElementById(`view-${viewName}`);

  if (targetTab) targetTab.classList.add("active");
  if (targetView) targetView.classList.add("active");

  if (viewName === "mistakes") {
    renderMistakesView();
  } else if (viewName === "search") {
    renderSearchResults(allQuestions);
  } else if (viewName === "dashboard") {
    updateDashboardStats();
  } else if (viewName === "exam") {
    const hub = document.getElementById("exam-hub-container");
    const activeCont = document.getElementById("exam-active-container");
    if (isExamActive) {
      if (hub) hub.style.display = "none";
      if (activeCont) activeCont.style.display = "block";
    } else {
      if (hub) hub.style.display = "block";
      if (activeCont) activeCont.style.display = "none";
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  updateDashboardStats();

  // Aggregate exams
  const examsMap = {
    "Đề 1": { title: "Bộ Đề Thi 1", desc: "40 câu trắc nghiệm chính thức có lời giải chi tiết và đáp án chuẩn", badge: "badge-blue", count: 0 },
    "Đề 2": { title: "Bộ Đề Thi 2", desc: "40 câu thi bao gồm các dạng bài RSA, AES, S-Box, Euclid mở rộng", badge: "badge-purple", count: 0 },
    "Đề 3": { title: "Bộ Đề Thi 3", desc: "40 câu trắc nghiệm Elgamal, Merkle-Hellman, Chữ ký số, Đường cong Elliptic", badge: "badge-emerald", count: 0 },
    "Đề 4": { title: "Bộ Đề Thi 4", desc: "39 câu chuyên sâu hệ mật khối, mã dòng RC4, xtime và thặng dư", badge: "badge-amber", count: 0 },
    "Đề Giữa Kỳ": { title: "Đề Thi Giữa Kỳ", desc: "Bộ câu hỏi thi giữa kỳ môn Nhập môn Mật mã học với đủ mức độ", badge: "badge-blue", count: 0 },
    "Đề Thi Mẫu": { title: "Đề Thi Mẫu & Ảnh Chụp", desc: "Tổng hợp các câu hỏi thi thực tế từ ảnh chụp màn hình các khóa", badge: "badge-purple", count: 0 }
  };

  allQuestions.forEach(q => {
    if (examsMap[q.exam]) {
      examsMap[q.exam].count++;
    }
  });

  const container = document.getElementById("exams-grid-container");
  if (!container) return;
  container.innerHTML = "";

  for (const [examKey, info] of Object.entries(examsMap)) {
    const card = document.createElement("div");
    card.className = "exam-card";
    card.innerHTML = `
      <div>
        <div class="exam-card-top">
          <span class="exam-badge ${info.badge}">${examKey}</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">${info.count} câu</span>
        </div>
        <h3 class="exam-card-title">${info.title}</h3>
        <p class="exam-card-desc">${info.desc}</p>
      </div>

      <div>
        <div class="exam-meta" style="margin-bottom: 1rem;">
          <span>⏱️ Đề chuẩn</span>
          <span>🎯 Đã có đáp án & lời giải</span>
        </div>
        <div class="exam-card-actions">
          <button class="btn btn-primary" onclick="startPracticeExam('${examKey}')">
            📖 Ôn tập
          </button>
          <button class="btn btn-secondary" onclick="startExamWithConfig('${examKey}', ${info.count})">
            ⏱️ Thi thử
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  // Topics Cloud
  const topicsMap = {};
  allQuestions.forEach(q => {
    topicsMap[q.topic] = (topicsMap[q.topic] || 0) + 1;
  });

  const cloudContainer = document.getElementById("topics-cloud-container");
  if (cloudContainer) {
    cloudContainer.innerHTML = "";
    for (const [topic, count] of Object.entries(topicsMap).sort((a,b) => b[1] - a[1])) {
      const pill = document.createElement("button");
      pill.className = "topic-pill";
      pill.innerHTML = `<span>${topic}</span> <span class="topic-count">${count}</span>`;
      pill.onclick = () => {
        filterPracticeByTopic(topic);
      };
      cloudContainer.appendChild(pill);
    }
  }
}

function updateDashboardStats() {
  document.getElementById("stat-total-q").textContent = allQuestions.length;
  const answeredCount = Object.keys(userPracticeAnswers).length;
  document.getElementById("stat-learned-count").textContent = answeredCount;
  document.getElementById("stat-bookmarked-count").textContent = bookmarkedIds.size;

  // Calculate theory and exercise stats
  const totalTheory = allQuestions.filter(q => q.type === 'Lý thuyết').length || 55;
  const totalExercise = allQuestions.filter(q => q.type === 'Bài tập').length || 78;
  const answeredTheory = allQuestions.filter(q => q.type === 'Lý thuyết' && userPracticeAnswers[q.id] !== undefined).length;
  const answeredExercise = allQuestions.filter(q => q.type === 'Bài tập' && userPracticeAnswers[q.id] !== undefined).length;
  const pctTheory = Math.round((answeredTheory / totalTheory) * 100);
  const pctExercise = Math.round((answeredExercise / totalExercise) * 100);

  const tTotal = document.getElementById("theory-total-count");
  if (tTotal) tTotal.textContent = totalTheory;
  const tAns = document.getElementById("theory-answered-count");
  if (tAns) tAns.textContent = answeredTheory;
  const tPct = document.getElementById("theory-percent");
  if (tPct) tPct.textContent = `${pctTheory}%`;
  const tBar = document.getElementById("theory-progress-bar");
  if (tBar) tBar.style.width = `${pctTheory}%`;

  const eTotal = document.getElementById("exercise-total-count");
  if (eTotal) eTotal.textContent = totalExercise;
  const eAns = document.getElementById("exercise-answered-count");
  if (eAns) eAns.textContent = answeredExercise;
  const ePct = document.getElementById("exercise-percent");
  if (ePct) ePct.textContent = `${pctExercise}%`;
  const eBar = document.getElementById("exercise-progress-bar");
  if (eBar) eBar.style.width = `${pctExercise}%`;
}

// ==================== PRACTICE MODE ====================
function setupPracticeTopicsFilter() {
  const select = document.getElementById("practice-topic-select");
  if (!select) return;
  const topics = Array.from(new Set(allQuestions.map(q => q.topic))).sort();
  select.innerHTML = '<option value="all">Tất cả chuyên đề</option>';
  topics.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

function startPracticeByType(type) {
  currentPracticeTypeFilter = type;
  const typeSelect = document.getElementById("practice-type-select");
  if (typeSelect) typeSelect.value = type;

  // Sync pills
  document.querySelectorAll(".type-filter-bar .type-pill-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (type === "all") {
    const btn = document.getElementById("type-pill-all");
    if (btn) btn.classList.add("active");
  } else if (type === "Lý thuyết") {
    const btn = document.getElementById("type-pill-theory");
    if (btn) btn.classList.add("active");
  } else if (type === "Bài tập") {
    const btn = document.getElementById("type-pill-exercise");
    if (btn) btn.classList.add("active");
  }

  const examSelect = document.getElementById("practice-exam-select");
  if (examSelect) examSelect.value = "all";
  const topicSelect = document.getElementById("practice-topic-select");
  if (topicSelect) topicSelect.value = "all";
  const statusSelect = document.getElementById("practice-status-select");
  if (statusSelect) statusSelect.value = "all";
  const searchInput = document.getElementById("practice-search-input");
  if (searchInput) searchInput.value = "";

  filterPracticeQuestions();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
  switchView("practice");
  showToast(`Đã mở bài luyện: ${type === 'Lý thuyết' ? 'Toàn bộ 55 câu Lý thuyết' : 'Toàn bộ 78 Bài tập tính toán'}`);
}

function setPracticeTypeFilter(type) {
  currentPracticeTypeFilter = type;
  const typeSelect = document.getElementById("practice-type-select");
  if (typeSelect) typeSelect.value = type;

  document.querySelectorAll(".type-filter-bar .type-pill-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (type === "all") {
    const btn = document.getElementById("type-pill-all");
    if (btn) btn.classList.add("active");
  } else if (type === "Lý thuyết") {
    const btn = document.getElementById("type-pill-theory");
    if (btn) btn.classList.add("active");
  } else if (type === "Bài tập") {
    const btn = document.getElementById("type-pill-exercise");
    if (btn) btn.classList.add("active");
  }

  onPracticeFilterChange();
}

function startPracticeExam(examKey, autoSwitch = true) {
  currentPracticeTypeFilter = "all";
  const typeSelect = document.getElementById("practice-type-select");
  if (typeSelect) typeSelect.value = "all";
  document.querySelectorAll(".type-filter-bar .type-pill-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("type-pill-all")?.classList.add("active");

  const examSelect = document.getElementById("practice-exam-select");
  if (examSelect) examSelect.value = examKey;
  const topicSelect = document.getElementById("practice-topic-select");
  if (topicSelect) topicSelect.value = "all";
  const statusSelect = document.getElementById("practice-status-select");
  if (statusSelect) statusSelect.value = "all";
  const searchInput = document.getElementById("practice-search-input");
  if (searchInput) searchInput.value = "";

  filterPracticeQuestions();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();

  if (autoSwitch) {
    switchView("practice");
  }
}

function filterPracticeByTopic(topic) {
  currentPracticeTypeFilter = "all";
  const typeSelect = document.getElementById("practice-type-select");
  if (typeSelect) typeSelect.value = "all";
  document.querySelectorAll(".type-filter-bar .type-pill-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("type-pill-all")?.classList.add("active");

  const examSelect = document.getElementById("practice-exam-select");
  if (examSelect) examSelect.value = "all";
  const topicSelect = document.getElementById("practice-topic-select");
  if (topicSelect) topicSelect.value = topic;

  filterPracticeQuestions();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
  switchView("practice");
}

function onPracticeFilterChange() {
  const typeSelect = document.getElementById("practice-type-select");
  if (typeSelect) {
    currentPracticeTypeFilter = typeSelect.value;
    document.querySelectorAll(".type-filter-bar .type-pill-btn").forEach(btn => btn.classList.remove("active"));
    if (currentPracticeTypeFilter === "all") document.getElementById("type-pill-all")?.classList.add("active");
    if (currentPracticeTypeFilter === "Lý thuyết") document.getElementById("type-pill-theory")?.classList.add("active");
    if (currentPracticeTypeFilter === "Bài tập") document.getElementById("type-pill-exercise")?.classList.add("active");
  }
  filterPracticeQuestions();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
}

function onPracticeSearch(keyword) {
  filterPracticeQuestions();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
}

function filterPracticeQuestions() {
  const typeFilter = document.getElementById("practice-type-select")?.value || currentPracticeTypeFilter || "all";
  const examFilter = document.getElementById("practice-exam-select").value;
  const topicFilter = document.getElementById("practice-topic-select").value;
  const statusFilter = document.getElementById("practice-status-select").value;
  const searchKw = (document.getElementById("practice-search-input").value || "").trim().toLowerCase();

  currentPracticeList = allQuestions.filter(q => {
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    if (examFilter !== "all" && q.exam !== examFilter) return false;
    if (topicFilter !== "all" && q.topic !== topicFilter) return false;

    if (statusFilter === "unanswered" && userPracticeAnswers[q.id] !== undefined) return false;
    if (statusFilter === "bookmarked" && !bookmarkedIds.has(q.id)) return false;
    if (statusFilter === "correct") {
      if (userPracticeAnswers[q.id] !== q.correct_index) return false;
    }
    if (statusFilter === "incorrect") {
      if (userPracticeAnswers[q.id] === undefined || userPracticeAnswers[q.id] === q.correct_index) return false;
    }

    if (searchKw) {
      const matchQ = q.question.toLowerCase().includes(searchKw);
      const matchOpts = q.options.some(o => o.toLowerCase().includes(searchKw));
      const matchExp = (q.explanation || "").toLowerCase().includes(searchKw);
      if (!matchQ && !matchOpts && !matchExp) return false;
    }

    return true;
  });

  if (currentPracticeList.length === 0) {
    currentPracticeList = allQuestions; // fallback
  }

  renderPracticeMatrix();
}

function renderCurrentPracticeQuestion() {
  if (currentPracticeList.length === 0) return;
  if (currentPracticeIndex >= currentPracticeList.length) currentPracticeIndex = 0;
  if (currentPracticeIndex < 0) currentPracticeIndex = currentPracticeList.length - 1;

  const q = currentPracticeList[currentPracticeIndex];

  // Meta Badges
  document.getElementById("p-q-exam").textContent = q.exam;
  document.getElementById("p-q-topic").textContent = q.topic;
  document.getElementById("p-q-diff").textContent = q.difficulty;
  document.getElementById("p-q-counter").textContent = `Câu ${currentPracticeIndex + 1} / ${currentPracticeList.length}`;

  const typeBadge = document.getElementById("p-q-type");
  if (typeBadge) {
    const isTheory = q.type === "Lý thuyết";
    typeBadge.textContent = isTheory ? "📖 Lý thuyết" : "🧮 Bài tập";
    typeBadge.className = `exam-badge ${isTheory ? 'badge-emerald' : 'badge-amber'}`;
  }

  // Bookmark Button State
  const bmBtn = document.getElementById("btn-bookmark");
  if (bookmarkedIds.has(q.id)) {
    bmBtn.classList.add("bookmarked");
    bmBtn.innerHTML = "★";
    bmBtn.title = "Bỏ đánh dấu câu này";
  } else {
    bmBtn.classList.remove("bookmarked");
    bmBtn.innerHTML = "☆";
    bmBtn.title = "Đánh dấu câu quan trọng";
  }

  // Question Text
  document.getElementById("p-q-text").innerHTML = formatMathFormulas(q.question);

  // Question Image
  const imgWrapper = document.getElementById("p-q-image-wrapper");
  const imgElem = document.getElementById("p-q-image");
  if (q.images && q.images.length > 0) {
    imgElem.src = q.images[0];
    imgWrapper.style.display = "block";
  } else {
    imgWrapper.style.display = "none";
  }

  // Options
  const optsContainer = document.getElementById("p-options-container");
  optsContainer.innerHTML = "";

  const labels = ["A", "B", "C", "D", "E", "F"];
  const userAns = userPracticeAnswers[q.id];

  q.options.forEach((optText, idx) => {
    const optDiv = document.createElement("div");
    optDiv.className = "option-item";

    // If user already answered this question
    if (userAns !== undefined) {
      if (idx === q.correct_index) {
        optDiv.classList.add("correct");
      } else if (idx === userAns) {
        optDiv.classList.add("incorrect");
      }
    }

    optDiv.innerHTML = `
      <div class="option-label">${labels[idx] || (idx + 1)}</div>
      <div class="option-text">${formatMathFormulas(optText)}</div>
    `;

    optDiv.onclick = () => {
      selectPracticeOption(idx);
    };

    optsContainer.appendChild(optDiv);
  });

  // Explanation Box
  const expBox = document.getElementById("p-explanation-box");
  const expText = document.getElementById("p-explanation-text");
  if (userAns !== undefined) {
    expText.innerHTML = formatMathFormulas(q.explanation || "Đáp án chuẩn xác theo tài liệu chuẩn.");
    expBox.style.display = "block";
  } else {
    expBox.style.display = "none";
  }

  updateMatrixCurrentState();
}

function selectPracticeOption(chosenIndex) {
  const q = currentPracticeList[currentPracticeIndex];
  userPracticeAnswers[q.id] = chosenIndex;

  if (chosenIndex === q.correct_index) {
    playSound("correct");
    // If it was in mistakes, can remove or mark
    showToast("🎉 Chính xác! Tuyệt vời.");
  } else {
    playSound("incorrect");
    mistakeIds.add(q.id);
    updateMistakesCounter();
    showToast("❌ Chưa đúng! Hãy xem lời giải chi tiết bên dưới.");
  }

  saveLocalState();
  renderCurrentPracticeQuestion();
  renderPracticeMatrix();
  updateDashboardStats();
}

function revealCurrentAnswer() {
  const q = currentPracticeList[currentPracticeIndex];
  userPracticeAnswers[q.id] = q.correct_index; // mark as revealed
  saveLocalState();
  renderCurrentPracticeQuestion();
  renderPracticeMatrix();
}

function prevPracticeQuestion() {
  currentPracticeIndex--;
  renderCurrentPracticeQuestion();
}

function nextPracticeQuestion() {
  currentPracticeIndex++;
  renderCurrentPracticeQuestion();
}

function randomPracticeQuestion() {
  const randIdx = Math.floor(Math.random() * currentPracticeList.length);
  currentPracticeIndex = randIdx;
  renderCurrentPracticeQuestion();
}

function toggleBookmarkCurrent() {
  const q = currentPracticeList[currentPracticeIndex];
  if (bookmarkedIds.has(q.id)) {
    bookmarkedIds.delete(q.id);
    showToast("Đã bỏ đánh dấu câu hỏi");
  } else {
    bookmarkedIds.add(q.id);
    showToast("⭐ Đã lưu vào câu hỏi quan trọng");
  }
  saveLocalState();
  renderCurrentPracticeQuestion();
  renderPracticeMatrix();
  updateDashboardStats();
}

// Sidebar matrix
function renderPracticeMatrix() {
  const matrix = document.getElementById("practice-matrix");
  if (!matrix) return;
  matrix.innerHTML = "";

  const total = currentPracticeList.length;
  let answered = 0;

  currentPracticeList.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "matrix-btn";
    btn.textContent = idx + 1;

    const userAns = userPracticeAnswers[q.id];
    if (userAns !== undefined) {
      answered++;
      if (userAns === q.correct_index) {
        btn.classList.add("correct");
      } else {
        btn.classList.add("incorrect");
      }
    }

    if (bookmarkedIds.has(q.id)) {
      btn.classList.add("flagged");
    }

    if (idx === currentPracticeIndex) {
      btn.classList.add("current");
    }

    btn.onclick = () => {
      currentPracticeIndex = idx;
      renderCurrentPracticeQuestion();
    };

    matrix.appendChild(btn);
  });

  const progressElem = document.getElementById("matrix-progress-text");
  if (progressElem) {
    progressElem.textContent = `${answered} / ${total} câu`;
  }
}

function updateMatrixCurrentState() {
  const btns = document.querySelectorAll("#practice-matrix .matrix-btn");
  btns.forEach((btn, idx) => {
    if (idx === currentPracticeIndex) {
      btn.classList.add("current");
    } else {
      btn.classList.remove("current");
    }
  });
}

// ==================== EXAM MODE ====================
function startQuickExam() {
  startExamWithConfig("Ngẫu Nhiên Toàn Bộ", 40);
}

function startExamByType(type, count = 40) {
  let pool = allQuestions.filter(q => q.type === type);
  if (pool.length === 0) pool = [...allQuestions];
  const actualCount = Math.min(count, pool.length);
  pool = shuffleArray(pool);
  examQuestions = pool.slice(0, actualCount);

  const titleName = type === 'Lý thuyết' ? 'Chuyên Đề Lý Thuyết' : 'Chuyên Đề Bài Tập Tính Toán';
  currentExamConfig = { name: titleName, count: examQuestions.length, type: type };
  currentExamIndex = 0;
  examUserAnswers = {};
  examFlaggedIds.clear();
  isExamActive = true;
  // 40 mins for theory, 50 mins for calc
  examTimeRemaining = (type === 'Lý thuyết' ? 40 : 50) * 60;

  document.getElementById("exam-title-display").textContent = `Thi Thử: ${titleName} (${examQuestions.length} câu - ${type === 'Lý thuyết' ? 40 : 50} phút)`;
  const matrixTitle = document.getElementById("exam-matrix-title");
  if (matrixTitle) matrixTitle.textContent = `Danh sách ${examQuestions.length} câu thi`;

  const hub = document.getElementById("exam-hub-container");
  if (hub) hub.style.display = "none";
  const activeCont = document.getElementById("exam-active-container");
  if (activeCont) activeCont.style.display = "block";

  startExamTimer();
  renderCurrentExamQuestion();
  renderExamMatrix();
  switchView("exam");
  showToast(`Bắt đầu thi thử: ${titleName} (${examQuestions.length} câu)!`);
}

function exitExamPrompt() {
  if (!isExamActive) return;
  if (confirm("Bạn có chắc chắn muốn dừng bài thi thử hiện tại và quay lại phòng chọn đề thi không? (Tiến trình bài thi này sẽ không được lưu)")) {
    clearInterval(examTimerInterval);
    isExamActive = false;
    examQuestions = [];
    examUserAnswers = {};
    const hub = document.getElementById("exam-hub-container");
    if (hub) hub.style.display = "block";
    const activeCont = document.getElementById("exam-active-container");
    if (activeCont) activeCont.style.display = "none";
    showToast("Đã dừng bài thi.");
  }
}

function startExamWithConfig(examName, count = 40) {
  let pool = [];
  if (examName === "Ngẫu Nhiên Toàn Bộ" || examName === "all") {
    pool = [...allQuestions];
  } else {
    pool = allQuestions.filter(q => q.exam === examName);
    if (pool.length === 0) pool = [...allQuestions];
  }

  // Shuffle pool
  pool = shuffleArray(pool);
  examQuestions = pool.slice(0, Math.min(count, pool.length));

  currentExamConfig = { name: examName, count: examQuestions.length, type: null };
  currentExamIndex = 0;
  examUserAnswers = {};
  examFlaggedIds.clear();
  isExamActive = true;
  examTimeRemaining = 50 * 60; // 50 mins

  document.getElementById("exam-title-display").textContent = `Thi Thử: ${examName} (${examQuestions.length} câu - 50 phút)`;
  const matrixTitle = document.getElementById("exam-matrix-title");
  if (matrixTitle) matrixTitle.textContent = `Danh sách ${examQuestions.length} câu thi`;

  const hub = document.getElementById("exam-hub-container");
  if (hub) hub.style.display = "none";
  const activeCont = document.getElementById("exam-active-container");
  if (activeCont) activeCont.style.display = "block";

  startExamTimer();
  renderCurrentExamQuestion();
  renderExamMatrix();
  switchView("exam");
}

function startExamTimer() {
  clearInterval(examTimerInterval);
  updateTimerDisplay();

  examTimerInterval = setInterval(() => {
    examTimeRemaining--;
    updateTimerDisplay();

    if (examTimeRemaining <= 0) {
      clearInterval(examTimerInterval);
      showToast("⏰ Đã hết giờ làm bài! Tự động nộp bài thi.");
      finalizeExamSubmission();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerElem = document.getElementById("exam-timer-display");
  const textElem = document.getElementById("timer-text");

  const mins = Math.floor(examTimeRemaining / 60);
  const secs = examTimeRemaining % 60;
  textElem.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  if (examTimeRemaining < 5 * 60) {
    timerElem.classList.add("urgent");
  } else {
    timerElem.classList.remove("urgent");
  }
}

function renderCurrentExamQuestion() {
  if (examQuestions.length === 0) return;
  const q = examQuestions[currentExamIndex];

  document.getElementById("e-q-badge").textContent = `Câu ${currentExamIndex + 1} / ${examQuestions.length}`;
  document.getElementById("e-q-topic").textContent = q.topic;

  const eTypeBadge = document.getElementById("e-q-type");
  if (eTypeBadge) {
    const isTheory = q.type === "Lý thuyết";
    eTypeBadge.textContent = isTheory ? "📖 Lý thuyết" : "🧮 Bài tập";
    eTypeBadge.className = `exam-badge ${isTheory ? 'badge-emerald' : 'badge-amber'}`;
  }

  // Flag button
  const flagBtn = document.getElementById("e-btn-flag");
  if (examFlaggedIds.has(q.id)) {
    flagBtn.style.color = "#f59e0b";
  } else {
    flagBtn.style.color = "var(--text-secondary)";
  }

  document.getElementById("e-q-text").innerHTML = formatMathFormulas(q.question);

  const imgWrapper = document.getElementById("e-q-image-wrapper");
  const imgElem = document.getElementById("e-q-image");
  if (q.images && q.images.length > 0) {
    imgElem.src = q.images[0];
    imgWrapper.style.display = "block";
  } else {
    imgWrapper.style.display = "none";
  }

  const optsContainer = document.getElementById("e-options-container");
  optsContainer.innerHTML = "";

  const labels = ["A", "B", "C", "D", "E", "F"];
  const userAns = examUserAnswers[q.id];

  q.options.forEach((optText, idx) => {
    const optDiv = document.createElement("div");
    optDiv.className = "option-item";
    if (userAns === idx) {
      optDiv.classList.add("selected");
    }

    optDiv.innerHTML = `
      <div class="option-label">${labels[idx] || (idx + 1)}</div>
      <div class="option-text">${formatMathFormulas(optText)}</div>
    `;

    optDiv.onclick = () => {
      selectExamOption(idx);
    };

    optsContainer.appendChild(optDiv);
  });

  updateExamMatrix();
}

function selectExamOption(idx) {
  const q = examQuestions[currentExamIndex];
  examUserAnswers[q.id] = idx;
  renderCurrentExamQuestion();
  renderExamMatrix();
}

function prevExamQuestion() {
  if (currentExamIndex > 0) {
    currentExamIndex--;
    renderCurrentExamQuestion();
  }
}

function nextExamQuestion() {
  if (currentExamIndex < examQuestions.length - 1) {
    currentExamIndex++;
    renderCurrentExamQuestion();
  }
}

function toggleExamFlagCurrent() {
  const q = examQuestions[currentExamIndex];
  if (examFlaggedIds.has(q.id)) {
    examFlaggedIds.delete(q.id);
  } else {
    examFlaggedIds.add(q.id);
  }
  renderCurrentExamQuestion();
  renderExamMatrix();
}

function renderExamMatrix() {
  const matrix = document.getElementById("exam-matrix");
  if (!matrix) return;
  matrix.innerHTML = "";

  let answeredCount = 0;

  examQuestions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "matrix-btn";
    btn.textContent = idx + 1;

    if (examUserAnswers[q.id] !== undefined) {
      btn.classList.add("answered");
      answeredCount++;
    }

    if (examFlaggedIds.has(q.id)) {
      btn.classList.add("flagged");
    }

    if (idx === currentExamIndex) {
      btn.classList.add("current");
    }

    btn.onclick = () => {
      currentExamIndex = idx;
      renderCurrentExamQuestion();
    };

    matrix.appendChild(btn);
  });

  document.getElementById("exam-answered-count").textContent = `${answeredCount} / ${examQuestions.length}`;
  document.getElementById("exam-progress-summary").textContent = `Đã hoàn thành: ${answeredCount} / ${examQuestions.length} câu`;
}

function updateExamMatrix() {
  const btns = document.querySelectorAll("#exam-matrix .matrix-btn");
  btns.forEach((btn, idx) => {
    if (idx === currentExamIndex) {
      btn.classList.add("current");
    } else {
      btn.classList.remove("current");
    }
  });
}

function promptSubmitExam() {
  const answered = Object.keys(examUserAnswers).length;
  const total = examQuestions.length;
  const remaining = total - answered;

  const desc = document.getElementById("confirm-modal-desc");
  desc.textContent = `Bạn đã trả lời ${answered}/${total} câu. Còn ${remaining} câu chưa làm. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`;

  document.getElementById("confirm-submit-modal").classList.add("active");
}

function closeSubmitModal() {
  document.getElementById("confirm-submit-modal").classList.remove("active");
}

function finalizeExamSubmission() {
  closeSubmitModal();
  clearInterval(examTimerInterval);
  isExamActive = false;

  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  examQuestions.forEach(q => {
    const userAns = examUserAnswers[q.id];
    if (userAns === undefined) {
      skippedCount++;
    } else if (userAns === q.correct_index) {
      correctCount++;
    } else {
      incorrectCount++;
      mistakeIds.add(q.id); // record in mistakes notebook
    }
  });

  saveLocalState();
  updateMistakesCounter();

  // Score on 10-point scale
  const rawScore = (correctCount / examQuestions.length) * 10;
  const finalScore = (Math.round(rawScore * 10) / 10).toFixed(1);

  document.getElementById("result-score").textContent = finalScore;
  document.getElementById("result-correct-count").textContent = correctCount;
  document.getElementById("result-incorrect-count").textContent = incorrectCount;
  document.getElementById("result-skipped-count").textContent = skippedCount;

  const badgeIcon = document.getElementById("result-badge-icon");
  const titleElem = document.getElementById("result-title");
  if (finalScore >= 8.5) {
    badgeIcon.textContent = "🏆";
    badgeIcon.className = "modal-icon-badge success";
    titleElem.textContent = "Xuất Sắc! Điểm Tuyệt Đối";
  } else if (finalScore >= 7.0) {
    badgeIcon.textContent = "🌟";
    badgeIcon.className = "modal-icon-badge success";
    titleElem.textContent = "Kết Quả Khá - Tốt!";
  } else if (finalScore >= 5.0) {
    badgeIcon.textContent = "👍";
    badgeIcon.className = "modal-icon-badge warning";
    titleElem.textContent = "Đạt Yêu Cầu - Cần Ôn Kỹ Thêm";
  } else {
    badgeIcon.textContent = "⚠️";
    badgeIcon.className = "modal-icon-badge warning";
    titleElem.textContent = "Cần Ôn Tập Lại Các Chủ Đề";
  }

  document.getElementById("exam-result-modal").classList.add("active");
}

function closeResultModalAndReview() {
  document.getElementById("exam-result-modal").classList.remove("active");
  // Set current practice list to exam questions to review
  currentPracticeList = [...examQuestions];
  // copy answers to practice answers so student sees explanations immediately
  examQuestions.forEach(q => {
    if (examUserAnswers[q.id] !== undefined) {
      userPracticeAnswers[q.id] = examUserAnswers[q.id];
    }
  });
  saveLocalState();
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
  renderPracticeMatrix();
  switchView("practice");
  showToast("Đang mở chế độ xem lại bài thi kèm lời giải chi tiết!");
}

function restartExamSameSettings() {
  document.getElementById("exam-result-modal").classList.remove("active");
  if (currentExamConfig.type) {
    startExamByType(currentExamConfig.type, currentExamConfig.count);
  } else {
    startExamWithConfig(currentExamConfig.name, currentExamConfig.count);
  }
}

// ==================== MISTAKES NOTEBOOK ====================
function updateMistakesCounter() {
  const badge = document.getElementById("nav-mistakes-count");
  if (badge) badge.textContent = mistakeIds.size;
}

function renderMistakesView() {
  const container = document.getElementById("mistakes-list-container");
  if (!container) return;
  container.innerHTML = "";

  if (mistakeIds.size === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎉</div>
        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: var(--text-primary);">Chưa có câu hỏi nào trong danh sách sai!</h3>
        <p>Khi bạn làm sai câu hỏi trong lúc ôn tập hoặc thi thử, hệ thống sẽ tự động lưu vào đây để bạn luyện lại.</p>
      </div>
    `;
    return;
  }

  const mistakeQuestions = allQuestions.filter(q => mistakeIds.has(q.id));

  mistakeQuestions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-panel";
    card.style.marginBottom = "1rem";

    card.innerHTML = `
      <div class="q-header">
        <div class="q-meta-badges">
          <span class="exam-badge badge-blue">${q.exam}</span>
          <span class="exam-badge badge-purple">${q.topic}</span>
          <span class="exam-badge badge-amber">${q.difficulty}</span>
        </div>
        <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="removeMistake('${q.id}')">
          ✓ Đã hiểu (Bỏ câu này)
        </button>
      </div>

      <div class="q-text" style="font-size: 1.05rem; margin-bottom: 1rem;">
        ${formatMathFormulas(q.question)}
      </div>

      <div style="margin-bottom: 1rem;">
        <strong>Đáp án đúng:</strong> 
        <span style="color: var(--success); font-weight: 700; margin-left: 0.5rem;">
          ${q.options[q.correct_index] || ""}
        </span>
      </div>

      <div class="explanation-card" style="margin-top: 0.5rem;">
        <div class="exp-header">💡 Lời giải chi tiết:</div>
        <div class="exp-content">${formatMathFormulas(q.explanation)}</div>
      </div>
    `;

    container.appendChild(card);
  });
}

function removeMistake(qId) {
  mistakeIds.delete(qId);
  saveLocalState();
  updateMistakesCounter();
  renderMistakesView();
  showToast("Đã loại câu khỏi danh sách câu sai.");
}

function clearMistakesHistory() {
  if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử câu làm sai?")) {
    mistakeIds.clear();
    saveLocalState();
    updateMistakesCounter();
    renderMistakesView();
    showToast("Đã xóa sạch sổ tay câu sai!");
  }
}

function practiceAllMistakes() {
  if (mistakeIds.size === 0) {
    showToast("Danh sách câu sai đang trống!");
    return;
  }
  currentPracticeList = allQuestions.filter(q => mistakeIds.has(q.id));
  currentPracticeIndex = 0;
  renderCurrentPracticeQuestion();
  renderPracticeMatrix();
  switchView("practice");
  showToast(`Đã tải ${currentPracticeList.length} câu hay sai để ôn luyện!`);
}

// ==================== SEARCH & QUICK REFERENCE ====================
function setSearchTypeFilter(type) {
  currentSearchTypeFilter = type;
  ["all", "theory", "exercise"].forEach(id => {
    const btn = document.getElementById(`search-pill-${id}`);
    if (btn) btn.classList.remove("active");
  });
  if (type === "all") document.getElementById("search-pill-all")?.classList.add("active");
  if (type === "Lý thuyết") document.getElementById("search-pill-theory")?.classList.add("active");
  if (type === "Bài tập") document.getElementById("search-pill-exercise")?.classList.add("active");

  onGlobalSearch(document.getElementById("global-search-input")?.value || "");
}

function onGlobalSearch(kw) {
  const query = (kw || "").trim().toLowerCase();

  let pool = allQuestions;
  if (currentSearchTypeFilter !== "all") {
    pool = pool.filter(q => q.type === currentSearchTypeFilter);
  }

  if (!query) {
    renderSearchResults(pool);
    return;
  }

  const results = pool.filter(q => {
    return (
      q.question.toLowerCase().includes(query) ||
      q.options.some(o => o.toLowerCase().includes(query)) ||
      (q.explanation || "").toLowerCase().includes(query) ||
      q.topic.toLowerCase().includes(query) ||
      q.exam.toLowerCase().includes(query)
    );
  });

  renderSearchResults(results);
}

function renderSearchResults(list) {
  const summaryElem = document.getElementById("search-results-summary");
  const container = document.getElementById("search-results-list");
  if (!container) return;

  const typeDesc = currentSearchTypeFilter === "all" ? "" : ` [Dạng: ${currentSearchTypeFilter}]`;
  summaryElem.textContent = `Tìm thấy ${list.length} câu hỏi phù hợp${typeDesc}`;
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <p>Không tìm thấy câu hỏi nào phù hợp với từ khóa.</p>
      </div>
    `;
    return;
  }

  list.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-panel";
    card.style.padding = "1.5rem";

    const isTheory = q.type === "Lý thuyết";
    const typeBadgeHtml = `<span class="exam-badge ${isTheory ? 'badge-emerald' : 'badge-amber'}">${isTheory ? '📖 Lý thuyết' : '🧮 Bài tập'}</span>`;

    const optsHtml = q.options.map((opt, oIdx) => {
      const isCorrect = oIdx === q.correct_index;
      return `
        <div style="padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); margin: 0.25rem 0; font-size: 0.95rem; ${isCorrect ? 'background: var(--success-light); color: var(--success); font-weight: 700;' : 'color: var(--text-secondary);'}">
          ${String.fromCharCode(65 + oIdx)}. ${opt} ${isCorrect ? '✓ (Đáp án đúng)' : ''}
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="q-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem;">
        <div class="q-meta-badges">
          <span class="exam-badge badge-blue">${q.exam}</span>
          <span class="exam-badge badge-purple">${q.topic}</span>
          ${typeBadgeHtml}
          <span style="font-size: 0.85rem; color: var(--text-muted);">Câu #${q.number || idx+1}</span>
        </div>
        <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.8rem;" onclick="jumpToPracticeFromSearch('${q.id}')">
          Luyện câu này ➔
        </button>
      </div>

      <div class="q-text" style="font-size: 1.05rem; margin-bottom: 0.85rem;">
        ${formatMathFormulas(q.question)}
      </div>

      <div style="margin-bottom: 1rem;">
        ${optsHtml}
      </div>

      <div class="explanation-card" style="margin-top: 0.5rem; padding: 0.75rem 1rem;">
        <div class="exp-header" style="font-size: 0.88rem;">💡 Lời giải chi tiết:</div>
        <div class="exp-content" style="font-size: 0.88rem;">${formatMathFormulas(q.explanation)}</div>
      </div>
    `;

    container.appendChild(card);
  });
}

function jumpToPracticeFromSearch(qId) {
  const foundIdx = allQuestions.findIndex(q => q.id === qId);
  if (foundIdx !== -1) {
    currentPracticeList = [...allQuestions];
    currentPracticeIndex = foundIdx;
    renderCurrentPracticeQuestion();
    renderPracticeMatrix();
    switchView("practice");
  }
}

// ==================== IMAGE MODAL ====================
function openImageModal(src) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-img");
  modalImg.src = src;
  modal.classList.add("active");
}

function closeImageModal() {
  document.getElementById("image-modal").classList.remove("active");
}

// ==================== UTILITIES ====================
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("nmmmh_theme", next);

  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("btn-sound-toggle");
  if (btn) {
    btn.textContent = soundEnabled ? "🔊" : "🔇";
    showToast(soundEnabled ? "Đã bật âm thanh hiệu ứng" : "Đã tắt âm thanh");
  }
}

function formatMathFormulas(text) {
  if (!text) return "";
  // Simple clean formatting for powers, indices and math expressions
  let t = text;
  // Replace ^2, ^3 with sup
  t = t.replace(/\^(\d+)/g, '<sup>$1</sup>');
  t = t.replace(/_(\d+)/g, '<sub>$1</sub>');
  t = t.replace(/Z\*\s*(\d+)/g, '<b>Z*<sub>$1</sub></b>');
  t = t.replace(/GF\(2\^8\)/gi, '<b>GF(2<sup>8</sup>)</b>');
  return t;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showToast(msg) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function setupKeyboardNavigation() {
  document.addEventListener("keydown", (e) => {
    // Only handle if not typing in input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      return;
    }

    const practiceActive = document.getElementById("view-practice").classList.contains("active");
    const examActive = document.getElementById("view-exam").classList.contains("active");

    if (practiceActive) {
      if (e.key === "ArrowLeft") {
        prevPracticeQuestion();
      } else if (e.key === "ArrowRight") {
        nextPracticeQuestion();
      } else if (e.key === "1" || e.key.toLowerCase() === "a") {
        selectPracticeOption(0);
      } else if (e.key === "2" || e.key.toLowerCase() === "b") {
        selectPracticeOption(1);
      } else if (e.key === "3" || e.key.toLowerCase() === "c") {
        selectPracticeOption(2);
      } else if (e.key === "4" || e.key.toLowerCase() === "d") {
        selectPracticeOption(3);
      }
    } else if (examActive) {
      if (e.key === "ArrowLeft") {
        prevExamQuestion();
      } else if (e.key === "ArrowRight") {
        nextExamQuestion();
      } else if (e.key === "1" || e.key.toLowerCase() === "a") {
        selectExamOption(0);
      } else if (e.key === "2" || e.key.toLowerCase() === "b") {
        selectExamOption(1);
      } else if (e.key === "3" || e.key.toLowerCase() === "c") {
        selectExamOption(2);
      } else if (e.key === "4" || e.key.toLowerCase() === "d") {
        selectExamOption(3);
      }
    }
  });
}

// ==================== THEORY GUIDE ====================
let currentTheoryChapter = "all";

function showChapter(chapterId) {
  currentTheoryChapter = chapterId;

  // Update active state on buttons
  const buttons = document.querySelectorAll(".theory-nav-btn");
  buttons.forEach(btn => btn.classList.remove("active"));

  // Highlight corresponding button
  const allBtns = Array.from(buttons);
  const targetBtn = allBtns.find(b => b.getAttribute("onclick")?.includes(`'${chapterId}'`));
  if (targetBtn) targetBtn.classList.add("active");

  const chapterCards = document.querySelectorAll("#theory-container .chapter-card");
  if (chapterId === "all") {
    chapterCards.forEach(card => card.style.display = "block");
  } else {
    chapterCards.forEach(card => {
      if (card.id === `chapter-${chapterId}`) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  // Scroll to theory navigation bar smoothly
  const navBar = document.getElementById("theory-nav-bar");
  if (navBar) {
    navBar.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function filterTheoryContent(query) {
  const kw = (query || "").trim().toLowerCase();
  const chapterCards = document.querySelectorAll("#theory-container .chapter-card");

  if (!kw) {
    showChapter(currentTheoryChapter);
    return;
  }

  // When searching, display cards containing the keyword
  chapterCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(kw)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

