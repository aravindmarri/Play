import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#pool-table');
const shootButton = document.querySelector('#shoot-button');
const powerReadout = document.querySelector('#power-readout');
const powerMeter = document.querySelector('#power-meter');
const powerFill = document.querySelector('#power-fill');
const hintButton = document.querySelector('#hint-button');
const hitPointButton = document.querySelector('#hit-point-button');
const canvasWrap = document.querySelector('#canvas-wrap');
const instruction = document.querySelector('#instruction');
const turnLabel = document.querySelector('#turn-label');
const toast = document.querySelector('#toast');
const modeDialog = document.querySelector('#mode-dialog');
const ballTooltip = document.querySelector('#ball-tooltip');
const tooltipNumber = document.querySelector('#ball-tooltip-number');
const tooltipGroup = document.querySelector('#ball-tooltip-group');
const hitPointPicker = document.querySelector('#hit-point-picker');
const cueContactBall = document.querySelector('#cue-contact-ball');
const cueContactMarker = document.querySelector('#cue-contact-marker');
const hitPointClose = document.querySelector('#hit-point-close');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setClearColor(0x09100c, 1);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5.5, 5.5, 3.2, -3.2, 0.1, 40);
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const clothPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rayHit = new THREE.Vector3();
const ballMeshes = new Map();
const WORLD_UNIT = 0.01;
const CLOTH_Y = 0;
const WORLD_BALL_R = 11.4 * WORLD_UNIT;
const rollingAxis = new THREE.Vector3();
const rollingRotation = new THREE.Quaternion();
const BALL_NUMBER_UP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const aimDirection = new THREE.Vector3();
const aimPoints = [new THREE.Vector3(), new THREE.Vector3()];
const CUE_LENGTH = 1.85;
const CUE_HALF_LENGTH_PX = CUE_LENGTH / (2 * WORLD_UNIT);
const MAX_PULL_DISTANCE = 190;
let aimLine;
let aimReflectionLine;
let cueStick;
let contactMarker;
let hoveredBall = null;
let targetRingMaterial;
const targetRings = new Map();

const VIEW = { width: 1100, height: 640 };
const BALL_R = 11.4;
const BALL_D = BALL_R * 2;
const PHYSICS_STEP = 1 / 120;
const TABLE = { left: 132, right: 968, top: 124, bottom: 516 };
const POCKETS = [
  { x: 132, y: 124, r: 29, corner: true }, { x: 550, y: 118, r: 22 }, { x: 968, y: 124, r: 29, corner: true },
  { x: 132, y: 516, r: 29, corner: true }, { x: 550, y: 522, r: 22 }, { x: 968, y: 516, r: 29, corner: true },
];
const COLORS = {
  1: '#f5d249', 2: '#367fcd', 3: '#c73b4c', 4: '#7948a1', 5: '#ed8737', 6: '#39865b', 7: '#78364a',
  8: '#101416', 9: '#f5d249', 10: '#367fcd', 11: '#c73b4c', 12: '#7948a1', 13: '#ed8737', 14: '#39865b', 15: '#78364a',
};

let balls = [];
const POOL_SETTINGS_KEY = 'aravind.pool.settings.v1';
function readPoolSettings() { try { return JSON.parse(localStorage.getItem(POOL_SETTINGS_KEY) || '{}') || {}; } catch { return {}; } }
function writePoolSettings(next) { try { localStorage.setItem(POOL_SETTINGS_KEY, JSON.stringify({ ...readPoolSettings(), ...next })); } catch { /* settings are optional */ } }
const savedPoolSettings = readPoolSettings();
let currentPlayer = 0;
let playerGroups = [null, null];
let matchScores = [0, 0];
let mode = savedPoolSettings.mode === 'solo' ? 'solo' : 'local';
let breakPending = true;
let aimingAngle = 0;
let cueInHand = false;
let handRestricted = false;
let moving = false;
let shot = null;
let drag = null;
let hitPointMode = false;
let contactPointSelected = false;
let hintAvailable = true;
let lastStrokePower = .6;
let lastPullDistance = MAX_PULL_DISTANCE * lastStrokePower;
const selectedHitLocal = new THREE.Vector3(0, 0, 1);
const pendingHitLocal = new THREE.Vector3(0, 0, 1);
let matchOver = false;
let inputLocked = false;
let toastTimer = 0;
let lastTime = 0;
let physicsAccumulator = 0;
let cueStrike = null;
let targetHintTimer = 0;
let targetHintClock = 0;
let width = 0;
let height = 0;
let pointer = { x: 350, y: 320, inside: false };
let soundEnabled = savedPoolSettings.soundEnabled !== false;
let audioContext;
let lastSoundAt = 0;
let computerTimer = 0;

function makeBall(number, x, y) {
  const rotation = number === 0 ? new THREE.Quaternion() : BALL_NUMBER_UP.clone();
  return {
    number, x, y, prevX: x, prevY: y, renderX: x, renderY: y,
    vx: 0, vy: 0, rotation, previousRotation: rotation.clone(),
    pocketed: false, sink: null,
  };
}

function makeRack() {
  document.body.classList.add('match-started');
  lastStrokePower = .6;
  lastPullDistance = MAX_PULL_DISTANCE * lastStrokePower;
  clearTimeout(computerTimer);
  currentPlayer = 0;
  playerGroups = [null, null];
  breakPending = true;
  matchOver = false;
  cueInHand = false;
  handRestricted = false;
  moving = false;
  inputLocked = false;
  shot = null;
  drag = null;
  physicsAccumulator = 0;
  cueStrike = null;
  targetHintTimer = 0;
  hintAvailable = true;
  hitPointMode = false;
  contactPointSelected = false;
  selectedHitLocal.set(0, 0, 1);
  pendingHitLocal.set(0, 0, 1);
  hitPointPicker.hidden = true;
  canvasWrap.classList.remove('hit-point-mode', 'dragging-cue');
  hitPointButton.setAttribute('aria-pressed', 'false');
  hitPointButton.querySelector('small').textContent = 'SELECT';
  updatePowerMeter(.6, false);
  const positions = [];
  const rackX = 786;
  const rackY = 320;
  for (let row = 0; row < 5; row++) {
    for (let place = 0; place <= row; place++) {
      positions.push({ row, place, x: rackX + row * (BALL_D * 0.866 + 0.18), y: rackY + (place - row / 2) * (BALL_D + 0.18) });
    }
  }
  // The 8 sits in the middle of the rack, with opposite groups in its back corners.
  const numbers = [1, 3, 14, 10, 8, 6, 12, 2, 11, 4, 15, 7, 9, 5, 13];
  balls = [makeBall(0, 350, rackY), ...positions.map((p, i) => makeBall(numbers[i], p.x, p.y))];
  for (const ball of balls) {
    const mesh = ballMeshes.get(ball.number);
    if (mesh) { mesh.quaternion.copy(ball.rotation); mesh.scale.setScalar(1); }
  }
  aimingAngle = 0;
  document.querySelector('#player-card-0').classList.add('active');
  document.querySelector('#player-card-1').classList.remove('active');
  updateUI('Aim, grab the cue, pull it back, then release to shoot.', 'YOUR TURN');
  resizeCanvas();
}

