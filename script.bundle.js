/*
 * «Медиатор» — распознавание эмоций и упражнения.
 * Обновление: улучшенный визуальный трекинг лица + оптимизация под постоянный трекинг.
 *
 * Технология: face-api.js (TinyFaceDetector + TinyLandmarks для realtime).
 */

// =========================
// DOM
// =========================
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const detectBtn = document.getElementById('detectBtn');
const emotionResult = document.getElementById('emotion-result');
const startPracticeBtn = document.getElementById('startPracticeBtn');
const trackingStatus = document.getElementById('trackingStatus');
const practiceHint = document.getElementById('practiceHint');
const videoHint = document.getElementById('videoHint');
const quickHelpBtn = document.getElementById('quickHelpBtn');

// Быстрая помощь
const quickHelpSection = document.getElementById('quickhelp');
const qhTension = document.getElementById('qhTension');
const qhFatigue = document.getElementById('qhFatigue');
const qhOverload = document.getElementById('qhOverload');
const qhBad = document.getElementById('qhBad');
const qhBack = document.getElementById('qhBack');
const quickHelpAfter = document.getElementById('quickHelpAfter');
const quickHelpBetterBtn = document.getElementById('quickHelpBetterBtn');
const quickHelpTestBtn = document.getElementById('quickHelpTestBtn');

// Мини-обратная связь (quick)
const quickFeedback = document.getElementById('quickFeedback');
const quickFbGood = document.getElementById('quickFbGood');
const quickFbNeutral = document.getElementById('quickFbNeutral');
const quickFbBad = document.getElementById('quickFbBad');
const quickFbStatus = document.getElementById('quickFbStatus');

const practiceBackBtn = document.getElementById('practiceBackBtn');
const practiceStartPauseBtn = document.getElementById('practiceStartPauseBtn');
const practiceMusicBtn = document.getElementById('practiceMusicBtn');
const practiceList = document.getElementById('practiceList');
const practiceSteps = document.getElementById('practiceSteps');
const practicePrompt = document.getElementById('practicePrompt');
const practiceTimer = document.getElementById('practiceTimer');
const practiceCoachLine = document.getElementById('practiceCoachLine');
const breathCircle = document.getElementById('breathCircle');
// Этап 1: на главной рекомендации практик не показываем.
// Рекомендатель используется только для заполнения списка вариантов на экране практики.

const finishPracticeBtn = document.getElementById('finishPracticeBtn');
const practiceSection = document.getElementById('practice');
const homeSection = document.getElementById('home');
const testSection = document.getElementById('test');
const recommendationSection = document.getElementById('recommendation');
const historySection = document.getElementById('history');
const diarySection = document.getElementById('diary');

const practiceTitle = document.getElementById('practice-title');
const practiceDescription = document.getElementById('practice-description');
const musicPlayer = document.getElementById('musicPlayer');

const submitTestBtn = document.getElementById('submitTestBtn');
const cancelTestBtn = document.getElementById('cancelTestBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const goToPracticeBtn = document.getElementById('goToPracticeBtn');
const editTestBtn = document.getElementById('editTestBtn');
const testQuestions = document.getElementById('testQuestions');

// Мини-обратная связь после практики (экран рекомендаций)
const recFeedback = document.getElementById('recFeedback');
const recFbGood = document.getElementById('recFbGood');
const recFbNeutral = document.getElementById('recFbNeutral');
const recFbBad = document.getElementById('recFbBad');
const recFbStatus = document.getElementById('recFbStatus');
const testProgress = document.getElementById('testProgress');
const testScoreHint = document.getElementById('testScoreHint');
const recommendedList = document.getElementById('recommendedList');
const recommendationSummary = document.getElementById('recommendationSummary');
const recommendationExplainLine = document.getElementById('recommendationExplainLine');
const howComputed = document.getElementById('howComputed');
const howComputedBody = document.getElementById('howComputedBody');
const recWarnings = document.getElementById('recWarnings');

const historyList = document.getElementById('historyList');
const diaryList = document.getElementById('diaryList');
const diaryInput = document.getElementById('diaryInput');
const saveDiaryBtn = document.getElementById('saveDiaryBtn');

// Навигация
const navItems = document.querySelectorAll('#bottomNav .nav-item');

// =========================
// Диаграмма истории
// =========================
// Диаграммы в разделе «История» отключены — оставляем только список записей.

const emotionColors = {
  happy: '#7EA9E1',
  sad: '#F6C358',
  angry: '#E3A7C0',
  fearful: '#A8C686',
  disgusted: '#D38888',
  surprised: '#D8BFD8',
  neutral: '#B0B0B0',
};

// Иконки для каждой эмоции. Используем эмодзи для усиления эмоционального контекста.
const emotionIcons = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  fearful: '😱',
  disgusted: '🤢',
  surprised: '😮',
  neutral: '😐',
};

// Бейджи причин: коротко объясняют, почему практика в рекомендациях.
const REASON_BADGES = {
  long_exhale: { icon: '🫁', text: 'удлинённый выдох' },
  grounding: { icon: '🧍', text: 'заземление' },
  relax_body: { icon: '💪', text: 'снимает напряжение' },
  stabilize_breath: { icon: '🌿', text: 'стабилизирует дыхание' },
  energize: { icon: '⚡', text: 'поднимает энергию' },
  stretch: { icon: '🤸', text: 'активирует тело' },
  focus: { icon: '🎯', text: 'возвращает фокус' },
  self_support: { icon: '❤️', text: 'самоподдержка' },
  visualize: { icon: '✨', text: 'визуализация' },
  gratitude: { icon: '🙏', text: 'закрепляет ресурс' },
};

/**
 * Преобразует шестнадцатеричный цвет вида #RRGGBB в строку rgba(r,g,b,alpha).
 * Если hex невалиден, возвращает прозрачный белый.
 * @param {string} hex - Цвет в формате #RRGGBB
 * @param {number} alpha - Прозрачность (0..1)
 * @returns {string} RGBA-строка
 */
function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string' || !/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
    return `rgba(255,255,255,${alpha})`;
  }
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Устанавливает CSS‑переменные на корневом элементе для текущей эмоции.
 * Цвета фона, рамки и текста вычисляются из emotionColors.
 * @param {string} emotion
 */
function setEmotionTheme(emotion) {
  const color = emotionColors[emotion] || emotionColors['neutral'];
  // Настраиваем разные альфа‑уровни для фона и рамки
  const bg = hexToRgba(color, 0.25);
  const border = hexToRgba(color, 0.4);
  // Тёмный текст лучше читается на светлых фонах
  const text = '#1f2937';
  document.documentElement.style.setProperty('--emotion-bg', bg);
  document.documentElement.style.setProperty('--emotion-border', border);
  document.documentElement.style.setProperty('--emotion-text', text);
}


// Этап 3: профиль эмоций собираем из нескольких измерений за короткое окно времени.
// Это снижает «скачки» и делает результат более надёжным.
const EMO_KEYS = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];

const PROFILE = {
  windowMs: 1500,   // храним измерения за последние ~1.5 сек
  maxSamples: 24,   // ограничение на число измерений в окне
  minSamples: 4,    // сколько измерений нужно для уверенного профиля
  weightFromFaceScore: true, // взвешиваем по качеству детекции лица
};

let expressionSamples = []; // [{t, expressions, faceScore}]

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

// =========================
// Контроль качества кадра (чтобы не "уверенно ошибаться")
// =========================
const QUALITY = {
  // детекция
  minFaceScore: 0.65,
  // лицо в кадре
  minFaceAreaRatio: 0.06, // слишком далеко
  maxFaceAreaRatio: 0.45, // слишком близко
  maxCenterOffsetRatio: 0.18,
  maxYawRatio: 0.22,
  // свет/контраст (0..255)
  minLuma: 60,
  maxLuma: 210,
  minContrast: 18,
  // резкость (условные единицы)
  minSharpness: 12,
  // как часто пересчитывать пиксельные метрики
  computeEveryMs: 380,
  // как долго удерживать подсказку, чтобы не мигало
  stickMs: 1200,
};

const qualityCanvas = document.createElement('canvas');
qualityCanvas.width = 48;
qualityCanvas.height = 48;
const qualityCtx = qualityCanvas.getContext('2d', { willReadFrequently: true });

let lastQualityCalcAt = 0;
let lastPixelQuality = { luma: null, contrast: null, sharpness: null };
let lastQualityHint = { text: '', level: 'ok', until: 0 };

function setVideoHint(text, level = 'ok') {
  if (!videoHint) return;
  const nextText = (text || '').trim();
  const nextLevel = level === 'warn' ? 'warn' : 'ok';

  if (videoHint.textContent !== nextText) videoHint.textContent = nextText;
  videoHint.classList.toggle('warn', nextLevel === 'warn');
  videoHint.classList.toggle('ok', nextLevel === 'ok');
}

function avgPoint(points, idxFrom, idxToInclusive) {
  if (!points || points.length < idxToInclusive + 1) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = idxFrom; i <= idxToInclusive; i++) {
    const p = points[i];
    if (!p) continue;
    x += p.x;
    y += p.y;
    n += 1;
  }
  if (!n) return null;
  return { x: x / n, y: y / n };
}

function estimateYawRatio(points) {
  // По 68-точечной разметке: глаза 36-41 и 42-47, нос 30.
  const le = avgPoint(points, 36, 41);
  const re = avgPoint(points, 42, 47);
  const nose = points && points[30] ? { x: points[30].x, y: points[30].y } : null;
  if (!le || !re || !nose) return 0;
  const eyeMidX = (le.x + re.x) / 2;
  const eyeDist = Math.max(1, Math.abs(re.x - le.x));
  return Math.abs((nose.x - eyeMidX) / eyeDist);
}

function computeLumaContrastAndSharpnessFromVideo(box) {
  // Возвращает объект {luma, contrast, sharpness} или null
  if (!video || !box || !qualityCtx) return null;
  if (!video.videoWidth || !video.videoHeight || !overlay?.width || !overlay?.height) return null;

  // Перевод координат box из overlay-space в video-space
  const sx0 = (box.x / overlay.width) * video.videoWidth;
  const sy0 = (box.y / overlay.height) * video.videoHeight;
  const sw0 = (box.width / overlay.width) * video.videoWidth;
  const sh0 = (box.height / overlay.height) * video.videoHeight;

  // небольшой паддинг
  const pad = 0.12;
  const sx = Math.max(0, Math.floor(sx0 - sw0 * pad));
  const sy = Math.max(0, Math.floor(sy0 - sh0 * pad));
  const sw = Math.min(video.videoWidth - sx, Math.floor(sw0 * (1 + pad * 2)));
  const sh = Math.min(video.videoHeight - sy, Math.floor(sh0 * (1 + pad * 2)));
  if (sw <= 2 || sh <= 2) return null;

  qualityCtx.drawImage(video, sx, sy, sw, sh, 0, 0, qualityCanvas.width, qualityCanvas.height);
  const img = qualityCtx.getImageData(0, 0, qualityCanvas.width, qualityCanvas.height);
  const data = img.data;

  // Лума + контраст (std) + простая "резкость" (средняя разность соседей)
  const w = qualityCanvas.width;
  const h = qualityCanvas.height;
  let sum = 0;
  let sum2 = 0;
  let sharpSum = 0;
  let count = 0;

  // Преобразование в серый: 0.2126R + 0.7152G + 0.0722B
  // Для резкости считаем |I(x)-I(x-1)| и |I(x)-I(y-1)|
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
    const yi = y | 0;
    gray[p] = yi;
    sum += yi;
    sum2 += yi * yi;
    count++;
  }

  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const idx = y * w + x;
      const v = gray[idx];
      const dx = Math.abs(v - gray[idx - 1]);
      const dy = Math.abs(v - gray[idx - w]);
      sharpSum += (dx + dy);
    }
  }

  const mean = sum / Math.max(1, count);
  const variance = Math.max(0, (sum2 / Math.max(1, count)) - mean * mean);
  const std = Math.sqrt(variance);
  const sharpness = sharpSum / Math.max(1, (w - 1) * (h - 1));
  return { luma: mean, contrast: std, sharpness };
}

function assessFrameQuality({ box, points, faceScore }) {
  const issues = [];

  // 1) базовая надёжность детекции
  if (Number.isFinite(faceScore) && faceScore < QUALITY.minFaceScore) {
    issues.push({ key: 'score', severity: 3, text: 'Лицо плохо видно — повернитесь к свету и смотрите прямо.' });
  }

  // 2) геометрия кадра
  if (box && overlay?.width && overlay?.height) {
    const frameArea = overlay.width * overlay.height;
    const faceArea = box.width * box.height;
    const areaRatio = faceArea / Math.max(1, frameArea);
    if (areaRatio < QUALITY.minFaceAreaRatio) {
      issues.push({ key: 'far', severity: 2, text: 'Подойдите ближе — лицо слишком далеко.' });
    } else if (areaRatio > QUALITY.maxFaceAreaRatio) {
      issues.push({ key: 'close', severity: 2, text: 'Отойдите чуть дальше — лицо слишком близко.' });
    }

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const fx = overlay.width / 2;
    const fy = overlay.height / 2;
    const dx = (cx - fx) / Math.max(1, overlay.width);
    const dy = (cy - fy) / Math.max(1, overlay.height);
    const centerOffset = Math.sqrt(dx * dx + dy * dy);
    if (centerOffset > QUALITY.maxCenterOffsetRatio) {
      issues.push({ key: 'center', severity: 1, text: 'Сместите лицо в центр кадра.' });
    }
  }

  // 3) поворот головы (yaw)
  const yawRatio = estimateYawRatio(points);
  if (yawRatio > QUALITY.maxYawRatio) {
    issues.push({ key: 'yaw', severity: 1, text: 'Поверните лицо прямо (без сильного поворота в сторону).' });
  }

  // 4) пиксельные метрики (свет/контраст/резкость) не чаще раз в QUALITY.computeEveryMs
  const now = performance.now();
  if (box && now - lastQualityCalcAt > QUALITY.computeEveryMs) {
    lastQualityCalcAt = now;
    const px = computeLumaContrastAndSharpnessFromVideo(box);
    if (px) lastPixelQuality = px;
  }

  const { luma, contrast, sharpness } = lastPixelQuality || {};
  if (Number.isFinite(luma)) {
    if (luma < QUALITY.minLuma) {
      issues.push({ key: 'dark', severity: 2, text: 'Темновато — добавьте света перед лицом.' });
    } else if (luma > QUALITY.maxLuma) {
      issues.push({ key: 'bright', severity: 2, text: 'Слишком ярко — уберите источник света из кадра.' });
    }
  }
  if (Number.isFinite(contrast) && contrast < QUALITY.minContrast) {
    issues.push({ key: 'low_contrast', severity: 1, text: 'Слабый контраст — попробуйте повернуться к свету боком.' });
  }
  if (Number.isFinite(sharpness) && sharpness < QUALITY.minSharpness) {
    issues.push({ key: 'blur', severity: 1, text: 'Кадр смазан — замрите на секунду.' });
  }

  if (issues.length === 0) {
    return { ok: true, issues: [], hint: 'Держите лицо по центру. Трекинг работает постоянно.' };
  }

  // приоритет: сначала severity, потом порядок
  issues.sort((a, b) => (b.severity - a.severity));
  const top = issues[0];
  // блокируем обновление эмоции при серьёзных проблемах (темно/пересвет/слишком далеко/плохой score)
  const block = top.severity >= 2;
  return { ok: false, block, issues, hint: top.text };
}

