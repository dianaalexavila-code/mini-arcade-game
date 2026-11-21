/* ============================================================
   MINI ARCADE – PLAY ZONE  |  app.js
   10 fully playable games, core system, achievements, leaderboard
   ============================================================ */

'use strict';

// ==================== POLYFILLS ====================
// ctx.roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
    const {tl=0, tr=0, br=0, bl=0} = r || {};
    this.beginPath();
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y); this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br); this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h); this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl); this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
    return this;
  };
}

// ==================== GAME CATALOGUE ====================
const GAMES = [
  { id:'shooter',  name:'Space Shooter',    icon:'🚀', color:'#7c3aed',
    desc:'Fly your spaceship, shoot enemies and meteors. Don\'t let them through!' },
  { id:'target',   name:'Target Master',    icon:'🎯', color:'#ef4444',
    desc:'Shoot moving targets as fast as you can before the timer runs out.' },
  { id:'asteroid', name:'Asteroid Dodge',   icon:'🛸', color:'#3b82f6',
    desc:'Dodge incoming asteroids. How long can you survive?' },
  { id:'snake',    name:'Snake Mini',       icon:'🐍', color:'#10b981',
    desc:'Classic snake game. Eat food, grow longer, don\'t crash!' },
  { id:'memory',   name:'Memory Match',     icon:'🧠', color:'#f59e0b',
    desc:'Flip cards and find matching pairs. Test your memory!' },
  { id:'reflex',   name:'Quick Reflex',     icon:'⚡', color:'#8b5cf6',
    desc:'Tap the target when it turns green. How fast are you?' },
  { id:'bubble',   name:'Bubble Shooter',   icon:'🫧', color:'#06b6d4',
    desc:'Shoot bubbles to match colors and clear the board.' },
  { id:'brick',    name:'Brick Breaker',    icon:'🧱', color:'#f97316',
    desc:'Break all the bricks with your ball and paddle.' },
  { id:'flappy',   name:'Flappy Style',     icon:'🐦', color:'#84cc16',
    desc:'Flap your wings to stay airborne and pass through gaps.' },
  { id:'racing',   name:'Racing Mini',      icon:'🏎️', color:'#ec4899',
    desc:'Race your car and dodge incoming traffic at high speed!' },
];

// ==================== ACHIEVEMENTS ====================
const ACHIEVEMENT_DEFS = [
  { id:'first_game',    name:'First Game',       icon:'🎮', desc:'Play any game for the first time' },
  { id:'score_1000',    name:'Score 1000',        icon:'💯', desc:'Reach 1000 points in any game' },
  { id:'score_5000',    name:'High Roller',       icon:'🔥', desc:'Reach 5000 points in any game' },
  { id:'no_miss',       name:'Perfect Aim',       icon:'🎯', desc:'Complete Target Master without missing' },
  { id:'snake_long',    name:'Big Snake',         icon:'🐍', desc:'Snake reaches length 20' },
  { id:'memory_fast',   name:'Memory Master',     icon:'🧠', desc:'Complete Memory Match in under 30s' },
  { id:'reflex_ms',     name:'Lightning Fast',    icon:'⚡', desc:'React in under 200ms in Quick Reflex' },
  { id:'all_games',     name:'Game Explorer',     icon:'🗺️', desc:'Play all 10 games at least once' },
  { id:'coins_100',     name:'Coin Collector',    icon:'🪙', desc:'Collect 100 coins' },
  { id:'survivor',      name:'Survivor',          icon:'🛡️', desc:'Survive 60 seconds in Asteroid Dodge' },
];

// ==================== STORAGE ====================
const Store = {
  get(key, def) {
    try { const v = localStorage.getItem('ma_'+key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('ma_'+key, JSON.stringify(val)); } catch {}
  }
};

// ==================== CORE STATE ====================
const State = {
  coins: Store.get('coins', 0),
  soundOn: Store.get('sound', true),
  leaderboard: Store.get('leaderboard', []),
  achievements: Store.get('achievements', {}),
  gamesPlayed: Store.get('gamesPlayed', {}),
  bestScores: Store.get('bestScores', {}),

  save() {
    Store.set('coins', this.coins);
    Store.set('sound', this.soundOn);
    Store.set('leaderboard', this.leaderboard);
    Store.set('achievements', this.achievements);
    Store.set('gamesPlayed', this.gamesPlayed);
    Store.set('bestScores', this.bestScores);
  },

  addScore(gameId, score, level) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;
    if (!this.bestScores[gameId] || score > this.bestScores[gameId]) {
      this.bestScores[gameId] = score;
    }
    this.leaderboard.push({
      game: game.name, gameId,
      score, level,
      date: new Date().toLocaleDateString()
    });
    this.leaderboard.sort((a,b) => b.score - a.score);
    if (this.leaderboard.length > 100) this.leaderboard.length = 100;

    if (!this.gamesPlayed[gameId]) this.gamesPlayed[gameId] = 0;
    this.gamesPlayed[gameId]++;

    const earnedCoins = Math.floor(score / 10);
    this.coins += earnedCoins;
    this.save();
    this.checkAchievements(gameId, score);
    updateHUDCoins();
    return earnedCoins;
  },

  checkAchievements(gameId, score) {
    const unlock = (id) => {
      if (!this.achievements[id]) {
        this.achievements[id] = true;
        this.save();
        const a = ACHIEVEMENT_DEFS.find(a => a.id === id);
        if (a) showToast(`🎖️ Achievement unlocked: ${a.name}!`);
        renderAchievements();
      }
    };
    // first game
    if (Object.keys(this.gamesPlayed).length >= 1) unlock('first_game');
    if (score >= 1000) unlock('score_1000');
    if (score >= 5000) unlock('score_5000');
    if (this.coins >= 100) unlock('coins_100');
    if (Object.keys(this.gamesPlayed).length >= 10) unlock('all_games');
  }
};

// ==================== SOUND ENGINE ====================
const SFX = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  play(type) {
    if (!State.soundOn) return;
    try {
      this.init();
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const configs = {
        shoot:  { freq: 880, type: 'square',   dur: 0.08, vol: 0.08 },
        hit:    { freq: 220, type: 'sawtooth',  dur: 0.12, vol: 0.12 },
        die:    { freq: 110, type: 'sawtooth',  dur: 0.4,  vol: 0.15 },
        win:    { freq: 660, type: 'sine',      dur: 0.3,  vol: 0.1  },
        coin:   { freq: 1320,type: 'sine',      dur: 0.15, vol: 0.08 },
        flap:   { freq: 440, type: 'sine',      dur: 0.07, vol: 0.07 },
        pop:    { freq: 550, type: 'sine',      dur: 0.1,  vol: 0.09 },
        beep:   { freq: 440, type: 'sine',      dur: 0.05, vol: 0.07 },
      };
      const c = configs[type] || configs.beep;
      o.type = c.type;
      o.frequency.setValueAtTime(c.freq, ctx.currentTime);
      g.gain.setValueAtTime(c.vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + c.dur);
      o.start(); o.stop(ctx.currentTime + c.dur);
    } catch {}
  }
};

// ==================== TOAST ====================
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ==================== GAME MODAL SYSTEM ====================
let currentGame = null;
let gamePaused = false;
let gameRunning = false;

const modal = {
  el: document.getElementById('gameModal'),
  diffScreen: document.getElementById('difficultyScreen'),
  canvasContainer: document.getElementById('canvasContainer'),
  canvas: document.getElementById('gameCanvas'),
  gameOverScreen: document.getElementById('gameOverScreen'),
  pauseScreen: document.getElementById('pauseScreen'),

  open(gameId) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;
    currentGame = game;
    document.getElementById('modalGameIcon').textContent = game.icon;
    document.getElementById('modalGameName').textContent = game.name;
    document.getElementById('diffGameTitle').textContent = game.name;
    document.getElementById('diffGameDesc').textContent = game.desc;
    this.el.classList.add('open');
    this.el.setAttribute('aria-hidden', 'false');
    this.diffScreen.classList.remove('hidden');
    this.gameOverScreen.style.display = 'none';
    this.pauseScreen.style.display = 'none';
    document.body.style.overflow = 'hidden';
    this.resetHUD();

    // Show/hide canvas vs memory/reflex DOM elements
    document.getElementById('gameCanvas').style.display = 'block';
    const memDiv = document.getElementById('memoryContainer');
    if (memDiv) { memDiv.classList.remove('active'); }
    const refDiv = document.getElementById('reflexContainer');
    if (refDiv) { refDiv.classList.remove('active'); }
  },

  close() {
    if (currentGame) stopCurrentGame();
    this.el.classList.remove('open');
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentGame = null;
    gameRunning = false;
    gamePaused = false;
    // cleanup special containers
    const mem = document.getElementById('memoryContainer');
    if (mem) mem.remove();
    const ref = document.getElementById('reflexContainer');
    if (ref) ref.remove();
  },

  resetHUD() {
    document.getElementById('hudScore').textContent = '0';
    document.getElementById('hudLives').textContent = '❤️❤️❤️';
    document.getElementById('hudLevel').textContent = '1';
  }
};