function placeCue(point) {
  const ball = balls[0];
  if (!ball || !point) return false;
  const left = handRestricted ? TABLE.left + 208 : TABLE.left + BALL_R + 3;
  if (point.x < left || point.x > TABLE.right - BALL_R - 3 || point.y < TABLE.top + BALL_R + 3 || point.y > TABLE.bottom - BALL_R - 3) return false;
  for (const other of balls.slice(1)) {
    if (other.pocketed || other.sink) continue;
    if (Math.hypot(other.x - point.x, other.y - point.y) < BALL_D + 2) return false;
  }
  ball.x = point.x;
  ball.y = point.y;
  ball.prevX = ball.renderX = point.x;
  ball.prevY = ball.renderY = point.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.rotation.identity();
  ball.previousRotation.identity();
  ball.pocketed = false;
  ball.sink = null;
  cueInHand = false;
  updateUI('Aim first. Press anywhere and pull back for power; release to shoot.', 'YOUR TURN');
  return true;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  width = rect.width;
  height = rect.height;
  const viewHeight = 6.35;
  const viewWidth = viewHeight * width / height;
  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(0, 9.5, 4.3);
  camera.lookAt(0, -0.18, 0);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function localPoint(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.ray.intersectPlane(clothPlane, rayHit)) return { x: VIEW.width / 2, y: VIEW.height / 2 };
  return { x: rayHit.x / WORLD_UNIT + VIEW.width / 2, y: rayHit.z / WORLD_UNIT + VIEW.height / 2 };
}

function aimAt(point) {
  const cue = balls[0];
  if (!cue || cueInHand || cue.sink) return;
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (Math.hypot(dx, dy) > 2) aimingAngle = Math.atan2(dy, dx);
}

function rayTarget() {
  const cue = balls[0];
  if (!cue || cue.pocketed || cue.sink) return null;
  const ux = Math.cos(aimingAngle);
  const uy = Math.sin(aimingAngle);
  let best = Infinity;
  let target = null;
  for (const ball of balls.slice(1)) {
    if (ball.pocketed || ball.sink) continue;
    const dx = ball.x - cue.x;
    const dy = ball.y - cue.y;
    const along = dx * ux + dy * uy;
    if (along < 0) continue;
    const side = dx * -uy + dy * ux;
    const reach = BALL_D;
    if (Math.abs(side) > reach) continue;
    const hit = along - Math.sqrt(reach * reach - side * side);
    if (hit > 0 && hit < best) { best = hit; target = ball; }
  }
  const edgeX = ux > 0 ? (TABLE.right - cue.x) / ux : ux < 0 ? (TABLE.left - cue.x) / ux : Infinity;
  const edgeY = uy > 0 ? (TABLE.bottom - cue.y) / uy : uy < 0 ? (TABLE.top - cue.y) / uy : Infinity;
  const edge = Math.min(edgeX, edgeY);
  return { ux, uy, distance: target ? best : edge, ball: target, edge };
}

function updateUI(message, label) {
  if (message && !hitPointMode) instruction.textContent = message;
  if (label) turnLabel.textContent = label;
  for (let player = 0; player < 2; player++) {
    const card = document.querySelector(`#player-card-${player}`);
    card.classList.toggle('active', currentPlayer === player && !matchOver);
    document.querySelector(`#player-name-${player}`).textContent = player === 0 ? 'You' : mode === 'solo' ? 'The House' : 'Player 2';
    const own = playerGroups[player];
    const group = document.querySelector(`#player-group-${player}`);
    group.replaceChildren();
    if (own === null) {
      group.setAttribute('aria-label', 'No group assigned yet');
      group.append(Object.assign(document.createElement('span'), { textContent: 'OPEN TABLE' }));
    } else {
      group.setAttribute('aria-label', own === 'solid' ? 'Solids' : 'Stripes');
      const dots = document.createElement('span'); dots.className = `ball-dot ${own}`; group.append(dots);
      const label = document.createElement('span'); label.textContent = own === 'solid' ? 'SOLIDS' : 'STRIPES'; group.append(label);
    }
    const left = balls.filter(ball => ball.number !== 0 && ball.number !== 8 && !ball.pocketed && !ball.sink && (own === 'solid' ? ball.number < 8 : own === 'stripe' ? ball.number > 8 : false)).length;
    document.querySelector(`#remaining-${player}`).textContent = own === null ? '—' : left === 0 ? '8 BALL' : `${left} LEFT`;
  }
  document.querySelector('.match-score').innerHTML = `<b>${matchScores[0]}</b><i>:</i><b>${matchScores[1]}</b>`;
  document.querySelector('.match-label').textContent = matchOver ? 'RACK COMPLETE' : moving ? 'RACK IN PLAY' : playerGroups[0] || playerGroups[1] ? 'RACE TO EIGHT' : 'OPEN TABLE';
  const aiTurn = mode === 'solo' && currentPlayer === 1;
  const disabled = moving || matchOver || inputLocked || aiTurn || cueInHand;
  shootButton.disabled = disabled || hitPointMode;
  hintButton.disabled = disabled || !hintAvailable || hitPointMode;
  hitPointButton.disabled = disabled;
  hintButton.querySelector('small').textContent = hintAvailable ? '1 / TURN' : 'USED';
  hitPointButton.querySelector('small').textContent = hitPointMode ? 'CLICK BALL' : contactPointSelected ? 'CHANGE' : 'SELECT';
  hitPointButton.setAttribute('aria-pressed', String(hitPointMode));
  document.querySelector('#rack-button').disabled = false;
  document.querySelector('#mode-button').innerHTML = mode === 'solo' ? 'SOLO PRACTICE <span>⌄</span>' : '2 PLAYERS <span>⌄</span>';
  canvas.setAttribute('aria-label', cueInHand
    ? 'Cue ball in hand. Move the pointer to place it, then click to set its position.'
    : 'Pool table. Move to aim. Press anywhere to lock direction, pull back for power, and release to shoot.');
}

function legalTarget(ball, player = currentPlayer) {
  if (matchOver || ball.number === 0 || ball.pocketed || ball.sink) return false;
  const group = playerGroups[player];
  if (group === null) return ball.number !== 8;
  if (remainingFor(player) === 0) return ball.number === 8;
  return group === 'solid' ? ball.number > 0 && ball.number < 8 : ball.number > 8;
}

function showLegalTargetHint() {
  if (!matchOver) targetHintTimer = Infinity;
}

function setToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function updatePowerMeter(power, ready = false) {
  const amount = Math.max(0, Math.min(1, power));
  const percent = Math.round(amount * 100);
  powerReadout.textContent = ready ? 'READY' : `${percent}%`;
  powerFill.style.width = `${percent}%`;
  powerMeter.setAttribute('aria-valuenow', String(percent));
}

function remainingFor(player) {
  const group = playerGroups[player];
  return balls.filter(ball => ball.number !== 0 && ball.number !== 8 && !ball.pocketed && !ball.sink && (group === 'solid' ? ball.number < 8 : group === 'stripe' ? ball.number > 8 : false)).length;
}