let trackingRunning = false;
let trackingRafId = null;
let detectInFlight = false;
let lastDetectAt = 0;
let avgDetectMs = 120;
let detectIntervalMs = 120;

let smoothBox = null;            // {x,y,width,height}
let smoothLandmarks = null;      // [{x,y}...]
let smoothExpressions = null;    // {happy:0..}
let lastSeenAt = 0;

let candidateEmotion = null;
let candidateSince = 0;
let stableEmotion = null;
let stableProb = 0;
let stableConfidence = 0;
let stableMargin = 0;

let overlayPalette = {
  primary: [126, 169, 225],
  accent: [227, 167, 192],
  secondary: [246, 195, 88],
};

function isMobileLike() {
  return window.matchMedia('(max-width: 600px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function rgba(rgb, a) {
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseCssColor(str, fallback = [126, 169, 225]) {
  const s = (str || '').trim();
  if (!s) return fallback;
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    }
  }
  const m = s.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
  if (m) {
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  return fallback;
}

function refreshOverlayPalette() {
  const st = getComputedStyle(document.body);
  overlayPalette.primary = parseCssColor(st.getPropertyValue('--color-primary'), overlayPalette.primary);
  overlayPalette.accent = parseCssColor(st.getPropertyValue('--color-accent'), overlayPalette.accent);
  overlayPalette.secondary = parseCssColor(st.getPropertyValue('--color-secondary'), overlayPalette.secondary);
}

function ensureOverlaySize() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  if (overlay.width !== vw || overlay.height !== vh) {
    overlay.width = vw;
    overlay.height = vh;
  }
}

function roundedRectPath(c, x, y, w, h, r) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

const FEATURE_GROUPS = [
  { from: 0, to: 16, closed: false, color: 'primary', alpha: 0.65, width: 2.4 },   // jaw
  { from: 17, to: 21, closed: false, color: 'primary', alpha: 0.75, width: 2.2 },  // left brow
  { from: 22, to: 26, closed: false, color: 'primary', alpha: 0.75, width: 2.2 },  // right brow
  { from: 27, to: 30, closed: false, color: 'secondary', alpha: 0.7, width: 2.2 }, // nose bridge
  { from: 30, to: 35, closed: false, color: 'secondary', alpha: 0.65, width: 2.2 },// nose base
  { from: 36, to: 41, closed: true, color: 'accent', alpha: 0.75, width: 2.2 },    // left eye
  { from: 42, to: 47, closed: true, color: 'accent', alpha: 0.75, width: 2.2 },    // right eye
  { from: 48, to: 59, closed: true, color: 'accent', alpha: 0.8, width: 2.4 },     // mouth outer
  { from: 60, to: 67, closed: true, color: 'accent', alpha: 0.55, width: 2.0 },    // mouth inner
];

function drawFeature(c, points, from, to, closed) {
  c.beginPath();
  c.moveTo(points[from].x, points[from].y);
  for (let i = from + 1; i <= to; i++) c.lineTo(points[i].x, points[i].y);
  if (closed) c.closePath();
  c.stroke();
}

function emotionDisplayName(emotion) {
  const map = {
    happy: 'Счастье',
    sad: 'Грусть',
    angry: 'Злость',
    fearful: 'Страх',
    disgusted: 'Отвращение',
    surprised: 'Удивление',
    neutral: 'Нейтрально',
  };
  return map[emotion] || emotion;
}

function getBestEmotion(expressions) {
  let bestEmotion = 'neutral';
  let maxProb = 0;
  for (const [emo, prob] of Object.entries(expressions || {})) {
    if (prob > maxProb) {
      maxProb = prob;
      bestEmotion = emo;
    }
  }
  return { emotion: bestEmotion, prob: maxProb };
}


function formatPct(x) {
  if (!Number.isFinite(x)) return '';
  return `${Math.round(clamp(x, 0, 1) * 100)}%`;
}

function roundProfile(profile, digits = 3) {
  if (!profile) return null;
  const out = {};
  EMO_KEYS.forEach((k) => {
    const v = Number(profile[k] || 0);
    out[k] = Number.isFinite(v) ? Number(v.toFixed(digits)) : 0;
  });
  return out;
}

function getTopEmotions(profile, n = 3) {
  if (!profile) return [];
  const arr = EMO_KEYS.map((k) => [k, Number(profile[k] || 0)]);
  arr.sort((a, b) => b[1] - a[1]);
  return arr.slice(0, n);
}

function formatTopEmotions(profile) {
  const top = getTopEmotions(profile, 3);
  if (top.length === 0) return '';
  const parts = top.map(([k, v]) => `${emotionDisplayName(k)} ${Math.round(v * 100)}%`);
  return `Профиль: ${parts.join(' • ')}`;
}

function trimOldSamples() {
  const now = performance.now();
  const cutoff = now - PROFILE.windowMs;
  // удаляем старые
  while (expressionSamples.length && expressionSamples[0].t < cutoff) expressionSamples.shift();
  // ограничиваем по длине
  if (expressionSamples.length > PROFILE.maxSamples) {
    expressionSamples.splice(0, expressionSamples.length - PROFILE.maxSamples);
  }
}

function pushExpressionSample(expressions, faceScore = 1) {
  const now = performance.now();
  expressionSamples.push({
    t: now,
    expressions: expressions || {},
    faceScore: clamp(Number(faceScore) || 0, 0, 1),
  });
  trimOldSamples();
}

function computeAveragedProfile() {
  if (!expressionSamples.length) return null;
  const acc = {};
  EMO_KEYS.forEach((k) => (acc[k] = 0));

  let wSum = 0;
  for (const s of expressionSamples) {
    const score = clamp(Number(s.faceScore) || 0, 0, 1);
    const w = PROFILE.weightFromFaceScore ? (0.35 + 0.65 * score) : 1;
    wSum += w;
    EMO_KEYS.forEach((k) => {
      acc[k] += (Number(s.expressions?.[k]) || 0) * w;
    });
  }
  if (!wSum) wSum = 1;
  EMO_KEYS.forEach((k) => (acc[k] /= wSum));
  return acc;
}

function computeEmotionMetrics(profile, faceScore = 1) {
  const best = getBestEmotion(profile || {});
  let second = 0;
  for (const [emo, prob] of Object.entries(profile || {})) {
    if (emo === best.emotion) continue;
    if (prob > second) second = prob;
  }
  const margin = clamp(best.prob - second, 0, 1);
  const score = clamp(Number(faceScore) || 0, 0, 1);

  // Итоговая «уверенность» — смесь: лучшая вероятность + отрыв + качество детекции лица
  const confidence = clamp(0.65 * best.prob + 0.25 * margin + 0.10 * score, 0, 1);

  return {
    emotion: best.emotion,
    prob: best.prob,
    secondProb: second,
    margin,
    faceScore: score,
    confidence,
  };
}


function smoothUpdateBox(box) {
  if (!box) return null;
  const a = TRACK.smoothAlphaBox;
  if (!smoothBox) {
    smoothBox = { x: box.x, y: box.y, width: box.width, height: box.height };
    return smoothBox;
  }
  smoothBox.x = lerp(smoothBox.x, box.x, a);
  smoothBox.y = lerp(smoothBox.y, box.y, a);
  smoothBox.width = lerp(smoothBox.width, box.width, a);
  smoothBox.height = lerp(smoothBox.height, box.height, a);
  return smoothBox;
}

function smoothUpdateLandmarks(points) {
  if (!points || !points.length) return null;
  const a = TRACK.smoothAlphaLandmarks;
  if (!smoothLandmarks || smoothLandmarks.length !== points.length) {
    smoothLandmarks = points.map((p) => ({ x: p.x, y: p.y }));
    return smoothLandmarks;
  }
  for (let i = 0; i < points.length; i++) {
    smoothLandmarks[i].x = lerp(smoothLandmarks[i].x, points[i].x, a);
    smoothLandmarks[i].y = lerp(smoothLandmarks[i].y, points[i].y, a);
  }
  return smoothLandmarks;
}

function smoothUpdateExpressions(expressions) {
  const a = TRACK.smoothAlphaExpressions;
  const keys = EMO_KEYS;
  if (!smoothExpressions) {
    smoothExpressions = {};
    keys.forEach((k) => (smoothExpressions[k] = expressions?.[k] || 0));
    return smoothExpressions;
  }
  keys.forEach((k) => {
    const v = expressions?.[k] || 0;
    smoothExpressions[k] = lerp(smoothExpressions[k], v, a);
  });
  return smoothExpressions;
}

function updateStableEmotion(expressions, faceScore = 1) {
  // 1) усредняем по окну (вычисляется снаружи) и дополнительно сглаживаем EMA
  const smoothed = smoothUpdateExpressions(expressions);

  // 2) сохраняем полный профиль
  emotionProfile = { ...smoothed };

  // 3) считаем уверенность
  const metrics = computeEmotionMetrics(smoothed, faceScore);
  emotionConfidence = metrics.confidence;
  emotionMargin = metrics.margin;

  const now = performance.now();

  if (!candidateEmotion || candidateEmotion !== metrics.emotion) {
    candidateEmotion = metrics.emotion;
    candidateSince = now;
  }

  if (!stableEmotion) {
    if (now - candidateSince >= TRACK.stableMinMs) {
      stableEmotion = candidateEmotion;
      stableProb = metrics.prob;
      stableMargin = metrics.margin;
      stableConfidence = metrics.confidence;
      return true;
    }
    return false;
  }

  if (candidateEmotion !== stableEmotion) {
    if (now - candidateSince >= TRACK.stableMinMs) {
      stableEmotion = candidateEmotion;
      stableProb = metrics.prob;
      stableMargin = metrics.margin;
      stableConfidence = metrics.confidence;
      return true;
    }
    return false;
  }

  stableProb = metrics.prob;
  stableMargin = metrics.margin;
  stableConfidence = metrics.confidence;
  return false;
}

function renderOverlay({ box, points, label }) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!box) return;

  const pad = Math.max(6, box.width * 0.04);
  const x = box.x - pad;
  const y = box.y - pad;
  const w = box.width + pad * 2;
  const h = box.height + pad * 2;
  const radius = clamp(w * 0.06, 10, 18);

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, rgba(overlayPalette.primary, 0.95));
  grad.addColorStop(0.55, rgba(overlayPalette.accent, 0.92));
  grad.addColorStop(1, rgba(overlayPalette.secondary, 0.95));

  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = rgba(overlayPalette.primary, 0.22);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = grad;
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();

  // Углы
  ctx.save();
  ctx.lineWidth = 4.4;
  ctx.strokeStyle = rgba(overlayPalette.primary, 0.55);
  ctx.globalAlpha = 0.9;
  const corner = clamp(w * 0.10, 18, 26);

  // TL
  ctx.beginPath();
  ctx.moveTo(x + radius * 0.9, y + corner);
  ctx.lineTo(x + radius * 0.9, y + radius * 0.9);
  ctx.lineTo(x + corner, y + radius * 0.9);
  ctx.stroke();

  // TR
  ctx.beginPath();
  ctx.moveTo(x + w - corner, y + radius * 0.9);
  ctx.lineTo(x + w - radius * 0.9, y + radius * 0.9);
  ctx.lineTo(x + w - radius * 0.9, y + corner);
  ctx.stroke();

  // BL
  ctx.beginPath();
  ctx.moveTo(x + radius * 0.9, y + h - corner);
  ctx.lineTo(x + radius * 0.9, y + h - radius * 0.9);
  ctx.lineTo(x + corner, y + h - radius * 0.9);
  ctx.stroke();

  // BR
  ctx.beginPath();
  ctx.moveTo(x + w - corner, y + h - radius * 0.9);
  ctx.lineTo(x + w - radius * 0.9, y + h - radius * 0.9);
  ctx.lineTo(x + w - radius * 0.9, y + h - corner);
  ctx.stroke();

  ctx.restore();

  // Ландмарки
  if (points && points.length >= 68) {
    ctx.save();
    for (const g of FEATURE_GROUPS) {
      const col =
        g.color === 'primary'
          ? overlayPalette.primary
          : g.color === 'secondary'
            ? overlayPalette.secondary
            : overlayPalette.accent;
      ctx.strokeStyle = rgba(col, g.alpha);
      ctx.lineWidth = g.width;
      drawFeature(ctx, points, g.from, g.to, g.closed);
    }

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = rgba(overlayPalette.secondary, 0.9);
    const keyIdx = [30, 36, 39, 42, 45, 48, 54];
    keyIdx.forEach((i) => {
      const p = points[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Лейбл
  if (label) {
    ctx.save();
    ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const metrics = ctx.measureText(label);
    const padX = 10;
    const boxW = metrics.width + padX * 2;
    const boxH = 26;

    let lx = x;
    let ly = y - boxH - 10;
    if (ly < 6) ly = y + 8;
    if (lx + boxW > overlay.width - 6) lx = overlay.width - boxW - 6;

    // Светлая тема по умолчанию (без тёмного режима)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeStyle = rgba(overlayPalette.primary, 0.35);
    ctx.lineWidth = 1;

    roundedRectPath(ctx, lx, ly, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(label, lx + padX, ly + 18);
    ctx.restore();
  }
}

// =========================
// Модели face-api.js
// =========================
async function loadModels() {
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  modelsReady = false;
  try {
    // Realtime: Tiny detector + Tiny landmarks
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);

    // Эмоции
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    // Точный снимок: SSD + полные landmarks
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    modelsReady = true;
  } catch (err) {
    modelsReady = false;
    console.error('Ошибка загрузки моделей:', err);
    emotionResult.innerText = 'Не удалось загрузить модели распознавания. Проверьте интернет.';
  }
}

// =========================
// Камера
// =========================
function startVideo() {
  if (!window.isSecureContext) {
    emotionResult.innerText = 'Для доступа к камере нужен безопасный контекст (https или localhost).';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    emotionResult.innerText = 'Ваш браузер не поддерживает доступ к камере.';
    return;
  }

  // Ограничиваем желаемое разрешение — быстрее и стабильнее для постоянного трекинга
  const constraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      cameraStream = stream;
      video.srcObject = stream;
      detectBtn.disabled = true;

      video.onloadedmetadata = () => {
        video.play().catch(() => {});
        ensureOverlaySize();
        detectBtn.disabled = false;
        if (TRACK.enabledByDefault && modelsReady) startTracking();
      };
    })
    .catch((err) => {
      console.error('Ошибка доступа к камере:', err);
      emotionResult.innerText = 'Не удалось получить доступ к камере.';
    });
}

// =========================
// Управление потоком камеры
// =========================
function stopVideoStream() {
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
  } catch (_) {}
  if (video) video.srcObject = null;
}