function updateHUDCoins() {
  document.getElementById('coinCount').textContent = State.coins;
}

function setHUD(score, lives, level) {
  document.getElementById('hudScore').textContent = score;
  document.getElementById('hudLives').textContent = '❤️'.repeat(Math.max(0, lives));
  document.getElementById('hudLevel').textContent = level;
}

function showGameOver(won, score, msg='') {
  gameRunning = false;
  gamePaused = false;
  const earnedCoins = State.addScore(currentGame.id, score, currentDifficulty);
  updateHUDCoins();

  document.getElementById('overlayEmoji').textContent = won ? '🏆' : '💀';
  document.getElementById('overlayTitle').textContent = won ? 'YOU WIN!' : 'GAME OVER';
  document.getElementById('overlayMsg').textContent = msg;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalCoins').textContent = earnedCoins || 0;
  modal.gameOverScreen.style.display = 'flex';
  SFX.play(won ? 'win' : 'die');
}

// ==================== DIFFICULTY ====================
let currentDifficulty = 'easy';
const DIFF_SETTINGS = {
  easy:   { speed: 1,   lives: 3, spawnRate: 0.015, enemyHp: 1 },
  medium: { speed: 1.6, lives: 2, spawnRate: 0.025, enemyHp: 2 },
  hard:   { speed: 2.4, lives: 1, spawnRate: 0.04,  enemyHp: 2 },
};

// ==================== KEYBOARD STATE ====================
const Keys = {};
document.addEventListener('keydown', e => { Keys[e.code] = true; });
document.addEventListener('keyup',   e => { Keys[e.code] = false; });