function shoot(powerValue, computer = false, pullDistance = MAX_PULL_DISTANCE * powerValue) {
  if (moving || matchOver || inputLocked || cueInHand || (mode === 'solo' && currentPlayer === 1 && !computer)) return;
  const cue = balls[0];
  if (!cue || cue.sink || cue.pocketed) return;
  wakeAudio();
  const power = Math.max(0.08, Math.min(1, powerValue));
  const strokePull = Math.max(0, Math.min(MAX_PULL_DISTANCE, pullDistance));
  targetHintTimer = 0;
  lastStrokePower = power;
  lastPullDistance = strokePull;
  updatePowerMeter(power);
  cueStrike = { angle: aimingAngle, age: 0, power, pullDistance: strokePull };
  physicsAccumulator = 0;
  const speed = 200 + power * 1150;
  cue.vx = Math.cos(aimingAngle) * speed;
  cue.vy = Math.sin(aimingAngle) * speed;
  moving = true;
  shot = { shooter: currentPlayer, groupAtStart: playerGroups[currentPlayer], ownBallsAtStart: remainingFor(currentPlayer), firstHit: null, railAfterContact: false, pocketed: [], scratch: false, broke: breakPending };
  breakPending = false;
  drag = null;
  updateUI('The balls are moving.', 'IN PLAY');
}

function pocket(ball, pocketIndex) {
  if (ball.pocketed || ball.sink) return;
  ball.sink = { x: POCKETS[pocketIndex].x, y: POCKETS[pocketIndex].y, t: 0 };
  ball.vx = 0;
  ball.vy = 0;
  if (shot && !shot.pocketed.includes(ball.number)) shot.pocketed.push(ball.number);
  if (ball.number === 0 && shot) shot.scratch = true;
  if (shot && ball.number !== 0) shot.railAfterContact = true;
  sound(ball.number === 8 ? 84 : 105, 0.045, 'sine');
}

function nearMouthForX(ball, y) {
  return POCKETS.some(p => Math.abs(y - p.y) < 34 && Math.abs(ball.x - p.x) < 37);
}

function nearMouthForY(ball, x) {
  return POCKETS.some(p => Math.abs(x - p.x) < 34 && Math.abs(ball.y - p.y) < 37);
}

function physicsStep(dt) {
  const active = balls.filter(ball => !ball.pocketed && !ball.sink);
  const drag = Math.exp(-1.1 * dt);
  for (const ball of active) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.5) {
      rollingAxis.set(ball.vy / speed, 0, -ball.vx / speed);
      rollingRotation.setFromAxisAngle(rollingAxis, speed * dt / BALL_R);
      ball.rotation.premultiply(rollingRotation).normalize();
    }
    ball.vx *= drag;
    ball.vy *= drag;
    if (Math.hypot(ball.vx, ball.vy) < 2.3) { ball.vx = 0; ball.vy = 0; }
  }

  for (const ball of active) {
    if (ball.pocketed || ball.sink) continue;
    const pocketIndex = POCKETS.findIndex(p => Math.hypot(ball.x - p.x, ball.y - p.y) < p.r - BALL_R * 0.3);
    if (pocketIndex !== -1) { pocket(ball, pocketIndex); continue; }
    const r = BALL_R;
    if (ball.x < TABLE.left + r && !nearMouthForX(ball, ball.y)) { ball.x = TABLE.left + r; ball.vx = Math.abs(ball.vx) * 0.79; if (shot && shot.firstHit !== null && ball.number !== 0) shot.railAfterContact = true; sound(Math.abs(ball.vx), 0.019, 'triangle'); }
    if (ball.x > TABLE.right - r && !nearMouthForX(ball, ball.y)) { ball.x = TABLE.right - r; ball.vx = -Math.abs(ball.vx) * 0.79; if (shot && shot.firstHit !== null && ball.number !== 0) shot.railAfterContact = true; sound(Math.abs(ball.vx), 0.019, 'triangle'); }
    if (ball.y < TABLE.top + r && !nearMouthForY(ball, ball.x)) { ball.y = TABLE.top + r; ball.vy = Math.abs(ball.vy) * 0.79; if (shot && shot.firstHit !== null && ball.number !== 0) shot.railAfterContact = true; sound(Math.abs(ball.vy), 0.019, 'triangle'); }
    if (ball.y > TABLE.bottom - r && !nearMouthForY(ball, ball.x)) { ball.y = TABLE.bottom - r; ball.vy = -Math.abs(ball.vy) * 0.79; if (shot && shot.firstHit !== null && ball.number !== 0) shot.railAfterContact = true; sound(Math.abs(ball.vy), 0.019, 'triangle'); }
  }

  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    if (a.pocketed || a.sink) continue;
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      if (b.pocketed || b.sink) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= BALL_D || distance === 0) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = BALL_D - distance;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      const relativeSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relativeSpeed < 0) {
        const impulse = -(1 + 0.96) * relativeSpeed * 0.5;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        if (shot && a.number === 0 && b.number !== 0 && shot.firstHit === null) shot.firstHit = b.number;
        if (shot && b.number === 0 && a.number !== 0 && shot.firstHit === null) shot.firstHit = a.number;
        sound(Math.abs(relativeSpeed), 0.033, 'sine');
      }
    }
  }

  if (!shot) return;
  const first = shot.firstHit === null ? null : balls.find(ball => ball.number === shot.firstHit);
  if (first && !first.sink && !first.pocketed) {
    const stillTouchesRail = first.x < TABLE.left + BALL_R + 2 || first.x > TABLE.right - BALL_R - 2 || first.y < TABLE.top + BALL_R + 2 || first.y > TABLE.bottom - BALL_R - 2;
    if (stillTouchesRail && (Math.abs(first.vx) + Math.abs(first.vy) > 35)) shot.railAfterContact = true;
  }
}

function switchTurn() {
  currentPlayer = 1 - currentPlayer;
  hintAvailable = true;
  targetHintTimer = 0;
  if (mode === 'solo' && currentPlayer === 1 && !matchOver) {
    updateUI('The House is lining one up…', 'THE HOUSE IS THINKING');
    computerTimer = setTimeout(playComputerTurn, 690);
  } else {
    updateUI(cueInHand ? 'Cue ball in hand. Place it anywhere on the felt.' : 'Your turn. Take your time.', currentPlayer === 0 ? 'YOUR TURN' : 'PLAYER 2 TO SHOOT');
  }
}

function endMatch(winner, message) {
  matchOver = true;
  targetHintTimer = 0;
  hintAvailable = false;
  moving = false;
  drag = null;
  matchScores[winner]++;
  const winnerName = winner === 0 ? 'You' : mode === 'solo' ? 'The House' : 'Player 2';
  instruction.textContent = `${winnerName} wins. ${message}`;
  turnLabel.textContent = 'GAME OVER';
  updateUI(null, 'GAME OVER');
  setToast(`${winnerName.toUpperCase()} WINS THE RACK`);
}