// =========================
// Текст и локализация
// =========================
function translateEmotion(emotion) {
  const map = {
    happy: 'счастливым',
    sad: 'грустным',
    angry: 'сердитым',
    fearful: 'испуганным',
    disgusted: 'раздражённым',
    surprised: 'удивлённым',
    neutral: 'нейтральным',
  };
  return map[emotion] || emotion;
}

// =========================
// Постоянный трекинг
// =========================
function startTracking() {
  if (trackingRunning) return;
  trackingRunning = true;
  if (trackingStatus) {
    trackingStatus.textContent = 'LIVE';
    trackingStatus.classList.remove('paused');
  }
  detectInFlight = false;
  lastDetectAt = 0;
  avgDetectMs = 120;
  detectIntervalMs = 120;
  candidateEmotion = null;
  candidateSince = 0;
  stableEmotion = null;
  stableProb = 0;
  stableConfidence = 0;
  stableMargin = 0;
  emotionProfile = null;
  emotionConfidence = 0;
  emotionMargin = 0;
  smoothExpressions = null;
  expressionSamples = [];
  lastSeenAt = 0;

  refreshOverlayPalette();
  ensureOverlaySize();

  trackingRafId = requestAnimationFrame(trackingLoop);
}

function stopTracking(clearOverlay = true) {
  trackingRunning = false;
  if (trackingStatus) {
    trackingStatus.textContent = 'PAUSED';
    trackingStatus.classList.add('paused');
  }
  if (trackingRafId) cancelAnimationFrame(trackingRafId);
  trackingRafId = null;
  detectInFlight = false;
  if (clearOverlay) ctx.clearRect(0, 0, overlay.width, overlay.height);
}

async function doRealtimeDetect() {
  if (!trackingRunning) return;
  if (!modelsReady) return;
  if (!video.videoWidth || !video.videoHeight) return;
  if (detectInFlight) return;

  detectInFlight = true;
  const t0 = performance.now();

  try {
    const inputSize = isMobileLike() ? TRACK.inputSizeMobile : TRACK.inputSizeDesktop;
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize,
      scoreThreshold: TRACK.scoreThreshold,
    });

    // withFaceLandmarks(true) — tiny landmarks
    const detection = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const t1 = performance.now();
    const dt = t1 - t0;
    avgDetectMs = avgDetectMs * 0.85 + dt * 0.15;
    detectIntervalMs = clamp(avgDetectMs * 1.15, TRACK.minIntervalMs, TRACK.maxIntervalMs);

    ensureOverlaySize();

    if (!detection) {
      // если лицо потерялось — очищаем через небольшой таймаут (чтобы не мигало)
      if (performance.now() - lastSeenAt > 450) {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
      return;
    }

    lastSeenAt = performance.now();

    const resized = faceapi.resizeResults(detection, {
      width: overlay.width,
      height: overlay.height,
    });

    const box = resized?.detection?.box || null;
    const points = resized?.landmarks?.positions || null;

    const sb = smoothUpdateBox(box);
    const sp = smoothUpdateLandmarks(points);

    const faceScore = resized?.detection?.score ?? detection?.detection?.score ?? 0;

    // Контроль качества кадра: если условия плохие — даём подсказку и не обновляем эмоцию
    const q = assessFrameQuality({ box: sb, points: sp, faceScore });
    const qNow = performance.now();
    if (!q.ok) {
      lastQualityHint = { text: q.hint, level: 'warn', until: qNow + QUALITY.stickMs };
      setVideoHint(q.hint, 'warn');
      // Блокируем действия только при критических проблемах
      if (q.block) {
        if (practiceHint) practiceHint.textContent = 'Улучшите качество кадра (свет/центр/расстояние) — затем можно пройти тест.';
        if (startPracticeBtn) {
          startPracticeBtn.disabled = true;
          startPracticeBtn.title = 'Улучшите качество кадра, чтобы продолжить.';
        }
      }
    } else {
      // Держим предупреждение немного дольше, чтобы не мигало
      if (lastQualityHint?.until && lastQualityHint.until > qNow) {
        setVideoHint(lastQualityHint.text, lastQualityHint.level);
      } else {
        setVideoHint(q.hint, 'ok');
      }
    }

    const label = stableEmotion
      ? `LIVE • ${emotionDisplayName(stableEmotion)} • ${formatPct(stableConfidence)}`
      : (!q.ok ? 'CHECK • качество кадра' : null);

    renderOverlay({ box: sb, points: sp, label });

    // Если качество критически плохое — не обновляем профиль эмоций (чтобы не "уверенно" ошибаться)
    if (!q.ok && q.block) {
      return;
    }

    // Этап 3: собираем профиль из нескольких измерений
    pushExpressionSample(detection.expressions, faceScore);
    const averaged = computeAveragedProfile() || detection.expressions;

    const changed = updateStableEmotion(averaged, faceScore);
    if (stableEmotion) {
      currentEmotion = stableEmotion;
      // Кнопка «Начать практику» видна всегда, но активируется только после определения эмоции.
      if (startPracticeBtn) {
        startPracticeBtn.disabled = false;
        startPracticeBtn.title = '';
      }
      if (practiceHint) {
        practiceHint.textContent = 'Эмоция определена — нажмите «Пройти тест», чтобы подобрать практику.';
      }
      // Обновляем набор практик только при смене стабильной эмоции (или при первом появлении списка)
      if (changed || (practiceList && practiceList.children.length === 0)) {
        renderPracticeUIOptions(stableEmotion);
      }
      // Обновляем визуальную тему в зависимости от стабильной эмоции
      setEmotionTheme(stableEmotion);
      // Формируем отображение: эмодзи + подпись. Разделяем строки через <br> для корректного форматирования.
      const emoji = emotionIcons[stableEmotion] || '';
      const labelText = `Сейчас: ${translateEmotion(stableEmotion)} (оценка уверенности модели ${formatPct(stableConfidence)})`;
      const details = formatTopEmotions(emotionProfile);
      emotionResult.innerHTML = `<span class="emotion-emoji">${emoji}</span><span>${labelText}</span><br>${details}`;
    }

    // (overlay уже отрисован выше)
  } catch (err) {
    console.error('Realtime detect error:', err);
  } finally {
    detectInFlight = false;
  }
}

function trackingLoop() {
  if (!trackingRunning) return;

  // Трекаем только когда главная открыта (экономим ресурсы)
  if (homeSection.classList.contains('hidden')) {
    stopTracking(true);
    return;
  }

  // Пауза, если вкладка скрыта
  if (document.hidden) {
    stopTracking(true);
    return;
  }

  const now = performance.now();
  if (now - lastDetectAt >= detectIntervalMs) {
    lastDetectAt = now;
    void doRealtimeDetect();
  }

  trackingRafId = requestAnimationFrame(trackingLoop);
}

// =========================
// Ручной «снимок» (кнопка)
// =========================
async function detectEmotionOnceAccurate() {
  if (!modelsReady) {
    emotionResult.innerText = 'Модели распознавания не загружены. Проверьте интернет и обновите страницу.';
    return;
  }
  emotionResult.innerText = 'Анализируем…';
  if (startPracticeBtn) {
    startPracticeBtn.disabled = true;
    startPracticeBtn.title = 'Анализируем…';
  }
  if (practiceHint) {
    practiceHint.textContent = 'Анализируем эмоцию…';
  }
  currentEmotion = null;

  try {
    const detection = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detection) {
      emotionResult.innerText = 'Лицо не найдено. Попробуйте ещё раз.';
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }

    ensureOverlaySize();
    const resized = faceapi.resizeResults(detection, {
      width: overlay.width,
      height: overlay.height,
    });

    const box = resized?.detection?.box || null;
    const points = resized?.landmarks?.positions || null;
    const sb = smoothUpdateBox(box);
    const sp = smoothUpdateLandmarks(points);
    const faceScore = resized?.detection?.score ?? detection?.detection?.score ?? 0;

    // Контроль качества кадра для «снимка»: если критично плохо — просим улучшить условия
    const q = assessFrameQuality({ box: sb, points: sp, faceScore });
    if (!q.ok) {
      lastQualityHint = { text: q.hint, level: 'warn', until: performance.now() + QUALITY.stickMs };
      setVideoHint(q.hint, 'warn');
    }
    if (!q.ok && q.block) {
      renderOverlay({ box: sb, points: sp, label: 'SNAP • CHECK • качество кадра' });
      emotionResult.innerText = 'Качество кадра низкое. Улучшите свет/центр/расстояние и попробуйте ещё раз.';
      if (practiceHint) practiceHint.textContent = 'Сделайте кадр лучше (свет/центр/расстояние) — затем повторите снимок.';
      if (startPracticeBtn) {
        startPracticeBtn.disabled = true;
        startPracticeBtn.title = 'Улучшите качество кадра, чтобы продолжить.';
      }
      return;
    }

    // Этап 3: профиль по «снимку» (и синхронизация с realtime профилем)
    expressionSamples = [];
    smoothExpressions = null;
    pushExpressionSample(detection.expressions, faceScore);
    const averaged = computeAveragedProfile() || detection.expressions;
    const best = getBestEmotion(averaged);
    currentEmotion = best.emotion;

    // синхронизируем realtime состояние, чтобы не «скакало»
    stableEmotion = best.emotion;
    stableProb = best.prob;
    // вычисляем профиль и уверенность
    const smoothed = smoothUpdateExpressions(averaged);
    emotionProfile = { ...smoothed };
    const metrics = computeEmotionMetrics(smoothed, faceScore);
    stableConfidence = metrics.confidence;
    stableMargin = metrics.margin;
    candidateEmotion = best.emotion;
    candidateSince = performance.now();

    const label = `SNAP • ${emotionDisplayName(best.emotion)} • ${formatPct(stableConfidence)}`;
    renderOverlay({ box: sb, points: sp, label });

    // Обновляем цветовую тему и выводим эмоцию с эмодзи
    setEmotionTheme(best.emotion);
    const emoji = emotionIcons[best.emotion] || '';
    const mainLine = `Вы выглядите: ${translateEmotion(best.emotion)} (оценка уверенности модели ${formatPct(stableConfidence)})`;
    const detailsLine = formatTopEmotions(emotionProfile);
    emotionResult.innerHTML = `<span class="emotion-emoji">${emoji}</span><span>${mainLine}</span><br>${detailsLine}`;
    if (startPracticeBtn) {
      startPracticeBtn.disabled = false;
      startPracticeBtn.title = '';
    }
    if (practiceHint) {
      practiceHint.textContent = 'Эмоция определена — нажмите «Пройти тест», чтобы подобрать практику.';
    }
    renderPracticeUIOptions(best.emotion);
  } catch (err) {
    console.error('Ошибка распознавания:', err);
    emotionResult.innerText = 'Произошла ошибка распознавания.';
  }
}

// =========================
// Практики
// =========================
// Несколько практик, зависящих от текущего настроения.
// Формат:
// - mode: 'breath' — дыхательная анимация по фазам
// - mode: 'guided' — пошаговая практика с подсказками

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