// ==================== INIT UI ====================
function renderGameCards() {
  const grid = document.getElementById('gamesGrid');
  grid.innerHTML = '';
  GAMES.forEach(game => {
    const best = State.bestScores[game.id] || 0;
    const played = State.gamesPlayed[game.id] || 0;
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="game-card-icon">${game.icon}</div>
      <div class="game-card-info">
        <div class="game-card-name">${game.name}</div>
        <div class="game-card-desc">${game.desc}</div>
      </div>
      <div class="game-card-meta">
        <span>Played: ${played}x</span>
        <span class="game-card-best">Best: ${best}</span>
      </div>
      <button class="btn-play">▶ PLAY</button>
    `;
    card.querySelector('.btn-play').addEventListener('click', () => modal.open(game.id));
    grid.appendChild(card);
  });
}

function renderLeaderboard(filterGameId='all') {
  const tbody = document.getElementById('lbTableBody');
  let entries = State.leaderboard;
  if (filterGameId !== 'all') entries = entries.filter(e => e.gameId === filterGameId);
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">No scores yet. Play some games!</td></tr>';
    return;
  }
  tbody.innerHTML = entries.slice(0,50).map((e,i) => `
    <tr class="${i===0?'lb-rank-1':i===1?'lb-rank-2':i===2?'lb-rank-3':''}">
      <td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)}</td>
      <td>${e.game}</td>
      <td>${e.score}</td>
      <td>${e.level||'—'}</td>
      <td>${e.date}</td>
    </tr>`).join('');
}

function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = ACHIEVEMENT_DEFS.map(a => {
    const unlocked = !!State.achievements[a.id];
    return `<div class="ach-card ${unlocked?'unlocked':'locked'}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
    </div>`;
  }).join('');
}

function renderProfile() {
  const played = Object.values(State.gamesPlayed).reduce((a,b)=>a+b, 0);
  const best = Math.max(0, ...Object.values(State.bestScores));
  const achCount = Object.values(State.achievements).filter(Boolean).length;
  document.getElementById('profileStats').textContent =
    `${played} games played · ${achCount} achievements · ${State.coins} coins`;
  document.getElementById('profileStatsGrid').innerHTML = `
    <div class="stat-box"><div class="stat-num">${played}</div><div class="stat-label">Games Played</div></div>
    <div class="stat-box"><div class="stat-num">${best}</div><div class="stat-label">Best Score</div></div>
    <div class="stat-box"><div class="stat-num">${State.coins}</div><div class="stat-label">Coins</div></div>
    <div class="stat-box"><div class="stat-num">${achCount}</div><div class="stat-label">Achievements</div></div>
    <div class="stat-box"><div class="stat-num">${Object.keys(State.gamesPlayed).length}</div><div class="stat-label">Unique Games</div></div>
  `;
}

function populateLBFilter() {
  const sel = document.getElementById('lbGameFilter');
  sel.innerHTML = '<option value="all">All Games</option>' +
    GAMES.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// ==================== NAVIGATION ====================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'leaderboard') renderLeaderboard();
    if (btn.dataset.tab === 'achievements') renderAchievements();
    if (btn.dataset.tab === 'profile') renderProfile();
  });
});

// Sound toggle
document.getElementById('soundToggle').addEventListener('click', () => {
  State.soundOn = !State.soundOn;
  document.getElementById('soundToggle').textContent = State.soundOn ? '🔊' : '🔇';
  State.save();
});

// Difficulty buttons
document.querySelectorAll('.btn-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    currentDifficulty = btn.dataset.diff;
    modal.diffScreen.classList.add('hidden');
    startCurrentGame();
  });
});

// Pause
document.getElementById('pauseBtn').addEventListener('click', () => {
  if (!gameRunning && !gamePaused) return;
  if (gamePaused) {
    gamePaused = false;
    modal.pauseScreen.style.display = 'none';
    resumeCurrentGame();
  } else {
    gamePaused = true;
    modal.pauseScreen.style.display = 'flex';
    pauseCurrentGame();
    document.getElementById('pauseBtn').textContent = '▶ Resume';
  }
});
document.getElementById('resumeBtn').addEventListener('click', () => {
  gamePaused = false;
  modal.pauseScreen.style.display = 'none';
  document.getElementById('pauseBtn').textContent = '⏸ Pause';
  resumeCurrentGame();
});
document.getElementById('pauseMenuBtn').addEventListener('click', () => modal.close());
document.getElementById('closeGameBtn').addEventListener('click', () => modal.close());
document.getElementById('menuBtn').addEventListener('click', () => modal.close());
document.getElementById('restartBtn').addEventListener('click', () => {
  modal.gameOverScreen.style.display = 'none';
  modal.diffScreen.classList.remove('hidden');
  stopCurrentGame();
  renderGameCards();
});
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm('Reset ALL data? This cannot be undone.')) {
    State.coins = 0; State.leaderboard = []; State.achievements = {};
    State.gamesPlayed = {}; State.bestScores = {};
    State.save(); renderGameCards(); renderProfile(); showToast('Data reset!');
  }
});

// Leaderboard filter
document.getElementById('lbGameFilter').addEventListener('change', e => renderLeaderboard(e.target.value));

// ==================== GAME ROUTER ====================
function startCurrentGame() {
  if (!currentGame) return;
  gameRunning = true;
  gamePaused = false;
  document.getElementById('pauseBtn').textContent = '⏸ Pause';
  modal.gameOverScreen.style.display = 'none';
  modal.pauseScreen.style.display = 'none';

  const canvas = modal.canvas;
  const container = modal.canvasContainer;
  canvas.style.display = 'block';

  // Size canvas
  const w = Math.min(container.clientWidth, 760);
  const h = Math.min(container.clientHeight || 460, 500);
  canvas.width = w || 480;
  canvas.height = h || 400;

  switch(currentGame.id) {
    case 'shooter':  startSpaceShooter(); break;
    case 'target':   startTargetMaster(); break;
    case 'asteroid': startAsteroidDodge(); break;
    case 'snake':    startSnakeMini(); break;
    case 'memory':   startMemoryMatch(); break;
    case 'reflex':   startQuickReflex(); break;
    case 'bubble':   startBubbleShooter(); break;
    case 'brick':    startBrickBreaker(); break;
    case 'flappy':   startFlappyStyle(); break;
    case 'racing':   startRacingMini(); break;
  }
}

function stopCurrentGame()   { gameRunning = false; clearAllIntervals(); }
function pauseCurrentGame()  { gameRunning = false; }
function resumeCurrentGame() { gameRunning = true; resumeGame(); }

const _intervals = [];
const _rafs = { id: null };
function clearAllIntervals() {
  _intervals.forEach(id => clearInterval(id));
  _intervals.length = 0;
  if (_rafs.id) { cancelAnimationFrame(_rafs.id); _rafs.id = null; }
}
function safeRAF(fn) {
  if (_rafs.id) cancelAnimationFrame(_rafs.id);
  function loop() {
    if (!gameRunning) return;
    fn();
    _rafs.id = requestAnimationFrame(loop);
  }
  _rafs.id = requestAnimationFrame(loop);
}

let _resumeFn = null;
function resumeGame() { if (_resumeFn) _resumeFn(); }

// Touch control mapping
function setupTouchControls(map) {
  // map: { up, down, left, right, action } => callback
  ['up','down','left','right','action'].forEach(dir => {
    const el = document.getElementById('tc-' + (dir==='action'?'action':dir));
    if (!el) return;
    el.ontouchstart = el.onmousedown = (e) => { e.preventDefault(); if (map[dir]) map[dir](true); };
    el.ontouchend = el.onmouseup = (e) => { e.preventDefault(); if (map[dir]) map[dir](false); };
  });
}

// ==================== HELPER: draw text ====================
function ctx2d() { return modal.canvas.getContext('2d'); }
function drawText(ctx, text, x, y, size=14, color='#fff', align='left') {
  ctx.font = `bold ${size}px "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

// =========================================================
// GAME 1: SPACE SHOOTER
// =========================================================
function startSpaceShooter() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = DIFF_SETTINGS[currentDifficulty];

  let score = 0, lives = diff.lives, level = 1;
  let ship = { x: W/2, y: H-60, w: 32, h: 36, speed: 5 };
  let bullets = [], enemies = [], meteors = [];
  let frame = 0, canShoot = true, shootTimer = 0;

  const touchState = { left: false, right: false, fire: false };
  setupTouchControls({
    left:   v => touchState.left = v,
    right:  v => touchState.right = v,
    action: v => { if (v) touchState.fire = true; }
  });

  function spawnEnemy() {
    enemies.push({
      x: 30 + Math.random() * (W - 60), y: -20,
      w: 28, h: 28, hp: diff.enemyHp,
      speed: diff.speed * (0.8 + Math.random()*0.6),
      drift: (Math.random()-0.5)*1.2
    });
  }
  function spawnMeteor() {
    meteors.push({
      x: Math.random() * W, y: -20,
      r: 12 + Math.random()*12,
      speed: diff.speed * (0.6 + Math.random()*0.8),
      rot: 0, rotSpeed: (Math.random()-0.5)*0.1
    });
  }

  function drawShip(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(-16, 18); ctx.lineTo(16, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-8, 14); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(0, 16, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-14, -14); ctx.lineTo(14, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, -4, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawMeteor(m) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
    ctx.fillStyle = '#78716c'; ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#a8a29e'; ctx.beginPath();
    ctx.arc(-m.r*0.3, -m.r*0.3, m.r*0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawStars() {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i=0; i<60; i++) {
      const sx = (i*137 + frame*0.3) % W;
      const sy = (i*83 + frame*(0.5+i%3*0.2)) % H;
      ctx.beginPath(); ctx.arc(sx, sy, i%3===0?1.5:0.8, 0, Math.PI*2); ctx.fill();
    }
  }

  function fireBullet() {
    if (!canShoot) return;
    bullets.push({ x: ship.x, y: ship.y - 18, w: 4, h: 14, speed: 10 });
    SFX.play('shoot'); canShoot = false;
    setTimeout(() => canShoot = true, 150);
  }

  function collides(a, b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }
  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const dx = Math.abs(cx - rx - rw/2), dy = Math.abs(cy - ry - rh/2);
    if (dx > rw/2 + cr || dy > rh/2 + cr) return false;
    if (dx <= rw/2 || dy <= rh/2) return true;
    return (dx-rw/2)**2 + (dy-rh/2)**2 <= cr*cr;
  }

  _resumeFn = () => safeRAF(update);

  function update() {
    frame++;
    // Input
    if ((Keys['ArrowLeft'] || Keys['KeyA'] || touchState.left) && ship.x > ship.w/2+2) ship.x -= ship.speed;
    if ((Keys['ArrowRight'] || Keys['KeyD'] || touchState.right) && ship.x < W - ship.w/2-2) ship.x += ship.speed;
    if ((Keys['Space'] || Keys['KeyZ'] || touchState.fire)) { fireBullet(); touchState.fire = false; }

    // Shoot timer
    shootTimer++; if (shootTimer > 30) { canShoot = true; shootTimer = 0; }

    // Level up
    level = 1 + Math.floor(score / 500);

    // Spawn
    if (Math.random() < diff.spawnRate * (1 + level*0.1)) spawnEnemy();
    if (Math.random() < diff.spawnRate * 0.6) spawnMeteor();

    // Update bullets
    bullets = bullets.filter(b => { b.y -= b.speed; return b.y > -20; });

    // Update enemies
    enemies.forEach(e => { e.x += e.drift; e.y += e.speed; });
    enemies = enemies.filter(e => e.y < H + 30);

    // Update meteors
    meteors.forEach(m => { m.y += m.speed; m.rot += m.rotSpeed; });
    meteors = meteors.filter(m => m.y < H + 30);

    // Bullet-enemy collisions
    bullets.forEach((b, bi) => {
      enemies.forEach((e, ei) => {
        if (collides({x:b.x-2,y:b.y,w:b.w,h:b.h}, {x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h})) {
          e.hp--; b.dead = true;
          if (e.hp <= 0) { e.dead = true; score += 100; SFX.play('coin'); }
          else SFX.play('hit');
        }
      });
    });
    bullets = bullets.filter(b => !b.dead);
    enemies = enemies.filter(e => !e.dead);

    // Bullet-meteor collisions
    bullets.forEach(b => {
      meteors.forEach(m => {
        if (circleRect(m.x, m.y, m.r, b.x-2, b.y, b.w, b.h)) {
          b.dead = true; m.dead = true; score += 50; SFX.play('hit');
        }
      });
    });
    bullets = bullets.filter(b => !b.dead);
    meteors = meteors.filter(m => !m.dead);

    // Ship-enemy collisions
    enemies.forEach(e => {
      if (circleRect(e.x, e.y, 14, ship.x-16, ship.y-18, 32, 36)) {
        e.dead = true; lives--; SFX.play('die');
      }
    });
    enemies = enemies.filter(e => !e.dead);

    // Ship-meteor
    meteors.forEach(m => {
      if (circleRect(m.x, m.y, m.r, ship.x-16, ship.y-18, 32, 36)) {
        m.dead = true; lives--; SFX.play('die');
      }
    });
    meteors = meteors.filter(m => !m.dead);

    setHUD(score, lives, level);

    // Enemy reaches bottom
    enemies.filter(e => e.y > H - 10).forEach(e => { e.dead = true; lives--; });
    enemies = enemies.filter(e => !e.dead);

    if (lives <= 0) { showGameOver(false, score, `You reached level ${level}!`); return; }

    // Draw
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);
    drawStars();
    bullets.forEach(b => { ctx.fillStyle='#fde68a'; ctx.fillRect(b.x-2, b.y, b.w, b.h); });
    enemies.forEach(drawEnemy);
    meteors.forEach(drawMeteor);
    drawShip(ship.x, ship.y);
  }

  safeRAF(update);
}