function finishShot() {
  if (!shot || moving) return;
  const record = shot;
  shot = null;
  const shooter = record.shooter;
  const wasBreak = record.broke;
  const pocketed = record.pocketed;
  const scratch = record.scratch;
  const eightDown = pocketed.includes(8);

  if (eightDown && wasBreak) {
      const eight = balls.find(ball => ball.number === 8);
      if (eight) {
        eight.sink = null; eight.pocketed = false; eight.x = 786; eight.y = 320;
        eight.prevX = eight.renderX = eight.x; eight.prevY = eight.renderY = eight.y;
        eight.rotation.copy(BALL_NUMBER_UP); eight.previousRotation.copy(BALL_NUMBER_UP);
      }
    setToast('The 8-ball on the break is spotted. Keep playing.');
  } else if (eightDown) {
    const ownBallsLeft = remainingFor(shooter);
    const legalEight = !scratch && record.firstHit === 8 && ownBallsLeft === 0;
    if (legalEight) endMatch(shooter, 'Nicely played.');
    else endMatch(1 - shooter, scratch ? 'Pocketing the 8 and cue ball is a loss.' : 'The 8-ball went down too soon.');
    return;
  }

  const open = playerGroups[shooter] === null;
  const nonEightPocketed = pocketed.filter(number => number > 0 && number !== 8);
  const hitEightEarly = open && record.firstHit === 8 && balls.some(ball => ball.number !== 0 && ball.number !== 8 && !ball.pocketed && !ball.sink);
  let wrongFirst = false;
  if (!open && record.firstHit !== null) {
    const firstBall = balls.find(ball => ball.number === record.firstHit);
    if (record.ownBallsAtStart > 0) wrongFirst = firstBall.number === 8 || (record.groupAtStart === 'solid' ? firstBall.number > 8 : firstBall.number < 8);
    else wrongFirst = firstBall.number !== 8;
  }
  const noHit = record.firstHit === null;
  const noRailOrPot = nonEightPocketed.length === 0 && !record.railAfterContact;
  const foul = scratch || noHit || wrongFirst || hitEightEarly || noRailOrPot;

  if (open && !foul && !wasBreak && nonEightPocketed.length) {
    const firstPocket = nonEightPocketed[0];
    playerGroups[shooter] = firstPocket < 8 ? 'solid' : 'stripe';
    playerGroups[1 - shooter] = firstPocket < 8 ? 'stripe' : 'solid';
    setToast(`${shooter === 0 ? 'You' : 'Player 2'} take ${playerGroups[shooter] === 'solid' ? 'solids' : 'stripes'}.`);
  }

  if (foul) {
    currentPlayer = 1 - shooter;
    hintAvailable = true;
    targetHintTimer = 0;
    cueInHand = true;
    handRestricted = wasBreak && scratch;
    const reason = scratch ? 'Scratch. Cue ball in hand.' : wrongFirst ? 'Wrong first ball. Cue ball in hand.' : noRailOrPot ? 'No rail after contact. Cue ball in hand.' : hitEightEarly ? 'The 8-ball is last. Cue ball in hand.' : 'Foul. Cue ball in hand.';
    updateUI(reason, currentPlayer === 0 ? 'YOUR TURN · BALL IN HAND' : mode === 'solo' ? 'THE HOUSE · BALL IN HAND' : 'PLAYER 2 · BALL IN HAND');
    setToast(reason);
    if (mode === 'solo' && currentPlayer === 1) {
      // The computer can still take its turn: choose a safe ball-in-hand position first.
      computerTimer = setTimeout(() => {
        const cue = balls[0];
        placeCue({ x: 255, y: 320 });
        if (!cueInHand) playComputerTurn();
      }, 720);
    }
    return;
  }

  const group = playerGroups[shooter];
  const legallyPocketedOwn = nonEightPocketed.some(number => group === 'solid' ? number < 8 : group === 'stripe' ? number > 8 : true);
  const keepTurn = legallyPocketedOwn && (!group || remainingFor(shooter) > 0);
  if (keepTurn) {
    currentPlayer = shooter;
    const playerName = shooter === 0 ? 'You' : mode === 'solo' ? 'The House' : 'Player 2';
    updateUI(`${playerName} pocketed one. Stay at the table.`, shooter === 0 ? 'YOUR TURN' : 'PLAYER 2 TO SHOOT');
    if (mode === 'solo' && shooter === 1) computerTimer = setTimeout(playComputerTurn, 520);
  } else {
    currentPlayer = shooter;
    switchTurn();
  }
}

function cueIsBlocked() {
  const cue = balls[0];
  return balls.slice(1).some(ball => !ball.pocketed && !ball.sink && Math.hypot(ball.x - cue.x, ball.y - cue.y) < BALL_D + 4);
}

function aimComputer() {
  const cue = balls[0];
  const ownGroup = playerGroups[1];
  let targets = balls.filter(ball => ball.number !== 0 && ball.number !== 8 && !ball.pocketed && !ball.sink && (!ownGroup || ownGroup === 'solid' ? ball.number < 8 : ball.number > 8));
  // Parenthesize group selection separately from the open-table case.
  if (ownGroup === null) targets = balls.filter(ball => ball.number > 0 && ball.number < 8 && !ball.pocketed && !ball.sink);
  if (ownGroup && remainingFor(1) === 0) targets = balls.filter(ball => ball.number === 8 && !ball.pocketed && !ball.sink);
  if (!targets.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const target of targets) {
    for (let pocketIndex = 0; pocketIndex < POCKETS.length; pocketIndex++) {
      const hole = POCKETS[pocketIndex];
      const ox = target.x - hole.x;
      const oy = target.y - hole.y;
      const pocketDistance = Math.hypot(ox, oy);
      if (pocketDistance < 1) continue;
      const oxn = ox / pocketDistance;
      const oyn = oy / pocketDistance;
      const hitX = target.x + oxn * (BALL_D + 1);
      const hitY = target.y + oyn * (BALL_D + 1);
      const pathX = hitX - cue.x;
      const pathY = hitY - cue.y;
      const cueDistance = Math.hypot(pathX, pathY);
      if (cueDistance < 2) continue;
      let clear = true;
      for (const blocker of balls) {
        if (blocker === cue || blocker === target || blocker.pocketed || blocker.sink) continue;
        const bdx = blocker.x - cue.x;
        const bdy = blocker.y - cue.y;
        const t = Math.max(0, Math.min(1, (bdx * pathX + bdy * pathY) / (cueDistance * cueDistance)));
        if (Math.hypot(bdx - pathX * t, bdy - pathY * t) < BALL_D + 2) { clear = false; break; }
      }
      if (!clear) continue;
      const lineX = hole.x - target.x;
      const lineY = hole.y - target.y;
      for (const blocker of balls) {
        if (blocker === cue || blocker === target || blocker.number === 8 || blocker.pocketed || blocker.sink) continue;
        const dx = blocker.x - target.x;
        const dy = blocker.y - target.y;
        const t = Math.max(0, Math.min(1, (dx * lineX + dy * lineY) / (pocketDistance * pocketDistance)));
        if (t > 0.04 && t < 0.94 && Math.hypot(dx - lineX * t, dy - lineY * t) < BALL_D + 2) { clear = false; break; }
      }
      if (!clear) continue;
      const angleToPocket = Math.atan2(hole.y - target.y, hole.x - target.x);
      const aimAngle = Math.atan2(hitY - cue.y, hitX - cue.x);
      const cutAngle = Math.abs(normalizeAngle(aimAngle - angleToPocket));
      const score = cueDistance + pocketDistance * 0.9 + cutAngle * 135 + (hole.corner ? 0 : 20);
      if (score < bestScore) { bestScore = score; best = { angle: aimAngle, power: Math.min(0.82, Math.max(0.32, score / 1020)) }; }
    }
  }
  return best;
}

function normalizeAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }

