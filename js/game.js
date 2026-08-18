(() => {
  "use strict";

  const W = 1280;
  const H = 720;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const bootEl = document.getElementById("boot");

  const GRAVITY = 1860;
  const MAX_FALL = 980;
  const RUN_SPEED = 355;
  const AIR_SPEED = 340;
  const JUMP_V = -820;
  const JUMP_V2 = -740;
  const ENEMY_PACE = 0.58;
  const COYOTE = 0.11;
  const JUMP_BUF = 0.13;
  const TORSO = 124;
  const SHOOT_CD = 0.16;
  const MISSILE_SPD = 700;
  const INVULN = 1.15;

  const STATE = {
    TITLE: "title",
    CALIBRATE: "calibrate",
    INTRO: "intro",
    PLAY: "play",
    BOSS_IN: "bossin",
    CLEAR: "clear",
    DEAD: "dead",
    GAMEOVER: "gameover",
    WIN: "win",
  };

  const ASSET_LIST = {
    hero_idle: "assets/sprites/hero_idle.png",
    hero_jump: "assets/sprites/hero_jump.png",
    hero_shoot: "assets/sprites/hero_shoot.png",
    hero_hurt: "assets/sprites/hero_hurt.png",
    hero_crouch: "assets/sprites/hero_crouch.png",
    hero_run1: "assets/sprites/hero_run1.png",
    hero_run2: "assets/sprites/hero_run2.png",
    hero_run3: "assets/sprites/hero_run3.png",
    hero_run4: "assets/sprites/hero_run4.png",
    missile: "assets/sprites/missile.png",
    dark_missile: "assets/sprites/dark_missile.png",
    platform: "assets/sprites/platform.png",
    spear: "assets/sprites/spear.png",
    spear2: "assets/sprites/spear2.png",
    asura: "assets/sprites/asura.png",
    preta: "assets/sprites/preta.png",
    oni: "assets/sprites/oni.png",
    kitsune: "assets/sprites/kitsune.png",
    hoplite: "assets/sprites/hoplite.png",
    bird: "assets/sprites/bird.png",
    draugr: "assets/sprites/draugr.png",
    wraith: "assets/sprites/wraith.png",
    mummy: "assets/sprites/mummy.png",
    anubis: "assets/sprites/anubis.png",
    mara: "assets/sprites/mara.png",
    orochi: "assets/sprites/orochi.png",
    minotaur: "assets/sprites/minotaur.png",
    fenrir: "assets/sprites/fenrir.png",
    apep: "assets/sprites/apep.png",
    lotus_hp: "assets/ui/lotus_hp.png",
    bg_naraka: "assets/bg/naraka.jpg",
    bg_japan: "assets/bg/japan.jpg",
    bg_greece: "assets/bg/greece.jpg",
    bg_norse: "assets/bg/norse.jpg",
    bg_egypt: "assets/bg/egypt.jpg",
    bg_title: "assets/bg/title.jpg",
  };

  const images = {};
  const keys = Object.create(null);
  const just = Object.create(null);

  let audio = null;
  let muted = false;
  let state = STATE.TITLE;
  let stageIndex = 0;
  let stage = null;
  let player = null;
  let camera = { x: 0, y: 0, shake: 0, lock: false, lockX: 0 };
  let bullets = [];
  let eBullets = [];
  let enemies = [];
  let pickups = [];
  let particles = [];
  let boss = null;
  let hud = {
    score: 0,
    lives: 3,
    best: 0,
    banner: "",
    bannerT: 0,
    charge: 0,
    introT: 0,
    clearT: 0,
    deadT: 0,
    titlePulse: 0,
    flash: 0,
  };
  let time = 0;
  let last = 0;
  let paused = false;
  let camUi = { settings: null, retry: null };

  const VIEW_MODES = [
    { id: "720", name: "720p", w: 1280, h: 720 },
    { id: "1080", name: "1080p", w: 1920, h: 1080 },
    { id: "1440", name: "1440p", w: 2560, h: 1440 },
    { id: "2160", name: "4K", w: 3840, h: 2160 },
    { id: "fit", name: "Fit screen", fit: true },
  ];
  let viewMode = document.documentElement.classList.contains("desktop") ? 4 : 1;
  let view = { scale: 1, cssW: 1280, cssH: 720 };

  function currentView() {
    return VIEW_MODES[viewMode] || VIEW_MODES[1];
  }

  function applyView(ox, oy) {
    const s = view.scale || 1;
    ctx.setTransform(s, 0, 0, s, (ox || 0) * s, (oy || 0) * s);
  }

  function applyResolution() {
    const mode = currentView();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const desk = document.documentElement.classList.contains("desktop");
    const maxW = Math.max(320, window.innerWidth - (desk ? 0 : 36));
    const maxH = Math.max(180, window.innerHeight - (desk ? 0 : 72));
    let cssW;
    let cssH;
    if (mode.fit) {
      if (maxW / maxH > W / H) {
        cssH = maxH;
        cssW = maxH * (W / H);
      } else {
        cssW = maxW;
        cssH = maxW * (H / W);
      }
    } else {
      cssW = mode.w;
      cssH = mode.h;
      const f = Math.min(1, maxW / cssW, maxH / cssH);
      cssW *= f;
      cssH *= f;
    }
    view.cssW = cssW;
    view.cssH = cssH;
    view.scale = (cssW * dpr) / W;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
  }

  function cycleResolution() {
    viewMode = (viewMode + 1) % VIEW_MODES.length;
    try {
      localStorage.setItem("bodhi.res", currentView().id);
    } catch (err) {}
    applyResolution();
  }

  function viewLabel() {
    const m = currentView();
    if (m.fit) return "Fit screen";
    return m.w + " × " + m.h;
  }

  try {
    const saved = localStorage.getItem("bodhi.res");
    const idx = VIEW_MODES.findIndex((m) => m.id === saved);
    if (idx >= 0) viewMode = idx;
  } catch (err) {}

  const ENEMY = {
    asura: { sprite: "asura", hp: 7, speed: 124, w: 70, h: 140, kind: "walker", score: 260, scale: 1.38 },
    preta: { sprite: "preta", hp: 2, speed: 62, w: 58, h: 108, kind: "flyer", score: 160, scale: 1.05 },
    oni: { sprite: "oni", hp: 10, speed: 80, w: 78, h: 148, kind: "bruiser", score: 380, scale: 1.15 },
    kitsune: { sprite: "kitsune", hp: 2, speed: 90, w: 70, h: 96, kind: "blink", score: 260, scale: 1.1 },
    hoplite: { sprite: "hoplite", hp: 9, speed: 92, w: 64, h: 132, kind: "shield", score: 300, scale: 1.08 },
    bird: { sprite: "bird", hp: 2, speed: 110, w: 78, h: 70, kind: "swoop", score: 220, scale: 1.15 },
    draugr: { sprite: "draugr", hp: 13, speed: 78, w: 70, h: 140, kind: "walker", score: 360, scale: 1.12 },
    wraith: { sprite: "wraith", hp: 3, speed: 80, w: 64, h: 112, kind: "flyer", score: 240, scale: 1.08 },
    mummy: { sprite: "mummy", hp: 8, speed: 76, w: 58, h: 132, kind: "shooter", score: 320, scale: 1.08 },
    anubis: { sprite: "anubis", hp: 9, speed: 128, w: 60, h: 140, kind: "hunter", score: 400, scale: 1.1 },
  };

  const BOSSES = {
    mara: { sprite: "mara", name: "MARA", title: "Lord of Illusion", hp: 42, w: 150, h: 230, score: 5000 },
    orochi: { sprite: "orochi", name: "YAMATA NO OROCHI", title: "Eight-Headed Calamity", hp: 54, w: 220, h: 200, score: 7000 },
    minotaur: { sprite: "minotaur", name: "MINOTAUR", title: "Bronze of the Labyrinth", hp: 58, w: 150, h: 230, score: 8000 },
    fenrir: { sprite: "fenrir", name: "FENRIR", title: "The Unbound Wolf", hp: 68, w: 230, h: 180, score: 10000 },
    apep: { sprite: "apep", name: "APEP", title: "Devourer of the Sun", hp: 82, w: 240, h: 200, score: 14000 },
  };

  const L1 = 472;
  const L2 = 364;
  const L3 = 268;

  function plat(x, y, w, extra) {
    const p = { x, y, w, h: 28, ox: x, oy: y, dx: 0, dy: 0, t: 0 };
    if (extra) Object.assign(p, extra);
    return p;
  }
  function lift(x, y, w, moveX, period) {
    return plat(x, y, w, { moveX, moveT: period || 2.6 });
  }
  function hoist(x, y, w, moveY, period) {
    return plat(x, y, w, { moveY, moveT: period || 2.8 });
  }

  function STAGES() {
    return [
      {
        id: "naraka",
        name: "NARAKA",
        subtitle: "The Crimson Court",
        myth: "Buddhist · Stage I",
        bg: "bg_naraka",
        width: 8000,
        ground: 598,
        fog: "rgba(90, 16, 12, 0.20)",
        accent: "#ff6a3a",
        particle: "ember",
        holes: [
          { x: 1680, w: 340 },
          { x: 3120, w: 420 },
          { x: 4780, w: 300 },
        ],
        platforms: [
          plat(560, L1, 180),
          plat(840, L2, 160),
          plat(1120, L3, 240),
          plat(1460, L3, 420),
          plat(1980, L2, 140),
          plat(2220, L1, 170),
          plat(2580, L1, 200),
          plat(2880, L2, 150),
          plat(3080, L3, 180),
          plat(3340, L2, 130),
          plat(3560, L1, 150),
          plat(3840, L2, 190),
          plat(4160, L3, 520),
          plat(4760, L2, 140),
          plat(5020, L1, 200),
          plat(5360, L2, 180),
          plat(5680, L1, 220),
          plat(6040, L2, 200),
          lift(2460, L2, 130, 70, 2.5),
        ],
        spawns: [
          { type: "preta", x: 700, y: 320 },
          { type: "asura", x: 980 },
          { type: "asura", x: 1560, y: L3 },
          { type: "preta", x: 1900, y: 250 },
          { type: "asura", x: 2340 },
          { type: "asura", x: 2700 },
          { type: "preta", x: 3200, y: 200 },
          { type: "asura", x: 3600 },
          { type: "asura", x: 4300, y: L3 },
          { type: "preta", x: 4560, y: 180 },
          { type: "asura", x: 5200 },
          { type: "preta", x: 5600, y: 280 },
          { type: "asura", x: 6120 },
        ],
        pickups: [
          { type: "lotus", x: 1240, y: L3 - 40 },
          { type: "lotus", x: 3420, y: L2 - 40 },
          { type: "lotus", x: 4400, y: L3 - 40 },
        ],
        bossAt: 7050,
        boss: "mara",
        hpMul: 1,
        spdMul: 1.0,
      },
      {
        id: "japan",
        name: "YOMI",
        subtitle: "Night of a Thousand Torii",
        myth: "Japanese · Stage II",
        bg: "bg_japan",
        width: 8400,
        ground: 598,
        fog: "rgba(28, 16, 48, 0.22)",
        accent: "#c9a0ff",
        particle: "petal",
        holes: [
          { x: 1480, w: 380 },
          { x: 2920, w: 360 },
          { x: 4560, w: 440 },
          { x: 6180, w: 260 },
        ],
        platforms: [
          plat(640, L1, 160),
          plat(900, L2, 140),
          plat(1140, L3, 200),
          plat(1400, L3, 180),
          plat(1660, L2, 120),
          plat(1880, L3, 150),
          plat(2100, L1, 160),
          plat(2420, L1, 190),
          plat(2680, L2, 140),
          plat(2880, L3, 160),
          plat(3120, L2, 120),
          plat(3340, L1, 140),
          plat(3620, L2, 180),
          plat(3920, L3, 280),
          plat(4280, L3, 160),
          plat(4520, L2, 130),
          lift(4780, L2, 140, 90, 2.3),
          plat(5080, L3, 160),
          plat(5340, L1, 180),
          plat(5680, L2, 200),
          plat(6000, L3, 180),
          plat(6280, L2, 130),
          plat(6520, L1, 180),
          hoist(2360, L2, 120, 50, 2.7),
        ],
        spawns: [
          { type: "oni", x: 780 },
          { type: "kitsune", x: 1200, y: 200 },
          { type: "oni", x: 1520, y: L3 },
          { type: "kitsune", x: 1960, y: 180 },
          { type: "oni", x: 2500 },
          { type: "kitsune", x: 3000, y: 190 },
          { type: "oni", x: 3400 },
          { type: "oni", x: 4040, y: L3 },
          { type: "kitsune", x: 4380, y: 180 },
          { type: "oni", x: 5200 },
          { type: "kitsune", x: 5760, y: 220 },
          { type: "oni", x: 6080, y: L3 },
          { type: "oni", x: 6680 },
        ],
        pickups: [
          { type: "lotus", x: 1180, y: L3 - 40 },
          { type: "lotus", x: 4000, y: L3 - 40 },
          { type: "lotus", x: 5120, y: L3 - 40 },
        ],
        bossAt: 7500,
        boss: "orochi",
        hpMul: 1.05,
        spdMul: 1.0,
      },
      {
        id: "greece",
        name: "TARTARUS",
        subtitle: "Marble and Bronze",
        myth: "Greek · Stage III",
        bg: "bg_greece",
        width: 8600,
        ground: 598,
        fog: "rgba(24, 16, 46, 0.24)",
        accent: "#d4b36a",
        particle: "dust",
        holes: [
          { x: 1260, w: 300 },
          { x: 2680, w: 460 },
          { x: 4320, w: 280 },
          { x: 5480, w: 360 },
          { x: 6680, w: 240 },
        ],
        platforms: [
          plat(520, L1, 150),
          plat(760, L2, 130),
          plat(980, L3, 220),
          plat(1240, L3, 200),
          plat(1520, L2, 110),
          plat(1740, L1, 140),
          plat(2060, L1, 180),
          plat(2320, L2, 140),
          plat(2540, L3, 160),
          plat(2780, L2, 110),
          plat(2980, L3, 130),
          plat(3200, L2, 110),
          plat(3400, L1, 140),
          plat(3720, L2, 200),
          plat(4040, L3, 360),
          plat(4480, L2, 120),
          plat(4720, L1, 160),
          plat(5040, L2, 160),
          plat(5280, L3, 180),
          lift(5520, L2, 130, 80, 2.2),
          plat(5820, L3, 150),
          plat(6060, L1, 170),
          plat(6380, L2, 180),
          plat(6660, L3, 160),
          plat(6900, L1, 180),
          hoist(1980, L2, 110, 46, 2.5),
        ],
        spawns: [
          { type: "hoplite", x: 700 },
          { type: "bird", x: 1040, y: 180 },
          { type: "hoplite", x: 1320, y: L3 },
          { type: "bird", x: 1700, y: 200 },
          { type: "hoplite", x: 2140 },
          { type: "bird", x: 2600, y: 170 },
          { type: "hoplite", x: 3040, y: L3 },
          { type: "bird", x: 3480, y: 190 },
          { type: "hoplite", x: 4160, y: L3 },
          { type: "bird", x: 4600, y: 180 },
          { type: "hoplite", x: 5100 },
          { type: "bird", x: 5600, y: 170 },
          { type: "hoplite", x: 6120 },
          { type: "hoplite", x: 6720, y: L3 },
          { type: "bird", x: 7000, y: 220 },
        ],
        pickups: [
          { type: "lotus", x: 1080, y: L3 - 40 },
          { type: "lotus", x: 3000, y: L3 - 40 },
          { type: "lotus", x: 4200, y: L3 - 40 },
        ],
        bossAt: 7700,
        boss: "minotaur",
        hpMul: 1.1,
        spdMul: 1.08,
      },
      {
        id: "norse",
        name: "NIFLHEIM",
        subtitle: "The Frost That Remembers",
        myth: "Norse · Stage IV",
        bg: "bg_norse",
        width: 8800,
        ground: 598,
        fog: "rgba(18, 36, 52, 0.28)",
        accent: "#7fd0ff",
        particle: "snow",
        holes: [
          { x: 1380, w: 420 },
          { x: 2860, w: 380 },
          { x: 4440, w: 500 },
          { x: 6120, w: 360 },
        ],
        platforms: [
          plat(600, L1, 160),
          plat(860, L2, 140),
          plat(1100, L3, 180),
          plat(1360, L2, 130),
          lift(1600, L2, 140, 100, 2.8),
          plat(1900, L3, 140),
          plat(2140, L1, 150),
          plat(2480, L1, 170),
          plat(2740, L2, 130),
          lift(3000, L3, 140, 80, 2.4),
          plat(3280, L2, 120),
          plat(3500, L1, 150),
          plat(3840, L2, 180),
          plat(4140, L3, 200),
          lift(4460, L2, 150, 110, 3.0),
          plat(4800, L3, 140),
          hoist(5040, L2, 130, 60, 2.6),
          plat(5300, L1, 160),
          plat(5660, L2, 180),
          plat(5960, L3, 170),
          lift(6240, L2, 140, 90, 2.5),
          plat(6540, L1, 160),
          plat(6880, L2, 190),
          plat(7200, L1, 200),
        ],
        spawns: [
          { type: "draugr", x: 780 },
          { type: "wraith", x: 1180, y: 200 },
          { type: "draugr", x: 1960, y: L3 },
          { type: "wraith", x: 2300, y: 190 },
          { type: "draugr", x: 2580 },
          { type: "wraith", x: 3180, y: 180 },
          { type: "draugr", x: 3580 },
          { type: "draugr", x: 4220, y: L3 },
          { type: "wraith", x: 4680, y: 170 },
          { type: "draugr", x: 5400 },
          { type: "wraith", x: 5800, y: 200 },
          { type: "draugr", x: 6040, y: L3 },
          { type: "wraith", x: 6500, y: 210 },
          { type: "draugr", x: 7000 },
        ],
        pickups: [
          { type: "lotus", x: 1140, y: L3 - 40 },
          { type: "lotus", x: 4220, y: L3 - 40 },
          { type: "lotus", x: 5080, y: L2 - 50 },
        ],
        bossAt: 7900,
        boss: "fenrir",
        hpMul: 1.15,
        spdMul: 1.12,
        slow: true,
      },
      {
        id: "egypt",
        name: "DUAT",
        subtitle: "Night River of the Sun",
        myth: "Egyptian · Stage V",
        bg: "bg_egypt",
        width: 9000,
        ground: 598,
        fog: "rgba(36, 22, 8, 0.22)",
        accent: "#f0c14a",
        particle: "sand",
        holes: [
          { x: 1180, w: 360 },
          { x: 2460, w: 480 },
          { x: 3920, w: 400 },
          { x: 5380, w: 460 },
          { x: 6920, w: 320 },
        ],
        platforms: [
          plat(500, L1, 150),
          plat(740, L2, 130),
          plat(960, L3, 200),
          plat(1220, L2, 120),
          plat(1460, L3, 140),
          plat(1700, L1, 140),
          plat(2020, L1, 170),
          plat(2280, L2, 130),
          plat(2500, L3, 140),
          lift(2760, L2, 130, 90, 2.3),
          plat(3040, L3, 140),
          plat(3280, L1, 150),
          plat(3600, L2, 170),
          plat(3880, L3, 180),
          plat(4140, L2, 120),
          plat(4360, L3, 140),
          hoist(4600, L2, 130, 55, 2.6),
          plat(4860, L1, 150),
          plat(5180, L2, 160),
          plat(5440, L3, 160),
          lift(5720, L2, 140, 100, 2.7),
          plat(6020, L3, 170),
          plat(6300, L1, 160),
          plat(6620, L2, 180),
          plat(6920, L3, 160),
          plat(7180, L2, 130),
          plat(7420, L1, 180),
        ],
        spawns: [
          { type: "mummy", x: 680 },
          { type: "anubis", x: 1040, y: L3 },
          { type: "mummy", x: 1780 },
          { type: "anubis", x: 2140 },
          { type: "mummy", x: 2560, y: L3 },
          { type: "anubis", x: 3120, y: L3 },
          { type: "mummy", x: 3520 },
          { type: "anubis", x: 4000, y: L3 },
          { type: "mummy", x: 4480, y: L3 },
          { type: "anubis", x: 5000 },
          { type: "mummy", x: 5520, y: L3 },
          { type: "anubis", x: 6100, y: L3 },
          { type: "mummy", x: 6420 },
          { type: "anubis", x: 7000, y: L3 },
          { type: "mummy", x: 7560 },
        ],
        pickups: [
          { type: "lotus", x: 1040, y: L3 - 40 },
          { type: "lotus", x: 3080, y: L3 - 40 },
          { type: "lotus", x: 5520, y: L3 - 40 },
          { type: "lotus", x: 7040, y: L3 - 40 },
        ],
        bossAt: 8100,
        boss: "apep",
        hpMul: 1.2,
        spdMul: 1.18,
      },
    ];
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function irand(a, b) {
    return (Math.random() * (b - a + 1) + a) | 0;
  }
  function holeAt(x) {
    const holes = stage.holes || [];
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (x > h.x && x < h.x + h.w) return h;
    }
    return null;
  }
  function inHole(x) {
    return !!holeAt(x);
  }
  function holeAhead(x, dir, dist) {
    const d = Math.max(8, dist);
    for (let s = 10; s <= d; s += 14) {
      const h = holeAt(x + dir * s);
      if (h) return h;
    }
    return null;
  }
  function supportedAt(x, y) {
    if (!inHole(x) && y >= stage.ground - 10 && y <= stage.ground + 8) return true;
    const plats = stage.platforms;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (x > p.x && x < p.x + p.w && Math.abs(y - p.y) < 10) return true;
    }
    return false;
  }
  function landOnWorld(ent, prevY) {
    ent.onGround = false;
    ent.standPlat = null;
    const feet = ent.y;
    const gx = ent.x;
    if (ent.vy >= 0 && prevY <= stage.ground + 2 && feet >= stage.ground && !inHole(gx)) {
      ent.y = stage.ground;
      ent.vy = 0;
      ent.onGround = true;
    }
    const plats = stage.platforms;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (gx > p.x && gx < p.x + p.w && ent.vy >= 0 && prevY - 2 <= p.y && feet >= p.y && feet <= p.y + 24) {
        ent.y = p.y;
        ent.vy = 0;
        ent.onGround = true;
        ent.standPlat = p;
      }
    }
  }

  function ridePlatform(ent) {
    if (!ent.standPlat) return;
    ent.x += ent.standPlat.dx || 0;
    ent.y += ent.standPlat.dy || 0;
  }

  function updatePlatforms(dt) {
    if (!stage) return;
    const plats = stage.platforms;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      p.t = (p.t || 0) + dt;
      p.dx = 0;
      p.dy = 0;
      if (p.moveX) {
        const nx = p.ox + Math.sin((p.t * Math.PI * 2) / (p.moveT || 2.6)) * p.moveX;
        p.dx = nx - p.x;
        p.x = nx;
      }
      if (p.moveY) {
        const ny = p.oy + Math.sin((p.t * Math.PI * 2) / (p.moveT || 2.8)) * p.moveY;
        p.dy = ny - p.y;
        p.y = ny;
      }
    }
  }
  function findStepPlat(e, dir) {
    const plats = stage.platforms;
    let best = null;
    let bestScore = -1e9;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      const lift = e.y - p.y;
      if (lift < 26 || lift > 280) continue;
      const mid = p.x + p.w * 0.5;
      const toward = (mid - e.x) * dir;
      if (toward < -40 || toward > 310) continue;
      if (e.onGround && Math.abs(e.y - p.y) < 8 && e.x > p.x && e.x < p.x + p.w) continue;
      const playerOn = player.x > p.x && player.x < p.x + p.w && Math.abs(player.y - p.y) < 36;
      if (lift > 196 && !playerOn) continue;
      let score = toward > 0 ? 50 : 0;
      score -= Math.abs(p.y - player.y) * 1.2;
      score -= Math.abs(mid - player.x) * 0.08;
      if (playerOn) score += 220;
      if (inHole(mid)) score += 90;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }
  function beginLeap(e, dir, vy, vx) {
    e.vy = vy;
    e.onGround = false;
    e.leapT = 0.9;
    e.leapDir = dir;
    e.leapVx = vx;
    burst(e.x, e.y - 8, "rgba(255,220,140,0.55)", 5, 90, 0.18);
  }
  function isGroundKind(kind) {
    return kind === "walker" || kind === "bruiser" || kind === "shield" || kind === "shooter" || kind === "hunter";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }

  async function loadAll() {
    const entries = Object.entries(ASSET_LIST);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, src]) => {
        images[key] = await loadImage(src);
        done += 1;
        if (bootEl) bootEl.textContent = `Opening the path… ${done}/${entries.length}`;
      })
    );
    const extras = [];
    const types = ["asura", "oni", "hoplite", "draugr", "mummy", "anubis"];
    const poses = [];
    for (let i = 1; i <= 12; i++) poses.push("walk" + i);
    poses.push("atk1", "atk2");
    for (let i = 0; i < types.length; i++) {
      for (let j = 0; j < poses.length; j++) extras.push(types[i] + "_" + poses[j]);
    }
    const bosses = ["mara", "orochi", "minotaur", "fenrir", "apep"];
    for (let i = 0; i < bosses.length; i++) {
      extras.push(bosses[i] + "_walk1", bosses[i] + "_atk");
    }
    const flyers = ["preta", "wraith", "kitsune", "bird"];
    for (let i = 0; i < flyers.length; i++) {
      for (let f = 1; f <= 4; f++) extras.push(flyers[i] + "_fly" + f);
    }
    await Promise.all(
      extras.map((key) =>
        loadImage("assets/sprites/" + key + ".png")
          .then((img) => {
            images[key] = img;
          })
          .catch(() => {})
      )
    );
  }

  function ensureAudio() {
    if (audio) return audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = { ctx: new AC(), t: 0, step: 0 };
    return audio;
  }

  function beep(freq, dur, type, gain, slide) {
    if (muted) return;
    const a = ensureAudio();
    if (!a) return;
    const t0 = a.ctx.currentTime;
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    g.gain.setValueAtTime(gain || 0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(a.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseHit(dur, gain) {
    if (muted) return;
    const a = ensureAudio();
    if (!a) return;
    const n = a.ctx.createBuffer(1, a.ctx.sampleRate * dur, a.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.ctx.createBufferSource();
    const g = a.ctx.createGain();
    const f = a.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    src.buffer = n;
    g.gain.value = gain || 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(a.ctx.destination);
    src.start();
  }

  const SCALES = [
    [262, 294, 330, 392, 440, 524],
    [247, 277, 330, 370, 415, 494],
    [220, 247, 277, 330, 370, 440],
    [196, 233, 262, 294, 349, 392],
    [233, 247, 277, 349, 370, 466],
  ];

  function tickMusic(dt) {
    if (muted || state === STATE.TITLE) return;
    const a = ensureAudio();
    if (!a) return;
    a.t += dt;
    const interval = state === STATE.PLAY || state === STATE.BOSS_IN ? 0.42 : 0.7;
    if (a.t < interval) return;
    a.t = 0;
    const scale = SCALES[stageIndex % SCALES.length];
    const bossy = !!boss && !boss.dead;
    const note = scale[(a.step + (bossy ? 2 : 0)) % scale.length];
    a.step += 1;
    beep(note * (bossy ? 0.5 : 0.5), 0.28, "triangle", bossy ? 0.035 : 0.022);
    if (a.step % 4 === 0) beep(scale[0] * 0.25, 0.4, "sine", 0.03);
  }

  function sfxShoot() {
    beep(980, 0.08, "square", 0.035, 420);
  }
  function sfxJump(twice) {
    if (twice) beep(420, 0.1, "sine", 0.045, 720);
    else beep(320, 0.1, "sine", 0.04, 520);
  }
  function sfxSuper() {
    beep(180, 0.45, "sawtooth", 0.07, 70);
    beep(640, 0.28, "sine", 0.055, 220);
  }
  function sfxHurt() {
    noiseHit(0.16, 0.1);
    beep(180, 0.16, "sawtooth", 0.05, 80);
  }
  function sfxKill() {
    beep(520, 0.12, "triangle", 0.05, 180);
  }
  function sfxPickup() {
    beep(660, 0.08, "sine", 0.05, 990);
  }
  function sfxBoss() {
    beep(80, 0.4, "sawtooth", 0.06, 40);
  }
  function sfxMelee() {
    beep(190, 0.09, "sawtooth", 0.045, 80);
    noiseHit(0.07, 0.045);
  }

  function burst(x, y, color, n, spd, life) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(spd * 0.3, spd);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.5, life),
        max: life,
        color,
        size: rand(2, 5),
        g: 240,
      });
    }
  }

  function ambientParticle() {
    const kind = stage.particle;
    const x = camera.x + rand(-40, W + 40);
    if (kind === "ember") {
      particles.push({
        x,
        y: rand(80, H - 80),
        vx: rand(-10, 20),
        vy: rand(-40, -10),
        life: rand(1.2, 2.4),
        max: 2,
        color: "rgba(255,140,60,0.8)",
        size: rand(1.5, 3),
        g: -20,
      });
    } else if (kind === "petal") {
      particles.push({
        x,
        y: rand(-20, 80),
        vx: rand(-20, 10),
        vy: rand(20, 50),
        life: rand(2, 4),
        max: 3,
        color: "rgba(220,170,255,0.7)",
        size: rand(2, 4),
        g: 10,
      });
    } else if (kind === "snow") {
      particles.push({
        x,
        y: rand(-20, 40),
        vx: rand(-30, 10),
        vy: rand(30, 70),
        life: rand(2.2, 4),
        max: 3,
        color: "rgba(220,240,255,0.75)",
        size: rand(1.4, 3.2),
        g: 8,
      });
    } else if (kind === "sand") {
      particles.push({
        x,
        y: rand(200, H),
        vx: rand(20, 80),
        vy: rand(-10, 10),
        life: rand(1.2, 2.2),
        max: 2,
        color: "rgba(220,180,90,0.45)",
        size: rand(1.2, 2.6),
        g: 0,
      });
    } else {
      particles.push({
        x,
        y: rand(40, H - 40),
        vx: rand(-8, 8),
        vy: rand(-16, 4),
        life: rand(1.4, 2.6),
        max: 2,
        color: "rgba(220,200,140,0.4)",
        size: rand(1.2, 2.4),
        g: 10,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (particles.length < 70 && (state === STATE.PLAY || state === STATE.BOSS_IN)) {
      if (Math.random() < dt * 18) ambientParticle();
    }
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camera.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function makePlayer() {
    return {
      x: 180,
      y: 200,
      vx: 0,
      vy: 0,
      w: 36,
      h: 88,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpBuf: 0,
      jumps: 2,
      spaceHeld: false,
      landT: 0,
      shootCd: 0,
      hp: 5,
      maxHp: 5,
      inv: 0,
      animT: 0,
      hurtT: 0,
      aimX: 1,
      aimY: 0,
      slow: 0,
      crouch: false,
      beamT: 0,
      beamDir: 1,
      beamX: 0,
      beamY: 0,
      beamHits: null,
      beamTick: 0,
      superHeld: false,
    };
  }

  function pBox(p) {
    const h = p.crouch ? 50 : p.h;
    return { x: p.x - p.w / 2, y: p.y - h, w: p.w, h };
  }

  function muzzlePos() {
    const f = player.facing;
    if (player.crouch) return { x: player.x + 36 * f, y: player.y - 64 };
    if (!player.onGround) return { x: player.x + 42 * f, y: player.y - 120 };
    if (Math.abs(player.vx) > 16) {
      return {
        x: player.x + 48 * f,
        y: player.y - 114 + Math.sin(player.animT * Math.PI) * 5,
      };
    }
    return { x: player.x + 40 * f, y: player.y - 128 };
  }

  function spawnEnemy(s) {
    const def = ENEMY[s.type];
    if (!def) return;
    const e = {
      type: s.type,
      def,
      x: s.x,
      y: s.y != null ? s.y : stage.ground,
      vx: 0,
      vy: 0,
      hp: Math.max(1, Math.round(def.hp * stage.hpMul)),
      maxHp: Math.max(1, Math.round(def.hp * stage.hpMul)),
      facing: -1,
      alive: true,
      t: rand(0, 4),
      cd: rand(0.4, 1.4),
      flash: 0,
      onGround: s.y == null,
      homeY: s.y != null ? s.y : stage.ground - 180,
      lunge: 0,
      lungeDir: -1,
      shotCd: rand(0.3, 1.1),
      leapT: 0,
      leapDir: -1,
      leapVx: 0,
      jumpCd: rand(0, 0.4),
      animT: rand(0, 4),
      attackT: 0,
      attackHit: false,
      moving: false,
    };
    enemies.push(e);
  }

  function eBox(e) {
    return { x: e.x - e.def.w / 2, y: e.y - e.def.h, w: e.def.w, h: e.def.h };
  }

  function meleeBox(e) {
    const dir = e.facing || -1;
    const reach = e.def.kind === "bruiser" ? 92 : e.def.kind === "hunter" ? 80 : 74;
    const w = e.def.w * 0.5 + reach;
    const x = dir > 0 ? e.x - 8 : e.x - w + 8;
    return { x, y: e.y - e.def.h + 10, w, h: e.def.h * 0.78 };
  }

  function enemyWalkKeys(type) {
    const list = [];
    for (let i = 1; i <= 12; i++) {
      const k = type + "_walk" + i;
      if (images[k]) list.push(k);
    }
    if (!list.length && images[type]) return [type];
    return list;
  }

  function enemyAtkKeys(type) {
    const list = [];
    for (let i = 1; i <= 2; i++) {
      const k = type + "_atk" + i;
      if (images[k]) list.push(k);
    }
    return list;
  }

  function enemyFlyKeys(type) {
    const base = images[type];
    const list = base ? [type] : [];
    if (!base) return list;
    for (let i = 1; i <= 4; i++) {
      const k = type + "_fly" + i;
      const im = images[k];
      if (!im) continue;
      const ratio = im.width / base.width;
      if (ratio > 0.78 && ratio < 1.28) list.push(k);
    }
    return list;
  }

  function faceToward(e, tx) {
    if (tx < e.x - 24) e.facing = -1;
    else if (tx > e.x + 24) e.facing = 1;
  }

  function spawnPickup(p) {
    pickups.push({ type: p.type, x: p.x, y: p.y, t: 0, taken: false });
  }

  function firePlayer() {
    if (player.shootCd > 0 || player.beamT > 0) return;
    player.shootCd = SHOOT_CD;
    let ax = 0;
    let ay = 0;
    if (keys.ArrowLeft) ax = -1;
    if (keys.ArrowRight) ax = 1;
    if (keys.ArrowUp) ay = -1;
    if (keys.ArrowDown && !player.onGround && !player.crouch) ay = 1;
    const hcAim = window.HeadCam;
    if (hcAim && hcAim.tracking && hcAim.headHigh) ay = -1;
    if (ax === 0 && ay === 0) ax = player.facing;
    const len = Math.hypot(ax, ay) || 1;
    ax /= len;
    ay /= len;
    player.aimX = ax;
    player.aimY = ay;
    if (ax !== 0) player.facing = ax > 0 ? 1 : -1;
    const m = muzzlePos();
    bullets.push({
      x: m.x + ax * 10,
      y: m.y + ay * 8,
      vx: ax * MISSILE_SPD,
      vy: ay * MISSILE_SPD,
      life: 1.5,
      friendly: true,
    });
    sfxShoot();
  }

  function fireSuper() {
    if (hud.charge < 5 || player.beamT > 0) return;
    hud.charge = 0;
    const m = muzzlePos();
    player.beamT = 0.62;
    player.beamDir = player.facing;
    player.beamX = m.x;
    player.beamY = m.y;
    player.beamHits = new Set();
    player.beamTick = 0;
    camera.shake = 14;
    hud.flash = 0.22;
    sfxSuper();
  }

  function beamBox() {
    const len = 1600;
    const thick = 40;
    const y = player.beamY - thick / 2;
    if (player.beamDir > 0) return { x: player.beamX, y, w: len, h: thick };
    return { x: player.beamX - len, y, w: len, h: thick };
  }

  function updateBeam(dt) {
    if (!player || player.beamT <= 0) return;
    player.beamT -= dt;
    player.beamTick -= dt;
    const m = muzzlePos();
    player.beamX = m.x;
    player.beamY = m.y;
    const box = beamBox();
    const first = player.beamTick <= 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive || !aabb(box, eBox(e))) continue;
      if (!player.beamHits.has(e)) {
        player.beamHits.add(e);
        damageEnemy(e, 5);
      } else if (first) damageEnemy(e, 1);
    }
    if (boss && !boss.dead) {
      const def = boss.def;
      const bb = { x: boss.x - def.w / 2, y: boss.y - def.h, w: def.w, h: def.h };
      if (aabb(box, bb)) {
        if (!player.beamHits.has("boss")) {
          player.beamHits.add("boss");
          damageBoss(8);
        } else if (first) damageBoss(2);
      }
    }
    if (first) {
      player.beamTick = 0.09;
      burst(player.beamX + player.beamDir * rand(40, 280), player.beamY + rand(-8, 8), "rgba(255,230,140,0.9)", 3, 70, 0.2);
    }
  }

  function fireEnemy(x, y, ax, ay, spd, life) {
    const len = Math.hypot(ax, ay) || 1;
    const s = (spd || 240) * ENEMY_PACE;
    eBullets.push({
      x,
      y,
      vx: (ax / len) * s,
      vy: (ay / len) * s,
      life: (life || 2.4) / ENEMY_PACE,
    });
  }

  function startStage(i, keepScore) {
    stageIndex = i;
    stage = STAGES()[i];
    player = makePlayer();
    player.y = stage.ground - 2;
    camera.x = 0;
    camera.lock = false;
    camera.shake = 0;
    bullets = [];
    eBullets = [];
    enemies = [];
    pickups = [];
    particles = [];
    boss = null;
    stage.spawns.forEach(spawnEnemy);
    stage.pickups.forEach(spawnPickup);
    if (!keepScore) {
      /* score persists across stages */
    }
    state = STATE.INTRO;
    hud.introT = 2.6;
    hud.banner = "";
    paused = false;
  }

  function startRun() {
    setCamBar(false);
    hud.score = 0;
    hud.lives = 3;
    hud.charge = 0;
    startStage(0, false);
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
  }

  function beginCalibrate() {
    state = STATE.CALIBRATE;
    paused = false;
    setCamBar(true);
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
    requestHeadCam();
    try { canvas.focus(); } catch (err) {}
  }

  function startFromCalibrate() {
    if (state === STATE.TITLE) {
      beginCalibrate();
      return;
    }
    if (state !== STATE.CALIBRATE) return;
    const hc = window.HeadCam;
    if (hc && hc.tracking) hc.lockRest();
    startRun();
  }

  window.BodhiStart = startFromCalibrate;

  function requestHeadCam() {
    if (window.HeadCam) {
      if (!window.HeadCam.active) window.HeadCam.start();
      return;
    }
    window.__wantHeadCam = true;
  }

  function setCamBar(on) {
    const el = document.getElementById("cam-bar");
    if (el) el.hidden = !on;
  }

  function canvasPoint(ev) {
    const rect = canvas.getBoundingClientRect();
    const gx = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * W;
    const gy = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * H;
    return { gx, gy };
  }

  function openWinCamSettings() {
    const wv = window.chrome && chrome.webview;
    if (!wv) {
      try { window.open("ms-settings:privacy-webcam"); } catch (err) {}
      return;
    }
    try { wv.postMessage("open-camera-settings"); } catch (err) {}
    try {
      if (wv.hostObjects && wv.hostObjects.bodhi) {
        Promise.resolve(wv.hostObjects.bodhi.OpenCameraSettings()).catch(() => {});
      }
    } catch (err) {}
  }

  function hitBtn(btn, gx, gy) {
    return !!(btn && gx >= btn.x && gx <= btn.x + btn.w && gy >= btn.y && gy <= btn.y + btn.h);
  }

  function hurtPlayer(dmg) {
    if (player.inv > 0 || state !== STATE.PLAY) return;
    player.hp -= dmg || 1;
    player.inv = INVULN;
    player.hurtT = 0.25;
    player.vx = -player.facing * 180;
    player.vy = -220;
    camera.shake = 10;
    hud.flash = 0.18;
    sfxHurt();
    burst(player.x, player.y - 50, "rgba(255,80,80,0.9)", 10, 180, 0.35);
    if (player.hp <= 0) killPlayer();
  }

  function killPlayer() {
    hud.lives -= 1;
    state = STATE.DEAD;
    hud.deadT = 1.4;
    burst(player.x, player.y - 40, "rgba(255,210,80,1)", 22, 260, 0.6);
    camera.shake = 16;
  }

  function respawn() {
    if (hud.lives <= 0) {
      state = STATE.GAMEOVER;
      if (hud.score > hud.best) hud.best = hud.score;
      return;
    }
    const rx = clamp(player.x - 220, 120, stage.width - 200);
    player = makePlayer();
    player.x = rx;
    player.y = 80;
    player.inv = 2;
    bullets = [];
    eBullets = [];
    state = STATE.PLAY;
    camera.lock = false;
    if (boss && !boss.dead) {
      camera.lock = true;
      camera.lockX = stage.bossAt - 80;
    }
  }

  function killEnemy(e) {
    e.alive = false;
    hud.score += e.def.score;
    if (hud.charge < 5) {
      hud.charge += 1;
      if (hud.charge === 5) {
        hud.banner = "DHARMA BEAM READY";
        hud.bannerT = 1.5;
      }
    }
    sfxKill();
    burst(e.x, e.y - e.def.h * 0.5, stage.accent, 14, 200, 0.4);
    if (Math.random() < 0.12) {
      pickups.push({ type: "lotus", x: e.x, y: e.y - e.def.h * 0.4, t: 0, taken: false });
    }
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.flash = 0.1;
    if (e.hp <= 0) killEnemy(e);
  }

  function spawnBoss() {
    const def = BOSSES[stage.boss];
    boss = {
      type: stage.boss,
      def,
      x: camera.lockX + W - 220,
      y: stage.ground,
      hp: def.hp,
      maxHp: def.hp,
      t: 0,
      phase: "enter",
      cd: 1.2,
      vx: 0,
      vy: 0,
      flash: 0,
      dead: false,
      facing: -1,
      telegraph: 0,
      animT: 0,
      attackT: 0,
      moveT: 0,
    };
    sfxBoss();
    hud.banner = def.name;
    hud.bannerT = 2.2;
  }

  function damageBoss(dmg) {
    if (!boss || boss.dead || boss.phase === "enter") return;
    boss.hp -= dmg;
    boss.flash = 0.08;
    camera.shake = Math.max(camera.shake, 5);
    if (boss.hp <= 0) {
      boss.hp = 0;
      boss.dead = true;
      hud.score += boss.def.score;
      burst(boss.x, boss.y - 80, "#fff2a8", 36, 320, 0.8);
      camera.shake = 18;
      sfxKill();
      beep(120, 0.5, "triangle", 0.08, 40);
    }
  }

  function camControl() {
    const hc = window.HeadCam;
    return !!(hc && hc.active && hc.tracking && !hc.calibrating);
  }

  function updatePlayer(dt) {
    const hc = window.HeadCam;
    const usingCam = camControl();
    const maxSpd = (player.onGround ? RUN_SPEED : AIR_SPEED) * (player.slow > 0 ? 0.62 : 1) * (player.crouch ? 0.34 : 1);
    let want = 0;
    if (usingCam) want = hc.move;
    else want = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);

    if (Math.abs(want) > 0.08) {
      player.vx = lerp(player.vx, want * maxSpd, player.onGround ? 0.28 : 0.14);
      player.facing = want > 0 ? 1 : -1;
    } else {
      player.vx *= player.onGround ? 0.72 : 0.94;
      if (Math.abs(player.vx) < 8) player.vx = 0;
    }

    if (keys.Space && !player.spaceHeld) player.jumpBuf = JUMP_BUF;
    player.spaceHeld = !!keys.Space;
    player.jumpBuf -= dt;
    player.coyote -= dt;
    const grounded = player.onGround;
    if (grounded) player.coyote = COYOTE;
    if (player.jumpBuf > 0 && player.coyote > 0) {
      player.vy = JUMP_V;
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuf = 0;
      player.jumps = 1;
      sfxJump(false);
    } else if (player.jumpBuf > 0 && !grounded && player.jumps > 0) {
      player.vy = JUMP_V2;
      player.jumpBuf = 0;
      player.jumps = 0;
      sfxJump(true);
      burst(player.x, player.y - 18, "rgba(255,220,120,0.95)", 10, 160, 0.28);
    }
    const holdJump = !!keys.Space;
    if (!holdJump && player.vy < 0) player.vy += GRAVITY * 1.05 * dt;

    player.vy = clamp(player.vy + GRAVITY * dt, -1400, MAX_FALL);
    const prevY = player.y;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = clamp(player.x, 40, stage.width - 40);

    landOnWorld(player, prevY);
    ridePlatform(player);
    if (player.onGround) {
      player.jumps = 2;
      if (!grounded) player.landT = 0.16;
    }
    player.crouch = !!(player.onGround && keys.ArrowDown);

    if (player.y > H + 90) killPlayer();

    player.shootCd -= dt;
    player.inv -= dt;
    player.hurtT -= dt;
    player.slow -= dt;
    player.landT -= dt;
    const runRate = 5.2 + Math.min(3.2, Math.abs(player.vx) / 110);
    player.animT += dt * (Math.abs(player.vx) > 18 && !player.crouch ? runRate : 2.2);

    if (keys.KeyA || keys.a || keys.A) firePlayer();
    if ((keys.KeyS || keys.s || keys.S) && !player.superHeld) fireSuper();
    player.superHeld = !!(keys.KeyS || keys.s || keys.S);

    if (!camera.lock) {
      const target = player.x - W * 0.34;
      camera.x = lerp(camera.x, clamp(target, 0, stage.width - W), 0.12);
    } else {
      camera.x = lerp(camera.x, camera.lockX, 0.08);
    }
    if (player.x > stage.bossAt && !boss && state === STATE.PLAY) {
      camera.lock = true;
      camera.lockX = stage.bossAt - 40;
      state = STATE.BOSS_IN;
      hud.introT = 1.6;
    }
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) {
        enemies.splice(i, 1);
        continue;
      }
      if (e.x < camera.x - 260 || e.x > camera.x + W + 420) continue;
      e.t += dt;
      e.cd -= dt;
      e.flash -= dt;
      const def = e.def;
      const kind = def.kind;
      const spd = def.speed * stage.spdMul * ENEMY_PACE;
      faceToward(e, player.x);

      if (isGroundKind(kind)) {
        const dir = player.x < e.x ? -1 : 1;
        const gap = Math.abs(player.x - e.x);
        e.shotCd -= dt;
        e.jumpCd -= dt;
        e.leapT -= dt;
        e.attackT -= dt;
        const chasing = e.lunge > 0 || gap > 40 || (!e.onGround && e.leapT > 0);
        e.moving = chasing;
        e.animT += dt * (e.attackT > 0 ? 8 : chasing && e.onGround ? 4.1 : 2.2);

        if (e.onGround && e.jumpCd <= 0 && e.lunge <= 0) {
          const lookX = e.x + dir * 40;
          const pit = e.y >= stage.ground - 8 ? holeAhead(e.x, dir, 96) : null;
          const dropOff = !supportedAt(lookX, e.y);
          const step = findStepPlat(e, dir);
          const playerAbove = player.y < e.y - 46;
          const needCross = dropOff && (inHole(lookX) || holeAhead(e.x, dir, 70));

          if (pit && e.y >= stage.ground - 8) {
            const airVx = clamp(pit.w / 0.7 + 50, 280, 430);
            beginLeap(e, dir, -880, airVx);
            e.jumpCd = 0.6;
          } else if (step && (playerAbove || inHole(step.x + step.w * 0.5) || needCross)) {
            const h = e.y - step.y;
            const vy = clamp(-Math.sqrt(2 * GRAVITY * (h + 36)), -1080, -640);
            const mid = step.x + step.w * 0.5;
            const pdir = Math.sign(mid - e.x) || dir;
            beginLeap(e, pdir, vy, clamp(Math.abs(mid - e.x) / 0.5, 150, 380));
            e.jumpCd = 0.65;
          } else if (needCross) {
            const h = holeAt(lookX) || holeAhead(e.x, dir, 90);
            const w = h ? h.w : 240;
            beginLeap(e, dir, -880, clamp(w / 0.7 + 50, 280, 430));
            e.jumpCd = 0.6;
          } else if (kind === "hunter" && e.jumpCd <= 0 && gap < 320 && gap > 110) {
            beginLeap(e, dir, -680, 240);
            e.jumpCd = 0.85;
          }
        }

        if (e.lunge > 0) {
          e.x += e.lungeDir * 340 * dt;
          e.lunge -= dt;
        } else if (!e.onGround && e.leapT > 0) {
          e.x += e.leapDir * e.leapVx * dt;
        } else {
          const hold = 40;
          if (gap > hold) e.x += dir * spd * dt;
          else e.x += dir * spd * 0.35 * dt;
        }

        const meleeRange = kind === "bruiser" ? 112 : kind === "shield" ? 102 : 90;
        if (
          e.attackT <= 0 &&
          e.cd <= 0 &&
          e.onGround &&
          gap < meleeRange &&
          Math.abs(player.y - e.y) < 120 &&
          !holeAhead(e.x, dir, 50)
        ) {
          e.attackT = 0.44;
          e.attackHit = false;
          e.cd = kind === "bruiser" ? 1.35 : kind === "hunter" ? 1.25 : 1.5;
          e.lunge = 0.16;
          e.lungeDir = dir;
          e.facing = dir;
          sfxMelee();
        } else if (
          !e.onGround &&
          kind === "hunter" &&
          e.attackT <= 0 &&
          gap < 72 &&
          Math.abs(player.y - e.y) < 90
        ) {
          e.attackT = 0.36;
          e.attackHit = false;
          sfxMelee();
        }

        if (e.attackT > 0.08 && e.attackT < 0.24 && !e.attackHit && player.inv <= 0) {
          if (aabb(meleeBox(e), pBox(player))) {
            hurtPlayer(1);
            e.attackHit = true;
            burst(player.x, player.y - 50, "rgba(255,210,90,0.95)", 8, 160, 0.22);
          }
        }

        const prevY = e.y;
        e.vy = clamp(e.vy + GRAVITY * dt, -1400, MAX_FALL);
        e.y += e.vy * dt;
        landOnWorld(e, prevY);
        ridePlatform(e);
        if (e.onGround) e.leapT = 0;

        if (!e.onGround && e.jumpCd <= 0 && inHole(e.x) && e.y > stage.ground - 20 && e.y < stage.ground + 90) {
          const h = holeAt(e.x);
          beginLeap(e, dir, -940, clamp((h ? h.w : 240) / 0.65 + 70, 320, 460));
          e.jumpCd = 0.85;
        }

        if (e.y > H + 90) {
          e.alive = false;
          continue;
        }

      } else if (kind === "flyer") {
        e.animT += dt * 6.2;
        e.x += -spd * 0.55 * dt + Math.sin(e.t * 1.3) * 10 * dt;
        e.y = e.homeY + Math.sin(e.t * 2.1) * 36;
        if (e.cd <= 0 && Math.abs(player.x - e.x) < 500) {
          fireEnemy(e.x, e.y - 20, player.x - e.x, player.y - 50 - e.y, 240, 2.2);
          e.cd = 3.1;
        }
      } else if (kind === "blink") {
        e.animT += dt * 7.4;
        e.y = e.homeY + Math.sin(e.t * 3) * 24;
        e.x += e.facing * spd * 0.25 * dt;
        if (e.cd <= 0) {
          e.x = clamp(player.x + rand(-220, 220), camera.x + 40, camera.x + W - 40);
          e.y = clamp(player.y - rand(80, 200), 80, stage.ground - 80);
          e.homeY = e.y;
          e.cd = 3.4;
          burst(e.x, e.y, "rgba(220,180,255,0.8)", 10, 120, 0.3);
        }
      } else if (kind === "swoop") {
        e.animT += dt * 10.5;
        if (Math.abs(player.x - e.x) < 260 && e.y < player.y - 20) {
          e.x += Math.sign(player.x - e.x) * spd * 1.15 * dt;
          e.y += spd * 0.9 * dt;
        } else {
          e.x += -spd * 0.45 * dt;
          e.y += Math.sin(e.t * 3) * 20 * dt;
          if (e.y > stage.ground - 160) e.y = stage.ground - 160;
        }
      }

      if (!isGroundKind(kind) && player.inv <= 0 && aabb(pBox(player), eBox(e))) hurtPlayer(1);
    }
  }

  function updateBoss(dt) {
    if (!boss || boss.dead) return;
    boss.t += dt;
    boss.cd -= dt;
    boss.flash -= dt;
    boss.telegraph -= dt;
    boss.animT += dt;
    boss.attackT -= dt;
    const def = boss.def;
    if (boss.phase === "enter") {
      const dest = camera.lockX + W - 250;
      boss.x = lerp(boss.x, dest, 0.04);
      if (Math.abs(boss.x - dest) < 8) {
        boss.phase = "fight";
        boss.cd = 0.8;
      }
      return;
    }

    const arenaL = camera.lockX + 170;
    const arenaR = camera.lockX + W - 150;
    if (boss.phase !== "charge") boss.facing = player.x < boss.x ? -1 : 1;

    if (boss.phase === "charge") {
      boss.x += boss.vx * dt;
      if (boss.x < arenaL || boss.x > arenaR) {
        boss.vx *= -1;
        boss.facing = boss.vx < 0 ? -1 : 1;
        boss.phase = "fight";
        boss.cd = 0.7;
        boss.attackT = 0.35;
        camera.shake = 12;
        fireEnemy(boss.x, stage.ground - 24, boss.facing, 0, 380, 1.6);
      }
    } else if (boss.moveT > 0) {
      boss.x += boss.vx * dt;
      boss.moveT -= dt;
    } else if (boss.attackT <= 0) {
      const gap = player.x - boss.x;
      const agap = Math.abs(gap);
      let dir;
      if (agap > 240) dir = Math.sign(gap) || -1;
      else if (agap < 110) dir = -Math.sign(gap || -1);
      else dir = Math.sin(boss.t * 0.85) > 0 ? -1 : 1;
      const spd = (boss.type === "fenrir" ? 270 : boss.type === "minotaur" ? 175 : boss.type === "mara" ? 145 : 105) * ENEMY_PACE;
      boss.vx = dir * spd;
      boss.moveT = rand(0.4, 0.85);
    }
    boss.x = clamp(boss.x, arenaL, arenaR);

    const stepping = boss.phase === "charge" || (boss.moveT > 0 && Math.abs(boss.vx) > 28);
    const bounce = stepping ? Math.abs(Math.sin(boss.animT * 11)) : 0.5 + 0.5 * Math.sin(boss.animT * 2.15);
    if (boss.type === "orochi" || boss.type === "apep") {
      boss.y = stage.ground - 4 + Math.sin(boss.animT * 1.75) * 14;
    } else {
      boss.y = stage.ground - bounce * (stepping ? 16 : 7);
    }

    if (boss.type === "mara") {
      if (boss.cd <= 0) {
        const mode = irand(0, 2);
        boss.attackT = 0.48;
        if (mode === 0) {
          for (let k = -2; k <= 2; k++) fireEnemy(boss.x - 40, boss.y - 140, -1, k * 0.28, 300, 2.6);
        } else if (mode === 1) {
          for (let k = 0; k < 5; k++) fireEnemy(camera.lockX + 80 + k * 180, 40, 0.05, 1, 260, 2.8);
        } else if (enemies.filter((e) => e.alive).length < 5) {
          spawnEnemy({ type: "preta", x: boss.x - 80, y: 280 });
        }
        boss.cd = boss.hp < def.hp * 0.4 ? 1.05 : 1.55;
      }
    } else if (boss.type === "orochi") {
      if (boss.cd <= 0) {
        const mode = irand(0, 2);
        boss.attackT = 0.5;
        if (mode === 0) {
          fireEnemy(boss.x - 80, boss.y - 160, -1, 0.05, 340, 2.4);
          fireEnemy(boss.x - 60, boss.y - 90, -1, 0.2, 320, 2.4);
          fireEnemy(boss.x - 90, boss.y - 210, -1, -0.15, 330, 2.4);
        } else if (mode === 1) {
          fireEnemy(boss.x - 40, stage.ground - 20, -1, 0, 420, 2);
        } else {
          boss.vx = -190;
          boss.moveT = 0.45;
        }
        boss.cd = 1.25;
      }
    } else if (boss.type === "minotaur") {
      if (boss.phase !== "charge" && boss.cd <= 0) {
        if (Math.random() < 0.55) {
          boss.phase = "charge";
          boss.vx = (player.x < boss.x ? -1 : 1) * 300;
          boss.facing = boss.vx < 0 ? -1 : 1;
          boss.attackT = 0.8;
        } else {
          boss.attackT = 0.45;
          fireEnemy(boss.x - 40, boss.y - 80, -1, -0.1, 360, 2);
          fireEnemy(boss.x - 40, boss.y - 80, -0.7, -0.5, 340, 2);
        }
        boss.cd = 1.1;
      }
    } else if (boss.type === "fenrir") {
      if (boss.cd <= 0) {
        const mode = irand(0, 2);
        boss.attackT = 0.46;
        if (mode === 0) {
          for (let k = 0; k < 8; k++) {
            const a = -Math.PI + (k / 7) * Math.PI;
            fireEnemy(boss.x - 60, boss.y - 90, Math.cos(a), Math.sin(a), 300, 2.2);
          }
          player.slow = 1.6;
        } else if (mode === 1) {
          boss.x = lerp(boss.x, player.x + 40, 0.9);
          boss.x = clamp(boss.x, arenaL, arenaR);
          camera.shake = 10;
        } else {
          fireEnemy(boss.x - 80, boss.y - 70, -1, 0, 460, 1.8);
        }
        boss.cd = 1.15;
      }
    } else if (boss.type === "apep") {
      if (boss.phase === "beam") {
        if (boss.telegraph <= 0) {
          const by = boss.beamY;
          if (Math.abs(player.y - 50 - by) < 36 && player.x < boss.x) hurtPlayer(1);
          boss.phase = "fight";
          boss.cd = 0.9;
        }
      } else if (boss.cd <= 0) {
        const mode = irand(0, 2);
        boss.attackT = 0.5;
        if (mode === 0) {
          boss.phase = "beam";
          boss.beamY = player.y - 50;
          boss.telegraph = 0.7;
        } else if (mode === 1) {
          for (let k = -1; k <= 1; k++) fireEnemy(boss.x - 70, boss.y - 100, -1, k * 0.3, 360, 2.3);
        } else {
          fireEnemy(boss.x - 40, 80, -0.2, 1, 280, 2.4);
          fireEnemy(boss.x - 180, 80, 0.1, 1, 280, 2.4);
          fireEnemy(boss.x - 320, 80, 0.05, 1, 280, 2.4);
        }
        boss.cd = 1.05;
      }
    }

    const b = { x: boss.x - def.w / 2, y: boss.y - def.h, w: def.w, h: def.h };
    if (player.inv <= 0 && aabb(pBox(player), b)) hurtPlayer(1);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < camera.x - 40 || b.x > camera.x + W + 40 || b.y < -40 || b.y > H + 40) {
        bullets.splice(i, 1);
        continue;
      }
      const box = { x: b.x - 14, y: b.y - 8, w: 28, h: 16 };
      let hit = false;
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!e.alive) continue;
        if (aabb(box, eBox(e))) {
          if (e.def.kind === "shield" && b.x > e.x === (e.facing > 0)) {
            // hitting the shield face from the front — half damage
            damageEnemy(e, 0.5);
          } else damageEnemy(e, 1);
          hit = true;
          break;
        }
      }
      if (!hit && boss && !boss.dead) {
        const def = boss.def;
        const bb = { x: boss.x - def.w / 2, y: boss.y - def.h, w: def.w, h: def.h };
        if (aabb(box, bb)) {
          damageBoss(1);
          hit = true;
        }
      }
      if (hit) {
        burst(b.x, b.y, "rgba(255,230,140,1)", 6, 90, 0.2);
        bullets.splice(i, 1);
      }
    }

    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y > H + 30) {
        eBullets.splice(i, 1);
        continue;
      }
      const box = { x: b.x - 12, y: b.y - 8, w: 24, h: 16 };
      if (player.inv <= 0 && aabb(box, pBox(player))) {
        hurtPlayer(1);
        eBullets.splice(i, 1);
      }
    }
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.t += dt;
      const box = { x: p.x - 16, y: p.y - 16, w: 32, h: 32 };
      if (aabb(box, pBox(player))) {
        if (p.type === "lotus" && player.hp < player.maxHp) {
          player.hp += 1;
          sfxPickup();
          hud.score += 50;
          pickups.splice(i, 1);
        } else if (p.type === "lotus") {
          hud.score += 100;
          sfxPickup();
          pickups.splice(i, 1);
        }
      }
    }
  }

  function update(dt) {
    hud.titlePulse += dt;
    hud.bannerT -= dt;
    hud.flash -= dt;
    camera.shake = Math.max(0, camera.shake - dt * 28);
    tickMusic(dt);
    updateParticles(dt);

    if (state === STATE.PLAY || state === STATE.BOSS_IN) updatePlatforms(dt);

    if (state === STATE.TITLE || state === STATE.CALIBRATE) return;

    if (state === STATE.INTRO) {
      hud.introT -= dt;
      if (hud.introT <= 0) state = STATE.PLAY;
      return;
    }

    if (state === STATE.BOSS_IN) {
      hud.introT -= dt;
      if (hud.introT <= 0) {
        state = STATE.PLAY;
        if (!boss) spawnBoss();
      }
      updatePlayer(dt);
      return;
    }

    if (state === STATE.DEAD) {
      hud.deadT -= dt;
      if (hud.deadT <= 0) respawn();
      return;
    }

    if (state === STATE.CLEAR) {
      hud.clearT -= dt;
      if (hud.clearT <= 0) {
        if (stageIndex >= STAGES().length - 1) {
          state = STATE.WIN;
          if (hud.score > hud.best) hud.best = hud.score;
        } else startStage(stageIndex + 1, true);
      }
      return;
    }

    if (state === STATE.GAMEOVER || state === STATE.WIN) return;
    if (paused) return;

    updatePlayer(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateBeam(dt);
    updatePickups(dt);

    if (boss && boss.dead && state === STATE.PLAY) {
      state = STATE.CLEAR;
      hud.clearT = 3.2;
      camera.lock = false;
    }
  }

  function drawSprite(key, x, y, flip, scale, alpha, flash, rot, scaleY) {
    const img = images[key];
    if (!img) return;
    const scx = scale || 1;
    const scy = scaleY == null ? scx : scaleY;
    const w = img.width * scx;
    const h = img.height * scy;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x - camera.x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -1 : 1, 1);
    if (flash) ctx.filter = "brightness(2.6) saturate(0.2)";
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawBg() {
    const img = images[stage ? stage.bg : "bg_title"] || images.bg_title;
    if (!img) {
      ctx.fillStyle = "#140c10";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const scale = 1.42;
    const bw = W * scale;
    const maxScroll = Math.max(1, bw - W);
    const par = stage ? (camera.x / Math.max(1, stage.width - W)) * maxScroll : 0;
    ctx.drawImage(img, -par, 0, bw, H);
    if (stage) {
      ctx.fillStyle = stage.fog;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawGround() {
    const g = stage.ground;
    const grad = ctx.createLinearGradient(0, g, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.02, "rgba(0,0,0,0.15)");
    grad.addColorStop(0.08, "rgba(12,8,8,0.72)");
    grad.addColorStop(1, "rgba(6,4,6,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, g - 6, W, H - g + 6);

    ctx.strokeStyle = stage.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const holes = stage.holes || [];
    let x = camera.x;
    const end = camera.x + W;
    while (x < end) {
      let next = end;
      let skip = null;
      for (let i = 0; i < holes.length; i++) {
        const h = holes[i];
        if (h.x + h.w > x && h.x < next) {
          if (h.x > x) next = h.x;
          else skip = h;
        }
      }
      if (skip) {
        x = skip.x + skip.w;
        continue;
      }
      ctx.moveTo(x - camera.x, g + 1);
      ctx.lineTo(next - camera.x, g + 1);
      x = next + 1;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < holes.length; i++) drawPit(holes[i], g);
  }

  function pitRand(seed, i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawPitSpear(px, tipY, scale, tilt, variant, shade) {
    const img = variant ? images.spear2 : images.spear;
    ctx.save();
    ctx.translate(px, tipY);
    ctx.rotate(tilt);
    ctx.globalAlpha = shade;
    if (img) {
      const h = 108 * scale;
      const w = (img.width / img.height) * h;
      ctx.drawImage(img, -w / 2, 0, w, h);
    } else {
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(-3 * scale, 18 * scale, 6 * scale, 90 * scale);
      ctx.fillStyle = stage.accent;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-7 * scale, 22 * scale);
      ctx.lineTo(7 * scale, 22 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPit(h, g) {
    const sx = h.x - camera.x;
    if (sx > W + 50 || sx + h.w < -50) return;
    const w = h.w;
    const seed = (h.x | 0) + 17;

    const abyss = ctx.createLinearGradient(0, g - 4, 0, H);
    abyss.addColorStop(0, "rgba(18, 6, 8, 0.15)");
    abyss.addColorStop(0.06, "rgba(42, 10, 12, 0.92)");
    abyss.addColorStop(0.28, "rgba(10, 2, 4, 1)");
    abyss.addColorStop(1, "#000");
    ctx.fillStyle = abyss;
    ctx.fillRect(sx, g + 1, w, H - g);

    const fog = ctx.createLinearGradient(0, g, 0, g + 90);
    fog.addColorStop(0, "rgba(255, 90, 50, 0.28)");
    fog.addColorStop(1, "rgba(80, 10, 8, 0)");
    ctx.fillStyle = fog;
    ctx.fillRect(sx, g + 1, w, 90);

    for (let row = 0; row < 3; row++) {
      const tip = g + 10 + row * 16;
      const sc = 0.62 + row * 0.2;
      const shade = 0.42 + row * 0.22;
      const step = 26 - row * 2;
      let n = 0;
      for (let x = sx + 12; x < sx + w - 10; x += step) {
        const r = pitRand(seed, n * 3 + row * 31);
        const r2 = pitRand(seed, n * 7 + row * 13);
        const tilt = (r - 0.5) * 0.22;
        const lift = r2 * 14;
        drawPitSpear(x + (r - 0.5) * 8, tip + lift, sc, tilt, (n + row) % 2 === 0, shade);
        n += 1;
      }
    }

    const lip = ctx.createLinearGradient(0, g - 10, 0, g + 8);
    lip.addColorStop(0, "rgba(72, 48, 36, 0.2)");
    lip.addColorStop(0.45, "rgba(58, 36, 26, 0.96)");
    lip.addColorStop(1, "rgba(22, 10, 8, 1)");
    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.moveTo(sx - 14, g + 8);
    ctx.lineTo(sx - 8, g - 7);
    ctx.quadraticCurveTo(sx + w * 0.5, g - 12, sx + w + 8, g - 7);
    ctx.lineTo(sx + w + 14, g + 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = stage.accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 6, g - 1);
    ctx.quadraticCurveTo(sx + w * 0.5, g - 6, sx + w + 6, g - 1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255, 220, 140, 0.55)";
    ctx.beginPath();
    ctx.arc(sx - 4, g - 5, 3.2, 0, Math.PI * 2);
    ctx.arc(sx + w + 4, g - 5, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlatforms() {
    const img = images.platform;
    for (let i = 0; i < stage.platforms.length; i++) {
      const p = stage.platforms[i];
      const sx = p.x - camera.x;
      if (sx > W || sx + p.w < -20) continue;
      if (img) ctx.drawImage(img, sx, p.y - 18, p.w, 56);
      else {
        ctx.fillStyle = "#6a5340";
        ctx.fillRect(sx, p.y, p.w, 18);
      }
    }
  }

  const RUN_FRAMES = ["hero_run1", "hero_run3", "hero_run2", "hero_run4"];

  function smooth01(t) {
    return t * t * (3 - 2 * t);
  }

  function drawPlayer() {
    if (player.inv > 0 && Math.floor(time * 18) % 2 === 0) return;
    const flip = player.facing < 0;
    const flash = player.hurtT > 0;
    let a = "hero_idle";
    let b = null;
    let mix = 0;
    let bob = 0;
    let rot = 0;
    let sx = 1.16;
    let sy = 1.16;

    if (flash) {
      a = "hero_hurt";
    } else if (!player.onGround) {
      a = "hero_jump";
      rot = clamp(player.vy * 0.00016, -0.1, 0.14);
      if (player.jumps === 0) rot -= 0.05;
    } else if (player.crouch) {
      a = images.hero_crouch ? "hero_crouch" : "hero_idle";
      if (!images.hero_crouch) {
        sy *= 0.58;
        sx *= 1.08;
        bob += 22;
      }
    } else if (Math.abs(player.vx) > 16) {
      const t = ((player.animT % 4) + 4) % 4;
      const i0 = t | 0;
      const i1 = (i0 + 1) % 4;
      mix = smooth01(t - i0);
      a = RUN_FRAMES[i0];
      b = RUN_FRAMES[i1];
      bob = Math.sin(t * Math.PI) * 3.4;
    } else {
      bob = Math.sin(time * 2.4) * 2.1;
      sy *= 1 + Math.sin(time * 2.4) * 0.016;
      sx *= 1 - Math.sin(time * 2.4) * 0.008;
    }

    if (player.landT > 0) {
      const k = clamp(player.landT / 0.16, 0, 1);
      sy *= 1 - 0.15 * k;
      sx *= 1 + 0.11 * k;
      bob += 3.2 * k;
    }

    const y = player.y + 4 + bob;
    if (b && mix > 0.02) {
      drawSprite(a, player.x, y, flip, sx, 1 - mix, flash, rot, sy);
      drawSprite(b, player.x, y, flip, sx, mix, false, rot, sy);
    } else {
      drawSprite(a, player.x, y, flip, sx, 1, flash, rot, sy);
    }
  }

  function drawBeam() {
    if (!player || player.beamT <= 0) return;
    const fade = player.beamT < 0.16 ? player.beamT / 0.16 : 1;
    const pulse = 0.82 + Math.sin(time * 42) * 0.18;
    const x0 = player.beamX - camera.x;
    const y0 = player.beamY;
    const x1 = player.beamDir > 0 ? W + 60 : -60;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.strokeStyle = `rgba(255, 186, 60, ${0.22 * fade})`;
    ctx.lineWidth = 46 * pulse;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.strokeStyle = `rgba(255, 220, 110, ${0.55 * fade})`;
    ctx.lineWidth = 20 * pulse;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.strokeStyle = `rgba(255, 252, 240, ${0.95 * fade})`;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  function drawMeleeArc(e) {
    const dir = e.facing > 0 ? 1 : -1;
    const cx = e.x - camera.x + dir * 26;
    const cy = e.y - e.def.h * 0.46;
    const p = clamp((0.26 - e.attackT) / 0.18, 0, 1);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(dir, 1);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255, 214, 110, ${0.52 * (1 - p)})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(8, 10, 40 + p * 20, -1.35, 0.85);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 248, 220, ${0.82 * (1 - p)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(8, 10, 46 + p * 20, -1.35, 0.85);
    ctx.stroke();
    ctx.restore();
  }

  function drawActors() {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.x < camera.x - 80 || e.x > camera.x + W + 80) continue;
      const air = isGroundKind(e.def.kind) && !e.onGround;
      const sc = e.def.scale;
      let key = e.def.sprite;
      let rot = 0;
      let sx = sc;
      let sy = sc;
      let bob = 0;
      if (isGroundKind(e.def.kind)) {
        const atks = enemyAtkKeys(e.type);
        if (e.attackT > 0) {
          const p = 1 - clamp(e.attackT / 0.44, 0, 1);
          if (atks.length) key = p < 0.42 ? atks[0] : atks[Math.min(atks.length - 1, 1)];
          const wind = p < 0.42;
          rot = (e.facing > 0 ? 1 : -1) * (wind ? -0.12 : 0.08);
          sx *= wind ? 0.96 : 1.05;
          sy *= wind ? 1.04 : 0.96;
        } else if (e.onGround && e.moving) {
          const g = e.animT;
          const wave = Math.sin(g * Math.PI);
          const contact = Math.cos(g * Math.PI);
          const plant = Math.max(0, contact);
          sy *= 1 - plant * 0.05;
          sx *= 1 + plant * 0.038;
          bob = (1 - Math.abs(contact)) * 3.4;
          rot = (e.facing > 0 ? 1 : -1) * wave * 0.032;
        } else if (e.onGround) {
          sy *= 1 + Math.sin(e.t * 2.8) * 0.016;
          bob = Math.sin(e.t * 2.8) * 1.3;
        } else if (air) {
          rot = clamp(e.vy * 0.00012, -0.08, 0.1);
          sx *= 0.97;
          sy *= 1.04;
        }
      } else {
        const flies = enemyFlyKeys(e.type);
        const n = flies.length;
        const flap = ((e.animT % n) + n) % n;
        key = flies[flap | 0];
        const beat = Math.sin(e.animT * Math.PI);
        if (e.def.kind === "swoop") {
          const diving = Math.abs(player.x - e.x) < 260 && e.y < player.y - 20;
          rot = Math.sin(e.t * 3.2) * 0.07 + (diving ? 0.2 : 0);
          sy *= 1 + beat * 0.08;
          sx *= 1 - beat * 0.045;
          bob = Math.sin(e.t * 5.2) * 3.2;
        } else if (e.def.kind === "blink") {
          rot = Math.sin(e.t * 4.4) * 0.11;
          bob = Math.sin(e.t * 3.5) * 4.2;
          sy *= 1 + Math.sin(e.t * 8) * 0.035;
          if (e.cd < 0.16) {
            sx *= 1.14;
            sy *= 0.86;
          }
        } else {
          rot = Math.sin(e.t * 2.15) * 0.09;
          bob = Math.sin(e.t * 2.5) * 5;
          sy *= 1 + beat * 0.05;
          sx *= 1 - beat * 0.028;
        }
      }
      const y = e.y + 4 + bob;
      const flip = e.facing > 0;
      drawSprite(key, e.x, y, flip, sx, 1, e.flash > 0, rot, sy);
      if (isGroundKind(e.def.kind) && e.attackT > 0.08 && e.attackT < 0.26) drawMeleeArc(e);
    }
    if (boss && !boss.dead) {
      const flip = boss.facing > 0;
      const type = boss.type;
      let bkey = type;
      const stepping = boss.phase === "charge" || (boss.moveT > 0 && Math.abs(boss.vx) > 28);
      if (boss.attackT > 0 && images[type + "_atk"]) bkey = type + "_atk";
      else if (stepping && images[type + "_walk1"]) {
        bkey = Math.floor(boss.animT * 7) % 2 === 0 ? type + "_walk1" : type;
      }
      const plant = stepping ? Math.abs(Math.sin(boss.animT * 11)) : 0.5 + 0.5 * Math.sin(boss.animT * 2.2);
      const bsy = 1 - (stepping ? 0.06 : 0.022) * plant;
      const bsx = 1 + (stepping ? 0.05 : 0.016) * plant;
      const bbob = stepping ? plant * 4 : Math.sin(boss.animT * 2.2) * 2.4;
      const lean = stepping ? (boss.vx > 0 ? 0.05 : -0.05) : 0;
      drawSprite(bkey, boss.x, boss.y + 6 + bbob, flip, bsx, 1, boss.flash > 0, lean, bsy);
      if (boss.phase === "beam" && boss.telegraph > 0) {
        ctx.fillStyle = `rgba(255,60,40,${0.18 + Math.sin(time * 24) * 0.08})`;
        ctx.fillRect(0, boss.beamY - 18 - 0, W, 36);
      } else if (boss.phase === "beam") {
        ctx.fillStyle = "rgba(255,210,80,0.75)";
        ctx.fillRect(0, boss.beamY - 14, boss.x - camera.x, 28);
      }
    }
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      const bob = Math.sin(p.t * 3) * 6;
      drawSprite("lotus_hp", p.x, p.y + bob + 16, false, 1.1, 1, false);
    }
    const mImg = images.missile;
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x - camera.x, b.y);
      ctx.rotate(ang);
      if (mImg) ctx.drawImage(mImg, -28, -14, 56, 28);
      else {
        ctx.fillStyle = "#ffd56a";
        ctx.fillRect(-16, -4, 32, 8);
      }
      ctx.restore();
    }
    const dImg = images.dark_missile;
    for (let i = 0; i < eBullets.length; i++) {
      const b = eBullets[i];
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x - camera.x, b.y);
      ctx.rotate(ang);
      if (dImg) ctx.drawImage(dImg, -24, -12, 48, 24);
      else {
        ctx.fillStyle = "#7a3cff";
        ctx.fillRect(-12, -4, 24, 8);
      }
      ctx.restore();
    }
  }

  function headActionLabel(hc) {
    if (!hc) return "WAITING";
    if (hc.status === "loading") return "STARTING CAMERA…";
    if (hc.status === "error") return hc.error || "CAMERA BLOCKED";
    if (hc.status === "lost" || hc.status === "seek") return "LOOK AT THE CAMERA";
    if (!hc.tracking) return "LOOK AT THE CAMERA";
    if (hc.headHigh) return "AIM UP";
    if (hc.move < -0.22) return "LEFT";
    if (hc.move > 0.22) return "RIGHT";
    return "NEUTRAL";
  }

  function drawCalibrate() {
    const hc = window.HeadCam;
    ctx.fillStyle = "#10080c";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 40px Cinzel, serif";
    ctx.fillText("HEAD CAMERA", W / 2, 58);
    ctx.font = "italic 20px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#efe0b8";
    ctx.fillText("MediaPipe Face Mesh — 5 punktów, steruje ich środek (CoP)", W / 2, 92);

    const vw = 720;
    const vh = 405;
    const vx = (W - vw) / 2;
    const vy = 118;

    ctx.fillStyle = "#1a1014";
    ctx.fillRect(vx - 6, vy - 6, vw + 12, vh + 12);
    ctx.strokeStyle = "#d4b36a";
    ctx.lineWidth = 2;
    ctx.strokeRect(vx - 6, vy - 6, vw + 12, vh + 12);

    const pic = hc && (hc.preview && hc.preview.complete ? hc.preview : hc.video);
    if (pic && (pic.naturalWidth || (pic.readyState >= 2))) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vx, vy, vw, vh);
      ctx.clip();
      ctx.translate(vx + vw, vy);
      ctx.scale(-1, 1);
      ctx.drawImage(pic, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#140c10";
      ctx.fillRect(vx, vy, vw, vh);
      ctx.fillStyle = "#cbb48a";
      ctx.font = "500 18px Cinzel, serif";
      ctx.fillText(hc && hc.status === "error" ? "Camera unavailable — keyboard will be used" : "Opening camera…", W / 2, vy + vh / 2);
    }

    if (hc && hc.pts && hc.pts.length >= 5) {
      const map = (p) => [vx + (1 - p[0]) * vw, vy + p[1] * vh];
      const dots = hc.pts.map(map);
      ctx.strokeStyle = "rgba(120,190,230,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dots[0][0], dots[0][1]);
      ctx.lineTo(dots[2][0], dots[2][1]);
      ctx.lineTo(dots[1][0], dots[1][1]);
      ctx.moveTo(dots[3][0], dots[3][1]);
      ctx.lineTo(dots[4][0], dots[4][1]);
      ctx.moveTo(dots[2][0], dots[2][1]);
      ctx.lineTo((dots[3][0] + dots[4][0]) / 2, (dots[3][1] + dots[4][1]) / 2);
      ctx.stroke();
      for (const d of dots) {
        ctx.fillStyle = "#8fd0ff";
        ctx.beginPath();
        ctx.arc(d[0], d[1], 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (hc && hc.tracking) {
      const mx = vx + (1 - hc.nx) * vw;
      const my = vy + hc.ny * vh;
      const cx = vx + (1 - hc._cal.x) * vw;
      const cy = vy + hc._cal.y * vh;

      ctx.strokeStyle = "rgba(244,210,122,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,186,70,0.75)";
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(vx + 24, cy - vh * 0.062);
      ctx.lineTo(vx + vw - 24, cy - vh * 0.062);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = hc.headHigh ? "#7dff9a" : "#ffd56a";
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const action = headActionLabel(hc);
    ctx.fillStyle = "rgba(10,6,8,0.72)";
    ctx.fillRect(W / 2 - 160, vy + vh - 52, 320, 40);
    ctx.fillStyle = action === "JUMP" ? "#7dff9a" : action === "LEFT" || action === "RIGHT" ? "#ffd56a" : "#f4d27a";
    ctx.font = "700 22px Cinzel, serif";
    ctx.fillText(action, W / 2, vy + vh - 24);

    ctx.font = "500 15px Cinzel, serif";
    ctx.fillStyle = "#e8d8b0";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText(hc && hc.lib ? ("tracker: " + hc.lib + "  ·  oczy · nos · kąciki ust  ·  CoP = średnia") : "tracker: MediaPipe Face Mesh", W / 2, 548);
    ctx.fillStyle = "#f4d27a";
    ctx.fillText("Pochyl głowę = chód    ·    Spacja = skok    ·    A = strzał    ·    głowa w górę = pocisk w górę", W / 2, 572);

    camUi.settings = null;
    camUi.retry = null;

    if (hc && hc.error) {
      ctx.fillStyle = "#ff8a7a";
      ctx.font = "500 13px Cinzel, serif";
      ctx.fillText(hc.error, W / 2, 610);
    }
    ctx.font = "italic 16px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#f4d27a";
    ctx.fillText("Enter albo przycisk „Zacznij grę” — da się wejść bez ramki na twarzy", W / 2, 678);
  }

  function drawHeadCam() {
    const hc = window.HeadCam;
    if (!hc || hc.status === "off") return;
    const vw = 168;
    const vh = 126;
    const x = 16;
    const y = H - vh - 16;
    ctx.save();
    ctx.fillStyle = "rgba(8,4,8,0.72)";
    ctx.fillRect(x - 4, y - 22, vw + 8, vh + 28);
    ctx.strokeStyle = "#d4b36a";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 4, y - 22, vw + 8, vh + 28);

    const pip = hc.preview && hc.preview.complete ? hc.preview : null;
    if (pip && pip.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, vw, vh);
      ctx.clip();
      ctx.translate(x + vw, y);
      ctx.scale(-1, 1);
      ctx.drawImage(pip, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1a1014";
      ctx.fillRect(x, y, vw, vh);
    }

    const mx = x + (1 - hc.nx) * vw;
    const my = y + hc.ny * vh;
    const cx = x + (1 - (hc._cal ? hc._cal.x : 0.5)) * vw;
    const cy = y + (hc._cal ? hc._cal.y : 0.5) * vh;

    ctx.strokeStyle = "rgba(244,210,122,0.45)";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,186,70,0.55)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 8, cy - vh * 0.062);
    ctx.lineTo(x + vw - 8, cy - vh * 0.062);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hc.tracking) {
      ctx.fillStyle = hc.headHigh ? "#7dff9a" : "#ffd56a";
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "600 11px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.textAlign = "left";
    let label = "HEAD CAM";
    if (hc.status === "loading") label = "LOADING TRACKER…";
    else if (hc.status === "seek" || hc.status === "lost") label = "LOOK AT THE CAMERA";
    else if (hc.status === "error") label = "CAMERA BLOCKED";
    else if (hc.status === "track") label = hc.headHigh ? "AIM UP" : "LEAN TO MOVE";
    ctx.fillText(label, x, y - 8);
    ctx.restore();
  }

  function drawHud() {
    ctx.save();
    ctx.fillStyle = "rgba(10,6,8,0.35)";
    ctx.fillRect(0, 0, W, 74);

    ctx.font = "600 15px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.textAlign = "left";
    ctx.fillText(stage ? stage.myth : "", 28, 28);
    ctx.font = "italic 16px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#e8d8b0";
    ctx.fillText(stage ? stage.subtitle : "", 28, 50);

    const lotus = images.lotus_hp;
    for (let i = 0; i < player.maxHp; i++) {
      const x = W / 2 - (player.maxHp * 28) / 2 + i * 28;
      ctx.globalAlpha = i < player.hp ? 1 : 0.22;
      if (lotus) ctx.drawImage(lotus, x, 14, 26, 22);
      else {
        ctx.fillStyle = "#f0c14a";
        ctx.fillRect(x, 18, 18, 16);
      }
    }
    ctx.globalAlpha = 1;

    const ready = hud.charge >= 5;
    for (let i = 0; i < 5; i++) {
      const x = W / 2 - 50 + i * 22;
      ctx.fillStyle = i < hud.charge
        ? (ready ? `rgba(255,220,90,${0.7 + Math.sin(time * 6) * 0.3})` : "#e8b84a")
        : "rgba(244,210,122,0.18)";
      ctx.beginPath();
      ctx.arc(x, 50, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ready) {
      ctx.font = "600 11px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff4d0";
      ctx.fillText("S", W / 2 + 68, 54);
    }

    ctx.textAlign = "right";
    ctx.font = "600 16px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.fillText("SCORE  " + String(hud.score).padStart(6, "0"), W - 28, 28);
    ctx.font = "italic 16px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#e8d8b0";
    ctx.fillText("LIVES  " + Math.max(0, hud.lives), W - 28, 50);

    if (boss && !boss.dead && boss.phase !== "enter") {
      const bw = 520;
      const bx = (W - bw) / 2;
      const by = 78;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(bx - 4, by - 18, bw + 8, 28);
      ctx.font = "600 12px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f4d27a";
      ctx.fillText(boss.def.name + "  ·  " + boss.def.title, W / 2, by - 4);
      ctx.fillStyle = "#2a1510";
      ctx.fillRect(bx, by + 2, bw, 8);
      ctx.fillStyle = stage.accent;
      ctx.fillRect(bx, by + 2, bw * (boss.hp / boss.maxHp), 8);
    }

    if (hud.bannerT > 0) {
      ctx.globalAlpha = clamp(hud.bannerT, 0, 1);
      ctx.textAlign = "center";
      ctx.font = "700 42px Cinzel, serif";
      ctx.fillStyle = "#fff4d0";
      ctx.fillText(hud.banner, W / 2, H * 0.28);
      ctx.globalAlpha = 1;
    }

    if (paused) {
      ctx.fillStyle = "rgba(8,4,8,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f4d27a";
      ctx.font = "700 40px Cinzel, serif";
      ctx.fillText("PAUSED", W / 2, H / 2 - 18);
      ctx.font = "500 16px Cinzel, serif";
      ctx.fillStyle = "#e8d8b0";
      ctx.fillText("Display  " + viewLabel() + "    ·    F  cycle    ·    C  set rest pose", W / 2, H / 2 + 28);
    }
    ctx.restore();
  }

  function drawCenterCard(title, sub, extra) {
    ctx.save();
    applyView();
    ctx.fillStyle = "rgba(8, 4, 10, 0.58)";
    ctx.fillRect(0, 0, W, H);
    const pw = 640;
    const ph = extra ? 188 : 150;
    const px = (W - pw) / 2;
    const py = H * 0.36;
    ctx.fillStyle = "rgba(16, 8, 12, 0.88)";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#d4b36a";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 44px Cinzel, serif";
    ctx.fillText(title, W / 2, py + 68);
    ctx.font = "italic 22px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#f0e2c0";
    ctx.fillText(sub, W / 2, py + 104);
    if (extra) {
      ctx.font = "500 15px Cinzel, serif";
      ctx.fillStyle = "#d4b36a";
      ctx.fillText(extra, W / 2, py + 142);
    }
    ctx.restore();
  }

  function drawTitle() {
    const img = images.bg_title;
    if (img) ctx.drawImage(img, 0, 0, W, H);
    else {
      ctx.fillStyle = "#140c10";
      ctx.fillRect(0, 0, W, H);
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(8,4,8,0.15)");
    g.addColorStop(0.55, "rgba(8,4,8,0.25)");
    g.addColorStop(1, "rgba(8,4,8,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 72px Cinzel, serif";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 18;
    ctx.fillText("BODHISATTVA", W / 2, 118);
    ctx.shadowBlur = 0;
    ctx.font = "italic 26px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#efe0b8";
    ctx.fillText("Lotus Path", W / 2, 156);

    ctx.font = "500 18px 'Cormorant Garamond', serif";
    ctx.fillStyle = "rgba(255,236,200,0.88)";
    ctx.fillText("A warrior of compassion walks every hell so that no being remains bound.", W / 2, 200);

    const names = [
      "I  Naraka — Buddhist",
      "II  Yomi — Japanese",
      "III  Tartarus — Greek",
      "IV  Niflheim — Norse",
      "V  Duat — Egyptian",
    ];
    ctx.fillStyle = "rgba(10,6,8,0.62)";
    ctx.fillRect(70, 552, W - 140, 44);
    ctx.font = "500 13px Cinzel, serif";
    ctx.fillStyle = "#e8c878";
    ctx.fillText(names.join("    ·    "), W / 2, 580);

    const pulse = 0.65 + Math.sin(hud.titlePulse * 2.4) * 0.35;
    ctx.globalAlpha = pulse;
    ctx.font = "600 20px Cinzel, serif";
    ctx.fillStyle = "#fff4d0";
    ctx.fillText("Press  Enter  to walk the path", W / 2, 628);
    ctx.globalAlpha = 1;
    ctx.font = "500 14px Cinzel, serif";
    ctx.fillStyle = "#e8c878";
    ctx.fillText("Display  " + viewLabel() + "     F  to cycle     F11  fullscreen", W / 2, 656);
    ctx.font = "italic 15px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText("Enter  camera check     ·     lean to move     ·     Space jump     ·     A shoot", W / 2, 680);
    if (hud.best) {
      ctx.fillText("Best  " + hud.best, W / 2, 704);
    }
  }

  function render() {
    const sx = camera.shake ? rand(-camera.shake, camera.shake) : 0;
    const sy = camera.shake ? rand(-camera.shake, camera.shake) : 0;
    applyView(sx, sy);

    if (state === STATE.TITLE) {
      drawTitle();
      return;
    }
    if (state === STATE.CALIBRATE) {
      drawCalibrate();
      return;
    }

    drawBg();
    if (stage) {
      drawGround();
      drawPlatforms();
    }
    drawParticles();
    if (player) drawPlayer();
    drawBeam();
    drawActors();

    applyView();
    if (hud.flash > 0) {
      ctx.fillStyle = `rgba(255,70,50,${hud.flash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }

    const vg = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 760);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const hideHud = state === STATE.INTRO || state === STATE.BOSS_IN || state === STATE.CLEAR || state === STATE.GAMEOVER || state === STATE.WIN;
    if (player && !hideHud) drawHud();
    if (state === STATE.PLAY || state === STATE.BOSS_IN) drawHeadCam();

    if (state === STATE.INTRO && stage) {
      drawCenterCard(stage.name, stage.subtitle, stage.myth);
    } else if (state === STATE.BOSS_IN && stage) {
      const b = BOSSES[stage.boss];
      drawCenterCard(b.name, b.title, "Boss of this realm");
    } else if (state === STATE.CLEAR) {
      drawCenterCard("REALM LIBERATED", stage.name, "The path continues…");
    } else if (state === STATE.GAMEOVER) {
      drawCenterCard("THE PATH BREAKS", "Score  " + hud.score, "Enter to rise again  ·  Esc for title");
    } else if (state === STATE.WIN) {
      drawCenterCard("ALL REALMS ARE FREE", "Compassion outlasts every hell", "Score  " + hud.score + "   ·   Enter for title");
    }
  }

  function onKey(e, down) {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) e.preventDefault();
    keys[code] = down;
    keys[e.key] = down;
    if (!down) return;

    if (code === "KeyM") muted = !muted;
    if (code === "KeyC") {
      requestHeadCam();
      if (window.HeadCam && window.HeadCam.active) window.HeadCam.calibrate();
      return;
    }
    if (code === "KeyW") {
      openWinCamSettings();
      return;
    }
    if (code === "KeyF") {
      cycleResolution();
      return;
    }
    if (code === "F11") {
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
      return;
    }
    if (state === STATE.TITLE && (code === "Enter" || code === "NumpadEnter" || code === "Space")) {
      beginCalibrate();
      return;
    }
    if (state === STATE.CALIBRATE && (code === "Enter" || code === "NumpadEnter" || code === "Space")) {
      startFromCalibrate();
      return;
    }
    if (state === STATE.CALIBRATE && code === "Escape") {
      setCamBar(false);
      state = STATE.TITLE;
      return;
    }
    if ((state === STATE.INTRO || state === STATE.BOSS_IN) && (code === "Enter" || code === "Space" || code === "KeyA")) {
      hud.introT = 0;
      return;
    }
    if (state === STATE.GAMEOVER && code === "Enter") {
      beginCalibrate();
      return;
    }
    if (state === STATE.WIN && code === "Enter") {
      state = STATE.TITLE;
      return;
    }
    if ((state === STATE.GAMEOVER || state === STATE.WIN) && code === "Escape") {
      state = STATE.TITLE;
      return;
    }
    if (code === "Escape" && (state === STATE.PLAY || state === STATE.BOSS_IN)) {
      paused = !paused;
    }
  }

  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.05) dt = 0.05;
    time += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  applyResolution();
  window.addEventListener("resize", applyResolution);
  document.addEventListener("fullscreenchange", applyResolution);
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const startKey = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
    if (startKey && (state === STATE.TITLE || state === STATE.CALIBRATE)) {
      e.preventDefault();
      e.stopPropagation();
      startFromCalibrate();
      return;
    }
    onKey(e, true);
  }, true);
  window.addEventListener("keyup", (e) => onKey(e, false));
  canvas.addEventListener("click", (ev) => {
    canvas.focus();
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
    const { gx, gy } = canvasPoint(ev);
    if (state === STATE.CALIBRATE) {
      if (hitBtn(camUi.settings, gx, gy)) {
        openWinCamSettings();
        return;
      }
      if (hitBtn(camUi.retry, gx, gy)) {
        requestHeadCam();
        return;
      }
      requestHeadCam();
      return;
    }
    if (state === STATE.TITLE) requestHeadCam();
  });

  const btnSet = document.getElementById("btn-cam-settings");
  const btnStart = document.getElementById("btn-cam-start");
  const btnPlay = document.getElementById("btn-cam-play");
  if (btnSet) {
    btnSet.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openWinCamSettings();
    });
  }
  if (btnStart) {
    btnStart.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      requestHeadCam();
    });
  }
  if (btnPlay) {
    btnPlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startFromCalibrate();
    });
  }

  loadAll()
    .then(() => {
      if (bootEl) bootEl.remove();
      canvas.focus();
      const params = new URLSearchParams(location.search);
      if (location.hash === "#play" || params.has("play")) {
        startRun();
        const si = parseInt(params.get("stage") || "0", 10);
        if (si > 0) startStage(Math.min(si, STAGES().length - 1), true);
        hud.introT = 0;
        state = STATE.PLAY;
        if (params.has("demo")) {
          keys.ArrowRight = true;
          keys.KeyA = true;
        }
        if (params.has("boss")) {
          player.x = stage.bossAt + 120;
          camera.lock = true;
          camera.lockX = stage.bossAt - 40;
          camera.x = camera.lockX;
          spawnBoss();
          if (boss) boss.phase = "fight";
        }
      }
      requestAnimationFrame(loop);
    })
    .catch((err) => {
      if (bootEl) bootEl.textContent = "Could not load an asset: " + err.message;
      console.error(err);
    });
})();