// =========================================================
// GAME 2: TARGET MASTER
// =========================================================
function startTargetMaster() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = currentDifficulty;

  const times = { easy: 45, medium: 30, hard: 20 };
  let timeLeft = times[diff];
  let score = 0, misses = 0;
  let targets = [];
  let frame = 0;

  function spawnTarget() {
    const size = diff==='hard' ? 20 + Math.random()*20 : 25 + Math.random()*30;
    targets.push({
      x: size + Math.random() * (W - size*2),
      y: size + Math.random() * (H - size*2),
      r: size, life: 1,
      vx: (Math.random()-0.5) * (diff==='easy'?2:diff==='medium'?3:5),
      vy: (Math.random()-0.5) * (diff==='easy'?2:diff==='medium'?3:5),
      color: `hsl(${Math.random()*360},80%,60%)`,
      maxLife: diff==='easy'?3:diff==='medium'?2:1.5,
      age: 0,
    });
  }
  spawnTarget(); spawnTarget();

  // Click/tap
  canvas.onclick = canvas.ontouchend = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const clientX = e.touches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.touches ? e.changedTouches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;
    let hit = false;
    targets = targets.filter(t => {
      const d = Math.hypot(mx-t.x, my-t.y);
      if (d < t.r) {
        score += Math.floor(100 * (t.r / 50)); SFX.play('coin'); hit = true; return false;
      }
      return true;
    });
    if (!hit) { misses++; SFX.play('hit'); }
    spawnTarget();
  };
  document.getElementById('tc-action').ontouchstart = (e) => {
    e.preventDefault();
    canvas.ontouchend(e);
  };

  const timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      canvas.onclick = null; canvas.ontouchend = null;
      showGameOver(score > 0, score, `Hits: ${score/100|0}  Misses: ${misses}`);
    }
  }, 1000);
  _intervals.push(timerInterval);

  State.checkAchievements('target', score);
  _resumeFn = () => safeRAF(update);

  function update() {
    frame++;
    // Update targets
    targets.forEach(t => {
      t.x += t.vx; t.y += t.vy; t.age += 0.016;
      if (t.x < t.r || t.x > W-t.r) t.vx *= -1;
      if (t.y < t.r || t.y > H-t.r) t.vy *= -1;
      t.life = Math.max(0, 1 - t.age / t.maxLife);
      if (t.life <= 0) { t.dead = true; misses++; spawnTarget(); }
    });
    targets = targets.filter(t => !t.dead);

    // Draw
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(59,130,246,0.1)'; ctx.lineWidth = 1;
    for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    targets.forEach(t => {
      const alpha = 0.4 + t.life * 0.6;
      ctx.globalAlpha = alpha;
      // Outer ring
      ctx.strokeStyle = t.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r*0.6, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r*0.25, 0, Math.PI*2); ctx.stroke();
      // Bullseye
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r*0.12, 0, Math.PI*2); ctx.fill();
      // Crosshair
      ctx.strokeStyle = t.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(t.x-t.r-8, t.y); ctx.lineTo(t.x+t.r+8, t.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x, t.y-t.r-8); ctx.lineTo(t.x, t.y+t.r+8); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // HUD overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H-36, W, 36);
    drawText(ctx, `Score: ${score}`, 10, H-10, 15, '#c4b5fd');
    drawText(ctx, `Time: ${timeLeft}s`, W/2, H-10, 15, timeLeft<10?'#f87171':'#fde68a', 'center');
    drawText(ctx, `Misses: ${misses}`, W-10, H-10, 15, '#94a3b8', 'right');
    setHUD(score, diff==='easy'?3:diff==='medium'?2:1, 1);
  }

  safeRAF(update);
}

// =========================================================
// GAME 3: ASTEROID DODGE
// =========================================================
function startAsteroidDodge() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = DIFF_SETTINGS[currentDifficulty];

  let score = 0, lives = diff.lives, survived = 0;
  let ship = { x: W/2, y: H/2, r: 14, speed: 4.5 };
  let asteroids = [];
  let frame = 0;
  const startTime = Date.now();

  const touchState = { up:false, down:false, left:false, right:false };
  setupTouchControls({
    up:    v => touchState.up = v,
    down:  v => touchState.down = v,
    left:  v => touchState.left = v,
    right: v => touchState.right = v,
  });

  for (let i=0; i<5; i++) spawnAsteroid();

  function spawnAsteroid() {
    const side = Math.floor(Math.random()*4);
    let x, y;
    if (side===0) { x=Math.random()*W; y=-30; }
    else if (side===1) { x=Math.random()*W; y=H+30; }
    else if (side===2) { x=-30; y=Math.random()*H; }
    else { x=W+30; y=Math.random()*H; }
    const angle = Math.atan2(H/2 - y, W/2 - x) + (Math.random()-0.5)*1.2;
    const spd = diff.speed * (0.5 + Math.random());
    asteroids.push({
      x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd,
      r: 14 + Math.random()*20, rot: 0, rotS: (Math.random()-0.5)*0.05
    });
  }

  function drawShip(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawAsteroid(a) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    ctx.fillStyle = '#78716c'; ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0; i<8; i++) {
      const ang = (i/8)*Math.PI*2;
      const r = a.r * (0.75 + Math.sin(i*2.3)*0.25);
      if (i===0) ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
      else ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _resumeFn = () => safeRAF(update);

  function update() {
    frame++;
    survived = Math.floor((Date.now() - startTime) / 1000);
    score = survived * 10 + (Math.floor(frame / 60)) * 5;

    // Input
    if (Keys['ArrowUp']    || Keys['KeyW'] || touchState.up)    ship.y -= ship.speed;
    if (Keys['ArrowDown']  || Keys['KeyS'] || touchState.down)  ship.y += ship.speed;
    if (Keys['ArrowLeft']  || Keys['KeyA'] || touchState.left)  ship.x -= ship.speed;
    if (Keys['ArrowRight'] || Keys['KeyD'] || touchState.right) ship.x += ship.speed;

    // Clamp
    ship.x = Math.max(ship.r, Math.min(W-ship.r, ship.x));
    ship.y = Math.max(ship.r, Math.min(H-ship.r, ship.y));

    // Update asteroids
    asteroids.forEach(a => {
      a.x += a.vx; a.y += a.vy; a.rot += a.rotS;
      if (Math.abs(a.x - W/2) > W + a.r*2 || Math.abs(a.y - H/2) > H + a.r*2) {
        a.reset = true;
      }
    });
    asteroids = asteroids.filter(a => !a.reset);

    // Spawn
    if (frame % Math.floor(90 / diff.speed) === 0) spawnAsteroid();
    if (asteroids.length < 4 + Math.floor(survived/10)) spawnAsteroid();

    // Collisions
    asteroids.forEach(a => {
      if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + ship.r - 4) {
        a.reset = true; lives--; SFX.play('die');
      }
    });
    asteroids = asteroids.filter(a => !a.reset);

    setHUD(score, lives, Math.floor(survived/10)+1);

    if (lives <= 0) {
      if (survived >= 60) State.achievements['survivor'] = true, State.save();
      showGameOver(false, score, `Survived ${survived}s!`); return;
    }

    // Draw
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i=0; i<50; i++) {
      const sx = (i*137.5) % W, sy = (i*79.3) % H;
      ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI*2); ctx.fill();
    }
    asteroids.forEach(drawAsteroid);
    drawShip(ship.x, ship.y);

    // Timer bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H-26, W, 26);
    drawText(ctx, `Survived: ${survived}s`, 10, H-6, 13, '#c4b5fd');
    drawText(ctx, `Score: ${score}`, W-10, H-6, 13, '#fde68a', 'right');
  }

  safeRAF(update);
}