function playComputerTurn() {
  if (mode !== 'solo' || currentPlayer !== 1 || matchOver || moving) return;
  if (cueInHand) {
    const placements = [{ x: 255, y: 320 }, { x: 250, y: 290 }, { x: 250, y: 350 }, { x: 190, y: 320 }, { x: 315, y: 250 }, { x: 315, y: 390 }];
    const openSpot = placements.find(point => placeCue(point));
    if (!openSpot) { updateUI('The House needs a clear cue-ball spot. Click anywhere on the felt to place it.', 'PLACE THE CUE BALL'); return; }
  }
  const choice = aimComputer();
  if (!choice) { aimingAngle = Math.PI; shoot(0.45, true); return; }
  aimingAngle = choice.angle;
  updateUI('The House lines up a shot…', 'THE HOUSE IS AIMING');
  draw();
  computerTimer = setTimeout(() => shoot(choice.power, true), 430);
}

function addBox(width, height, depth, material, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function worldPoint(x, y, height = WORLD_BALL_R) {
  return new THREE.Vector3((x - VIEW.width / 2) * WORLD_UNIT, height, (y - VIEW.height / 2) * WORLD_UNIT);
}

function makeFeltTexture() {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 512;
  canvasTexture.height = 512;
  const textureContext = canvasTexture.getContext('2d');
  textureContext.fillStyle = '#17442f';
  textureContext.fillRect(0, 0, 512, 512);
  for (let i = -512; i < 1024; i += 4) {
    textureContext.strokeStyle = i % 8 === 0 ? 'rgba(225,237,207,.035)' : 'rgba(4,20,12,.045)';
    textureContext.lineWidth = 1;
    textureContext.beginPath();
    textureContext.moveTo(i, 0);
    textureContext.lineTo(i + 512, 512);
    textureContext.stroke();
  }
  for (let i = 0; i < 7200; i++) {
    const x = (i * 137 + 23) % 512;
    const y = (i * 79 + 41) % 512;
    textureContext.fillStyle = i % 3 ? 'rgba(224,231,190,.045)' : 'rgba(8,19,11,.075)';
    textureContext.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeBallTexture(number) {
  const image = document.createElement('canvas');
  image.width = 1024;
  image.height = 512;
  const textureContext = image.getContext('2d');
  const stripe = number >= 9;
  textureContext.fillStyle = stripe ? '#f6f3e6' : COLORS[number];
  textureContext.fillRect(0, 0, image.width, image.height);
  if (stripe) {
    textureContext.fillStyle = COLORS[number];
    textureContext.fillRect(0, 182, image.width, 148);
  }
  for (const centerX of [256, 768]) {
    textureContext.beginPath();
    textureContext.arc(centerX, 256, 91, 0, Math.PI * 2);
    textureContext.fillStyle = '#fbf8ed';
    textureContext.fill();
    textureContext.lineWidth = 8;
    textureContext.strokeStyle = 'rgba(30,31,27,.45)';
    textureContext.stroke();
    textureContext.fillStyle = '#171a17';
    textureContext.font = '700 138px Georgia, serif';
    textureContext.textAlign = 'center';
    textureContext.textBaseline = 'middle';
    textureContext.fillText(String(number), centerX, 259);
  }
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createBallMeshes() {
  const sphere = new THREE.SphereGeometry(WORLD_BALL_R, 40, 32);
  for (let number = 0; number <= 15; number++) {
    let material;
    if (number === 0) {
      material = new THREE.MeshPhysicalMaterial({ color: 0xf5f1e5, roughness: .17, clearcoat: .95, clearcoatRoughness: .09 });
      material.transparent = true;
    } else {
      material = new THREE.MeshPhysicalMaterial({
        map: makeBallTexture(number), roughness: .17, metalness: .015,
        clearcoat: .92, clearcoatRoughness: .1,
      });
    }
    const mesh = new THREE.Mesh(sphere, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.number = number;
    mesh.position.y = CLOTH_Y + WORLD_BALL_R;
    scene.add(mesh);
    ballMeshes.set(number, mesh);
  }
}

function addFeltLine(points, opacity = .23) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => worldPoint(point.x, point.y, CLOTH_Y + .009)));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xe1e2cf, transparent: true, opacity }));
  line.frustumCulled = false;
  scene.add(line);
}

function buildTable() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x0b100d, roughness: .96 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.29;
  ground.receiveShadow = true;
  scene.add(ground);

  const wood = new THREE.MeshPhysicalMaterial({ color: 0x352216, roughness: .24, metalness: .04, clearcoat: .62, clearcoatRoughness: .2 });
  const warmEdge = new THREE.MeshStandardMaterial({ color: 0x65503a, roughness: .3, metalness: .18 });
  const cushion = new THREE.MeshStandardMaterial({ color: 0x1c3929, roughness: .66 });
  const cushionTop = new THREE.MeshStandardMaterial({ color: 0x365a40, roughness: .62 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc6a56b, metalness: .6, roughness: .3 });

  // Separate the cabinet from the cloth to prevent striped depth artifacts.
  addBox(9.94, .5, 5.54, wood, 0, -.29, 0, false);
  for (const x of [-4.25, 4.25]) for (const z of [-2.22, 2.22]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.145, .215, .74, 8), wood);
    leg.position.set(x, -.87, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    scene.add(leg);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.205, .205, .075, 8), warmEdge);
    collar.position.set(x, -.535, z);
    scene.add(collar);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.205, .18, .07, 8), warmEdge);
    foot.position.set(x, -1.22, z);
    scene.add(foot);
  }

  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(8.66, 4.32),
    new THREE.MeshStandardMaterial({ map: makeFeltTexture(), color: 0xffffff, roughness: .94, metalness: 0 }),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = CLOTH_Y;
  felt.receiveShadow = true;
  scene.add(felt);

  // The rails break around all six pockets, leaving a clear opening at each mouth.
  for (const z of [-2.105, 2.105]) {
    addBox(3.73, .15, .28, cushion, -2.165, .045, z);
    addBox(3.73, .15, .28, cushion, 2.165, .045, z);
    addBox(3.74, .07, .045, cushionTop, -2.165, .137, z + Math.sign(z) * .055, false);
    addBox(3.74, .07, .045, cushionTop, 2.165, .137, z + Math.sign(z) * .055, false);
  }
  for (const x of [-4.315, 4.315]) {
    addBox(.28, .15, 3.44, cushion, x, .045, 0);
    addBox(.045, .07, 3.44, cushionTop, x + Math.sign(x) * .055, .137, 0, false);
  }

  // Polished wood bands sit outside the green cushions.
  for (const z of [-2.47, 2.47]) addBox(9.66, .09, .18, warmEdge, 0, -.005, z, false);
  for (const x of [-4.78, 4.78]) addBox(.18, .09, 5.0, warmEdge, x, -.005, 0, false);
  for (const z of [-2.38, 2.38]) {
    addBox(3.6, .014, .018, brass, -2.18, .11, z, false);
    addBox(3.6, .014, .018, brass, 2.18, .11, z, false);
  }

  const pocketGeometry = new THREE.CylinderGeometry(.285, .255, .12, 40);
  const pocketMaterial = new THREE.MeshStandardMaterial({ color: 0x050806, roughness: .38, metalness: .08 });
  const rimGeometry = new THREE.TorusGeometry(.286, .018, 8, 40);
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x8d754e, metalness: .48, roughness: .4 });
  for (const pocket of POCKETS) {
    const x = (pocket.x - VIEW.width / 2) * WORLD_UNIT;
    const z = (pocket.y - VIEW.height / 2) * WORLD_UNIT;
    const hole = new THREE.Mesh(pocketGeometry, pocketMaterial);
    hole.position.set(x, -.035, z);
    hole.receiveShadow = true;
    scene.add(hole);
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, .006, z);
    scene.add(rim);
  }

  // Brass rail diamonds finish the table without a ring around the cue ball.
  for (const x of [-3.8, -2.5, -1.25, 1.25, 2.5, 3.8]) {
    for (const z of [-2.48, 2.48]) {
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.035, 0), brass);
      diamond.position.set(x, .068, z);
      diamond.scale.set(1, .45, 1);
      scene.add(diamond);
    }
  }
}