const PRACTICES = {
  breath_4_2_6: {
    title: 'Дыхание 4–2–6 (сброс напряжения)',
    short: 'Снижает тревожность и «накал» за 2 минуты.',
    description: 'Вдох 4 • Пауза 2 • Выдох 6. Следуйте подсказкам и ритму круга.',
    tags: ['calm','de-escalate'],
    hasBreathHolds: true,
    caution: 'Дышите мягко. Если кружится голова или неприятно — остановитесь и сделайте 2 обычных вдоха-выдоха.',
    durationSec: 120,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 4, prompt: 'Вдох', coach: 'Вдох через нос…', s0: 0.86, s1: 1.06 },
      { name: 'hold', seconds: 2, prompt: 'Пауза', coach: 'Небольшая пауза…', s0: 1.06, s1: 1.06 },
      { name: 'exhale', seconds: 6, prompt: 'Выдох', coach: 'Медленный выдох…', s0: 1.06, s1: 0.82 },
    ],
    steps: [
      'Сядьте ровно, плечи опустите, челюсть расслабьте.',
      'Дышите через нос. Выдох делайте мягким и длинным.',
      'Если кружится голова — сократите вдох до 3 и выдох до 4–5.',
    ],
  },
  box_4: {
    title: 'Квадратное дыхание 4–4–4–4',
    short: 'Выравнивает состояние и концентрацию.',
    description: 'Вдох 4 • Пауза 4 • Выдох 4 • Пауза 4. Идеально для нейтрального состояния.',
    tags: ['balance','focus'],
    hasBreathHolds: true,
    caution: 'Если задержки усиливают дискомфорт — уменьшите паузы до 2 сек или делайте без пауз.',
    durationSec: 120,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 4, prompt: 'Вдох', coach: 'Спокойный вдох…', s0: 0.88, s1: 1.05 },
      { name: 'hold1', seconds: 4, prompt: 'Пауза', coach: 'Держим мягко…', s0: 1.05, s1: 1.05 },
      { name: 'exhale', seconds: 4, prompt: 'Выдох', coach: 'Ровный выдох…', s0: 1.05, s1: 0.88 },
      { name: 'hold2', seconds: 4, prompt: 'Пауза', coach: 'Нейтральная пауза…', s0: 0.88, s1: 0.88 },
    ],
    steps: [
      'Смотрите в одну точку или закройте глаза.',
      'Не ускоряйтесь. Лучше медленнее, но ровнее.',
      'Если тяжело — делайте 3–3–3–3.',
    ],
  },
  grounding_54321: {
    title: 'Заземление 5–4–3–2–1',
    short: 'Возвращает в «здесь и сейчас» при тревоге/стрессе.',
    description: 'Пошаговая практика внимания: зрение, осязание, слух, запах, вкус.',
    tags: ['grounding','anxiety'],
    hasBreathHolds: false,
    caution: 'Если накрывает тревога — делайте шаги медленно и мягко возвращайте внимание к опоре (стопы, спина).',
    durationSec: 150,
    mode: 'guided',
    timeline: [
      { seconds: 30, prompt: '5 предметов', coach: 'Назовите 5 вещей, которые видите.' },
      { seconds: 30, prompt: '4 ощущения', coach: '4 вещи, которые ощущаете телом (опора, одежда…).' },
      { seconds: 30, prompt: '3 звука', coach: '3 звука вокруг вас (даже очень тихих).' },
      { seconds: 30, prompt: '2 запаха', coach: '2 запаха. Если нет — представьте приятный.' },
      { seconds: 30, prompt: '1 вкус', coach: '1 вкус или ощущение во рту. Сделайте мягкий выдох.' },
    ],
    steps: [
      'Поставьте стопы на пол и слегка надавите ими в опору.',
      'Выполняйте шаги не спеша, проговаривая про себя.',
      'В конце сделайте 2 медленных вдоха и выдоха.',
    ],
  },
  gratitude_60: {
    title: 'Мини‑медитация благодарности (60 сек)',
    short: 'Поддерживает позитив и снижает внутренний шум.',
    description: 'Найдите 3 небольшие вещи, за которые вы благодарны прямо сейчас.',
    tags: ['uplift','resource'],
    hasBreathHolds: false,
    caution: 'Если трудно почувствовать благодарность — выберите нейтральные вещи (тепло, вода, еда) — это нормально.',
    durationSec: 60,
    mode: 'guided',
    timeline: [
      { seconds: 20, prompt: '1 вещь', coach: 'Подумайте об одной хорошей мелочи за сегодня.' },
      { seconds: 20, prompt: '2 вещь', coach: 'Теперь ещё одну — даже совсем маленькую.' },
      { seconds: 20, prompt: '3 вещь', coach: 'И третью. Скажите себе: «я замечаю хорошее».' },
    ],
    steps: [
      'Сделайте один глубокий вдох и длинный выдох.',
      'Произнесите мысленно 3 пункта благодарности.',
      'В конце улыбнитесь (даже чуть‑чуть) — это «закрепляет» состояние.',
    ],
  },

  // Новые практики для расширения каталога
  alt_nostril_5min: {
    title: 'Чередование ноздрей (5 мин)',
    short: 'Стабилизирует дыхание и успокаивает ум.',
    description: 'Попеременное закрывание ноздрей: вдох правой – выдох левой, вдох левой – выдох правой.',
    tags: ['calm','focus'],
    hasBreathHolds: false,
    caution: 'Не форсируйте вдохи; если неудобно — пробуйте без задержек.',
    durationSec: 300,
    mode: 'guided',
    timeline: [
      { seconds: 60, prompt: 'Правая→левая', coach: 'Закройте правую ноздрю, вдох левой; затем закройте левую и выдохните правой.' },
      { seconds: 60, prompt: 'Левая→правая', coach: 'Закройте левую ноздрю, вдох правой; затем закройте правую и выдохните левой.' },
      { seconds: 60, prompt: 'Повтор', coach: 'Продолжайте чередовать ноздри, мягко и без усилий.' },
      { seconds: 60, prompt: 'Спокойный ритм', coach: 'Замедлите темп, делая дыхание плавным.' },
      { seconds: 60, prompt: 'Финал', coach: 'Сделайте несколько обычных вдохов, ощутите стабилизацию дыхания.' },
    ],
    steps: [
      'Сядьте с прямой спиной и расслабьте плечи.',
      'Используйте большой и безымянный пальцы для закрывания ноздрей.',
      'Не форсируйте дыхание; если неудобно, дышите без задержек.',
    ],
  },
  progressive_relaxation_5: {
    title: 'Прогрессивная релаксация (5 мин)',
    short: 'Снимает телесное напряжение через поочерёдное расслабление.',
    description: 'Напряжение–расслабление разных мышц тела.',
    tags: ['relax','body'],
    hasBreathHolds: false,
    caution: 'Не напрягайте мышцы слишком сильно; при дискомфорте прекращайте.',
    durationSec: 300,
    mode: 'guided',
    timeline: [
      { seconds: 60, prompt: 'Стопы и ноги', coach: 'Напрягите и расслабьте стопы, икры и бедра.' },
      { seconds: 60, prompt: 'Живот и спина', coach: 'Напрягите и расслабьте живот, поясницу и плечи.' },
      { seconds: 60, prompt: 'Руки', coach: 'Сожмите кулаки, затем расслабьте руки и запястья.' },
      { seconds: 60, prompt: 'Лицо', coach: 'Напрягите лоб, губы, затем расслабьте все мышцы лица.' },
      { seconds: 60, prompt: 'Полное расслабление', coach: 'Ощутите, как всё тело становится тяжёлым и расслабленным.' },
    ],
    steps: [
      'Лягте или сядьте удобно, закройте глаза.',
      'Напрягайте каждую группу мышц примерно на 5 секунд, затем расслабляйте на 15 секунд.',
      'Дышите ровно и глубоко на протяжении всей практики.',
    ],
  },
  body_scan_3: {
    title: 'Боди‑скан (3 мин)',
    short: 'Осознавание тела с головы до пят.',
    description: 'Постепенное внимательное сканирование частей тела.',
    tags: ['awareness','anxiety'],
    hasBreathHolds: false,
    caution: 'Если появляются неприятные ощущения, не задерживайтесь на них — переходите дальше.',
    durationSec: 180,
    mode: 'guided',
    timeline: [
      { seconds: 60, prompt: 'Голова и шея', coach: 'Отметьте ощущения в голове, лице, шее.' },
      { seconds: 60, prompt: 'Туловище', coach: 'Переключите внимание на грудь, живот, спину.' },
      { seconds: 60, prompt: 'Руки и ноги', coach: 'Пройдите вниманием по рукам, ногам до кончиков пальцев.' },
    ],
    steps: [
      'Примите удобную позу, закройте глаза.',
      'Медленно перемещайте внимание по телу, отмечая ощущения без оценки.',
      'Не пытайтесь изменить то, что ощущаете — просто наблюдайте.',
    ],
  },
  energizing_breath_3_1_3: {
    title: 'Активирующее дыхание 3–1–3',
    short: 'Наполняет энергией через равномерные циклы.',
    description: 'Вдох 3 • Пауза 1 • Выдох 3. Идеально, когда нужна бодрость.',
    tags: ['energy','activating'],
    hasBreathHolds: true,
    caution: 'Если кружится голова — сократите цикл до 2–1–2 или просто дышите без задержек.',
    durationSec: 180,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 3, prompt: 'Вдох', coach: 'Вдох носом на 3 секунды…', s0: 0.85, s1: 1.05 },
      { name: 'hold', seconds: 1, prompt: 'Пауза', coach: 'Короткая пауза…', s0: 1.05, s1: 1.05 },
      { name: 'exhale', seconds: 3, prompt: 'Выдох', coach: 'Выдох через рот на 3 секунды…', s0: 1.05, s1: 0.85 },
    ],
    steps: [
      'Сядьте ровно, разведите плечи.',
      'Вдохните на 3 секунды через нос, затем сделайте паузу на 1 секунду.',
      'Выдохните на 3 секунды. Повторяйте плавно.',
    ],
  },
  focus_attention_5: {
    title: 'Фокус внимания (5 мин)',
    short: 'Развивает концентрацию на одном объекте.',
    description: 'Выберите точку или звук и удерживайте внимание на нём.',
    tags: ['focus','mindfulness'],
    hasBreathHolds: false,
    caution: 'Если ум отвлекается — мягко возвращайте внимание без осуждения.',
    durationSec: 300,
    mode: 'guided',
    timeline: [
      { seconds: 120, prompt: 'Визуальный фокус', coach: 'Сосредоточьтесь взглядом на одной точке перед собой.' },
      { seconds: 120, prompt: 'Слуховой фокус', coach: 'Слушайте один звук, не отвлекаясь на другие.' },
      { seconds: 60, prompt: 'Ощущения', coach: 'Перенесите фокус на дыхание и телесные ощущения.' },
    ],
    steps: [
      'Сядьте удобно, выпрямите спину.',
      'Выберите объект для концентрации (точку, звук, дыхание).',
      'При отвлечении мягко возвращайтесь к выбранному объекту.',
    ],
  },
  self_compassion_3: {
    title: 'Самосострадание (3 мин)',
    short: 'Укрепляет поддержку и принятие себя.',
    description: 'Практика мягкого отношения к себе.',
    tags: ['emotional','support'],
    hasBreathHolds: false,
    caution: 'Если возникают сильные эмоции — просто замедлите дыхание и обратитесь к себе с добротой.',
    durationSec: 180,
    mode: 'guided',
    timeline: [
      { seconds: 60, prompt: 'Осознание', coach: 'Отметьте свои эмоции и скажите: «Это нормально, что я так себя чувствую».' },
      { seconds: 60, prompt: 'Доброта', coach: 'Скажите себе: «Пусть я буду добр(а) к себе».' },
      { seconds: 60, prompt: 'Поддержка', coach: 'Пожелайте себе поддержки и спокойствия.' },
    ],
    steps: [
      'Сядьте удобно, руки положите на сердце или колени.',
      'Признайте свои чувства без осуждения.',
      'Повторяйте фразы мягким внутренним голосом.',
    ],
  },
  visualization_light_5: {
    title: 'Визуализация света (5 мин)',
    short: 'Наполняет теплой энергией через образ света.',
    description: 'Представьте тёплый свет, который наполняет вас и возвращает ресурс.',
    tags: ['uplift','resource'],
    hasBreathHolds: false,
    caution: 'Если сложно визуализировать — просто ощущайте тепло и покой.',
    durationSec: 300,
    mode: 'guided',
    timeline: [
      { seconds: 120, prompt: 'Свет над вами', coach: 'Представьте теплый луч света над головой.' },
      { seconds: 120, prompt: 'Свет в груди', coach: 'Чувствуйте, как свет проходит через тело к сердцу.' },
      { seconds: 60, prompt: 'Наполнение', coach: 'Пусть тепло распространяется по всему телу.' },
    ],
    steps: [
      'Закройте глаза и расслабьтесь.',
      'Представьте теплый свет над головой, направьте его в грудь.',
      'Ощутите, как свет наполняет все части тела.',
    ],
  },
  stretch_break_2: {
    title: 'Растяжка (2 мин)',
    short: 'Активирует мышцы и улучшает кровообращение.',
    description: 'Несколько простых движений для расслабления спины и шеи.',
    tags: ['body','energy'],
    hasBreathHolds: false,
    caution: 'Не доводите до боли; растягивайтесь мягко.',
    durationSec: 120,
    mode: 'guided',
    timeline: [
      { seconds: 30, prompt: 'Вращение плеч', coach: 'Сделайте круговые движения плечами вперёд и назад.' },
      { seconds: 30, prompt: 'Наклоны головы', coach: 'Медленно наклоняйте голову в стороны, растягивая шею.' },
      { seconds: 30, prompt: 'Повороты корпуса', coach: 'Поверните корпус влево и вправо, удерживая таз неподвижным.' },
      { seconds: 30, prompt: 'Вытяжение', coach: 'Потянитесь вверх, затем расслабьтесь, чувствуя лёгкость.' },
    ],
    steps: [
      'Встаньте или сядьте ровно, ноги на ширине плеч.',
      'Выполняйте движения плавно, без резких рывков.',
      'Дышите свободно и не напрягайтесь.',
    ],
  },

  // =========================
  // Быстрая помощь (30–60 сек)
  // =========================
  quick_exhale_40: {
    title: 'Длинный выдох (40 сек)',
    short: 'Быстро снижает тревогу и напряжение.',
    description: 'Простой ритм: вдох 3 секунды → длинный выдох 5 секунд.',
    tags: ['quick','anxiety'],
    hasBreathHolds: false,
    caution: 'Если кружится голова — дышите мягче и чуть короче.',
    durationSec: 40,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 3, prompt: 'Вдох', coach: 'Вдох носом…', s0: 0.85, s1: 1.05 },
      { name: 'exhale', seconds: 5, prompt: 'Выдох', coach: 'Длинный выдох через рот…', s0: 1.05, s1: 0.85 },
    ],
    steps: [
      'Сядьте удобно, расслабьте плечи.',
      'Следуйте ритму: вдох 3, выдох 5.',
      'На выдохе отпускайте напряжение.',
    ],
  },
  quick_box_30: {
    title: 'Квадрат (30 сек)',
    short: 'Универсальный быстрый стабилизатор.',
    description: 'Ритм 2–2–2–2: вдох → пауза → выдох → пауза.',
    tags: ['quick','stable'],
    hasBreathHolds: true,
    caution: 'Если задержки неприятны — делайте без пауз, просто ровно.',
    durationSec: 30,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 2, prompt: 'Вдох', coach: 'Вдох…', s0: 0.85, s1: 1.05 },
      { name: 'hold', seconds: 2, prompt: 'Пауза', coach: 'Маленькая пауза…', s0: 1.05, s1: 1.05 },
      { name: 'exhale', seconds: 2, prompt: 'Выдох', coach: 'Выдох…', s0: 1.05, s1: 0.85 },
      { name: 'hold', seconds: 2, prompt: 'Пауза', coach: 'Пауза…', s0: 0.85, s1: 0.85 },
    ],
    steps: [
      'Следуйте квадрату: вдох 2, пауза 2, выдох 2, пауза 2.',
      'Дышите мягко, без усилия.',
    ],
  },
  quick_energy_30: {
    title: 'Мягкая активация (30 сек)',
    short: 'Помогает собрать энергию и внимание.',
    description: 'Ритм 2–0–2: вдох 2 → выдох 2, без задержек.',
    tags: ['quick','energy'],
    hasBreathHolds: false,
    caution: 'Если хочется медленнее — делайте 3–0–3.',
    durationSec: 30,
    mode: 'breath',
    pattern: [
      { name: 'inhale', seconds: 2, prompt: 'Вдох', coach: 'Вдох…', s0: 0.85, s1: 1.03 },
      { name: 'exhale', seconds: 2, prompt: 'Выдох', coach: 'Выдох…', s0: 1.03, s1: 0.85 },
    ],
    steps: [
      'Сядьте ровно, расправьте плечи.',
      'Вдох 2 — выдох 2, чуть бодрее обычного.',
    ],
  },
  quick_grounding_60: {
    title: 'Заземление (60 сек)',
    short: 'Снимает перегруз и возвращает в «здесь и сейчас».',
    description: 'Упрощённое 3–2–1: 3 увидеть, 2 почувствовать, 1 выдох.',
    tags: ['quick','grounding'],
    hasBreathHolds: false,
    caution: 'Делайте шаги медленно и мягко.',
    durationSec: 60,
    mode: 'guided',
    timeline: [
      { seconds: 20, prompt: '3 вещи', coach: 'Найдите глазами 3 предмета вокруг.' },
      { seconds: 20, prompt: '2 ощущения', coach: 'Почувствуйте 2 точки опоры: стопы, спина, ладони.' },
      { seconds: 20, prompt: '1 выдох', coach: 'Сделайте длинный выдох и отметьте, что вы здесь.' },
    ],
    steps: [
      'Осмотритесь: назовите 3 вещи.',
      'Отметьте 2 ощущения в теле.',
      'Сделайте 1 длинный выдох.',
    ],
  },
};