// =========================================================
// GAME 4: SNAKE MINI
// =========================================================
function startSnakeMini() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;

  const SIZE = 20;
  const COLS = Math.floor(W / SIZE);
  const ROWS = Math.floor(H / SIZE);
  const speeds = { easy: 150, medium: 100, hard: 65 };
  const TICK = speeds[currentDifficulty];

  let snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }];
  let dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 };
  let food = placeFood();
  let score = 0;
  let lives = DIFF_SETTINGS[currentDifficulty].lives;
  let started = false;

  function placeFood() {
    let pos;
    do { pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) }; }
    while (snake.some(s => s.x===pos.x && s.y===pos.y));
    return pos;
  }

  document.addEventListener('keydown', handleKey);
  function handleKey(e) {
    if (!gameRunning) return;
    if (e.code==='ArrowUp'    || e.code==='KeyW') nextDir = {x:0,y:-1};
    if (e.code==='ArrowDown'  || e.code==='KeyS') nextDir = {x:0,y:1};
    if (e.code==='ArrowLeft'  || e.code==='KeyA') nextDir = {x:-1,y:0};
    if (e.code==='ArrowRight' || e.code==='KeyD') nextDir = {x:1,y:0};
  }

  setupTouchControls({
    up:    v => { if(v) nextDir = {x:0,y:-1}; },
    down:  v => { if(v) nextDir = {x:0,y:1}; },
    left:  v => { if(v) nextDir = {x:-1,y:0}; },
    right: v => { if(v) nextDir = {x:1,y:0}; },
  });

  _resumeFn = () => { const id = setInterval(tick, TICK); _intervals.push(id); };
  drawGame();

  function tick() {
    if (!gameRunning) return;
    // Don't reverse
    if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) dir = { ...nextDir };

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      lives--; SFX.play('die'); setHUD(score, lives, Math.floor(snake.length/5)+1);
      if (lives <= 0) {
        clearAllIntervals(); document.removeEventListener('keydown', handleKey);
        showGameOver(false, score, `Snake length: ${snake.length}`); return;
      }
      snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }];
      dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
      return;
    }

    // Self collision
    if (snake.some(s => s.x===head.x && s.y===head.y)) {
      lives--; SFX.play('die'); setHUD(score, lives, Math.floor(snake.length/5)+1);
      if (lives <= 0) {
        clearAllIntervals(); document.removeEventListener('keydown', handleKey);
        showGameOver(false, score, `Snake length: ${snake.length}`); return;
      }
      snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }];
      dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10 * snake.length;
      SFX.play('coin');
      food = placeFood();
      if (snake.length >= 20) State.achievements['snake_long'] = true, State.save();
    } else {
      snake.pop();
    }
    setHUD(score, lives, Math.floor(snake.length/5)+1);
    drawGame();
  }

  function drawGame() {
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);
    // Grid lines
    ctx.strokeStyle = 'rgba(59,130,246,0.07)'; ctx.lineWidth = 0.5;
    for (let x=0; x<=COLS; x++) { ctx.beginPath(); ctx.moveTo(x*SIZE,0); ctx.lineTo(x*SIZE,H); ctx.stroke(); }
    for (let y=0; y<=ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*SIZE); ctx.lineTo(W,y*SIZE); ctx.stroke(); }

    // Snake
    snake.forEach((seg, i) => {
      const hue = 140 + i * 2;
      ctx.fillStyle = i===0 ? '#a78bfa' : `hsl(${hue},70%,${50-i*0.3}%)`;
      ctx.beginPath();
      ctx.roundRect(seg.x*SIZE+1, seg.y*SIZE+1, SIZE-2, SIZE-2, 4);
      ctx.fill();
    });

    // Eyes on head
    if (snake.length > 0) {
      const h = snake[0];
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(h.x*SIZE+6, h.y*SIZE+6, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x*SIZE+14, h.y*SIZE+6, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1f2328';
      ctx.beginPath(); ctx.arc(h.x*SIZE+7, h.y*SIZE+7, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x*SIZE+15, h.y*SIZE+7, 1.5, 0, Math.PI*2); ctx.fill();
    }

    // Food
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(food.x*SIZE+SIZE/2, food.y*SIZE+SIZE/2, SIZE/2-2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(food.x*SIZE+SIZE/2-1, food.y*SIZE+2, 3, 6); // stem
  }

  const id = setInterval(tick, TICK);
  _intervals.push(id);
}