function build3DScene() {
  scene.background = new THREE.Color(0x09100c);
  scene.add(new THREE.HemisphereLight(0xe7eadb, 0x172018, 1.22));
  const key = new THREE.DirectionalLight(0xfff4df, 2.9);
  key.position.set(-3.5, 9, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -.00035;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.PointLight(0xc6a56b, 25, 18, 2);
  fill.position.set(3.8, 5.2, -2.4);
  scene.add(fill);

  buildTable();
  createBallMeshes();
  contactMarker = new THREE.Group();
  const contactRing = new THREE.Mesh(
    new THREE.TorusGeometry(WORLD_BALL_R * .4, .007, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x20c9a8, depthWrite: false }),
  );
  const contactDot = new THREE.Mesh(
    new THREE.SphereGeometry(.018, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x08745f, depthWrite: false }),
  );
  contactRing.renderOrder = 8;
  contactDot.renderOrder = 9;
  contactMarker.add(contactRing, contactDot);
  contactMarker.visible = false;
  ballMeshes.get(0).add(contactMarker);
  aimLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage)),
    new THREE.LineDashedMaterial({ color: 0xf0ddb1, dashSize: .075, gapSize: .065, transparent: true, opacity: .63, depthWrite: false }),
  );
  aimLine.frustumCulled = false;
  scene.add(aimLine);

  aimReflectionLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage)),
    new THREE.LineDashedMaterial({ color: 0xd7ad68, dashSize: .052, gapSize: .045, transparent: true, opacity: .48, depthWrite: false }),
  );
  aimReflectionLine.frustumCulled = false;
  aimReflectionLine.visible = false;
  scene.add(aimReflectionLine);

  cueStick = new THREE.Group();
  const addCueSection = (radiusTop, radiusBottom, length, y, material) => {
    const section = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 24), material);
    section.position.y = y;
    section.castShadow = true;
    cueStick.add(section);
  };
  const maple = new THREE.MeshPhysicalMaterial({ color: 0xd4a768, roughness: .3, clearcoat: .82, clearcoatRoughness: .12 });
  const walnut = new THREE.MeshPhysicalMaterial({ color: 0x54291b, roughness: .28, clearcoat: .88, clearcoatRoughness: .1 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x171d19, roughness: .72, metalness: .06 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xd6c7a7, roughness: .2, metalness: .72 });
  addCueSection(.017, .027, .85, .4475, maple);
  addCueSection(.027, .037, .37, -.1625, walnut);
  addCueSection(.037, .043, .33, -.5125, leather);
  addCueSection(.043, .047, .23, -.7925, walnut);
  addCueSection(.039, .039, .018, -.3475, silver);
  addCueSection(.044, .044, .012, -.6775, silver);
  addCueSection(.049, .047, .03, -.925, new THREE.MeshStandardMaterial({ color: 0x111713, roughness: .8 }));
  const ferrule = new THREE.Mesh(
    new THREE.CylinderGeometry(.018, .021, .045, 16),
    new THREE.MeshPhysicalMaterial({ color: 0xf0ead8, roughness: .24, clearcoat: .55 }),
  );
  ferrule.position.y = .895;
  cueStick.add(ferrule);
  const cueTip = new THREE.Mesh(
    new THREE.CylinderGeometry(.014, .018, .024, 14),
    new THREE.MeshStandardMaterial({ color: 0x477c76, roughness: .45 }),
  );
  cueTip.position.y = .9295;
  cueStick.add(cueTip);
  scene.add(cueStick);

  targetRingMaterial = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .96, depthWrite: false });
  const targetRingGeometry = new THREE.TorusGeometry(WORLD_BALL_R * 1.06, .008, 8, 40);
  for (let number = 1; number <= 15; number++) {
    const ring = new THREE.Mesh(targetRingGeometry, targetRingMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 2;
    ring.visible = false;
    targetRings.set(number, ring);
    scene.add(ring);
  }

}

function setRayFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  return rect;
}

function updateHover(event) {
  const rect = setRayFromEvent(event);
  const hit = raycaster.intersectObjects(Array.from(ballMeshes.values()), false).find(item => item.object.visible);
  if (!hit) {
    hoveredBall = null;
    ballTooltip.hidden = true;
    return;
  }
  hoveredBall = hit.object;
  const number = hit.object.userData.number;
  tooltipNumber.textContent = number === 0 ? 'CUE' : String(number);
  tooltipGroup.textContent = number === 0 ? 'CUE BALL' : number === 8 ? 'THE 8 BALL' : number < 8 ? 'SOLID' : 'STRIPE';
  ballTooltip.hidden = false;
  ballTooltip.style.left = Math.max(8, Math.min(rect.width - 82, event.clientX - rect.left + 15)) + 'px';
  ballTooltip.style.top = Math.max(8, Math.min(rect.height - 48, event.clientY - rect.top - 34)) + 'px';
}

function setHitPointMode(enabled) {
  hitPointMode = enabled;
  if (enabled) pendingHitLocal.copy(contactPointSelected ? selectedHitLocal : new THREE.Vector3(0, 0, 1));
  ballTooltip.hidden = true;
  hoveredBall = null;
  hitPointPicker.hidden = !enabled;
  hitPointButton.setAttribute('aria-pressed', String(enabled));
  hitPointButton.querySelector('small').textContent = enabled ? 'CHOOSING' : contactPointSelected ? 'CHANGE' : 'SELECT';
  cueContactMarker.style.left = `${50 + pendingHitLocal.x * 45}%`;
  cueContactMarker.style.top = `${50 - pendingHitLocal.y * 45}%`;
  instruction.textContent = enabled ? 'Choose exactly where the cue tip should strike.' : 'Aim first. Press anywhere and pull back for power; release to shoot.';
  if (enabled) setToast('Choose a contact point on the animated cue ball.');
}

