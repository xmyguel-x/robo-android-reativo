/**
 * Robô Android Reativo — content script.
 *
 * 1. Injeta um mascote (Robô Android em SVG articulado) no canto da tela.
 * 2. Observa o DOM e lê a última mensagem do assistente.
 * 3. Detecta a "reação" (humor) da mensagem.
 * 4. Anima o robô conforme a reação e reproduz o texto no balão de fala.
 */
(function () {
  'use strict';

  if (window.__arMascotLoaded) return;
  window.__arMascotLoaded = true;

  /* ------------------------------------------------------------------ *
   * Configurações
   * ------------------------------------------------------------------ */

  const DEFAULTS = {
    enabled: true,
    walk: true,          // passeia andando pelo rodapé
    speak: false,        // TTS (voz do navegador)
    ttsRate: 1.05,
    ttsPitch: 1.0,
    ttsVoice: '',
    bubbleWidth: 320,
    scale: 1,
    selector: '',        // seletor CSS da mensagem do assistente (vazio = auto)
    settleMs: 650,       // tempo que o texto precisa ficar parado (streaming)
    hideAfterMs: 9000,   // esconde o balão após a fala
    badge: true
  };

  const S = Object.assign({}, DEFAULTS);

  const REACTIONS = {
    neutral:   { label: 'neutro',      color: '#6b7280', face: 'neutral',   anim: 'nod',      fx: [] },
    happy:     { label: 'alegre',      color: '#f59e0b', face: 'happy',     anim: 'bounce',   fx: [['sparkle', '✦']] },
    excited:   { label: 'empolgado',   color: '#f97316', face: 'excited',   anim: 'jump',     fx: [['confetti', '◆']] },
    love:      { label: 'apaixonado',  color: '#ec4899', face: 'love',      anim: 'heartbeat', fx: [['heart', '♥']] },
    sad:       { label: 'triste',      color: '#3b82f6', face: 'sad',       anim: 'droop',    fx: [['drop', '●']] },
    angry:     { label: 'irritado',    color: '#ef4444', face: 'angry',     anim: 'shake',    fx: [['steam', '▲']] },
    surprised: { label: 'surpreso',    color: '#8b5cf6', face: 'surprised', anim: 'pop',      fx: [['mark', '!']] },
    thinking:  { label: 'pensando',    color: '#6366f1', face: 'thinking',  anim: 'tilt',     fx: [['mark', '…']] },
    confused:  { label: 'confuso',     color: '#a855f7', face: 'confused',  anim: 'wobble',   fx: [['mark', '?']] },
    tired:     { label: 'cansado',     color: '#64748b', face: 'tired',     anim: 'sway',     fx: [['zzz', 'z']] },
    scared:    { label: 'assustado',   color: '#0ea5e9', face: 'scared',    anim: 'tremble',  fx: [['drop', '●']] },
    celebrate: { label: 'comemorando', color: '#10b981', face: 'excited',   anim: 'spin',     fx: [['confetti', '●']] },
    proud:     { label: 'orgulhoso',   color: '#f59e0b', face: 'proud',     anim: 'chest',    fx: [['sparkle', '✦']] },
    error:     { label: 'deu ruim',    color: '#ef4444', face: 'angry',     anim: 'glitch',   fx: [['mark', '✕']] }
  };

  /* ------------------------------------------------------------------ *
   * Léxico de detecção de reação (PT-BR + EN)
   * ------------------------------------------------------------------ */

  const LEXICON = {
    happy: ['feliz', 'alegre', 'alegria', 'maravilhoso', 'maravilhosa', 'otimo', 'boa', 'bom', 'perfeito', 'perfeita', 'sucesso', 'concluido', 'feito', 'pronto', 'pronta', 'obrigado', 'obrigada', 'valeu', 'legal', 'show', 'top', 'aprovado', 'funcionou', 'happy', 'glad', 'great', 'awesome', 'perfect', 'thanks', 'thank you', 'done', 'works'],
    excited: ['incrivel', 'fantastico', 'espetacular', 'empolgado', 'empolgada', 'animado', 'animada', 'uau', 'uau!', 'hype', 'insano', 'maluco', 'demais', 'excited', 'amazing', 'incredible', 'yay', 'lets go', 'bora', 'awesome'],
    love: ['amo', 'amar', 'amor', 'carinho', 'carinhoso', 'fofo', 'fofa', 'adoro', 'adorar', 'coracao', 'love', 'adore', 'lovely', 'cute', 'sweet', 'adorei'],
    sad: ['triste', 'tristeza', 'decepcionado', 'decepcionante', 'infeliz', 'dor', 'sofrimento', 'chateado', 'chateada', 'arrependido', 'culpa', 'sad', 'sorry', 'unfortunately', 'disappointed', 'regret', 'depressing', 'sinto muito'],
    angry: ['irritado', 'irritada', 'raiva', 'odio', 'furioso', 'furiosa', 'irritante', 'odeio', 'odeia', 'revoltado', 'nervoso', 'angry', 'hate', 'annoying', 'frustrated', 'furious', 'mad', 'irritado com'],
    surprised: ['inesperado', 'surpreso', 'surpresa', 'chocado', 'chocada', 'whoa', 'surprising', 'surprised', 'wow', 'really', 'será que', 'sera que'],
    thinking: ['talvez', 'pensando', 'pensar', 'vou verificar', 'verificando', 'analisando', 'considerando', 'deixa eu', 'provavelmente', 'parece que', 'thinking', 'let me check', 'checking', 'analyzing', 'considering', 'maybe', 'perhaps', 'hmm', 'seems', 'probably', 'analisando isso'],
    confused: ['confuso', 'confusa', 'duvida', 'nao sei', 'como assim', 'estranho', 'estranha', 'perplexo', 'confused', 'unclear', 'not sure', 'why', 'huh'],
    tired: ['cansado', 'cansada', 'exausto', 'exausta', 'tedioso', 'tediosa', 'demorado', 'demorou', 'cansar', 'tired', 'exhausted', 'bored', 'tedious', 'so tired', 'sem forca'],
    scared: ['medo', 'assustado', 'assustada', 'panico', 'perigo', 'cuidado', 'alerta', 'scared', 'afraid', 'danger', 'panic', 'warning', 'careful', 'atencao'],
    celebrate: ['parabens', 'parabéns', 'congratulo', 'congratulacoes', 'comemorar', 'vitoria', 'celebrar', 'celebrate', 'congrats', 'congratulations', 'victory', 'hooray', 'we did it', 'finalmente'],
    proud: ['orgulho', 'orgulhoso', 'orgulhosa', 'orgulhooso', 'conquistei', 'proud', 'accomplished', 'nailed it', 'orgulho de'],
    error: ['erro', 'falha', 'falhou', 'nao funcionou', 'quebrou', 'problema', 'bug', 'exception', 'error', 'failed', 'failure', 'broken', "didn't work", "doesn't work", 'crashou', 'consegui corrigir']
  };

  const EMOJI = {
    '\u{1F600}': 'happy', '\u{1F603}': 'happy', '\u{1F604}': 'happy', '\u{1F601}': 'happy',
    '\u{1F60A}': 'happy', '\u{1F642}': 'happy', '\u{1F60C}': 'happy', '\u{1F97A}': 'love',
    '\u{1F60D}': 'love', '\u{1F618}': 'love', '\u{1F617}': 'love', '\u{1F60B}': 'love',
    '\u{2764}': 'love', '\u{1F9E1}': 'love', '\u{1F494}': 'love', '\u{1F495}': 'love',
    '\u{1F62D}': 'sad', '\u{1F622}': 'sad', '\u{1F61E}': 'sad', '\u{1F614}': 'sad',
    '\u{1F63F}': 'sad', '\u{1F494}': 'sad', '\u{1F621}': 'angry', '\u{1F92C}': 'angry',
    '\u{1F620}': 'angry', '\u{1F624}': 'angry', '\u{1F4A2}': 'angry',
    '\u{1F62E}': 'surprised', '\u{1F632}': 'surprised', '\u{1F92F}': 'surprised',
    '\u{1F631}': 'scared', '\u{1F628}': 'scared', '\u{1F630}': 'scared',
    '\u{1F633}': 'surprised', '\u{1F6A8}': 'scared',
    '\u{1F914}': 'thinking', '\u{1F928}': 'confused', '\u{1F615}': 'confused',
    '\u{1F971}': 'tired', '\u{1F62A}': 'tired', '\u{1F634}': 'tired',
    '\u{1F389}': 'celebrate', '\u{1F38A}': 'celebrate', '\u{1F973}': 'celebrate',
    '\u{1F3AF}': 'celebrate', '\u{1F44F}': 'celebrate', '\u{1F64C}': 'celebrate',
    '\u{1F525}': 'excited', '\u{1F4AA}': 'excited', '\u{2728}': 'excited',
    '\u{26A1}': 'excited', '\u{1F680}': 'excited', '\u{1F388}': 'excited',
    '\u{2705}': 'happy', '\u{1F44D}': 'happy', '\u{1F64F}': 'happy',
    '\u{274C}': 'error', '\u{26D4}': 'error', '\u{1F6D1}': 'error',
    '\u{1F6A8}': 'scared', '\u{26A0}': 'scared'
  };

  const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const LEX_NORM = {};
  for (const key of Object.keys(LEXICON)) {
    LEX_NORM[key] = LEXICON[key].map(strip);
  }

  /** Detecta a reação predominante de uma mensagem. */
  function detectReaction(raw) {
    const text = raw || '';
    const norm = strip(text);
    const score = {};
    const bump = (k, v) => { score[k] = (score[k] || 0) + v; };

    for (const key of Object.keys(LEX_NORM)) {
      for (const word of LEX_NORM[key]) {
        if (!word) continue;
        let from = 0, hits = 0;
        while (hits < 3) {
          const at = norm.indexOf(word, from);
          if (at === -1) break;
          hits++;
          from = at + word.length;
        }
        if (hits) bump(key, hits * (1 + word.length / 40));
      }
    }

    for (const ch of text) {
      const e = EMOJI[ch];
      if (e) bump(e, 3.2);
    }

    // pontuação da própria mensagem
    const excl = (text.match(/!/g) || []).length;
    const dots = (text.match(/\.{3}|…/g) || []).length;
    const letters = text.replace(/[^\p{L}]/gu, '');
    if (excl >= 2) bump('excited', excl * 0.5);
    if (dots >= 1) bump('tired', dots * 0.4);
    if (letters.length >= 12 && letters === letters.toUpperCase()) bump('excited', 1.6);

    let best = 'neutral', bestScore = 0;
    for (const k of Object.keys(score)) {
      if (score[k] > bestScore) { best = k; bestScore = score[k]; }
    }
    return { id: best, score: bestScore };
  }

  /* ------------------------------------------------------------------ *
   * Limpeza de texto (markdown -> texto puro)
   * ------------------------------------------------------------------ */

  function cleanText(t) {
    return String(t || '')
      .replace(/```[\s\S]*?```/g, ' [código] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(^|[^*])(\*|_)([^*_]+)\2/g, '$1$3')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* ------------------------------------------------------------------ *
   * DOM: robô + balão
   * ------------------------------------------------------------------ */

  const STAR = 'M0 -8 L2.6 -2.6 L8 0 L2.6 2.6 L0 8 L-2.6 2.6 L-8 0 L-2.6 -2.6 Z';
  const HEART = 'M0 6.5 C-6.5 1.5 -8 -3.5 -4.5 -6 C-1.8 -7.8 0 -5.5 0 -3.6 C0 -5.5 1.8 -7.8 4.5 -6 C8 -3.5 6.5 1.5 0 6.5 Z';

  const EYE = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
  const ARC = (d) => '<path d="' + d + '"/>';

  const ROBOT_SVG = [
    '<svg class="ar-svg" viewBox="0 0 207 243" xmlns="http://www.w3.org/2000/svg" data-face="neutral" aria-hidden="true">',
    '  <g class="ar-legs">',
    '    <g class="ar-leg ar-leg-l"><rect class="ar-limb" x="65" y="180" width="28" height="58" rx="11"/></g>',
    '    <g class="ar-leg ar-leg-r"><rect class="ar-limb" x="114" y="180" width="28" height="58" rx="11"/></g>',
    '  </g>',
    '  <g class="ar-arms">',
    '    <g class="ar-arm ar-arm-l"><rect class="ar-limb" x="6" y="82" width="27" height="82" rx="13.5"/></g>',
    '    <g class="ar-arm ar-arm-r"><rect class="ar-limb" x="174" y="82" width="27" height="82" rx="13.5"/></g>',
    '  </g>',
    '  <g class="ar-body"><path d="M40 78 H166 V176 A14 14 0 0 1 152 190 H54 A14 14 0 0 1 40 176 Z"/></g>',
    '  <g class="ar-antennas">',
    '    <path d="M61 2 L73 26"/>',
    '    <path d="M146 2 L134 26"/>',
    '  </g>',
    '  <g class="ar-head">',
    '    <path class="ar-head-shape" d="M40 75 A63 57 0 0 1 166 75 Z"/>',
    '    <g class="ar-face ar-face-neutral"><g class="ar-eyes">', EYE(73.5, 48, 5.4), EYE(132.5, 48, 5.4), '</g></g>',
    '    <g class="ar-face ar-face-happy"><g class="ar-eyes">',
    '      ', ARC('M67.5 51.5 q6 -7 12 0'), ARC('M126.5 51.5 q6 -7 12 0'),
    '    </g><g class="ar-mouth">', ARC('M90 63 q13 9 26 0'), '</g></g>',
    '    <g class="ar-face ar-face-excited"><g class="ar-eyes">',
    '      <path class="ar-star" transform="translate(73.5,47) scale(1.05)" d="', STAR, '"/>',
    '      <path class="ar-star" transform="translate(132.5,47) scale(1.05)" d="', STAR, '"/>',
    '    </g><g class="ar-mouth">', ARC('M89 62 q14 11 28 0'), '</g></g>',
    '    <g class="ar-face ar-face-love"><g class="ar-eyes">',
    '      <path class="ar-heart" transform="translate(73.5,45) scale(1.25)" d="', HEART, '"/>',
    '      <path class="ar-heart" transform="translate(132.5,45) scale(1.25)" d="', HEART, '"/>',
    '    </g><g class="ar-mouth">', ARC('M90 63 q13 9 26 0'), '</g></g>',
    '    <g class="ar-face ar-face-sad"><g class="ar-eyes">',
    '      ', ARC('M67.5 45 q6 7 12 0'), ARC('M126.5 45 q6 7 12 0'),
    '    </g><g class="ar-mouth">', ARC('M90 67 q13 -9 26 0'), '</g></g>',
    '    <g class="ar-face ar-face-angry"><g class="ar-eyes">',
    '      ', ARC('M67 43 l13 9'), ARC('M140 43 l-13 9'),
    '    </g><g class="ar-mouth">', ARC('M92 66 q11 -5 22 0'), '</g></g>',
    '    <g class="ar-face ar-face-surprised"><g class="ar-eyes">',
    '      ', EYE(73.5, 47, 8), '<circle class="ar-pupil" cx="73.5" cy="49" r="3.4"/>',
    '      ', EYE(132.5, 47, 8), '<circle class="ar-pupil" cx="132.5" cy="49" r="3.4"/>',
    '    </g><g class="ar-mouth"><ellipse class="ar-fill" cx="103" cy="65" rx="6.5" ry="5"/></g></g>',
    '    <g class="ar-face ar-face-thinking"><g class="ar-eyes">',
    '      ', EYE(73.5, 43, 5.4), EYE(132.5, 48, 5.4),
    '    </g><g class="ar-mouth">', ARC('M95 66 h16'), '</g></g>',
    '    <g class="ar-face ar-face-confused"><g class="ar-eyes">',
    '      ', EYE(72, 49, 4), EYE(133, 44, 6.4),
    '    </g><g class="ar-mouth">', ARC('M93 67 q5 -6 10 0 q5 6 10 0'), '</g></g>',
    '    <g class="ar-face ar-face-tired"><g class="ar-eyes">',
    '      <rect class="ar-eye-bar" x="67" y="46.2" width="13" height="3.6" rx="1.8"/>',
    '      <rect class="ar-eye-bar" x="126" y="46.2" width="13" height="3.6" rx="1.8"/>',
    '    </g><g class="ar-mouth">', ARC('M93 66 h20'), '</g></g>',
    '    <g class="ar-face ar-face-scared"><g class="ar-eyes">',
    '      ', EYE(73.5, 46, 8), '<circle class="ar-pupil" cx="73.5" cy="48" r="3.6"/>',
    '      ', EYE(132.5, 46, 8), '<circle class="ar-pupil" cx="132.5" cy="48" r="3.6"/>',
    '    </g><g class="ar-mouth">', ARC('M93 66 q10 -7 20 0'), '</g></g>',
    '    <g class="ar-face ar-face-proud"><g class="ar-eyes">',
    '      ', EYE(73.5, 45, 5.4), EYE(132.5, 45, 5.4),
    '    </g><g class="ar-mouth">', ARC('M89 63 q14 10 28 0'), '</g></g>',
    '    <ellipse class="ar-mouth-talk" cx="103" cy="65" rx="9" ry="7"/>',
    '  </g>',
    '</svg>'
  ].join('');

  let root, actor, robot, svg, bubble, badge, badgeLabel, bubbleText, fx, hideTimer;

  function buildDom() {
    root = document.createElement('div');
    root.id = 'ar-root';

    actor = document.createElement('div');
    actor.className = 'ar-actor';

    fx = document.createElement('div');
    fx.className = 'ar-fx';

    const shadow = document.createElement('div');
    shadow.className = 'ar-shadow';

    bubble = document.createElement('div');
    bubble.className = 'ar-bubble';
    bubble.innerHTML =
      '<div class="ar-bubble-head">' +
      '<span class="ar-badge"><span class="ar-dot"></span><span class="ar-badge-text">neutro</span></span>' +
      '<button class="ar-close" type="button" title="Fechar">&times;</button>' +
      '</div>' +
      '<div class="ar-text"></div>';
    badge = bubble.querySelector('.ar-badge');
    badgeLabel = bubble.querySelector('.ar-badge-text');
    bubbleText = bubble.querySelector('.ar-text');
    bubble.querySelector('.ar-close').addEventListener('click', () => hideBubble());

    robot = document.createElement('div');
    robot.className = 'ar-robot';
    robot.innerHTML = ROBOT_SVG;
    svg = robot.querySelector('.ar-svg');

    actor.appendChild(fx);
    actor.appendChild(shadow);
    actor.appendChild(bubble);
    actor.appendChild(robot);
    root.appendChild(actor);
    document.documentElement.appendChild(root);

    applySettings();
  }

  function applySettings() {
    if (!root) return;
    root.style.display = S.enabled ? '' : 'none';
    bubble.style.width = Math.max(200, S.bubbleWidth) + 'px';
    robot.style.width = Math.round(120 * S.scale) + 'px';
    robot.style.left = Math.round(80 - 60 * S.scale) + 'px';
    actor.style.width = Math.round(160 * S.scale) + 'px';
    fx.style.width = actor.style.width;
    fx.style.left = robot.style.left;
    const shadow = actor.querySelector('.ar-shadow');
    if (shadow) shadow.style.width = Math.round(96 * S.scale) + 'px';
  }

  /* ------------------------------------------------------------------ *
   * Motor de caminhada
   * ------------------------------------------------------------------ */

  const walk = {
    pos: 0,
    goal: null,
    last: 0,
    phase: 0,
    speed: 76,
    pauseUntil: 0
  };

  function bounds() {
    const w = Math.round(160 * S.scale);
    return { min: 4, max: Math.max(4, window.innerWidth - w - 8) };
  }

  function homeX() {
    const b = bounds();
    return b.max - 20;
  }

  function pickGoal() {
    const b = bounds();
    walk.goal = Math.round(b.min + Math.random() * (b.max - b.min));
    walk.pauseUntil = Date.now() + 1400 + Math.random() * 2200;
  }

  function tick(ts) {
    requestAnimationFrame(tick);
    if (!root) return;

    const dt = Math.min(0.05, (ts - walk.last) / 1000 || 0);
    walk.last = ts;

    const b = bounds();
    walk.pos = Math.max(b.min, Math.min(b.max, walk.pos));

    if (!S.walk) {
      walk.goal = homeX();
    } else {
      if (walk.goal === null) pickGoal();
      else if (Math.abs(walk.pos - walk.goal) < 1 && Date.now() > walk.pauseUntil) pickGoal();
    }

    const dx = (walk.goal || walk.pos) - walk.pos;
    const stepLen = Math.sign(dx) * Math.min(Math.abs(dx), walk.speed * dt);
    const before = walk.pos;
    walk.pos += stepLen;
    const moved = walk.pos - before;

    // ciclo de passos acompanha a distância percorrida (não o tempo)
    walk.phase += (moved / 92) * Math.PI * 2;

    const swing = Math.sin(walk.phase);
    const swing2 = Math.sin(walk.phase * 2);
    const moving = Math.min(1, Math.abs(moved) / 0.35);

    svg.style.setProperty('--ar-leg-l', (swing * 20 * moving).toFixed(2) + 'deg');
    svg.style.setProperty('--ar-leg-r', (-swing * 20 * moving).toFixed(2) + 'deg');
    svg.style.setProperty('--ar-arm-l', (-swing * 9 * moving).toFixed(2) + 'deg');
    svg.style.setProperty('--ar-arm-r', (swing * 9 * moving).toFixed(2) + 'deg');

    const bob = -Math.abs(swing2) * 3.4 * moving;
    const lean = Math.sign(moved) * 2.2 * moving;
    svg.style.transform = 'translateY(' + bob.toFixed(2) + 'px) rotate(' + lean.toFixed(2) + 'deg)';

    actor.style.transform = 'translateX(' + walk.pos.toFixed(1) + 'px)';

    // mantém o balão dentro da viewport
    const flip = walk.pos + 80 * S.scale + S.bubbleWidth / 2 > window.innerWidth - 8;
    bubble.classList.toggle('ar-left', flip);
  }

  /* ------------------------------------------------------------------ *
   * Balão, digitação e voz
   * ------------------------------------------------------------------ */

  let typeTimer = null;
  let typeResolve = null;

  function hideBubble() {
    clearTimeout(hideTimer);
    bubble.classList.remove('ar-visible', 'ar-typing');
  }

  function showBubble(reaction, text) {
    const r = REACTIONS[reaction] || REACTIONS.neutral;
    badge.style.color = r.color;
    badge.style.background = r.color + '1f';
    badgeLabel.textContent = r.label;
    badge.style.display = S.badge ? '' : 'none';
    bubble.classList.add('ar-visible');
    clearTimeout(hideTimer);
    if (S.hideAfterMs > 0) {
      hideTimer = setTimeout(hideBubble, S.hideAfterMs);
    }
  }

  function typeText(text, done) {
    clearInterval(typeTimer);
    if (typeResolve) { const prev = typeResolve; typeResolve = null; prev(); }
    bubbleText.textContent = '';
    bubble.classList.add('ar-typing');
    svg.classList.add('is-speaking');

    const full = text.length > 900 ? text.slice(0, 900) + '…' : text;
    if (!full) {
      bubble.classList.remove('ar-typing');
      svg.classList.remove('is-speaking');
      done && done();
      return;
    }

    const perChar = Math.max(8, Math.min(42, 1400 / full.length));
    let i = 0;
    typeResolve = done || null;
    typeTimer = setInterval(() => {
      i++;
      bubbleText.textContent = full.slice(0, i);
      bubble.scrollTop = bubble.scrollHeight;
      if (i >= full.length) {
        clearInterval(typeTimer);
        bubble.classList.remove('ar-typing');
        svg.classList.remove('is-speaking');
        const r = typeResolve;
        typeResolve = null;
        r && r();
      }
    }, perChar);
  }

  function speak(text) {
    if (!S.speak || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 900));
      u.lang = 'pt-BR';
      u.rate = S.ttsRate;
      u.pitch = S.ttsPitch;
      const voices = speechSynthesis.getVoices() || [];
      const v = voices.find((x) => x.name === S.ttsVoice) ||
                voices.find((x) => /^pt[-_]BR/i.test(x.lang)) ||
                voices.find((x) => /^pt/i.test(x.lang)) ||
                voices.find((x) => /^pt/i.test(x.name));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* TTS é opcional */ }
  }

  /* ------------------------------------------------------------------ *
   * Efeitos de reação
   * ------------------------------------------------------------------ */

  function setFace(face) {
    svg.setAttribute('data-face', face);
  }

  let reactionTimer = null;

  function playReaction(reaction) {
    const r = REACTIONS[reaction] || REACTIONS.neutral;
    robot.className = 'ar-robot';
    // reinicia a animação
    void robot.offsetWidth;
    robot.classList.add('ar-react-' + r.anim);
    clearTimeout(reactionTimer);
    reactionTimer = setTimeout(() => robot.classList.remove('ar-react-' + r.anim), 2600);
  }

  function spawnFx(reaction) {
    const r = REACTIONS[reaction] || REACTIONS.neutral;
    if (!r.fx.length) return;
    const n = reaction === 'celebrate' ? 10 : 5;
    for (let i = 0; i < n; i++) {
      const [kind, glyph] = r.fx[i % r.fx.length];
      const p = document.createElement('span');
      p.className = 'ar-p ' + (kind === 'drop' ? 'fall' : kind === 'steam' ? 'rise' : kind === 'zzz' ? 'drift' : 'rise');
      p.dataset.kind = kind;
      p.textContent = glyph;
      p.style.setProperty('--ar-dx', (Math.random() * 70 - 35).toFixed(0) + 'px');
      p.style.left = (60 + Math.random() * 40).toFixed(0) + 'px';
      p.style.animationDelay = (i * 0.12).toFixed(2) + 's';
      fx.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }

  /* ------------------------------------------------------------------ *
   * Entrega da mensagem
   * ------------------------------------------------------------------ */

  let deliveryToken = 0;

  async function deliver(text) {
    const token = ++deliveryToken;
    const react = detectReaction(text);
    const r = REACTIONS[react.id] || REACTIONS.neutral;

    // fala imediatamente: o robô continua andando enquanto o balão transcreve
    setFace(r.face);
    showBubble(react.id, text);
    playReaction(react.id);
    spawnFx(react.id);
    speak(text);

    await new Promise((resolve) => {
      typeText(text, resolve);
    });
    if (token !== deliveryToken) return;
  }

  function waitFor(x, timeout) {
    return new Promise((resolve) => {
      const started = Date.now();
      const iv = setInterval(() => {
        if (Math.abs(walk.pos - x) < 6 || Date.now() - started > timeout) {
          clearInterval(iv);
          resolve();
        }
      }, 60);
    });
  }
  /* ------------------------------------------------------------------ *
   * Leitura das mensagens do assistente
   *
   * Estratégia em três camadas:
   *   1. seletor manual (escolhido pelo usuário no popup) — tem prioridade;
   *   2. marcadores explícitos no DOM (data-role="assistant", classes, ...);
   *   3. descoberta estrutural: acha a lista de mensagens, classifica cada
   *      item como assistente/usuário/desconhecido e devolve os do assistente.
   * ------------------------------------------------------------------ */

  const ASSISTANT_SELECTORS = [
    '[data-role="assistant"]',
    '[data-role="agent"]',
    '[data-role="bot"]',
    '[data-role="model"]',
    '[data-author="assistant"]',
    '[data-author="agent"]',
    '[data-author="ai"]',
    '[data-message-author-role="assistant"]',
    '[data-message-author-role="agent"]',
    '[data-message-author="assistant"]',
    '[data-message-role="assistant"]',
    '[data-author-role="assistant"]',
    '[data-sender="assistant"]',
    '[data-testid*="assistant" i]',
    '[data-testid*="agent" i]',
    '[data-testid*="bot" i]',
    '[data-testid*="mcode" i]',
    '[data-testid*="mavis" i]',
    '[data-testid*="minimax" i]',
    '[class*="assistant" i]',
    '[class*="agent-message" i]',
    '[class*="bot-message" i]',
    '[class*="ai-message" i]',
    '[class*="assistant-message" i]',
    '[class*="model-response" i]',
    '[class*="gpt" i]',
    '[class*="mcode" i]',
    '[class*="mavis" i]',
    '[class*="minimax" i]',
    'article[class*="reply" i]',
    '[class*="markdown-body" i]'
  ];

  const ASSISTANT_WORDS = /(assistant|assistente|agente|\bagent\b|\bbot\b|\bai\b|modelo|\bmodel\b|gpt|gemini|claude|mcode|mavis|minimax)/i;
  const USER_WORDS = /(user|usuário|usuario|humano|human|\beu\b|\bme\b|customer|cliente|prompt|pergunta|question)/i;

  let activeSelector = '';
  let activeMode = '';
  let lastText = '';
  let settleTimer = null;
  let detectTimer = null;
  let group = null;
  let groupAt = 0;
  const GROUP_TTL = 3000;

  function ownNode(el) {
    return !!(el && el.closest && el.closest('#ar-root'));
  }

  function textOf(el) {
    return cleanText(el.innerText || el.textContent || '');
  }

  /** Classifica um item da lista de mensagens. */
  function classifyItem(el, parentRect) {
    const sig = [
      el.getAttribute('data-role'),
      el.getAttribute('data-author'),
      el.getAttribute('data-message-author-role'),
      el.getAttribute('data-message-role'),
      el.getAttribute('data-author-role'),
      el.getAttribute('data-sender'),
      el.getAttribute('aria-label'),
      el.getAttribute('itemprop'),
      el.getAttribute('class'),
      el.id
    ].filter(Boolean).join(' ');

    if (ASSISTANT_WORDS.test(sig)) return 'assistant';
    if (USER_WORDS.test(sig)) return 'user';

    // alinhamento: em chat LTR o usuário costuma ficar à direita
    const r = el.getBoundingClientRect();
    if (r.width && parentRect && parentRect.width) {
      const rel = (r.left - parentRect.left) / parentRect.width;
      if (rel > 0.55) return 'user';
      if (rel < 0.3) return 'assistant';
    }
    return 'unknown';
  }

  /** Procura listas de mensagens: irmãos repetidos (mesma tag + classe) com texto. */
  function structuralCandidates() {
    const out = [];
    const nodes = document.querySelectorAll('body *');
    let visited = 0;
    for (const el of nodes) {
      if (++visited > 6000) break;
      if (ownNode(el)) continue;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      const kids = Array.from(el.children).filter((k) => !ownNode(k));
      if (kids.length < 2 || kids.length > 40) continue;
      const buckets = new Map();
      for (const k of kids) {
        const sig = k.tagName + '|' + (k.getAttribute('class') || '');
        if (!buckets.has(sig)) buckets.set(sig, []);
        buckets.get(sig).push(k);
      }
      for (const [sig, items] of buckets) {
        if (items.length < 2) continue;
        let substantial = 0;
        for (const it of items) {
          if (textOf(it).length > 12) substantial++;
        }
        if (substantial < 2) continue;
        out.push({ parent: el, sig: sig, items: items });
      }
    }
    return out;
  }

  function detectGroup() {
    // camada 2 — marcadores explícitos
    for (const sel of ASSISTANT_SELECTORS) {
      let els = [];
      try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { continue; }
      const good = els.filter((el) => !ownNode(el) && textOf(el).length > 8);
      if (good.length) {
        return {
          mode: 'marcador',
          selector: sel,
          parent: good[0].parentElement,
          sig: null,
          items: good,
          roles: good.map(() => 'assistant')
        };
      }
    }

    // camada 3 — descoberta estrutural
    const cands = structuralCandidates();
    if (!cands.length) return null;

    let best = null;
    for (const c of cands) {
      const pr = c.parent.getBoundingClientRect();
      const roles = c.items.map((it) => classifyItem(it, pr));
      const nA = roles.filter((r) => r === 'assistant').length;
      const nU = roles.filter((r) => r === 'user').length;
      const nX = roles.filter((r) => r === 'unknown').length;

      let score;
      if (nA) score = 1000 + nA * 10 - nU * 5;
      else if (nU) score = 500 + nX * 10;
      else score = 100 + (nX % 2 === 0 ? 20 : 0);
      score += Math.min(c.items.length, 20);

      if (!best || score > best.score) {
        best = { mode: 'estrutura', selector: '', parent: c.parent, sig: c.sig, items: c.items, roles: roles, score: score };
      }
    }
    return best;
  }

  function currentGroup() {
    const now = Date.now();
    if (group && group.parent && group.parent.isConnected && now - groupAt < GROUP_TTL) {
      if (group.sig) {
        // re-coleciona os itens do mesmo grupo (pode ter mensagem nova)
        const kids = Array.from(group.parent.children).filter((k) => !ownNode(k));
        const same = kids.filter((k) => k.tagName + '|' + (k.getAttribute('class') || '') === group.sig);
        if (same.length) {
          group.items = same;
          group.roles = same.map((it) => classifyItem(it, group.parent.getBoundingClientRect()));
          return group;
        }
      } else if (group.selector) {
        // modo marcador: reconsulta o seletor para enxergar mensagens novas
        let els = [];
        try { els = Array.from(document.querySelectorAll(group.selector)); } catch (e) { els = []; }
        const good = els.filter((el) => !ownNode(el) && textOf(el).length > 8);
        if (good.length) {
          group.items = good;
          group.roles = good.map(() => 'assistant');
        }
        return group;
      } else {
        return group;
      }
    }
    group = detectGroup();
    groupAt = now;
    if (group) {
      activeMode = group.mode;
      activeSelector = group.selector || '';
    }
    return group;
  }

  /** Itens que pertencem ao assistente dentro do grupo detectado. */
  function assistantItems(g) {
    if (!g || !g.items.length) return [];
    const roles = g.roles || [];
    const nA = roles.filter((r) => r === 'assistant').length;
    const nU = roles.filter((r) => r === 'user').length;

    if (nA) {
      return g.items.filter((it, i) => roles[i] === 'assistant' || (roles[i] === 'unknown' && !nU));
    }
    if (nU) {
      // só o usuário é marcado: o resto é do assistente
      return g.items.filter((it, i) => roles[i] === 'unknown');
    }
    // nada marcado: chats alternam usuário/assistente — a última resposta é do assistente
    const n = g.items.length;
    const idx = n % 2 === 0 ? n - 1 : n - 2;
    return idx >= 0 ? [g.items[idx]] : [];
  }

  const ROLE_LABEL = /^(assistant|agente|bot|robo|robô|ia|ai|modelo|model|eu|you|sistema|system|user|usuário|usuario|mcode|mavis|minimax|reply|resposta)$/i;

  /**
   * Extrai o texto da mensagem ignorando o rótulo do autor
   * (muitos chats trazem um cabeçalho "Assistant" acima do conteúdo).
   */
  function extractMessage(el) {
    let txt = cleanText(el.innerText || el.textContent || '');
    const lines = txt.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      const first = lines[0];
      const rich = el.children && el.children.length > 1;
      const shout = first === first.toUpperCase() && first.length <= 12 && /[A-ZÀ-Ý]/.test(first);
      if (ROLE_LABEL.test(first) || (rich && shout)) {
        lines.shift();
        txt = lines.join('\n');
      }
    }
    return txt;
  }

  function readMessages() {
    // camada 1 — seletor manual
    if (S.selector) {
      let els = [];
      try { els = Array.from(document.querySelectorAll(S.selector)); } catch (e) { return []; }
      return els.filter((el) => !ownNode(el)).map(extractMessage).filter(Boolean);
    }
    const g = currentGroup();
    return assistantItems(g).map(extractMessage).filter(Boolean);
  }

  function scan() {
    if (!S.enabled) return;
    const messages = readMessages();
    if (root) {
      root.dataset.arMode = S.selector ? 'manual' : (activeMode || 'nenhum');
      root.dataset.arCount = String(messages.length);
    }
    if (!messages.length) return;
    const text = messages[messages.length - 1];
    if (!text || text === lastText) return;
    lastText = text;
    deliver(text);
  }

  function scheduleScan() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(scan, Math.max(150, S.settleMs));
  }

  function startObserver() {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (ownNode(m.target)) continue;
        scheduleScan();
        break;
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function ensureSelector() {
    if (S.selector) {
      activeSelector = S.selector;
      activeMode = 'manual';
      return activeSelector;
    }
    const g = currentGroup();
    if (g) {
      activeMode = g.mode;
      activeSelector = g.selector || '';
    }
    return activeSelector;
  }

  /* ------------------------------------------------------------------ *
   * Modo de seleção manual (picker)
   * ------------------------------------------------------------------ */

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) {
      const s = '#' + CSS.escape(el.id);
      try { if (document.querySelectorAll(s).length === 1) return s; } catch (e) { /* ignore */ }
    }
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
      let part = node.tagName.toLowerCase();
      const cls = (node.getAttribute('class') || '')
        .split(/\s+/)
        .filter((c) => c && c.indexOf('ar-') !== 0 && c.indexOf('is-') !== 0)
        .slice(0, 2);
      if (cls.length) part += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const parent = node.parentElement;
      if (parent) {
        const sibs = Array.prototype.filter.call(parent.children, (c) => c.tagName === node.tagName);
        if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      const test = parts.join(' > ');
      try { if (document.querySelectorAll(test).length === 1) return test; } catch (e) { /* ignore */ }
      node = parent;
    }
    return parts.join(' > ');
  }

  function startPicker() {
    const box = document.createElement('div');
    box.className = 'ar-picker-box';
    const tip = document.createElement('div');
    tip.className = 'ar-picker-tip';
    tip.textContent = 'Clique na mensagem do assistente para vincular o robô a ela (ESC cancela)';
    document.documentElement.appendChild(box);
    document.documentElement.appendChild(tip);

    let hovered = null;
    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el.closest('#ar-root') || el === box || el === tip) { box.style.display = 'none'; hovered = null; return; }
      hovered = el;
      const r = el.getBoundingClientRect();
      box.style.display = 'block';
      box.style.left = r.left - 2 + 'px';
      box.style.top = r.top - 2 + 'px';
      box.style.width = r.width + 4 + 'px';
      box.style.height = r.height + 4 + 'px';
    };
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sel = cssPath(hovered || document.elementFromPoint(e.clientX, e.clientY));
      cleanup();
      if (sel) {
        S.selector = sel;
        activeSelector = sel;
        lastText = '';
        save({ selector: sel });
        scan();
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') cleanup(); };
    function cleanup() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      box.remove();
      tip.remove();
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  /* ------------------------------------------------------------------ *
   * Armazenamento e mensagens do popup
   * ------------------------------------------------------------------ */

  function save(patch) {
    Object.assign(S, patch);
    try { chrome.storage.local.set(patch); } catch (e) { /* ignore */ }
  }

  function loadSettings() {
    try {
      chrome.storage.local.get(DEFAULTS, (items) => {
        Object.assign(S, items || {});
        applySettings();
        walk.pos = homeX();
        walk.goal = null;
        ensureSelector();
        scan();
      });
    } catch (e) {
      walk.pos = homeX();
      ensureSelector();
    }
  }

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'ar-pick') { startPicker(); sendResponse({ ok: true }); }
      else if (msg.type === 'ar-scan') { ensureSelector(); scan(); sendResponse({ ok: true, selector: activeSelector }); }
      else if (msg.type === 'ar-reset') {
        save({ selector: '' });
        group = null;
        groupAt = 0;
        lastText = '';
        ensureSelector();
        scan();
        sendResponse({ ok: true, selector: activeSelector, mode: activeMode });
      }
      else if (msg.type === 'ar-state') {
        const msgs = readMessages();
        if (root) {
          root.dataset.arMode = S.selector ? 'manual' : (activeMode || 'nenhum');
          root.dataset.arCount = String(msgs.length);
        }
        sendResponse({
          ok: true,
          selector: activeSelector || S.selector,
          mode: S.selector ? 'manual' : (activeMode || ''),
          count: msgs.length,
          enabled: S.enabled, walk: S.walk, speak: S.speak, lastText: lastText
        });
      } else if (msg.type === 'ar-set') { save(msg.patch || {}); applySettings(); sendResponse({ ok: true }); }
      return true;
    });
  } catch (e) { /* ignore */ }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      Object.keys(changes).forEach((k) => { S[k] = changes[k].newValue; });
      applySettings();
      ensureSelector();
    });
  } catch (e) { /* ignore */ }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  buildDom();
  loadSettings();
  requestAnimationFrame((t) => { walk.last = t; requestAnimationFrame(tick); });

  const onResize = () => { walk.pos = Math.min(walk.pos, bounds().max); };
  window.addEventListener('resize', onResize);

  detectTimer = setInterval(() => {
    if (S.selector) return;
    const before = activeMode + '|' + activeSelector;
    group = null;          // força nova descoberta
    groupAt = 0;
    const found = ensureSelector();
    if (!found && !assistantItems(currentGroup()).length) return;
    if (before !== activeMode + '|' + activeSelector) {
      lastText = '';
      scheduleScan();
    }
  }, 5000);

  startObserver();
})();