// =========================================================
// GAME 5: MEMORY MATCH
// =========================================================
function startMemoryMatch() {
  const canvas = modal.canvas;
  canvas.style.display = 'none';

  const container = modal.canvasContainer;
  const memDiv = document.createElement('div');
  memDiv.id = 'memoryContainer';
  memDiv.className = 'memory-container active';
  container.appendChild(memDiv);

  const EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍒','🥝','🍑','🍍','🥭','🍌','🍐','🫐','🍈','🍉','🫒'];
  const pairs = currentDifficulty==='easy' ? 8 : currentDifficulty==='medium' ? 10 : 12;
  const symbols = EMOJIS.slice(0, pairs);
  let cards = [...symbols, ...symbols].sort(() => Math.random()-0.5);

  let flipped = [], matched = 0, moves = 0, canFlip = true;
  const startTime = Date.now();

  cards.forEach((sym, i) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.index = i;
    card.dataset.sym = sym;
    card.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-card-front">❓</div>
        <div class="memory-card-back">${sym}</div>
      </div>`;
    card.addEventListener('click', () => flipCard(card));
    memDiv.appendChild(card);
  });

  function flipCard(card) {
    if (!gameRunning || !canFlip) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (flipped.length >= 2) return;
    card.classList.add('flipped');
    flipped.push(card);
    SFX.play('beep');
    if (flipped.length === 2) {
      canFlip = false; moves++;
      if (flipped[0].dataset.sym === flipped[1].dataset.sym) {
        flipped[0].classList.add('matched'); flipped[1].classList.add('matched');
        matched++; SFX.play('coin');
        flipped = []; canFlip = true;
        if (matched === pairs) {
          const elapsed = Math.floor((Date.now()-startTime)/1000);
          const bonus = Math.max(0, 500 - elapsed*5);
          const score = matched * 100 + bonus - moves * 5;
          if (elapsed < 30) State.achievements['memory_fast'] = true, State.save();
          showGameOver(true, Math.max(score, matched*50), `Completed in ${elapsed}s, ${moves} moves`);
        }
      } else {
        setTimeout(() => {
          flipped.forEach(c => c.classList.remove('flipped'));
          flipped = []; canFlip = true;
        }, 900);
      }
    }
    setHUD(matched * 100, pairs - matched, 1);
  }

  _resumeFn = () => {};
  setHUD(0, pairs, 1);
}

// =========================================================
// GAME 6: QUICK REFLEX
// =========================================================
function startQuickReflex() {
  const canvas = modal.canvas;
  canvas.style.display = 'none';

  const container = modal.canvasContainer;
  const refDiv = document.createElement('div');
  refDiv.id = 'reflexContainer';
  refDiv.className = 'reflex-container active';
  refDiv.innerHTML = `
    <div id="reflexTarget" class="reflex-target" style="background:#1e1e40;border:4px solid #2e2e60">⏳</div>
    <div class="reflex-instructions" id="reflexInstructions">Wait for the target to turn GREEN, then tap it!</div>
    <div class="reflex-stats">
      <div><div class="reflex-stat-num" id="reflexScore">0</div><div class="reflex-stat-label">Score</div></div>
      <div><div class="reflex-stat-num" id="reflexReaction">—</div><div class="reflex-stat-label">Last Reaction</div></div>
      <div><div class="reflex-stat-num" id="reflexRound">0</div><div class="reflex-stat-label">Round</div></div>
    </div>`;
  container.appendChild(refDiv);

  const totalRounds = currentDifficulty==='easy' ? 8 : currentDifficulty==='medium' ? 10 : 12;
  let round = 0, score = 0, greenTime = 0, state = 'waiting';
  let timer = null;

  const target = document.getElementById('reflexTarget');
  const instructions = document.getElementById('reflexInstructions');

  function nextRound() {
    round++;
    if (round > totalRounds) {
      showGameOver(true, score, `All ${totalRounds} rounds completed!`); return;
    }
    state = 'waiting';
    target.style.background = '#1e1e40';
    target.style.borderColor = '#2e2e60';
    target.textContent = '⏳';
    instructions.textContent = 'Wait for GREEN...';
    document.getElementById('reflexRound').textContent = round;

    const delay = 1500 + Math.random() * (currentDifficulty==='easy'?2500:currentDifficulty==='medium'?2000:1500);
    timer = setTimeout(() => {
      if (!gameRunning) return;
      state = 'green';
      target.style.background = '#10b981';
      target.style.borderColor = '#34d399';
      target.textContent = '✅';
      instructions.textContent = 'TAP NOW!';
      greenTime = Date.now();
      // Auto-fail if too slow
      timer = setTimeout(() => {
        if (state === 'green') {
          state = 'missed'; target.style.background = '#ef4444';
          target.textContent = '❌'; score = Math.max(0, score-50);
          instructions.textContent = 'Too slow! -50 pts';
          document.getElementById('reflexScore').textContent = score;
          setTimeout(nextRound, 1000);
        }
      }, currentDifficulty==='easy'?3000:currentDifficulty==='medium'?2000:1500);
    }, delay);
  }

  target.addEventListener('click', handleTap);
  target.addEventListener('touchend', e => { e.preventDefault(); handleTap(); });
  document.getElementById('tc-action').ontouchstart = e => { e.preventDefault(); handleTap(); };

  function handleTap() {
    if (!gameRunning) return;
    if (state === 'waiting') {
      // Too early
      clearTimeout(timer);
      state = 'early';
      target.style.background = '#f59e0b';
      target.textContent = '⚠️';
      instructions.textContent = 'Too early! Wait for green.';
      score = Math.max(0, score - 30);
      document.getElementById('reflexScore').textContent = score;
      setTimeout(nextRound, 1000);
    } else if (state === 'green') {
      clearTimeout(timer);
      const reaction = Date.now() - greenTime;
      state = 'hit';
      const pts = Math.max(10, 500 - reaction);
      score += pts;
      instructions.textContent = `${reaction}ms! +${pts} pts`;
      document.getElementById('reflexReaction').textContent = reaction + 'ms';
      document.getElementById('reflexScore').textContent = score;
      target.style.background = '#3b82f6';
      target.textContent = '⚡';
      if (reaction < 200) State.achievements['reflex_ms'] = true, State.save();
      setHUD(score, totalRounds - round + 1, round);
      SFX.play('coin');
      setTimeout(nextRound, 800);
    }
  }

  _resumeFn = () => {};
  setHUD(0, totalRounds, 1);
  nextRound();
}

// =========================================================
// GAME 7: BUBBLE SHOOTER
// =========================================================
function startBubbleShooter() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = DIFF_SETTINGS[currentDifficulty];

  const R = 18; // bubble radius
  const COLS = Math.floor(W / (R*2)) - 1;
  const ROWS_VISIBLE = 8;
  const COLORS = ['#f87171','#60a5fa','#34d399','#fbbf24','#a78bfa','#f472b6'];
  const numColors = currentDifficulty==='easy' ? 3 : currentDifficulty==='medium' ? 4 : 5;
  const usedColors = COLORS.slice(0, numColors);

  let grid = [];
  let score = 0, lives = diff.lives;
  let shooter = { x: W/2, y: H - 40, angle: -Math.PI/2, color: randomColor() };
  let nextColor = randomColor();
  let bullet = null;
  let frame = 0;

  function randomColor() { return usedColors[Math.floor(Math.random()*usedColors.length)]; }

  // Build initial grid
  for (let row=0; row<ROWS_VISIBLE-2; row++) {
    grid[row] = [];
    for (let col=0; col<COLS; col++) {
      if (Math.random() > 0.15) grid[row][col] = { color: randomColor(), row, col };
      else grid[row][col] = null;
    }
  }

  function bubbleXY(row, col) {
    const offsetX = (row % 2) ? R : 0;
    return { x: R + col * R*2 + offsetX + (W - COLS*R*2)/2, y: R*2 + row * (R*1.72) };
  }

  function drawBubble(x, y, color, alpha=1) {
    ctx.save(); ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x-R*0.3, y-R*0.3, R*0.1, x, y, R);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, color); g.addColorStop(1, darken(color));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R-1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function darken(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n>>16)-40), g = Math.max(0, ((n>>8)&0xff)-40), b = Math.max(0,(n&0xff)-40);
    return `rgb(${r},${g},${b})`;
  }

  // Mouse/touch aim
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    shooter.angle = Math.atan2(my - shooter.y, mx - shooter.x);
    shooter.angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, shooter.angle));
  };

  canvas.onclick = canvas.ontouchend = (e) => {
    e.preventDefault();
    if (bullet) return;
    SFX.play('shoot');
    bullet = { x: shooter.x, y: shooter.y, vx: Math.cos(shooter.angle)*9, vy: Math.sin(shooter.angle)*9, color: shooter.color };
    shooter.color = nextColor;
    nextColor = randomColor();
  };
  document.getElementById('tc-left').ontouchstart  = e => { e.preventDefault(); shooter.angle -= 0.15; };
  document.getElementById('tc-right').ontouchstart = e => { e.preventDefault(); shooter.angle += 0.15; };
  document.getElementById('tc-action').ontouchstart = e => { e.preventDefault(); canvas.onclick(e); };

  function findGrid(bx, by) {
    let best = null, bestD = Infinity;
    grid.forEach((row, ri) => {
      if (!row) return;
      row.forEach((cell, ci) => {
        const pos = bubbleXY(ri, ci);
        const d = Math.hypot(bx-pos.x, by-pos.y);
        if (d < bestD) { bestD = d; best = { r: ri, c: ci }; }
      });
    });
    // Find empty neighbor
    if (best) {
      const neighbors = getNeighbors(best.r, best.c);
      let emptyBest = null, emptyD = Infinity;
      neighbors.forEach(n => {
        if (!grid[n.r] || !grid[n.r][n.c]) {
          const pos = bubbleXY(n.r, n.c);
          const d = Math.hypot(bx-pos.x, by-pos.y);
          if (d < emptyD) { emptyD = d; emptyBest = n; }
        }
      });
      if (emptyBest) return emptyBest;
    }
    return best || { r:0, c:0 };
  }

  function getNeighbors(r, c) {
    const even = r % 2 === 0;
    return [
      {r:r-1, c: even?c:c+1}, {r:r-1, c: even?c-1:c},
      {r:r, c:c-1}, {r:r, c:c+1},
      {r:r+1, c: even?c:c+1}, {r:r+1, c: even?c-1:c},
    ].filter(n => n.r>=0 && n.c>=0 && n.c<COLS);
  }

  function findMatches(r, c, color) {
    const visited = new Set();
    const stack = [{r,c}];
    while (stack.length) {
      const cur = stack.pop();
      const key = `${cur.r},${cur.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (!grid[cur.r] || !grid[cur.r][cur.c] || grid[cur.r][cur.c].color !== color) continue;
      getNeighbors(cur.r, cur.c).forEach(n => {
        if (!visited.has(`${n.r},${n.c}`)) stack.push(n);
      });
    }
    return [...visited].map(k => ({ r:+k.split(',')[0], c:+k.split(',')[1] }));
  }

  function placeBullet(bx, by) {
    const pos = findGrid(bx, by);
    if (!grid[pos.r]) grid[pos.r] = [];
    grid[pos.r][pos.c] = { color: bullet.color, row: pos.r, col: pos.c };

    const matches = findMatches(pos.r, pos.c, bullet.color);
    if (matches.length >= 3) {
      matches.forEach(m => { if(grid[m.r]) grid[m.r][m.c] = null; });
      score += matches.length * 50; SFX.play('pop');
    }

    // Check win
    const anyLeft = grid.some(row => row && row.some(c => c));
    if (!anyLeft) { showGameOver(true, score, 'Board cleared!'); return; }

    // Check if bubbles reach shooter area
    const maxRow = grid.reduce((max, row, i) => row && row.some(c=>c) ? i : max, 0);
    if (maxRow > ROWS_VISIBLE) { lives--; if(lives<=0) showGameOver(false,score,'Bubbles reached you!'); }

    setHUD(score, lives, Math.floor(score/500)+1);
    bullet = null;
  }

  _resumeFn = () => safeRAF(update);

  function update() {
    frame++;
    if (bullet) {
      bullet.x += bullet.vx; bullet.y += bullet.vy;
      if (bullet.x < R) { bullet.vx = Math.abs(bullet.vx); bullet.x = R; }
      if (bullet.x > W-R) { bullet.vx = -Math.abs(bullet.vx); bullet.x = W-R; }
      if (bullet.y < R*2) { placeBullet(bullet.x, bullet.y); }
      else {
        // Check collision with grid
        let hit = false;
        grid.forEach((row, ri) => {
          if (!row || hit) return;
          row.forEach((cell, ci) => {
            if (!cell || hit) return;
            const p = bubbleXY(ri, ci);
            if (Math.hypot(bullet.x-p.x, bullet.y-p.y) < R*1.9) {
              hit = true; placeBullet(bullet.x, bullet.y);
            }
          });
        });
      }
    }

    // Draw
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);

    // Draw grid bubbles
    grid.forEach((row, ri) => {
      if (!row) return;
      row.forEach((cell, ci) => {
        if (!cell) return;
        const p = bubbleXY(ri, ci);
        drawBubble(p.x, p.y, cell.color);
      });
    });

    // Draw bullet
    if (bullet) drawBubble(bullet.x, bullet.y, bullet.color);

    // Draw shooter
    const sx = shooter.x, sy = shooter.y;
    // Aim line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(shooter.angle)*120, sy + Math.sin(shooter.angle)*120);
    ctx.stroke(); ctx.setLineDash([]);

    drawBubble(sx, sy, shooter.color);
    // Next bubble preview
    drawBubble(sx + 48, sy, nextColor, 0.6);
    drawText(ctx, 'NEXT:', sx+28, sy-22, 10, '#94a3b8');
  }

  safeRAF(update);
}