function selectCueHitPoint(event) {
  const rect = cueContactBall.getBoundingClientRect();
  let x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
  let y = -(event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
  const distance = Math.hypot(x, y);
  if (distance > .9) { x *= .9 / distance; y *= .9 / distance; }
  const z = Math.sqrt(Math.max(.05, 1 - x * x - y * y));
  pendingHitLocal.set(x, y, z).normalize();
  selectedHitLocal.copy(pendingHitLocal);
  contactPointSelected = true;
  setHitPointMode(false);
  instruction.textContent = 'Contact point set. Press anywhere and pull back to shoot.';
  setToast('Cue contact point selected.');
}

function cancelShotSetup(message = 'Shot setup cancelled.') {
  if (drag) {
    if (canvas.hasPointerCapture?.(drag.id)) canvas.releasePointerCapture(drag.id);
    drag = null;
    canvasWrap.classList.remove('dragging-cue');
    updatePowerMeter(.6, false);
    instruction.textContent = 'Aim first. Press anywhere and pull back for power; release to shoot.';
    setToast(message);
    return true;
  }
  if (hitPointMode) {
    setHitPointMode(false);
    setToast('Contact point selection cancelled.');
    return true;
  }
  return false;
}

function updateAimAndCue() {
  const cue = balls[0];
  const canAim = cue && !cue.pocketed && !cue.sink && !moving && !matchOver && !inputLocked && !cueInHand && !(mode === 'solo' && currentPlayer === 1);
  const inStrike = Boolean(cueStrike && cueStrike.age < .18 && moving && cue && !cue.sink);
  if (canAim) {
    const info = rayTarget();
    if (info && info.distance > 0) {
      const travel = Math.max(0, info.distance);
      const lineHeight = CLOTH_Y + WORLD_BALL_R;
      const start = worldPoint(cue.x, cue.y, lineHeight);
      const end = worldPoint(cue.x + info.ux * travel, cue.y + info.uy * travel, lineHeight);
      const position = aimLine.geometry.attributes.position;
      position.setXYZ(0, start.x, start.y, start.z);
      position.setXYZ(1, end.x, end.y, end.z);
      position.needsUpdate = true;
      aimLine.computeLineDistances();
      aimLine.visible = true;
      aimReflectionLine.visible = false;
      if (!info.ball && Number.isFinite(info.edge)) {
        const hitX = cue.x + info.ux * info.edge;
        const hitY = cue.y + info.uy * info.edge;
        let reflectX = info.ux;
        let reflectY = info.uy;
        if (Math.abs(hitX - TABLE.left) < 1 || Math.abs(hitX - TABLE.right) < 1) reflectX *= -1;
        if (Math.abs(hitY - TABLE.top) < 1 || Math.abs(hitY - TABLE.bottom) < 1) reflectY *= -1;
        const insetX = hitX + reflectX * 2;
        const insetY = hitY + reflectY * 2;
        const reboundX = reflectX > 0 ? (TABLE.right - insetX) / reflectX : reflectX < 0 ? (TABLE.left - insetX) / reflectX : Infinity;
        const reboundY = reflectY > 0 ? (TABLE.bottom - insetY) / reflectY : reflectY < 0 ? (TABLE.top - insetY) / reflectY : Infinity;
        const rebound = Math.max(0, Math.min(reboundX, reboundY, 270));
        const reflectedStart = worldPoint(hitX, hitY, lineHeight);
        const reflectedEnd = worldPoint(hitX + reflectX * rebound, hitY + reflectY * rebound, lineHeight);
        const reflectedPosition = aimReflectionLine.geometry.attributes.position;
        reflectedPosition.setXYZ(0, reflectedStart.x, reflectedStart.y, reflectedStart.z);
        reflectedPosition.setXYZ(1, reflectedEnd.x, reflectedEnd.y, reflectedEnd.z);
        reflectedPosition.needsUpdate = true;
        aimReflectionLine.computeLineDistances();
        aimReflectionLine.visible = rebound > 1;
      }
      aimDirection.set(info.ux, 0, info.uy).normalize();
    } else {
      aimLine.visible = false;
      aimReflectionLine.visible = false;
    }
  } else {
    aimLine.visible = false;
    aimReflectionLine.visible = false;
  }

  if (!canAim && !inStrike) { cueStick.visible = false; return; }
  const ux = inStrike ? Math.cos(cueStrike.angle) : aimDirection.x;
  const uz = inStrike ? Math.sin(cueStrike.angle) : aimDirection.z;
  const direction = new THREE.Vector3(ux, 0, uz).normalize();
  const cueWorld = worldPoint(cue.x, cue.y, CLOTH_Y + WORLD_BALL_R);
  const cueMesh = ballMeshes.get(0);
  const contactLocal = hitPointMode ? pendingHitLocal : selectedHitLocal;
  let tipTarget = cueMesh.localToWorld(contactLocal.clone().multiplyScalar(WORLD_BALL_R));
  if (!contactPointSelected && !hitPointMode) tipTarget = cueWorld.clone().addScaledVector(direction, WORLD_BALL_R);
  let tipGap = .56 + (drag ? drag.pullDistance : 0);
  if (inStrike) {
    const progress = Math.min(1, cueStrike.age / .18);
    const eased = 1 - Math.pow(1 - progress, 3);
    tipGap = .56 + cueStrike.pullDistance - eased * (cueStrike.pullDistance + .9);
  }
  cueStick.position.copy(tipTarget).addScaledVector(direction, -(CUE_HALF_LENGTH_PX + tipGap) * WORLD_UNIT);
  cueStick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  cueStick.visible = true;

  contactMarker.visible = hitPointMode || contactPointSelected;
  if (contactMarker.visible) {
    contactMarker.position.copy(contactLocal).multiplyScalar(WORLD_BALL_R * 1.045);
    contactMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), contactLocal);
  }
}

function updateBallMeshes(alpha = 1) {
  for (const ball of balls) {
    const mesh = ballMeshes.get(ball.number);
    if (!mesh) continue;
    const available = !ball.pocketed || (ball.number === 0 && cueInHand);
    mesh.visible = available;
    if (!available) continue;

    let x = ball.prevX + (ball.x - ball.prevX) * alpha;
    let y = ball.prevY + (ball.y - ball.prevY) * alpha;
    let sinkProgress = 0;
    if (ball.sink) {
      sinkProgress = Math.min(1, ball.sink.t / .29);
      sinkProgress = 1 - Math.pow(1 - sinkProgress, 3);
      x += (ball.sink.x - x) * sinkProgress;
      y += (ball.sink.y - y) * sinkProgress;
    }
    mesh.position.set((x - VIEW.width / 2) * WORLD_UNIT, CLOTH_Y + WORLD_BALL_R * (1 - sinkProgress), (y - VIEW.height / 2) * WORLD_UNIT);
    mesh.scale.setScalar(1 - sinkProgress * .94);
    mesh.quaternion.copy(ball.previousRotation).slerp(ball.rotation, alpha);
    if (ball.number === 0) mesh.material.opacity = cueInHand ? .58 : 1;
  }
}

function draw(alpha = 1) {
  updateBallMeshes(alpha);
  updateAimAndCue();
  const hintFade = Math.min(1, targetHintTimer / .8);
  const pulse = .93 + .07 * Math.sin(targetHintClock * 7.5);
  targetRingMaterial.opacity = .96 * hintFade * pulse;
  for (const ball of balls) {
    const ring = targetRings.get(ball.number);
    if (!ring) continue;
    const mesh = ballMeshes.get(ball.number);
    const show = targetHintTimer > 0 && legalTarget(ball) && mesh?.visible;
    ring.visible = show;
    if (show) {
      ring.position.set(mesh.position.x, .027, mesh.position.z);
      ring.scale.setScalar(1 + .015 * Math.sin(targetHintClock * 7.5));
    }
  }
  renderer.render(scene, camera);
}
function animate(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;
  targetHintTimer = Math.max(0, targetHintTimer - dt);
  targetHintClock += dt;
  if (moving) {
    physicsAccumulator += dt;
    while (physicsAccumulator >= PHYSICS_STEP) {
      for (const ball of balls) {
        ball.prevX = ball.x;
        ball.prevY = ball.y;
        ball.previousRotation.copy(ball.rotation);
      }
      physicsStep(PHYSICS_STEP);
      physicsAccumulator -= PHYSICS_STEP;
    }
  } else {
    physicsAccumulator = 0;
    for (const ball of balls) {
      ball.prevX = ball.renderX = ball.x;
      ball.prevY = ball.renderY = ball.y;
      ball.previousRotation.copy(ball.rotation);
    }
  }
  if (cueStrike) { cueStrike.age += dt; if (cueStrike.age >= .18) cueStrike = null; }
  let sinkAnimating = false;
  for (const ball of balls) {
    if (!ball.sink) continue;
    ball.sink.t += dt;
    if (ball.sink.t >= .29) { ball.sink = null; ball.pocketed = true; }
    else sinkAnimating = true;
  }
  if (moving) {
    const inMotion = balls.some(ball => !ball.pocketed && !ball.sink && Math.hypot(ball.vx, ball.vy) > 0);
    if (!inMotion && !sinkAnimating) { moving = false; finishShot(); }
  }
  draw(moving ? physicsAccumulator / PHYSICS_STEP : 1);
  requestAnimationFrame(animate);
}

