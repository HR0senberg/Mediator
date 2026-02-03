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