function getPracticeIdsForEmotion(emotion) {
  switch (emotion) {
    case 'angry':
      // При раздражении рекомендуем практики на снятие телесного напряжения и длинный выдох
      return ['progressive_relaxation_5', 'breath_4_2_6', 'grounding_54321'];
    case 'fearful':
    case 'surprised':
      // При страхе и удивлении важно заземление и стабилизация дыхания
      return ['grounding_54321', 'alt_nostril_5min', 'breath_4_2_6'];
    case 'disgusted':
      // Отвращение часто сопровождается напряжением — помогаем снять его
      return ['progressive_relaxation_5', 'breath_4_2_6', 'grounding_54321'];
    case 'sad':
      // При грусти важно мягкое принятие и поддержка
      return ['self_compassion_3', 'box_4', 'visualization_light_5'];
    case 'happy':
      // При позитиве можно закрепить состояние визуализацией и благодарностью
      return ['visualization_light_5', 'gratitude_60', 'box_4'];
    case 'neutral':
    default:
      // Для нейтрального состояния подойдёт фокус, дыхание и благодарность
      return ['focus_attention_5', 'box_4', 'breath_4_2_6'];
  }
}

let recommendedPracticeId = 'box_4';
let activePracticeId = null;

// Runtime-подготовка практики (чтобы не считать reduce/поиск фаз каждый кадр)
let activePracticeRuntime = null;

// Кэш последнего отрисованного состояния практики (минимизируем DOM-обновления)
const PRACTICE_UI = {
  lastTimerSec: null,
  lastPrompt: null,
  lastCoach: null,
  lastScale: null,
  lastUiTs: 0,
  lastPhaseIndex: -1,
  lastSegIndex: -1,
  prevCycleTSec: 0,
};

function setText(el, text) {
  if (!el) return;
  const t = String(text ?? '');
  if (el.textContent !== t) el.textContent = t;
}

function preparePracticeRuntime(p) {
  if (!p) return null;
  if (p.mode === 'breath') {
    let cycleSec = 0;
    const ends = [];
    const phases = Array.isArray(p.pattern) ? p.pattern : [];
    for (const ph of phases) {
      const s = Number(ph?.seconds) || 0;
      cycleSec += s;
      ends.push(cycleSec);
    }
    return {
      mode: 'breath',
      durationSec: Number(p.durationSec) || 0,
      phases,
      cycleSec: Math.max(0.001, cycleSec),
      phaseEnds: ends,
    };
  }

  // guided
  let totalSec = 0;
  const ends = [];
  const segments = Array.isArray(p.timeline) ? p.timeline : [];
  for (const seg of segments) {
    const s = Number(seg?.seconds) || 0;
    totalSec += s;
    ends.push(totalSec);
  }
  return {
    mode: 'guided',
    durationSec: Number(p.durationSec) || 0,
    segments,
    totalSec: Math.max(0.001, totalSec),
    segEnds: ends,
  };
}

let practiceRunning = false;
let practiceStartTs = 0;
let practiceElapsedMs = 0;
let practiceRaf = null;
let musicOn = false;

function stopPracticeLoop() {
  if (practiceRaf) cancelAnimationFrame(practiceRaf);
  practiceRaf = null;
  practiceRunning = false;
}

function setCircleScale(scale) {
  if (!breathCircle) return;
  const s = Number(scale);
  if (!Number.isFinite(s)) return;
  // не трогаем DOM, если изменение микроскопическое
  if (Number.isFinite(PRACTICE_UI.lastScale) && Math.abs(PRACTICE_UI.lastScale - s) < 0.002) return;
  PRACTICE_UI.lastScale = s;
  breathCircle.style.setProperty('--scale', String(s));
}

function renderPracticeUIOptions(emotion) {
  const ids = getPracticeIdsForEmotion(emotion);
  recommendedPracticeId = ids[0];
  // Этап 1: на главной экран рекомендации не показываем.
  // Обновляем только список вариантов на экране практики.
  if (practiceList) {
    practiceList.innerHTML = '';
    ids.forEach((id, idx) => {
      const p = PRACTICES[id];
      if (!p) return;
      const btn = document.createElement('button');
      btn.className = idx === 0 ? 'primary' : 'ghost';
      btn.textContent = idx === 0 ? `★ ${p.title}` : p.title;
      btn.addEventListener('click', () => loadPractice(id, false));
      practiceList.appendChild(btn);
    });
  }
}

function renderPracticeSteps(id) {
  if (!practiceSteps) return;
  const p = PRACTICES[id];
  practiceSteps.innerHTML = '';
  (p?.steps || []).forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    practiceSteps.appendChild(li);
  });
}

function loadPractice(id, autoStart = false) {
  const p = PRACTICES[id];
  if (!p) return;

  // новая сессия практики (для одноразовой обратной связи)
  activeSessionId = newSessionId();
  // сбрасываем UI обратной связи
  [
    [quickFbGood, quickFbNeutral, quickFbBad],
    [recFbGood, recFbNeutral, recFbBad],
  ].forEach(([a, b, c]) => {
    [a, b, c].forEach((btn) => {
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('disabled');
    });
  });
  if (quickFbStatus) quickFbStatus.textContent = '';
  if (recFbStatus) recFbStatus.textContent = '';

  activePracticeId = id;
  currentPracticeType = id;

  // Подготовка runtime-структур (фазы/таймлайн) и сброс кэшей UI
  activePracticeRuntime = preparePracticeRuntime(p);
  PRACTICE_UI.lastTimerSec = null;
  PRACTICE_UI.lastPrompt = null;
  PRACTICE_UI.lastCoach = null;
  PRACTICE_UI.lastUiTs = 0;
  PRACTICE_UI.lastPhaseIndex = -1;
  PRACTICE_UI.lastSegIndex = -1;
  PRACTICE_UI.prevCycleTSec = 0;
  PRACTICE_UI.lastScale = null;

  setText(practiceTitle, p.title);
  setText(practiceDescription, p.description);
  renderPracticeSteps(id);

  setText(practicePrompt, 'Подготовьтесь…');
  setText(practiceCoachLine, 'Сядьте удобно, расслабьте плечи.');
  setText(practiceTimer, formatTime(p.durationSec));
  setCircleScale(0.92);

  practiceElapsedMs = 0;
  stopPracticeLoop();
  setText(practiceStartPauseBtn, 'Начать');

  // музыка
  if (musicPlayer) {
    // не принуждаем загрузку — браузер подтянет по требованию
    musicPlayer.preload = 'none';
    musicPlayer.loop = true;
    // сравнение по подстроке, потому что src становится абсолютным URL
    if (!String(musicPlayer.src || '').includes('calm.wav')) {
      musicPlayer.src = 'calm.wav';
    }
  }
  setMusic(false);

  if (autoStart) startOrResumePractice();
}

function setMusic(on) {
  musicOn = on;
  if (!musicPlayer) return;
  if (musicOn) {
    musicPlayer.volume = 0.6;
    musicPlayer.play().catch(() => {});
  } else {
    musicPlayer.pause();
  }
  setText(practiceMusicBtn, `Музыка: ${musicOn ? 'вкл' : 'выкл'}`);
}

function startOrResumePractice() {
  if (!activePracticeId) return;
  if (practiceRunning) return;
  practiceRunning = true;
  practiceStartTs = performance.now();
  setText(practiceStartPauseBtn, 'Пауза');
  document.body.classList.add('relax-bg');
  // чтобы первая отрисовка не ждала троттлинга
  PRACTICE_UI.lastUiTs = 0;
  practiceRaf = requestAnimationFrame(practiceLoop);
}

function pausePractice() {
  if (!practiceRunning) return;
  practiceRunning = false;
  setText(practiceStartPauseBtn, 'Продолжить');
}

function togglePracticeStartPause() {
  if (!activePracticeId) return;
  if (practiceRunning) pausePractice();
  else startOrResumePractice();
}

function practiceLoop(ts) {
  if (!practiceRunning || !activePracticeId) return;
  const p = PRACTICES[activePracticeId];
  const rt = activePracticeRuntime || preparePracticeRuntime(p);

  const dt = ts - practiceStartTs;
  practiceStartTs = ts;
  practiceElapsedMs += dt;

  const elapsedSec = practiceElapsedMs / 1000;
  const durationSec = Number(rt?.durationSec ?? p?.durationSec ?? 0) || 0;
  const remaining = Math.max(0, durationSec - elapsedSec);

  // Таймер обновляем 1 раз в секунду (а не каждый кадр)
  const remFloor = Math.floor(remaining);
  if (PRACTICE_UI.lastTimerSec !== remFloor) {
    PRACTICE_UI.lastTimerSec = remFloor;
    setText(practiceTimer, formatTime(remaining));
  }

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canAnimate = !reducedMotion;

  // Троттлинг визуала до ~30fps
  const allowUiFrame = (ts - PRACTICE_UI.lastUiTs) >= 33;

  // --- визуальная анимация + подсказки ---
  if (rt && rt.mode === 'breath') {
    const phases = rt.phases || [];
    const ends = rt.phaseEnds || [];
    const cycleSec = rt.cycleSec || 1;
    if (phases.length) {
      const tCycle = elapsedSec % cycleSec;
      // если произошёл переход через 0 в цикле — сбрасываем индекс
      if (tCycle < (PRACTICE_UI.prevCycleTSec || 0)) {
        PRACTICE_UI.lastPhaseIndex = 0;
      }
      PRACTICE_UI.prevCycleTSec = tCycle;

      let idx = PRACTICE_UI.lastPhaseIndex;
      if (!Number.isInteger(idx) || idx < 0 || idx >= phases.length) idx = 0;

      // продвигаем индекс вперёд без полного перебора массива
      while (idx < ends.length && tCycle >= ends[idx]) idx += 1;
      if (idx >= phases.length) idx = phases.length - 1;

      const idxChanged = idx !== PRACTICE_UI.lastPhaseIndex;
      if (idxChanged) PRACTICE_UI.lastPhaseIndex = idx;

      const phase = phases[idx] || phases[phases.length - 1];

      // Тексты обновляем только при смене фазы или по троттлингу
      if (idxChanged || allowUiFrame) {
        setText(practicePrompt, phase?.prompt || '');
        setText(practiceCoachLine, phase?.coach || '');
      }

      // Масштаб круга — только если можно анимировать и не чаще 30fps
      if (canAnimate && (idxChanged || allowUiFrame)) {
        const start = idx === 0 ? 0 : (ends[idx - 1] || 0);
        const dur = Math.max(0.001, Number(phase?.seconds) || 0.001);
        const local = clamp((tCycle - start) / dur, 0, 1);
        const e = easeInOutSine(local);
        const s0 = Number(phase?.s0);
        const s1 = Number(phase?.s1);
        const from = Number.isFinite(s0) ? s0 : 0.92;
        const to = Number.isFinite(s1) ? s1 : 0.92;
        const scale = from + (to - from) * e;
        setCircleScale(scale);
        PRACTICE_UI.lastUiTs = ts;
      } else if (!canAnimate) {
        setCircleScale(0.92);
      }
    }
  } else if (rt && rt.mode === 'guided') {
    const segments = rt.segments || [];
    const ends = rt.segEnds || [];
    if (segments.length) {
      const t = clamp(elapsedSec, 0, rt.totalSec || elapsedSec);
      let idx = PRACTICE_UI.lastSegIndex;
      if (!Number.isInteger(idx) || idx < 0 || idx >= segments.length) idx = 0;
      while (idx < ends.length && t >= ends[idx]) idx += 1;
      if (idx >= segments.length) idx = segments.length - 1;

      const idxChanged = idx !== PRACTICE_UI.lastSegIndex;
      if (idxChanged) PRACTICE_UI.lastSegIndex = idx;

      const seg = segments[idx] || segments[segments.length - 1];
      if (idxChanged || allowUiFrame) {
        setText(practicePrompt, seg?.prompt || '');
        setText(practiceCoachLine, seg?.coach || '');
      }

      if (canAnimate && allowUiFrame) {
        const pulse = 0.92 + 0.03 * Math.sin(elapsedSec * (Math.PI / 3));
        setCircleScale(pulse);
        PRACTICE_UI.lastUiTs = ts;
      } else if (!canAnimate) {
        setCircleScale(0.92);
      }
    }
  }

  // автозавершение
  if (elapsedSec >= durationSec) {
    setText(practicePrompt, 'Готово ✅');
    setText(practiceCoachLine, 'Сделайте последний мягкий выдох и отметьте состояние.');
    pausePractice();
    if (quickHelpMode && quickHelpAfter) {
      quickHelpAfter.classList.remove('hidden');
    }
    return;
  }

  practiceRaf = requestAnimationFrame(practiceLoop);
}

// =========================
// Быстрая помощь (30–60 секунд)
// =========================
function openQuickHelpChooser() {
  hideAllSections();
  if (quickHelpSection) quickHelpSection.classList.remove('hidden');
  stopTracking(true);
}

function chooseQuickPracticeByCamera() {
  const cam = snapshotCameraAssessment();
  // Если нет данных — отправляем в выбор или даём универсальный вариант
  if (!cam || !cam.emotion) {
    return null;
  }
  const { valence, arousal } = computeValenceArousalFromCamera(cam);
  const emo = cam.emotion;

  // Перегруз/тревога: высокая активация
  if (arousal >= 0.7) {
    if (emo === 'fearful' || emo === 'surprised') return 'quick_exhale_40';
    if (emo === 'angry' || emo === 'disgusted') return 'quick_exhale_40';
    return 'quick_grounding_60';
  }
  // Усталость/апатия: низкая активация + негатив
  if (arousal <= 0.35 && valence < -0.1) {
    return 'quick_energy_30';
  }
  // По умолчанию — быстрый стабилизатор
  return 'quick_box_30';
}

function startQuickHelp(practiceId, source = 'manual') {
  quickHelpMode = true;
  quickHelpSource = source;
  assessment = null; // в быстрой помощи не используем поток теста

  document.body.classList.add('quick-mode');
  if (quickHelpAfter) quickHelpAfter.classList.add('hidden');

  // Переходим сразу к практике
  hideAllSections();
  practiceSection.classList.remove('hidden');
  // Варианты практик в quick-режиме не нужны — очищаем
  if (practiceList) practiceList.innerHTML = '';
  loadPractice(practiceId, true);
}

function startQuickHelpAuto() {
  const id = chooseQuickPracticeByCamera();
  if (!id) {
    openQuickHelpChooser();
    return;
  }
  startQuickHelp(id, 'camera');
}

function quickHelpDone() {
  cleanupPracticeTransient();
  hideAllSections();
  setActiveNav('home');
}

