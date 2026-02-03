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

