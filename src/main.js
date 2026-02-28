/* ═══════════════════════════════════════════════════
   Road Fury: Kerala Rush — Main Entry Point
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameStateManager } from './managers/GameStateManager.js';
import { InputManager } from './managers/InputManager.js';
import { SoundManager } from './managers/SoundManager.js';
import { ScoreManager } from './managers/ScoreManager.js';
import { AssetLoader } from './managers/AssetLoader.js';
import { RaceScene } from './scenes/RaceScene.js';

// ── Managers ──
const gameState = new GameStateManager();
const input = new InputManager();
const sound = new SoundManager();
const score = new ScoreManager();
const assets = new AssetLoader();

// ── Renderer ──
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// ── Race Scene ──
let raceScene = null;
let lastTime = 0;
let animFrameId = null;

// ── DOM Elements ──
const $loading = document.getElementById('loading-screen');
const $lobby = document.getElementById('lobby-screen');
const $hud = document.getElementById('hud');
const $countdown = document.getElementById('countdown-overlay');
const $postgame = document.getElementById('postgame-screen');
const $leaderboard = document.getElementById('leaderboard-modal');
const $achieveToast = document.getElementById('achievement-toast');

// HUD elements
const $speedNumber = document.getElementById('speed-number');
const $speedArc = document.getElementById('speed-arc');
const $posNumber = document.querySelector('.pos-number');
const $posSuffix = document.querySelector('.pos-suffix');
const $scoreValue = document.getElementById('score-value');
const $comboEl = document.getElementById('hud-combo');
const $comboMult = document.querySelector('.combo-multiplier');
const $countNumber = document.getElementById('countdown-number');
const $minimap = document.getElementById('minimap');

// ═══════════════════════════════════════════════════
// LOBBY LOGIC
// ═══════════════════════════════════════════════════

function initLobby() {
    // ── Player Name ──
    const $playerName = document.getElementById('player-name');
    $playerName.value = gameState.getSelection('playerName');
    $playerName.addEventListener('input', () => {
        gameState.setSelection('playerName', $playerName.value || 'Rider_' + Math.floor(Math.random() * 9999));
    });

    // ── Character Selection ──
    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.setSelection('character', btn.dataset.char);
        });
    });

    // ── Map Selection ──
    document.querySelectorAll('.map-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.setSelection('map', btn.dataset.map);
        });
    });

    // ── Difficulty ──
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.setSelection('difficulty', btn.dataset.diff);
        });
    });

    // ── Bike Selection ──
    document.querySelectorAll('.bike-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.bike === 'sports' && !gameState.sportsUnlocked) return;
            document.querySelectorAll('.bike-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.setSelection('bike', btn.dataset.bike);
        });
    });

    // Update sports bike lock display
    if (gameState.sportsUnlocked) {
        const lock = document.getElementById('sports-lock');
        if (lock) lock.style.display = 'none';
    }

    // ── Start Race ──
    document.getElementById('start-race-btn').addEventListener('click', () => {
        sound.resume();
        startRace();
    });

    // ── Leaderboard ──
    document.getElementById('show-leaderboard').addEventListener('click', () => {
        showLeaderboard();
    });
    document.getElementById('leaderboard-close').addEventListener('click', () => {
        $leaderboard.classList.add('hidden');
    });
    document.getElementById('close-leaderboard').addEventListener('click', () => {
        $leaderboard.classList.add('hidden');
    });

    // Leaderboard tabs
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            populateLeaderboard(tab.dataset.lbmap);
        });
    });

    // ── Return to Lobby ──
    document.getElementById('return-lobby-btn').addEventListener('click', () => {
        showScreen('lobby');
        gameState.transition('LOBBY');
    });
}

// ═══════════════════════════════════════════════════
// SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════

function showScreen(name) {
    [$loading, $lobby, $hud, $countdown, $postgame, $leaderboard].forEach(el => {
        el.classList.add('hidden');
    });

    switch (name) {
        case 'loading': $loading.classList.remove('hidden'); break;
        case 'lobby': $lobby.classList.remove('hidden'); break;
        case 'hud': $hud.classList.remove('hidden'); break;
        case 'countdown': $countdown.classList.remove('hidden'); break;
        case 'postgame': $postgame.classList.remove('hidden'); break;
    }
}

// ═══════════════════════════════════════════════════
// RACE START
// ═══════════════════════════════════════════════════

async function startRace() {
    showScreen('loading');

    // Fake loading with progress
    const $bar = document.getElementById('loader-bar');
    const $text = document.getElementById('loader-text');

    $text.textContent = 'Generating track...';
    $bar.style.width = '20%';
    await delay(300);

    // Initialize race scene
    if (raceScene) raceScene.dispose();
    raceScene = new RaceScene(renderer, gameState, input, sound, score, assets);

    $text.textContent = 'Building world...';
    $bar.style.width = '50%';
    await delay(200);

    raceScene.init();

    $text.textContent = 'Spawning riders...';
    $bar.style.width = '80%';
    await delay(200);

    input.enable();

    $text.textContent = 'Ready!';
    $bar.style.width = '100%';
    await delay(300);

    // Show HUD + Countdown overlay together
    [$loading, $lobby, $postgame, $leaderboard].forEach(el => el.classList.add('hidden'));
    $hud.classList.remove('hidden');
    $countdown.classList.remove('hidden');

    // Also render the scene behind the countdown
    raceScene.render();

    await runCountdown();

    $countdown.classList.add('hidden');
    raceScene.startRace();
    gameState.transition('RACING');

    // Start game loop
    lastTime = performance.now();
    gameLoop(lastTime);
}

async function runCountdown() {
    for (let i = 3; i >= 1; i--) {
        $countNumber.textContent = i;
        $countNumber.style.animation = 'none';
        void $countNumber.offsetHeight; // force reflow
        $countNumber.style.animation = 'countPop 0.5s ease-out';
        sound.playCountdown();
        await delay(1000);
    }
    $countNumber.textContent = 'GO!';
    $countNumber.style.color = '#00ff88';
    $countNumber.style.animation = 'none';
    void $countNumber.offsetHeight;
    $countNumber.style.animation = 'countPop 0.5s ease-out';
    sound.playGo();
    await delay(600);
    $countNumber.style.color = '';
}

// ═══════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════

function gameLoop(time) {
    if (!raceScene) return;

    // Check if race just ended
    if (!raceScene.isRunning && gameState.currentState === 'FINISHED') {
        endRace();
        return;
    }

    animFrameId = requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05); // cap delta
    lastTime = time;

    input.update();

    if (raceScene.isRunning) {
        raceScene.update(dt);
    }

    raceScene.render();
    updateHUD();
}

// ═══════════════════════════════════════════════════
// HUD UPDATE
// ═══════════════════════════════════════════════════

function updateHUD() {
    if (!raceScene) return;

    // Speed
    const speed = raceScene.getSpeed();
    $speedNumber.textContent = speed;

    // Speed arc (0–251 dashoffset, 251 = empty, 0 = full)
    const maxSpeed = 220;
    const arcOffset = 251 - (speed / maxSpeed) * 251;
    $speedArc.setAttribute('stroke-dashoffset', Math.max(0, arcOffset));

    // Position
    const pos = raceScene.getPosition();
    const suffixes = ['st', 'nd', 'rd', 'th'];
    $posNumber.textContent = pos;
    $posSuffix.textContent = suffixes[pos - 1] || 'th';

    // Score
    $scoreValue.textContent = raceScene.getScore();

    // Combo
    const combo = raceScene.getComboMultiplier();
    if (combo > 1) {
        $comboEl.style.display = 'flex';
        $comboMult.textContent = `x${combo}`;
    } else {
        $comboEl.style.display = 'none';
    }

    // Minimap
    drawMinimap(raceScene.getMinimapData());
}

function drawMinimap(data) {
    const ctx = $minimap.getContext('2d');
    const w = $minimap.width;
    const h = $minimap.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);

    // Road strip
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(w / 2 - 10, 0, 20, h);

    // Scale: map track to minimap height
    const scale = h / 200; // show 200 units of track
    const playerZ = data.player.z;

    // Player dot
    const px = w / 2 + (data.player.x - data.player.x) * 2; // center player
    const py = h * 0.75; // player at 75% from top
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Bot dots
    data.bots.forEach((bot, i) => {
        const dz = (bot.z - playerZ) * scale;
        const dx = (bot.x - data.player.x) * 2;
        const bx = w / 2 + dx;
        const by = py - dz;
        if (by > 0 && by < h) {
            ctx.fillStyle = ['#3355ff', '#ff9900', '#9933ff'][i] || '#ff0000';
            ctx.beginPath();
            ctx.arc(bx, by, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Finish line
    const finishDz = (data.trackLength - playerZ) * scale;
    const finishY = py - finishDz;
    if (finishY > 0 && finishY < h) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(w / 2 - 15, finishY);
        ctx.lineTo(w / 2 + 15, finishY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ═══════════════════════════════════════════════════
// END RACE / POST-GAME
// ═══════════════════════════════════════════════════

function endRace() {
    input.disable();
    cancelAnimationFrame(animFrameId);

    // Check achievements
    const newAchievements = score.checkAchievements();

    // Show achievement toasts
    newAchievements.forEach((ach, i) => {
        setTimeout(() => showAchievementToast(ach), i * 1200);
    });

    // Save to leaderboard
    score.saveToLeaderboard(
        gameState.getSelection('playerName'),
        gameState.getSelection('map')
    );

    // Do one final render
    if (raceScene) raceScene.render();

    sound.playWin();

    // Build post-game screen
    const placement = score.placement;
    const titleEmojis = ['🏆', '🥈', '🥉', ''];
    const $title = document.getElementById('postgame-title');
    $title.textContent = `${titleEmojis[placement - 1] || ''} ${placement}${['st', 'nd', 'rd', 'th'][placement - 1] || 'th'} Place!`;

    // Score breakdown
    const $breakdown = document.getElementById('score-breakdown');
    $breakdown.innerHTML = '';
    const breakdown = score.getBreakdown();
    breakdown.forEach(row => {
        const div = document.createElement('div');
        div.className = 'score-row';
        const valClass = row.value > 0 ? 'positive' : row.value < 0 ? 'negative' : '';
        div.innerHTML = `
      <span class="label">${row.label}</span>
      <span class="value ${valClass}">${row.value > 0 ? '+' : ''}${row.value}</span>
    `;
        $breakdown.appendChild(div);
    });

    // Achievements
    const $achList = document.getElementById('achievements-list');
    $achList.innerHTML = '';
    if (newAchievements.length > 0) {
        newAchievements.forEach(ach => {
            const badge = document.createElement('div');
            badge.className = 'ach-badge';
            badge.textContent = `${ach.name}`;
            $achList.appendChild(badge);
        });
    }

    // Show post-game screen after a short delay (let winner animation play)
    setTimeout(() => {
        showScreen('postgame');
    }, 1500);
}

function showAchievementToast(ach) {
    const $icon = document.getElementById('ach-icon');
    const $text = document.getElementById('ach-text');
    $icon.textContent = ach.name.split(' ')[0]; // emoji
    $text.textContent = ach.desc;
    $achieveToast.classList.add('show');
    sound.playAchievement();
    setTimeout(() => {
        $achieveToast.classList.remove('show');
    }, 3000);
}

// ═══════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════

function showLeaderboard() {
    $leaderboard.classList.remove('hidden');
    populateLeaderboard('all');
}

function populateLeaderboard(mapFilter) {
    const data = ScoreManager.getLeaderboard(mapFilter);
    const $body = document.getElementById('leaderboard-body');
    $body.innerHTML = '';

    if (data.length === 0) {
        $body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">No races yet!</td></tr>';
        return;
    }

    data.slice(0, 10).forEach((entry, i) => {
        const tr = document.createElement('tr');
        const medals = ['🥇', '🥈', '🥉'];
        const rank = i < 3 ? medals[i] : i + 1;
        const timeStr = entry.time ? `${Math.floor(entry.time / 60)}:${Math.floor(entry.time % 60).toString().padStart(2, '0')}` : '-';
        tr.innerHTML = `
      <td>${rank}</td>
      <td>${entry.player}</td>
      <td style="color:var(--clr-primary);font-weight:600;">${entry.score}</td>
      <td>${timeStr}</td>
      <td>${entry.placement === 1 ? '🏆' : '-'}</td>
    `;
        $body.appendChild(tr);
    });
}

// ═══════════════════════════════════════════════════
// WINDOW EVENTS
// ═══════════════════════════════════════════════════

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (raceScene) raceScene.resize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
    sound.init();
    initLobby();

    // Simulate loading
    const $bar = document.getElementById('loader-bar');
    const $text = document.getElementById('loader-text');

    $text.textContent = 'Initializing engine...';
    $bar.style.width = '30%';
    await delay(400);

    $text.textContent = 'Loading assets...';
    $bar.style.width = '60%';
    try {
        await assets.loadAll((progress) => {
            $bar.style.width = `${60 + progress * 40}%`;
        });
    } catch (e) {
        console.warn("Asset loading error:", e);
    }

    $text.textContent = 'Ready!';
    $bar.style.width = '100%';
    await delay(300);

    showScreen('lobby');
    gameState.transition('LOBBY');
}

init();
