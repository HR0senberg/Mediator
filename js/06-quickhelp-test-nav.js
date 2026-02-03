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