function quickHelpToTest() {
  // Возвращаемся на главный экран и запускаем стандартный тест
  cleanupPracticeTransient();
  setActiveNav('home');
  openStateTest();
}

function bindQuickHelpHandlers() {
  if (quickHelpBtn) {
    quickHelpBtn.disabled = false;
    quickHelpBtn.addEventListener('click', startQuickHelpAuto);
  }
  if (qhTension) qhTension.addEventListener('click', () => startQuickHelp('quick_exhale_40', 'manual'));
  if (qhFatigue) qhFatigue.addEventListener('click', () => startQuickHelp('quick_energy_30', 'manual'));
  if (qhOverload) qhOverload.addEventListener('click', () => startQuickHelp('quick_grounding_60', 'manual'));
  if (qhBad) qhBad.addEventListener('click', () => startQuickHelp('quick_box_30', 'manual'));
  if (qhBack) qhBack.addEventListener('click', () => setActiveNav('home'));

  if (quickHelpBetterBtn) quickHelpBetterBtn.addEventListener('click', quickHelpDone);
  if (quickHelpTestBtn) quickHelpTestBtn.addEventListener('click', quickHelpToTest);

  // Мини-обратная связь (необязательная)
  if (quickFbGood) quickFbGood.addEventListener('click', () => {
    const ok = savePracticeFeedback('good', 'quick_after');
    lockFeedbackUI([quickFbGood, quickFbNeutral, quickFbBad], quickFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });
  if (quickFbNeutral) quickFbNeutral.addEventListener('click', () => {
    const ok = savePracticeFeedback('neutral', 'quick_after');
    lockFeedbackUI([quickFbGood, quickFbNeutral, quickFbBad], quickFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });
  if (quickFbBad) quickFbBad.addEventListener('click', () => {
    const ok = savePracticeFeedback('bad', 'quick_after');
    lockFeedbackUI([quickFbGood, quickFbNeutral, quickFbBad], quickFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });
}

// =========================
// Поток продукта: камера → тест → рекомендации → практика
// =========================

// Этап 4: психо‑чек (самоотчёт) — нормализация и понятная интерпретация.
// Шкала 1..5 → 0..1, затем вычисляем два базовых индекса:
//  - Напряжение (stress+anxiety)
//  - Ресурс (energy+mood)
// Расширенный список вопросов теста (стресс, тревога, энергия, настроение, фокус, телесное напряжение, усталость)
const TEST_KEYS = ['stress', 'anxiety', 'energy', 'mood', 'focus', 'body', 'fatigue'];

function isLikert15(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

function normalize15(v) {
  return clamp((v - 1) / 4, 0, 1);
}

function levelLabel(n, { low = 'низкое', mid = 'среднее', high = 'высокое' } = {}) {
  if (!Number.isFinite(n)) return '—';
  if (n < 0.34) return low;
  if (n < 0.67) return mid;
  return high;
}

function computeTestScores(t) {
  if (!t) return null;
  // Собираем сырой профиль для всех вопросов теста
  const raw = {};
  for (const k of TEST_KEYS) {
    const v = t[k];
    if (!isLikert15(v)) return null;
    raw[k] = v;
  }

  // Нормализуем каждую шкалу 1–5 в диапазон [0,1]
  const norm = {};
  for (const k of TEST_KEYS) {
    norm[k] = normalize15(raw[k]);
  }

  // Индексы для итоговых состояний
  // Тension (напряжение) учитывает стресс, тревогу, телесное напряжение и трудности с фокусом
  const tension = clamp((norm.stress + norm.anxiety + norm.body + norm.focus) / 4, 0, 1);
  // Ресурс учитывает энергию, настроение, низкую усталость и способность фокусироваться
  const resource = clamp((norm.energy + norm.mood + (1 - norm.fatigue) + (1 - norm.focus)) / 4, 0, 1);
  // Истощение выше при низкой энергии/настроении, высокой усталости и телесном напряжении
  const depletion = clamp(((1 - norm.energy) + (1 - norm.mood) + norm.fatigue + norm.body) / 4, 0, 1);
  const wellbeing = clamp((1 - tension + resource) / 2, 0, 1);

  return {
    raw,
    norm,
    indices: { tension, resource, depletion, wellbeing },
    levels: {
      tension: levelLabel(tension, { low: 'низкое', mid: 'среднее', high: 'высокое' }),
      resource: levelLabel(resource, { low: 'низкий', mid: 'средний', high: 'высокий' }),
      wellbeing: levelLabel(wellbeing, { low: 'низкое', mid: 'среднее', high: 'высокое' }),
    },
    flags: {
      highTension: tension >= 0.75,
      lowResource: resource <= 0.25,
      lowEnergy: norm.energy <= 0.25,
      lowMood: norm.mood <= 0.25,
    },
  };
}



// =========================
// Этап 5: фьюжн (камера + тест) → итоговое состояние
// =========================
// Приводим эмоции к двум базовым осям:
//  - валентность (−1..+1): негатив ↔ позитив
//  - активация (0..1): низкая ↔ высокая
// Затем объединяем это с индексами теста (напряжение/ресурс) и получаем итоговое состояние.
const EMOTION_VA_MAP = {
  happy:      { valence:  1.0, arousal: 0.55 },
  surprised:  { valence:  0.2, arousal: 0.85 },
  neutral:    { valence:  0.0, arousal: 0.25 },
  sad:        { valence: -0.8, arousal: 0.20 },
  angry:      { valence: -0.8, arousal: 0.85 },
  fearful:    { valence: -0.9, arousal: 0.95 },
  disgusted:  { valence: -0.6, arousal: 0.65 },
};

function to01(x) {
  return clamp(x, 0, 1);
}

function computeValenceArousalFromCamera(camera) {
  const fallbackEmotion = (camera && camera.emotion) ? camera.emotion : 'neutral';
  const profile = camera && camera.profile ? camera.profile : null;

  // Если есть профиль — считаем взвешенное среднее.
  if (profile) {
    let sum = 0;
    let v = 0;
    let a = 0;
    for (const k of EMO_KEYS) {
      const w = Number(profile[k]) || 0;
      if (w <= 0) continue;
      const m = EMOTION_VA_MAP[k] || EMOTION_VA_MAP.neutral;
      sum += w;
      v += w * m.valence;
      a += w * m.arousal;
    }
    if (sum > 0) {
      return { valence: clamp(v / sum, -1, 1), arousal: to01(a / sum) };
    }
  }

  const m = EMOTION_VA_MAP[fallbackEmotion] || EMOTION_VA_MAP.neutral;
  return { valence: clamp(m.valence, -1, 1), arousal: to01(m.arousal) };
}

function fusedStateTitle(key) {
  switch (key) {
    case 'irritation': return 'Раздражение / накал';
    case 'anxiety': return 'Тревожное напряжение';
    case 'high_tension': return 'Высокое напряжение';
    case 'apathy': return 'Усталость / апатия';
    case 'low_mood': return 'Пониженное настроение';
    case 'positive': return 'Позитив / ресурс';
    case 'stable':
    default: return 'Стабильно';
  }
}

function computeFusedState(camera, testScores) {
  if (!camera || !testScores) return null;

  const { valence, arousal } = computeValenceArousalFromCamera(camera);

  const tension = to01(testScores.indices?.tension ?? 0.5);
  const resource = to01(testScores.indices?.resource ?? 0.5);
  const mood = to01(testScores.norm?.mood ?? 0.5);
  const energy = to01(testScores.norm?.energy ?? 0.5);

  const emo = camera.emotion || 'neutral';
  const camConf = Number.isFinite(camera.confidence) ? to01(camera.confidence) : 0.5;

  const neg = valence < -0.2;
  const pos = valence > 0.2;
  const highA = arousal > 0.65;
  const lowA = arousal < 0.35;

  // Согласованность сигналов (насколько камера «сходится» с самооценкой)
  const valence01 = to01((valence + 1) / 2);
  const moodAlign = 1 - Math.abs(valence01 - mood);
  const arousalAlign = 1 - Math.abs(arousal - tension);
  const coherence = to01((moodAlign + arousalAlign) / 2);

  let key = 'stable';
  const why = [];

  // 1) Раздражение / накал (гнев/отвращение + напряжение/высокая активация)
  if ((emo === 'angry' || emo === 'disgusted') && (tension >= 0.55 || highA || testScores.flags?.highTension)) {
    key = 'irritation';
    why.push('мимика ближе к гневу/раздражению');
    if (tension >= 0.55) why.push('по тесту есть напряжение');
  }
  // 2) Тревожное напряжение (страх/удивление + напряжение)
  else if ((testScores.flags?.highTension) || ((emo === 'fearful' || emo === 'surprised') && (tension >= 0.55 || highA))) {
    key = 'anxiety';
    why.push('сигналы похожи на тревогу/высокое возбуждение');
    if (tension >= 0.55) why.push('по тесту напряжение среднее/высокое');
  }
  // 3) Высокое напряжение (тест явно высокий, даже если лицо нейтральное)
  else if (tension >= 0.75) {
    key = 'high_tension';
    why.push('по тесту напряжение высокое');
  }
  // 4) Усталость / апатия (низкий ресурс + низкая активация + негатив/нейтр.)
  else if ((testScores.flags?.lowResource || energy <= 0.25) && lowA && (neg || mood <= 0.4)) {
    key = 'apathy';
    why.push('низкий ресурс/энергия');
    if (lowA) why.push('низкая активация');
  }
  // 5) Пониженное настроение (плохое настроение при не слишком высокой тревоге)
  else if (testScores.flags?.lowMood || (emo === 'sad' && resource <= 0.55)) {
    key = 'low_mood';
    why.push('настроение снижено');
  }
  // 6) Позитив / ресурс
  else if (pos && resource >= 0.55 && tension <= 0.45) {
    key = 'positive';
    why.push('много ресурса и позитивный фон');
  } else {
    key = 'stable';
    why.push('состояние выглядит ровным');
  }

  // Итоговая уверенность: камера + согласованность с тестом.
  const confidence = to01(0.55 * camConf + 0.45 * coherence);

  return {
    key,
    title: fusedStateTitle(key),
    confidence,
    signals: {
      valence,
      arousal,
      tension,
      resource,
      mood,
      energy,
      coherence,
      cameraConfidence: camConf,
    },
    why,
  };
}

function describeFusedStateBrief(f) {
  if (!f) return '';
  const conf = Number.isFinite(f.confidence) ? ` (оценка уверенности модели ${formatPct(f.confidence)})` : '';
  return `${f.title}${conf}`;
}

function describeTestScoresBrief(scores) {
  if (!scores) return '';
  return `напряжение ${scores.levels.tension}, ресурс ${scores.levels.resource}`;
}

function renderTestMeta() {
  if (!assessment || !assessment.test) return;
  const t = assessment.test;
  const answered = TEST_KEYS.filter((k) => isLikert15(t[k])).length;
  if (testProgress) testProgress.textContent = `Ответы: ${answered}/${TEST_KEYS.length}`;

  const scores = computeTestScores(t);
  assessment.testScores = scores;
  if (testScoreHint) {
    testScoreHint.textContent = scores ? `Профиль: ${describeTestScoresBrief(scores)}` : '';
  }
}

function resetAssessment() {
  assessment = null;
}

function snapshotCameraAssessment() {
  if (!currentEmotion) return null;
  return {
    emotion: currentEmotion,
    prob: Number.isFinite(stableProb) ? stableProb : null,
    confidence: Number.isFinite(stableConfidence) ? stableConfidence : null,
    margin: Number.isFinite(stableMargin) ? stableMargin : null,
    profile: emotionProfile ? roundProfile(emotionProfile, 3) : null,
  };
}

function openStateTest() {
  const snap = snapshotCameraAssessment();
  if (!snap) {
    emotionResult.innerText = 'Подождите, пока определится эмоция (или нажмите «Снимок (точнее)»).';
    return;
  }

  assessment = {
    camera: snap,
    // Расширенный тест включает семь шкал
    test: { stress: null, anxiety: null, energy: null, mood: null, focus: null, body: null, fatigue: null },
    testScores: null,
    fused: null,
    recommendations: [],
    recommendedIds: [],
    selectedPracticeId: null,
    createdAtISO: new Date().toISOString(),
  };

  // Камера остаётся активной на всех экранах; выключаем только трекинг (экономим ресурсы)
  stopTracking(true);

  homeSection.classList.add('hidden');
  practiceSection.classList.add('hidden');
  recommendationSection.classList.add('hidden');
  testSection.classList.remove('hidden');

  // сброс UI теста
  if (submitTestBtn) submitTestBtn.disabled = true;
  document.querySelectorAll('.scaleBtn').forEach((b) => b.classList.remove('selected'));

  if (testScoreHint) testScoreHint.textContent = '';
  if (testProgress) testProgress.textContent = `Ответы: 0/${TEST_KEYS.length}`;
}

function setTestAnswer(q, v) {
  if (!assessment) return;
  assessment.test[q] = v;

  // подсветка выбранного значения для конкретного вопроса
  document.querySelectorAll(`.scaleBtn[data-q=\"${q}\"]`).forEach((b) => {
    b.classList.toggle('selected', String(b.dataset.v) === String(v));
  });

  const t = assessment.test;
  const allAnswered = TEST_KEYS.every((k) => isLikert15(t[k]));
  if (submitTestBtn) submitTestBtn.disabled = !allAnswered;
  renderTestMeta();
}

function onTestQuestionsClick(event) {
  const btn = event.target.closest('.scaleBtn');
  if (!btn) return;
  const q = btn.dataset.q;
  const v = parseInt(btn.dataset.v, 10);
  if (!q || !Number.isFinite(v)) return;
  setTestAnswer(q, v);
}

function describeTestBrief(t) {
  if (!t) return '';
  return `стресс ${t.stress}/5, тревога ${t.anxiety}/5, энергия ${t.energy}/5, настроение ${t.mood}/5, фокус ${t.focus}/5, тело ${t.body}/5, усталость ${t.fatigue}/5`;
}

function getPracticeIdsForAssessment(camera, t, testScoresOverride = null, fusedOverride = null) {
  const rec = buildRecommendedPracticeObjects(camera, t, testScoresOverride, fusedOverride);
  return (rec || []).map((x) => x.id);
}


// =========================
// Этап 6: рекомендательный модуль (состояние → 1–3 практики + «почему» + мягкие предупреждения)
// =========================
function uniqById(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach((x) => {
    if (!x || !x.id || seen.has(x.id) || !PRACTICES[x.id]) return;
    seen.add(x.id);
    out.push(x);
  });
  return out;
}

function buildAdaptiveCaution(practiceId, scores, fused) {
  const p = PRACTICES[practiceId];
  const cautions = [];

  // Индивидуальные мягкие предупреждения по контексту
  const anxietyHi = scores?.raw?.anxiety >= 4 || scores?.flags?.highTension;
  const lowEnergy = scores?.flags?.lowEnergy || scores?.indices?.resource <= 0.25;

  if (p?.hasBreathHolds && anxietyHi) {
    cautions.push('Если задержки дыхания усиливают тревогу — уменьшите паузы или делайте без пауз.');
  }

  if (practiceId === 'breath_4_2_6' && lowEnergy && (fused?.key === 'apathy')) {
    cautions.push('Если хочется бодрее — сделайте это упражнение короче (например, 3–0–4) и не форсируйте выдох.');
  }

  // Базовая безопасность — всегда коротко
  cautions.push('Остановитесь при головокружении или дискомфорте.');

  // Встроенное предупреждение практики (если есть)
  if (p?.caution) cautions.unshift(p.caution);

  // Убираем повторы
  const uniq = [];
  const seen = new Set();
  cautions.forEach((c) => {
    const key = (c || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniq.push(key);
  });

  return uniq.slice(0, 2).join(' ');
}

function buildRecommendedPracticeObjects(camera, t, testScoresOverride = null, fusedOverride = null) {
  const emotion = (camera && camera.emotion) ? camera.emotion : (currentEmotion || 'neutral');
  const scores = testScoresOverride || computeTestScores(t);
  const fused = fusedOverride || (scores ? computeFusedState(camera || { emotion }, scores) : null);

  // Фолбэк, если нет данных теста
  if (!scores || !fused) {
    const ids = getPracticeIdsForEmotion(emotion);
    return ids.map((id, idx) => ({
      id,
      why: idx === 0 ? 'Базовая рекомендация по выражению лица.' : 'Альтернативный вариант.',
      reasons: idx === 0 ? ['stabilize_breath'] : ['grounding'],
      caution: PRACTICES[id]?.caution || 'Дышите мягко и остановитесь при дискомфорте.',
    }));
  }

  const rec = [];
  const add = (id, why, reasons = []) => rec.push({ id, why, reasons, caution: buildAdaptiveCaution(id, scores, fused) });

  // Главная логика: по итоговому состоянию
  // В отличие от первоначальной версии, для каждого состояния подбираем
  // практики из расширенного каталога. Мы стараемся сочетать дыхательные,
  // телесные и когнитивные упражнения, чтобы рекомендации были более
  // разнообразными и соответствовали текущему состоянию пользователя.
  switch (fused.key) {
    case 'irritation':
      // Раздражение / накал → снимаем телесное напряжение и «остужаем» дыхание
      add('progressive_relaxation_5', 'Последовательное расслабление тела помогает снизить раздражение и снять мышечный зажим.', ['relax_body']);
      add('breath_4_2_6', 'Удлинённый выдох снижает «накал» и возвращает контроль.', ['long_exhale']);
      add('grounding_54321', 'Заземление возвращает внимание в «здесь и сейчас», отвлекая от эмоций.', ['grounding']);
      break;

    case 'anxiety':
    case 'high_tension':
      // Тревожное напряжение / высокий стресс → балансируем дыхание и расслабляем тело
      add('alt_nostril_5min', 'Чередование ноздрей стабилизирует дыхание и помогает нервной системе успокоиться.', ['stabilize_breath']);
      add('progressive_relaxation_5', 'Снимает телесное напряжение, накопившееся в мышцах во время стресса.', ['relax_body']);
      add('breath_4_2_6', 'Длинный выдох помогает телу быстрее перейти в режим спокойствия.', ['long_exhale']);
      break;

    case 'apathy':
      // Усталость / апатия → мягко активируем тело и наполняем энергией
      add('energizing_breath_3_1_3', 'Равномерные циклы дыхания 3-1-3 наполняют энергией и бодрят.', ['energize']);
      add('stretch_break_2', 'Короткая растяжка активизирует тело и кровь, возвращая лёгкость.', ['stretch']);
      add('focus_attention_5', 'Фокусировка внимания на процессе помогает выйти из апатичного состояния.', ['focus']);
      break;

    case 'low_mood':
      // Пониженное настроение → работаем с поддержкой и мягкой визуализацией
      add('self_compassion_3', 'Мягкая практика самосострадания поддерживает и дарит ощущение принятия.', ['self_support']);
      add('visualization_light_5', 'Визуализация света повышает тонус и согревает изнутри.', ['visualize']);
      add('focus_attention_5', 'Помогает переключить внимание с тяжёлых мыслей на нейтральный процесс.', ['focus']);
      break;

    case 'positive':
      // Позитив / ресурс → закрепляем состояние, углубляем благодарность
      add('gratitude_60', 'Закрепляет ресурсное состояние и усиливает благодарность.', ['gratitude']);
      add('visualization_light_5', 'Помогает глубже прочувствовать радость и ресурс.', ['visualize']);
      add('focus_attention_5', 'Фокусирует внимание и усиливает ощущение присутствия в моменте.', ['focus']);
      break;

    case 'stable':
    default:
      // Стабильно → универсальные варианты для поддержания баланса
      add('box_4', 'Универсальное ровное дыхание для стабилизации и выравнивания.', ['stabilize_breath']);
      add('focus_attention_5', 'Фокусировка помогает поддерживать ясность и присутствие.', ['focus']);
      add('breath_4_2_6', 'Удлинённый выдох расслабляет и выравнивает состояние.', ['long_exhale']);
      break;
  }

  // Дополнительная адаптация: если тест показывает низкую энергию — предлагается активирующее дыхание,
  // если высокая тревога/напряжение — добавляем балансирующее дыхание. Это дополняет основную тройку,
  // но не превышает 3 уникальных вариантов после фильтрации.
  if (scores?.flags?.lowEnergy) {
    add('energizing_breath_3_1_3', 'При низкой энергии мягко активизируйте себя дыханием 3–1–3.', ['energize']);
  }
  if (scores?.flags?.highTension) {
    add('alt_nostril_5min', 'При сильном напряжении сбалансированное чередование ноздрей быстро успокоит.', ['stabilize_breath']);
  }

  // Уникальность и существование
  let out = uniqById(rec);
  if (out.length === 0) {
    out.push({ id: 'box_4', why: 'Универсальный вариант.', reasons: ['stabilize_breath'], caution: buildAdaptiveCaution('box_4', scores, fused) });
  }

  // --- Персонализация по фидбеку и анти-повтор ---
  const recent = new Set(getRecentHistoryPracticeIds(2));

  // если практика стабильно не нравится (2+ «плохо» за 3 недели без «хорошо») — временно исключаем
  const filtered = out.filter((r) => {
    const s = getPracticeFeedbackSummary(r.id, 21);
    return !(s.bad >= 2 && s.good === 0);
  });
  if (filtered.length) out = filtered;

  // ранжирование: базовый порядок + предпочтения + штраф за повтор
  const baseOrder = new Map(out.map((r, idx) => [r.id, idx]));
  const recScore = (r) => {
    const baseIdx = baseOrder.get(r.id) ?? 9;
    const base = (10 - baseIdx);
    const pref = getPracticeFeedbackSummary(r.id, 45).score; // 1.5 месяца
    const prefClamped = clamp(pref, -2, 2);
    const repeatPenalty = recent.has(r.id) ? 1.2 : 0;
    return base + 0.7 * prefClamped - repeatPenalty;
  };
  out.sort((a, b) => {
    const d = recScore(b) - recScore(a);
    if (Math.abs(d) > 1e-6) return d;
    // стабильность: сохраняем исходный порядок
    return (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0);
  });

  return out.slice(0, 3);
}

function renderRecommendationWarnings(selectedPracticeId) {
  if (!recWarnings) return;
  const base = 'Это практика самопомощи, не медицинский диагноз. Дышите мягко и остановитесь при дискомфорте.';

  let extra = '';
  const selected = assessment?.recommendations?.find((r) => r.id === selectedPracticeId) || null;
  if (selected?.caution) extra = selected.caution;

  const txt = extra ? `${base} Важно: ${extra}` : base;
  recWarnings.textContent = txt;
  recWarnings.classList.remove('hidden');
}

function buildRecommendationText(fused, emotion, t) {
  // Человеческое объяснение «почему» (с опорой на итоговое состояние)
  if (fused && fused.key) {
    switch (fused.key) {
      case 'irritation':
        return 'Похоже, сейчас есть внутренний «накал» или раздражение. Начните с практик на удлинённый выдох и заземление — они помогают быстро снизить возбуждение и вернуть ощущение контроля.';
      case 'anxiety':
      case 'high_tension':
        return 'Сейчас может быть много напряжения или тревоги. Лучше начать с заземления и дыхания с длинным выдохом — это помогает быстрее успокоить тело и мысли.';
      case 'apathy':
        return 'Похоже, ресурса и энергии сейчас мало. Выберите мягкую выравнивающую практику без форсирования — цель в том, чтобы восстановить опору и спокойный ритм дыхания.';
      case 'low_mood':
        return 'Настроение может быть сниженным. Мягкая стабилизация и короткая благодарность помогут «потеплить» состояние и вернуть ощущение поддержки.';
      case 'positive':
        return 'Состояние выглядит достаточно ресурсным. Можно закрепить его короткой практикой благодарности или ровным дыханием для фокуса.';
      case 'stable':
      default:
        return 'Состояние похоже на ровное. Можно выбрать выравнивающую практику или короткую благодарность для закрепления.';
    }
  }

  // Фолбэк (если fused отсутствует)
  if (!t) return 'Подберём практику под текущее состояние.';
  const scores = computeTestScores(t);
  if ((scores && scores.flags.highTension) || ['angry', 'fearful', 'surprised'].includes(emotion)) {
    return 'Похоже, сейчас есть напряжение/тревога. Начните с практик на удлинённый выдох и заземление — они помогают быстро снизить «накал».';
  }
  if ((scores && scores.flags.lowMood) || emotion === 'sad') {
    return 'Сейчас настроение может быть сниженным. Лучше подойдут мягкие стабилизирующие практики и короткая благодарность — они помогают вернуть опору и «потеплить» состояние.';
  }
  if (scores && scores.flags.lowEnergy) {
    return 'Энергии немного — начните со спокойной практики, без форсирования. Цель — выровнять дыхание и вернуть ощущение контроля.';
  }
  return 'Состояние похоже на стабильное. Можно выбрать выравнивающую практику или короткую благодарность для закрепления.';
}

function renderPracticeUIOptionsByIds(ids) {
  if (!ids || ids.length === 0) ids = ['box_4'];
  recommendedPracticeId = ids[0];

  if (!practiceList) return;
  practiceList.innerHTML = '';
  ids.forEach((id, idx) => {
    const p = PRACTICES[id];
    if (!p) return;
    const btn = document.createElement('button');
    const isSelected = assessment && assessment.selectedPracticeId === id;
    btn.className = isSelected ? 'primary' : 'ghost';
    btn.textContent = idx == 0 ? `★ ${p.title}` : p.title;
    btn.addEventListener('click', () => {
      if (assessment) assessment.selectedPracticeId = id;
      loadPractice(id, false);
    });
    practiceList.appendChild(btn);
  });
}


function renderRecommendedList(ids) {
  if (!recommendedList) return;
  recommendedList.innerHTML = '';

  const recs = (assessment && Array.isArray(assessment.recommendations) && assessment.recommendations.length)
    ? assessment.recommendations
    : (ids || []).map((id, idx) => ({ id, why: idx === 0 ? 'Рекомендуем начать с этого варианта.' : 'Альтернативный вариант.', caution: PRACTICES[id]?.caution || '' }));

  recs.forEach((r, idx) => {
    const p = PRACTICES[r.id];
    if (!p) return;
    const selected = assessment && assessment.selectedPracticeId === r.id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rec-card ${selected ? 'selected' : ''}`;

    const title = document.createElement('div');
    title.className = 'rec-title';
    title.textContent = idx === 0 ? `★ ${p.title}` : p.title;

    const sub = document.createElement('div');
    sub.className = 'rec-sub';
    sub.textContent = p.short || p.description || '';

    const why = document.createElement('div');
    why.className = 'rec-why';
    why.textContent = `Почему: ${r.why}`;

    // Короткие бейджи причин — чтобы «почему эта практика» было понятно с первого взгляда
    const reasons = Array.isArray(r.reasons) ? r.reasons : [];
    let badges = null;
    if (reasons.length) {
      badges = document.createElement('div');
      badges.className = 'rec-badges';
      reasons.slice(0, 3).forEach((key) => {
        const meta = REASON_BADGES[key];
        if (!meta) return;
        const b = document.createElement('span');
        b.className = 'rec-badge';
        b.innerHTML = `<span class="i">${meta.icon}</span><span>${meta.text}</span>`;
        badges.appendChild(b);
      });
    }

    btn.appendChild(title);
    btn.appendChild(sub);
    btn.appendChild(why);
    if (badges) btn.appendChild(badges);

    // Добавляем аккуратное предупреждение прямо в карточку только для выбранной практики
    if (selected && r.caution) {
      const caution = document.createElement('div');
      caution.className = 'rec-caution';
      caution.innerHTML = `<b>Важно:</b> ${r.caution}`;
      btn.appendChild(caution);
    }

    btn.addEventListener('click', () => {
      if (!assessment) return;
      assessment.selectedPracticeId = r.id;
      renderRecommendedList(assessment.recommendedIds);
      renderPracticeUIOptionsByIds(assessment.recommendedIds);
      renderRecommendationWarnings(r.id);
    });
    recommendedList.appendChild(btn);
  });
}

function showRecommendations({ completed = false } = {}) {
  if (!assessment) return;
const emo = assessment.camera?.emotion || currentEmotion;
const prob = assessment.camera?.prob;
const conf = assessment.camera?.confidence;
const t = assessment.test;

const emoText = translateEmotion(emo);
const probText = Number.isFinite(prob) ? `≈ ${prob.toFixed(2)}` : '';
const confText = Number.isFinite(conf) ? `, оценка уверенности модели ${formatPct(conf)}` : '';
const prefix = completed ? 'Практика завершена. ' : '';

  // Показываем мини-обратную связь только после завершения практики
  if (recFeedback) {
    if (completed) {
      recFeedback.classList.remove('hidden');
      if (recFbStatus) recFbStatus.textContent = '';
      [recFbGood, recFbNeutral, recFbBad].forEach((b) => {
        if (!b) return;
        b.disabled = false;
        b.classList.remove('disabled');
      });
    } else {
      recFeedback.classList.add('hidden');
    }
  }

  if (recommendationSummary) {
    const scores = assessment.testScores || computeTestScores(t);
    const fused = assessment.fused;
    const fusedText = fused ? `Итог: ${describeFusedStateBrief(fused)}.` : 'Итог: —';
    recommendationSummary.innerText = `${prefix}${fusedText}`.trim();

    // Одна строка «что учли» — без простыни чисел
    if (recommendationExplainLine && scores && fused) {
      const energyLbl = levelLabel(scores.norm?.energy ?? 0.5, { low: 'низкая', mid: 'средняя', high: 'высокая' });
      const focusLbl = levelLabel(scores.norm?.focus ?? 0.5, { low: 'легко держать фокус', mid: 'средне', high: 'трудно держать фокус' });
      recommendationExplainLine.innerText = `Учли: камера ${emoText}${Number.isFinite(conf) ? ` (${formatPct(conf)})` : ''} + тест: напряжение ${scores.levels?.tension || '—'}, ресурс ${scores.levels?.resource || '—'}, энергия ${energyLbl}, фокус ${focusLbl} → ${fused.title}`;
    } else if (recommendationExplainLine) {
      recommendationExplainLine.innerText = '';
    }

    // Раскрывающийся блок «как рассчитали» (проверяемость)
    if (howComputedBody && scores && fused) {
      const camLine = `Эмоция: <b>${emoText}</b>${Number.isFinite(prob) ? ` (≈ ${prob.toFixed(2)})` : ''}${Number.isFinite(conf) ? `, оценка уверенности модели ${formatPct(conf)}` : ''}`;
      const rules = (Array.isArray(fused.why) && fused.why.length) ? fused.why.join(' · ') : '';
      const grid = `
        <div class="how-grid">
          <div class="how-item"><b>Камера</b><div>${camLine}</div></div>
          <div class="how-item"><b>Сработало состояние</b><div><b>${fused.title}</b> (оценка уверенности модели ${formatPct(fused.confidence)})</div></div>
          <div class="how-item"><b>Тест: индексы</b><div>напряжение: <b>${scores.levels?.tension || '—'}</b> · ресурс: <b>${scores.levels?.resource || '—'}</b></div></div>
          <div class="how-item"><b>Тест: ответы</b><div>${describeTestBrief(t)}</div></div>
        </div>
        ${rules ? `<div style="margin-top:0.6rem"><b>Почему так:</b> ${rules}</div>` : ''}
      `;
      howComputedBody.innerHTML = grid;
    }
  }

    const fused = assessment.fused;

  const recText = buildRecommendationText(fused, emo, t);
  const p = document.getElementById('recommendation-text');
  if (p) p.innerText = recText;

  renderRecommendedList(assessment.recommendedIds);
  renderPracticeUIOptionsByIds(assessment.recommendedIds);
  renderRecommendationWarnings(assessment.selectedPracticeId || assessment.recommendedIds?.[0]);

  testSection.classList.add('hidden');
  practiceSection.classList.add('hidden');
  recommendationSection.classList.remove('hidden');
}

function submitTest() {
  if (!assessment) return;

  // фиксируем итоговые показатели теста
  assessment.testScores = computeTestScores(assessment.test);
  assessment.fused = computeFusedState(assessment.camera, assessment.testScores);

  assessment.recommendations = buildRecommendedPracticeObjects(assessment.camera, assessment.test, assessment.testScores, assessment.fused);
  assessment.recommendedIds = (assessment.recommendations || []).map((r) => r.id);
  assessment.selectedPracticeId = assessment.recommendedIds[0];

  showRecommendations({ completed: false });
}

function openPracticeFromRecommendations() {
  if (!assessment) return;
  const id = assessment.selectedPracticeId || assessment.recommendedIds?.[0] || recommendedPracticeId;
  recommendationSection.classList.add('hidden');
  homeSection.classList.add('hidden');
  practiceSection.classList.remove('hidden');
  loadPractice(id, false);
}

function backFromPractice() {
  stopPracticeLoop();
  setMusic(false);
  document.body.classList.remove('relax-bg');

  practiceSection.classList.add('hidden');
  if (assessment && assessment.recommendedIds && assessment.recommendedIds.length) {
    showRecommendations({ completed: false });
  } else {
    setActiveNav('home');
  }
}

function finishPractice() {
  stopPracticeLoop();
  if (!musicPlayer.paused) musicPlayer.pause();
  document.body.classList.remove('relax-bg');

  // сохраняем сессию в историю
  const cam = assessment && assessment.camera ? assessment.camera : snapshotCameraAssessment();
  saveHistoryEntry({
    timestamp: new Date().toISOString(),
    emotion: cam && cam.emotion ? cam.emotion : currentEmotion,
    emotionProb: cam ? cam.prob : null,
    emotionConfidence: cam ? cam.confidence : null,
    emotionProfile: cam ? cam.profile : null,
    fusedKey: assessment && assessment.fused ? assessment.fused.key : null,
    fusedTitle: assessment && assessment.fused ? assessment.fused.title : null,
    fusedConfidence: assessment && assessment.fused && Number.isFinite(assessment.fused.confidence) ? assessment.fused.confidence : null,
    practice: currentPracticeType,
    test: assessment ? assessment.test : null,
    testScores: assessment ? assessment.testScores : null,
  });

  practiceSection.classList.add('hidden');

  if (assessment && assessment.recommendedIds && assessment.recommendedIds.length) {
    showRecommendations({ completed: true });
  } else {
    setActiveNav('home');
  }
}

// =========================
// История и дневник
// =========================
function saveHistoryEntry(entry) {
  const history = JSON.parse(localStorage.getItem('mediatorHistory') || '[]');
  history.push(entry);
  localStorage.setItem('mediatorHistory', JSON.stringify(history));
}

function showHistory() {
  hideAllSections();
  historySection.classList.remove('hidden');
  historyList.innerHTML = '';

  const history = JSON.parse(localStorage.getItem('mediatorHistory') || '[]');
  if (history.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Пока нет записей.';
    historyList.appendChild(li);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement('li');
    const date = new Date(item.timestamp).toLocaleString('ru-RU');
    const emoRu = translateEmotion(item.emotion);
    let practiceRu = 'практика';
    if (item.practice && PRACTICES[item.practice]) {
      practiceRu = PRACTICES[item.practice].title;
    } else if (item.practice === 'breathing') {
      practiceRu = 'дыхательная практика';
    } else if (item.practice === 'meditation') {
      practiceRu = 'медитация';
    }
    const confTxt = Number.isFinite(item.emotionConfidence) ? `, оценка уверенности модели — ${formatPct(item.emotionConfidence)}` : '';
    const testTxt = item.test ? `, тест — ${describeTestBrief(item.test)}` : '';
    const profileTxt = item.testScores ? `, профиль — ${describeTestScoresBrief(item.testScores)}` : '';
    const fusedConfTxt = Number.isFinite(item.fusedConfidence) ? `, оценка уверенности модели — ${formatPct(item.fusedConfidence)}` : '';
    const fusedTxt = item.fusedTitle ? `, итог — ${item.fusedTitle}${fusedConfTxt}` : '';
    li.textContent = `${date}: эмоция — ${emoRu}${confTxt}${fusedTxt}, упражнение — ${practiceRu}${testTxt}${profileTxt}`;
    historyList.appendChild(li);
  });

  // Диаграммы удалены по запросу — оставляем только ленту истории.
}

function saveDiary() {
  const text = diaryInput.value.trim();
  if (!text) return;

  const diary = JSON.parse(localStorage.getItem('mediatorDiary') || '[]');
  diary.push({
    timestamp: new Date().toISOString(),
    text,
  });
  localStorage.setItem('mediatorDiary', JSON.stringify(diary));

  diaryInput.value = '';
  loadDiary();
}

function loadDiary() {
  diaryList.innerHTML = '';
  const diary = JSON.parse(localStorage.getItem('mediatorDiary') || '[]');
  if (diary.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Записей пока нет.';
    diaryList.appendChild(li);
    return;
  }

  diary.forEach((entry) => {
    const li = document.createElement('li');
    const date = new Date(entry.timestamp).toLocaleString('ru-RU');
    li.textContent = `${date}: ${entry.text}`;
    diaryList.appendChild(li);
  });
}

function showDiary() {
  hideAllSections();
  diarySection.classList.remove('hidden');
  loadDiary();
}

// =========================
// Навигация
// =========================

function cleanupPracticeTransient() {
  stopPracticeLoop();
  setMusic(false);
  document.body.classList.remove('relax-bg');
  document.body.classList.remove('quick-mode');
  quickHelpMode = false;
  quickHelpSource = null;
  if (quickHelpAfter) quickHelpAfter.classList.add('hidden');
  activePracticeId = null;
}
function hideAllSections() {
  cleanupPracticeTransient();
  homeSection.classList.add('hidden');
  if (quickHelpSection) quickHelpSection.classList.add('hidden');
  practiceSection.classList.add('hidden');
  testSection.classList.add('hidden');
  recommendationSection.classList.add('hidden');
  historySection.classList.add('hidden');
  diarySection.classList.add('hidden');
}

function setActiveNav(target) {
  // переход по нижней навигации сбрасывает текущую оценку (чтобы поток был предсказуемым)
  resetAssessment();
  navItems.forEach((item) => item.classList.remove('active'));
  hideAllSections();

  switch (target) {
    case 'home':
      homeSection.classList.remove('hidden');
      // Камера активна постоянно; на главной включаем/возобновляем только трекинг
      if (!video.srcObject) {
        startVideo();
      } else {
        ensureOverlaySize();
        if (TRACK.enabledByDefault && modelsReady) startTracking();
      }
      break;
    case 'history':
      stopTracking(true);
      showHistory();
      break;
    case 'diary':
      stopTracking(true);
      showDiary();
      break;
    default:
      homeSection.classList.remove('hidden');
      if (!video.srcObject) {
        startVideo();
      } else {
        ensureOverlaySize();
        if (TRACK.enabledByDefault && modelsReady) startTracking();
      }
  }

  const activeLink = document.querySelector(`#bottomNav .nav-item[data-target="${target}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// =========================
// Инициализация
// =========================
async function init() {
  refreshOverlayPalette();

  // Устанавливаем нейтральную тему по умолчанию, пока не определится реальная эмоция
  setEmotionTheme('neutral');

  // Кнопка «Мне сейчас тяжело» должна работать независимо от распознавания
  bindQuickHelpHandlers();

  // Если face-api.js не загрузился (нет интернета/блокировки CDN) — показываем понятную ошибку
  if (!window.faceapi) {
    emotionResult.innerText = 'Не удалось загрузить библиотеку распознавания (face-api.js). Проверьте интернет или блокировщик, затем обновите страницу.';
    if (detectBtn) detectBtn.disabled = true;
    if (startPracticeBtn) startPracticeBtn.disabled = true;
    startVideo();
    return;
  }

  await loadModels();

  if (!modelsReady) {
    emotionResult.innerText = 'Модели распознавания не загружены. Проверьте интернет и обновите страницу.';
    if (trackingStatus) {
      trackingStatus.textContent = 'OFF';
      trackingStatus.classList.add('paused');
    }
  }

  detectBtn.disabled = true;
  startVideo();

  // Этап 1: на главной есть кнопка «Начать практику», но она активируется только когда определится эмоция.
  if (startPracticeBtn) {
    startPracticeBtn.disabled = true;
    startPracticeBtn.title = 'Ожидаю определение эмоции…';
  }
  if (practiceHint) {
    practiceHint.textContent = 'Подождите, пока определится эмоция (или нажмите «Снимок (точнее)»).';
  }

  detectBtn.addEventListener('click', detectEmotionOnceAccurate);
  startPracticeBtn.addEventListener('click', openStateTest);
  finishPracticeBtn.addEventListener('click', finishPractice);  submitTestBtn.addEventListener('click', submitTest);

  if (cancelTestBtn) cancelTestBtn.addEventListener('click', () => {
    testSection.classList.add('hidden');
    resetAssessment();
    setActiveNav('home');
  });

  if (editTestBtn) editTestBtn.addEventListener('click', () => {
    recommendationSection.classList.add('hidden');
    testSection.classList.remove('hidden');
    // кнопка отправки активируется, если ответы уже выбраны
    if (assessment) {
      const t = assessment.test;
      const allAnswered = TEST_KEYS.every((k) => isLikert15(t[k]));
      if (submitTestBtn) submitTestBtn.disabled = !allAnswered;
      renderTestMeta();
    }
  });

  if (goToPracticeBtn) goToPracticeBtn.addEventListener('click', openPracticeFromRecommendations);

  // Мини-обратная связь после практики (на экране рекомендаций)
  if (recFbGood) recFbGood.addEventListener('click', () => {
    const ok = savePracticeFeedback('good', 'recommendation');
    lockFeedbackUI([recFbGood, recFbNeutral, recFbBad], recFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });
  if (recFbNeutral) recFbNeutral.addEventListener('click', () => {
    const ok = savePracticeFeedback('neutral', 'recommendation');
    lockFeedbackUI([recFbGood, recFbNeutral, recFbBad], recFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });
  if (recFbBad) recFbBad.addEventListener('click', () => {
    const ok = savePracticeFeedback('bad', 'recommendation');
    lockFeedbackUI([recFbGood, recFbNeutral, recFbBad], recFbStatus, ok ? 'Спасибо! Учтём это.' : 'Уже записано. Спасибо!');
  });

  if (testQuestions) testQuestions.addEventListener('click', onTestQuestionsClick);

  backHomeBtn.addEventListener('click', () => {
    recommendationSection.classList.add('hidden');
    testSection.classList.add('hidden');
    practiceSection.classList.add('hidden');
    resetAssessment();
    setActiveNav('home');
  });

  document.querySelectorAll('.backBtn').forEach((btn) => {
    btn.addEventListener('click', () => setActiveNav('home'));
  });

  saveDiaryBtn.addEventListener('click', saveDiary);

  navItems.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(link.dataset.target);
    });
  });

  // Service Worker для офлайн‑кэша (не влияет на камеру)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  setActiveNav('home');

  // Практика
  if (practiceBackBtn) practiceBackBtn.addEventListener('click', backFromPractice);
  if (practiceStartPauseBtn) practiceStartPauseBtn.addEventListener('click', togglePracticeStartPause);
  if (practiceMusicBtn) practiceMusicBtn.addEventListener('click', () => setMusic(!musicOn));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTracking(true);
      pausePractice();
    } else if (!homeSection.classList.contains('hidden') && TRACK.enabledByDefault) {
      if (!video.srcObject) startVideo();
      if (modelsReady) startTracking();
    }
  });

  window.addEventListener('resize', () => {
    ensureOverlaySize();
  });

  window.addEventListener('beforeunload', () => {
    stopTracking(true);
    stopPracticeLoop();
    stopVideoStream();
  });

  // Глобальные обработчики ошибок (чтобы пользователю было понятно, что случилось)
  window.addEventListener('error', () => {
    if (!modelsReady) return;
    // не спамим — показываем только самое важное
  });
  window.addEventListener('unhandledrejection', () => {
    // молча, чтобы не ломать UX; детали в console
  });
}

window.addEventListener('DOMContentLoaded', init);
