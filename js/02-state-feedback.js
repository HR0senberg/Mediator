// =========================
// Состояние приложения
// =========================
let currentEmotion = null;         // happy/sad/...
let currentPracticeType = null;    // meditation/breathing
let assessment = null;            // текущая оценка (камера + тест)

// Режим быстрой помощи (без теста)
let quickHelpMode = false;
let quickHelpSource = null; // 'camera' | 'manual'

// =========================
// Мини-обратная связь после практики
// =========================
const FEEDBACK_STORAGE_KEY = 'mediatorFeedback';
let activeSessionId = null; // id текущей сессии практики

function newSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readFeedback() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function writeFeedback(list) {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

// Короткая «память предпочтений» по практикам на основе сохранённого фидбека.
// Используем мягкое экспоненциальное затухание: недавнее важнее.
function getPracticeFeedbackSummary(practiceId, horizonDays = 30) {
  if (!practiceId) return { good: 0, neutral: 0, bad: 0, score: 0 };
  const list = readFeedback();
  const now = Date.now();
  let good = 0;
  let neutral = 0;
  let bad = 0;
  let score = 0;
  for (const it of list) {
    if (!it || it.practiceId !== practiceId) continue;
    const t = Date.parse(it.timestamp);
    if (!Number.isFinite(t)) continue;
    const ageDays = (now - t) / 86400000;
    if (ageDays < 0 || ageDays > horizonDays) continue;
    const w = Math.exp(-ageDays / 14);
    if (it.rating === 'good') {
      good += 1;
      score += 1 * w;
    } else if (it.rating === 'bad') {
      bad += 1;
      score += -1 * w;
    } else {
      neutral += 1;
      score += 0;
    }
  }
  return { good, neutral, bad, score };
}

function getRecentHistoryPracticeIds(limit = 2) {
  try {
    const history = JSON.parse(localStorage.getItem('mediatorHistory') || '[]');
    if (!Array.isArray(history) || history.length === 0) return [];
    const out = [];
    for (let i = history.length - 1; i >= 0 && out.length < limit; i -= 1) {
      const id = history[i]?.practice;
      if (id && !out.includes(id)) out.push(id);
    }
    return out;
  } catch (_) {
    return [];
  }
}

function savePracticeFeedback(rating, origin = 'unknown') {
  const entry = {
    timestamp: new Date().toISOString(),
    sessionId: activeSessionId || null,
    practiceId: currentPracticeType || activePracticeId || null,
    rating, // 'good' | 'neutral' | 'bad'
    mode: quickHelpMode ? 'quick' : 'regular',
    origin, // 'quick_after' | 'recommendation' | ...
    emotion: (assessment?.camera?.emotion) || currentEmotion || null,
    fusedKey: (assessment?.fused?.key) || null,
  };
  const list = readFeedback();
  // Не позволяем спамить: одна оценка на сессию
  if (entry.sessionId && list.some((x) => x && x.sessionId === entry.sessionId)) {
    return false;
  }
  list.push(entry);
  writeFeedback(list);
  return true;
}

function lockFeedbackUI(btns, statusEl, message) {
  (btns || []).forEach((b) => {
    if (!b) return;
    b.disabled = true;
    b.classList.add('disabled');
  });
  if (statusEl) statusEl.textContent = message || 'Спасибо!';
}
let cameraStream = null;           // MediaStream или null
let modelsReady = false;           // модели face-api загружены

// Этап 3: эмоциональный профиль (несколько кадров → усреднение + уверенность)
let emotionProfile = null;        // {happy:..} сглаженный профиль вероятностей
let emotionConfidence = 0;        // 0..1 итоговая «уверенность» (учёт отрыва и качества детекции)
let emotionMargin = 0;            // 0..1 отрыв топ‑эмоции от второй

// =========================
// Визуальный realtime-трекинг
// =========================
const ctx = overlay.getContext('2d', { alpha: true });
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const TRACK = {
  enabledByDefault: true,
  scoreThreshold: 0.5,
  inputSizeMobile: 192,     // кратно 32 (128..512)
  inputSizeDesktop: 224,
  // Стабилизация
  smoothAlphaBox: 0.35,      // меньше — сильнее сглаживание (и больше лаг)
  smoothAlphaLandmarks: 0.45,
  smoothAlphaExpressions: 0.35,
  // Стабилизация эмоции (гистерезис)
  stableMinMs: 450,
  // Авто-настройка частоты
  minIntervalMs: 90,
  maxIntervalMs: 240,
};

