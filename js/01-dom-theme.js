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