function onPointerDown(event) {
  event.preventDefault();
  wakeAudio();
  if (hitPointMode) return;
  const point = localPoint(event);
  pointer = { ...point, inside: true };
  if (cueInHand && !moving) {
    canvas.setPointerCapture(event.pointerId);
    if (!placeCue(point)) setToast('Find a clear spot on the felt for the cue ball.');
    return;
  }
  if (moving || matchOver || inputLocked || (mode === 'solo' && currentPlayer === 1)) return;
  const rect = canvas.getBoundingClientRect();
  canvas.setPointerCapture(event.pointerId);
  drag = {
    id: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startTableX: point.x,
    startTableY: point.y,
    screenScale: VIEW.width / rect.width,
    angle: aimingAngle,
    power: 0,
    pullDistance: 0,
  };
  canvasWrap.classList.add('dragging-cue');
  updatePowerMeter(0);
  instruction.textContent = 'Aim locked. Pull back for power; release to shoot. Esc cancels.';
  ballTooltip.hidden = true;
  hoveredBall = null;
}

function onPointerMove(event) {
  const point = localPoint(event);
  pointer = { ...point, inside: true };
  if (hitPointMode) {
    return;
  } else if (cueInHand) {
    const cue = balls[0];
    cue.x = Math.max(TABLE.left + BALL_R + 3, Math.min(TABLE.right - BALL_R - 3, point.x));
    cue.y = Math.max(TABLE.top + BALL_R + 3, Math.min(TABLE.bottom - BALL_R - 3, point.y));
    cue.prevX = cue.renderX = cue.x;
    cue.prevY = cue.renderY = cue.y;
    ballTooltip.hidden = true;
    hoveredBall = null;
  } else if (drag && drag.id === event.pointerId) {
    const dx = point.x - drag.startTableX;
    const dy = point.y - drag.startTableY;
    const pull = -(dx * Math.cos(drag.angle) + dy * Math.sin(drag.angle));
    drag.pullDistance = Math.min(MAX_PULL_DISTANCE, Math.max(0, pull - 4));
    drag.power = drag.pullDistance / MAX_PULL_DISTANCE;
    aimingAngle = drag.angle;
    instruction.textContent = drag.power < .055 ? 'Aim locked. Pull backward to add power. Esc cancels.' : 'Aim locked. Release to shoot; push forward to reduce power.';
    lastStrokePower = drag.power;
    lastPullDistance = drag.pullDistance;
    updatePowerMeter(drag.power);
    ballTooltip.hidden = true;
    hoveredBall = null;
  } else {
    updateHover(event);
    if (!moving && !inputLocked && !(mode === 'solo' && currentPlayer === 1)) aimAt(point);
  }
}

function onPointerUp(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const power = drag.power;
  const pullDistance = drag.pullDistance;
  drag = null;
  canvasWrap.classList.remove('dragging-cue');
  if (power > .055) shoot(power, false, pullDistance);
  else {
    updatePowerMeter(.6, false);
    instruction.textContent = 'Direction set. Press anywhere and pull when you are ready.';
  }
}

function onPointerCancel(event) {
  if (drag?.id === event.pointerId) cancelShotSetup('Shot setup cancelled.');
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerCancel);
canvas.addEventListener('pointerleave', () => {
  pointer.inside = false;
  hoveredBall = null;
  ballTooltip.hidden = true;
});
window.addEventListener('resize', resizeCanvas);

shootButton.addEventListener('click', () => shoot(lastStrokePower, false, lastPullDistance));
hintButton.addEventListener('click', () => {
  if (!hintAvailable || moving || matchOver) return;
  hintAvailable = false;
  showLegalTargetHint();
  updateUI(null);
  instruction.textContent = 'The glowing balls are your legal targets. Take your shot when ready.';
  setToast('Legal target balls are highlighted until your shot.');
});
hitPointButton.addEventListener('click', () => setHitPointMode(!hitPointMode));
cueContactBall.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
  selectCueHitPoint(event);
});
hitPointClose.addEventListener('click', () => setHitPointMode(false));
hitPointPicker.addEventListener('click', event => { if (event.target === hitPointPicker) setHitPointMode(false); });
document.querySelector('#rack-button').addEventListener('click', () => makeRack());
document.querySelector('#mode-button').addEventListener('click', () => modeDialog.showModal());
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  writePoolSettings({ mode });
  modeDialog.close();
  makeRack();
  setToast(mode === 'solo' ? 'Solo practice. You play both sides.' : 'Two-player mode. Pass the device between turns.');
}));
modeDialog.addEventListener('click', event => { if (event.target === modeDialog) modeDialog.close(); });

window.addEventListener('keydown', event => {
  if (event.code === 'Escape') {
    event.preventDefault();
    cancelShotSetup();
    return;
  }
  if (event.repeat && (event.code === 'Space' || event.code.startsWith('Arrow'))) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!hitPointMode && !cueInHand && !moving && !matchOver && !(mode === 'solo' && currentPlayer === 1)) shoot(lastStrokePower, false, lastPullDistance);
  } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    if (drag || hitPointMode || moving || cueInHand || matchOver || (mode === 'solo' && currentPlayer === 1)) return;
    event.preventDefault();
    aimingAngle += event.code === 'ArrowLeft' ? -0.035 : 0.035;
  } else if (event.code.toLowerCase() === 'r' && event.target === document.body) makeRack();
});

const initialSoundButton = document.querySelector('#sound-button');
initialSoundButton.setAttribute('aria-pressed', String(soundEnabled));
initialSoundButton.innerHTML = `<span class="sound-dot"></span> SOUND ${soundEnabled ? 'ON' : 'OFF'}`;
document.querySelector('#sound-button').addEventListener('click', event => {
  soundEnabled = !soundEnabled;
  writePoolSettings({ soundEnabled });
  event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  event.currentTarget.innerHTML = `<span class="sound-dot"></span> SOUND ${soundEnabled ? 'ON' : 'OFF'}`;
  if (soundEnabled) wakeAudio();
});

function wakeAudio() {
  if (!soundEnabled || audioContext) return;
  try { audioContext = new AudioContext(); } catch { soundEnabled = false; }
}

function sound(speed, volume, type) {
  if (!soundEnabled || !audioContext || speed < 95) return;
  const now = audioContext.currentTime;
  if (now - lastSoundAt < .036) return;
  lastSoundAt = now;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(78, Math.min(660, 120 + speed * 1.1)), now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .055);
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start(now); osc.stop(now + .057);
}

build3DScene();
resizeCanvas();
makeRack();
requestAnimationFrame(animate);

