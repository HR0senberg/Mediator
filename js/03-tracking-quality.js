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