// =========================================================
// GAME 8: BRICK BREAKER
// =========================================================
function startBrickBreaker() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = DIFF_SETTINGS[currentDifficulty];

  const COLS = 10, ROWS = currentDifficulty==='easy' ? 4 : currentDifficulty==='medium' ? 5 : 6;
  const BW = W / COLS - 4, BH = 20;
  const BPAD = 2;
  const BALL_SPEED = 5 + diff.speed;

  let paddle = { x: W/2, w: 100 - diff.speed*10, h: 12, speed: 7 };
  let ball = { x: W/2, y: H-80, vx: BALL_SPEED * 0.7, vy: -BALL_SPEED, r: 8 };
  let bricks = [];
  let score = 0, lives = diff.lives, level = 1;
  let launched = false;

  function buildBricks() {
    bricks = [];
    for (let r=0; r<ROWS; r++) {
      for (let c=0; c<COLS; c++) {
        const hp = diff.enemyHp + Math.floor(r/3);
        bricks.push({
          x: c*(BW+BPAD)+BPAD, y: 50 + r*(BH+BPAD), w:BW, h:BH, hp, maxHp: hp,
          color: `hsl(${(r*40+c*15)%360},70%,55%)`
        });
      }
    }
  }
  buildBricks();

  const touchState = { left:false, right:false };
  setupTouchControls({
    left:   v => touchState.left = v,
    right:  v => touchState.right = v,
    action: v => { if (v && !launched) launched = true; },
  });

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    paddle.x = (e.clientX - rect.left) * (W / rect.width);
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    paddle.x = (e.touches[0].clientX - rect.left) * (W / rect.width);
  };
  canvas.onclick = canvas.ontouchend = () => { if (!launched) launched = true; };

  _resumeFn = () => safeRAF(update);

  function update() {
    // Paddle input
    if (Keys['ArrowLeft']  || Keys['KeyA'] || touchState.left)  paddle.x -= paddle.speed;
    if (Keys['ArrowRight'] || Keys['KeyD'] || touchState.right) paddle.x += paddle.speed;
    if (Keys['Space']) launched = true;
    paddle.x = Math.max(paddle.w/2, Math.min(W-paddle.w/2, paddle.x));

    if (!launched) {
      ball.x = paddle.x; ball.y = H - 60;
    } else {
      // Move ball
      ball.x += ball.vx; ball.y += ball.vy;

      // Wall bounces
      if (ball.x < ball.r)   { ball.x = ball.r;   ball.vx = Math.abs(ball.vx); }
      if (ball.x > W-ball.r) { ball.x = W-ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r)   { ball.y = ball.r;   ball.vy = Math.abs(ball.vy); }

      // Ball lost
      if (ball.y > H + ball.r) {
        lives--; SFX.play('die'); setHUD(score, lives, level);
        if (lives <= 0) { showGameOver(false, score, `Level ${level} reached`); return; }
        launched = false;
        ball.x = paddle.x; ball.y = H-80;
        ball.vx = BALL_SPEED * 0.7; ball.vy = -BALL_SPEED;
      }

      // Paddle collision
      const px = paddle.x - paddle.w/2, py = H - 30;
      if (ball.y + ball.r >= py && ball.y < py + paddle.h &&
          ball.x >= px && ball.x <= px + paddle.w && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
        const offset = (ball.x - paddle.x) / (paddle.w/2);
        ball.vx = offset * BALL_SPEED; SFX.play('beep');
      }

      // Brick collisions
      bricks.forEach(b => {
        if (b.hp <= 0) return;
        if (ball.x > b.x && ball.x < b.x+b.w && ball.y+ball.r > b.y && ball.y-ball.r < b.y+b.h) {
          b.hp--;
          if (b.hp <= 0) { score += 10 * level; SFX.play('coin'); }
          else SFX.play('hit');
          // Determine which side
          const fromTop = ball.y - ball.vy < b.y;
          const fromBot = ball.y - ball.vy > b.y + b.h;
          if (fromTop || fromBot) ball.vy *= -1; else ball.vx *= -1;
        }
      });
      bricks = bricks.filter(b => b.hp > 0);

      // Level complete
      if (bricks.length === 0) {
        level++; score += 500; SFX.play('win');
        if (level > 5) { showGameOver(true, score, 'All levels cleared!'); return; }
        buildBricks(); launched = false; ball.x = W/2; ball.y = H-80;
        showToast(`Level ${level}! 🎉`);
      }
    }

    setHUD(score, lives, level);

    // Draw
    ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, W, H);

    // Bricks
    bricks.forEach(b => {
      const alpha = b.hp / b.maxHp;
      ctx.fillStyle = b.color; ctx.globalAlpha = 0.5 + alpha*0.5;
      ctx.beginPath(); ctx.roundRect(b.x+1, b.y+1, b.w-2, b.h-2, 4); ctx.fill();
      ctx.globalAlpha = 1;
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(b.x+2, b.y+2, b.w-4, 4);
    });

    // Paddle
    const px = paddle.x - paddle.w/2;
    const pg = ctx.createLinearGradient(px, H-30, px, H-30+paddle.h);
    pg.addColorStop(0, '#a78bfa'); pg.addColorStop(1, '#7c3aed');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.roundRect(px, H-30, paddle.w, paddle.h, 6); ctx.fill();

    // Ball
    const bg = ctx.createRadialGradient(ball.x-2, ball.y-2, 1, ball.x, ball.y, ball.r);
    bg.addColorStop(0, '#fff'); bg.addColorStop(0.5, '#fde68a'); bg.addColorStop(1, '#f59e0b');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

    if (!launched) {
      drawText(ctx, 'Press SPACE or tap to launch', W/2, H/2, 14, '#94a3b8', 'center');
    }
  }

  safeRAF(update);
}

// =========================================================
// GAME 9: FLAPPY STYLE
// =========================================================
function startFlappyStyle() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = currentDifficulty;

  const GRAVITY = 0.45;
  const FLAP = -8;
  const PIPE_W = 52;
  const GAPS = { easy: 160, medium: 130, hard: 100 };
  const SPEEDS = { easy: 2.8, medium: 3.8, hard: 5 };
  const GAP = GAPS[diff];
  const SPEED = SPEEDS[diff];

  let bird = { x: W*0.25, y: H/2, vy: 0, r: 14 };
  let pipes = [];
  let score = 0;
  let lives = DIFF_SETTINGS[diff].lives;
  let bgX = 0, groundX = 0;
  let frame = 0;
  let started = false;

  function spawnPipe() {
    const topH = 50 + Math.random() * (H - GAP - 100);
    pipes.push({ x: W + 10, topH, gap: GAP });
  }
  spawnPipe();

  function flap() {
    if (!gameRunning) return;
    if (!started) started = true;
    bird.vy = FLAP;
    SFX.play('flap');
  }

  canvas.onclick = flap;
  canvas.ontouchstart = e => { e.preventDefault(); flap(); };
  document.addEventListener('keydown', e => { if(e.code==='Space'||e.code==='ArrowUp') flap(); });
  document.getElementById('tc-action').ontouchstart = e => { e.preventDefault(); flap(); };
  document.getElementById('tc-up').ontouchstart = e => { e.preventDefault(); flap(); };

  _resumeFn = () => safeRAF(update);

  function drawBird(x, y, vy) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/5, vy * 0.06)));
    // Body
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI*2); ctx.fill();
    // Wing
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.ellipse(-6, 2, 8, 6, -0.4, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8, -4, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1f2328';
    ctx.beginPath(); ctx.arc(9, -4, 2.5, 0, Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(16,-2); ctx.lineTo(22, 1); ctx.lineTo(16, 4); ctx.fill();
    ctx.restore();
  }

  function update() {
    frame++;
    if (!started) {
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, 0, W, H);
      drawBird(bird.x, bird.y + Math.sin(frame*0.05)*6, 0);
      drawText(ctx, 'Tap or SPACE to start', W/2, H/2+60, 16, '#c4b5fd', 'center');
      return;
    }

    // Physics
    bird.vy += GRAVITY; bird.y += bird.vy;

    // Scroll bg
    bgX = (bgX - SPEED * 0.3) % W;
    groundX = (groundX - SPEED) % 40;

    // Scroll pipes
    pipes.forEach(p => p.x -= SPEED);
    pipes = pipes.filter(p => p.x > -PIPE_W - 10);

    // Spawn
    if (frame % Math.floor(130 / (SPEED/2.8)) === 0) spawnPipe();

    // Scoring
    pipes.forEach(p => {
      if (!p.passed && p.x + PIPE_W < bird.x) {
        p.passed = true; score++; SFX.play('coin');
      }
    });

    // Collisions
    if (bird.y - bird.r < 0 || bird.y + bird.r > H - 30) {
      lives--; SFX.play('die'); setHUD(score, lives, Math.floor(score/5)+1);
      if (lives <= 0) { showGameOver(false, score, `You passed ${score} pipes!`); return; }
      bird.y = H/2; bird.vy = 0; started = false;
    }
    pipes.forEach(p => {
      if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
        if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + p.gap) {
          lives--; SFX.play('die'); setHUD(score, lives, Math.floor(score/5)+1);
          if (lives <= 0) { showGameOver(false, score, `You passed ${score} pipes!`); return; }
          bird.y = H/2; bird.vy = 0; started = false;
          pipes = []; spawnPipe();
        }
      }
    });

    setHUD(score, lives, Math.floor(score/5)+1);

    // Draw sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0ea5e9'); sky.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Clouds
    for (let i=0; i<3; i++) {
      const cx = ((bgX + i*280) % (W+100)) - 50;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(cx, 50+i*30, 55, 25, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx+35, 42+i*30, 35, 20, 0, 0, Math.PI*2); ctx.fill();
    }

    // Pipes
    pipes.forEach(p => {
      const pg1 = ctx.createLinearGradient(p.x, 0, p.x+PIPE_W, 0);
      pg1.addColorStop(0, '#16a34a'); pg1.addColorStop(0.5, '#22c55e'); pg1.addColorStop(1, '#16a34a');
      ctx.fillStyle = pg1;
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_W, p.topH);
      ctx.fillRect(p.x-5, p.topH-16, PIPE_W+10, 16); // cap
      // Bottom pipe
      const botY = p.topH + p.gap;
      ctx.fillRect(p.x, botY, PIPE_W, H - botY - 30);
      ctx.fillRect(p.x-5, botY, PIPE_W+10, 16); // cap
    });

    // Ground
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, H-30, W, 30);
    ctx.fillStyle = '#a16207';
    for (let i=0; i<Math.ceil(W/40)+1; i++) {
      ctx.fillRect(groundX + i*40, H-30, 20, 8);
    }

    drawBird(bird.x, bird.y, bird.vy);

    // Score
    drawText(ctx, String(score), W/2, 50, 32, '#fff', 'center');
  }

  safeRAF(update);
}

// =========================================================
// GAME 10: RACING MINI
// =========================================================
function startRacingMini() {
  const canvas = modal.canvas;
  const ctx = ctx2d();
  const W = canvas.width, H = canvas.height;
  const diff = DIFF_SETTINGS[currentDifficulty];

  const ROAD_LEFT = W * 0.15, ROAD_W = W * 0.7;
  const LANE_W = ROAD_W / 3;
  const CAR_W = 36, CAR_H = 60;

  let player = { x: ROAD_LEFT + LANE_W * 1.5 - CAR_W/2, y: H - 100, speed: 0 };
  let enemies = [], coins_obj = [];
  let score = 0, lives = diff.lives, distance = 0;
  let bgOffset = 0, frame = 0;

  const touchState = { left:false, right:false };
  setupTouchControls({
    left:  v => touchState.left = v,
    right: v => touchState.right = v,
  });

  function spawnEnemy() {
    const lane = Math.floor(Math.random()*3);
    const colors = ['#f87171','#60a5fa','#fbbf24','#34d399','#a78bfa'];
    enemies.push({
      x: ROAD_LEFT + lane * LANE_W + LANE_W/2 - CAR_W/2,
      y: -CAR_H,
      speed: diff.speed * (1.5 + Math.random()),
      color: colors[Math.floor(Math.random()*colors.length)]
    });
  }
  function spawnCoin() {
    const lane = Math.floor(Math.random()*3);
    coins_obj.push({
      x: ROAD_LEFT + lane * LANE_W + LANE_W/2,
      y: -20, speed: diff.speed * 2 + 1
    });
  }

  function drawCar(x, y, color, isPlayer) {
    ctx.save(); ctx.translate(x + CAR_W/2, y + CAR_H/2);
    // Body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-CAR_W/2, -CAR_H/2, CAR_W, CAR_H, 8); ctx.fill();
    // Windshield
    ctx.fillStyle = isPlayer ? 'rgba(100,200,255,0.7)' : 'rgba(100,100,200,0.5)';
    ctx.fillRect(-CAR_W/2+6, isPlayer?-CAR_H/2+10:-CAR_H/2+10, CAR_W-12, 18);
    // Wheels
    ctx.fillStyle = '#1f2328';
    [[-CAR_W/2-3,-CAR_H/2+10],[CAR_W/2-5,-CAR_H/2+10],
     [-CAR_W/2-3,CAR_H/2-18],[CAR_W/2-5,CAR_H/2-18]].forEach(([wx,wy]) => {
      ctx.fillRect(wx, wy, 8, 14);
    });
    // Headlights / taillights
    ctx.fillStyle = isPlayer ? '#fde68a' : '#f87171';
    ctx.beginPath(); ctx.arc(-CAR_W/2+6, isPlayer?CAR_H/2-5:(-CAR_H/2+5), 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(CAR_W/2-6,  isPlayer?CAR_H/2-5:(-CAR_H/2+5), 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  _resumeFn = () => safeRAF(update);

  function update() {
    frame++; distance++;
    const gameSpeed = diff.speed + distance / 1500;
    score = Math.floor(distance / 5);

    bgOffset = (bgOffset + gameSpeed * 1.5) % 80;

    // Input
    const spd = 5 + diff.speed;
    if ((Keys['ArrowLeft']  || Keys['KeyA'] || touchState.left)  && player.x > ROAD_LEFT + 2) player.x -= spd;
    if ((Keys['ArrowRight'] || Keys['KeyD'] || touchState.right) && player.x < ROAD_LEFT + ROAD_W - CAR_W - 2) player.x += spd;

    // Spawn
    if (frame % Math.floor(80 / gameSpeed) === 0) spawnEnemy();
    if (frame % 150 === 0) spawnCoin();

    // Update enemies
    enemies.forEach(e => e.y += e.speed + gameSpeed);
    enemies = enemies.filter(e => e.y < H + CAR_H);

    // Update coins
    coins_obj.forEach(c => c.y += c.speed);
    coins_obj = coins_obj.filter(c => c.y < H + 20);

    // Collision: player-enemy
    enemies.forEach(e => {
      if (player.x < e.x + CAR_W && player.x + CAR_W > e.x &&
          player.y < e.y + CAR_H && player.y + CAR_H > e.y) {
        e.dead = true; lives--; SFX.play('die');
        setHUD(score, lives, Math.floor(distance/200)+1);
        if (lives <= 0) { showGameOver(false, score, `Distance: ${distance}m`); }
      }
    });
    enemies = enemies.filter(e => !e.dead);

    // Collision: coins
    coins_obj.forEach(c => {
      if (Math.abs(c.x - (player.x+CAR_W/2)) < 24 && Math.abs(c.y - (player.y+CAR_H/2)) < 30) {
        c.dead = true; score += 50; State.coins++; SFX.play('coin'); updateHUDCoins();
      }
    });
    coins_obj = coins_obj.filter(c => !c.dead);

    setHUD(score, lives, Math.floor(distance/200)+1);
    if (!gameRunning) return;

    // Draw
    // Sky
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    // Road
    const rg = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_LEFT+ROAD_W, 0);
    rg.addColorStop(0, '#374151'); rg.addColorStop(0.5, '#4b5563'); rg.addColorStop(1, '#374151');
    ctx.fillStyle = rg;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

    // Road edges
    ctx.fillStyle = '#6b7280'; ctx.fillRect(ROAD_LEFT-4, 0, 4, H);
    ctx.fillRect(ROAD_LEFT+ROAD_W, 0, 4, H);

    // Lane dashes
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.setLineDash([30, 20]);
    for (let l=1; l<3; l++) {
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT + LANE_W*l, -bgOffset);
      ctx.lineTo(ROAD_LEFT + LANE_W*l, H + 80);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Scenery (trees)
    const treeColors = ['#166534','#15803d','#16a34a'];
    for (let i=0; i<8; i++) {
      const ty = ((i*120 + bgOffset*0.4) % (H+100)) - 50;
      ctx.fillStyle = treeColors[i%3];
      ctx.beginPath(); ctx.arc(W*0.08 + (i%2)*10, ty, 18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(W*0.92 - (i%2)*10, ty, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(W*0.08+(i%2)*10-3, ty+10, 6, 20);
      ctx.fillRect(W*0.92-(i%2)*10-3, ty+10, 6, 20);
    }

    // Coins
    coins_obj.forEach(c => {
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🪙', c.x, c.y+4);
    });

    // Enemy cars
    enemies.forEach(e => drawCar(e.x, e.y, e.color, false));

    // Player car
    drawCar(player.x, player.y, '#7c3aed', true);

    // Speed indicator
    const speedKmH = Math.floor(50 + distance/30 + diff.speed*20);
    drawText(ctx, `${speedKmH} km/h`, W - 70, H - 10, 12, '#94a3b8', 'center');
  }

  safeRAF(update);
}

// ==================== INIT ====================
function init() {
  updateHUDCoins();
  renderGameCards();
  renderAchievements();
  populateLBFilter();
  renderProfile();

  document.getElementById('soundToggle').textContent = State.soundOn ? '🔊' : '🔇';
  document.getElementById('coinCount').textContent = State.coins;
}

init();
