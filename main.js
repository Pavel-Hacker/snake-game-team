
const CFG = Object.freeze({
  GRID: 20,               
  SPEED: 10,              
  STORAGE_KEY: 'snake_hi_simple', 
  OUTLINE_ALPHA: 0.10,    
  WRAP: true              // "телепорт" через края поля (если false — стены смертельны)
});

const $ = (sel) => document.querySelector(sel);

const canvas = $('#game');
const scoreEl = $('#score');
const hiscoreEl = $('#hiscore');

const ctx = canvas.getContext('2d');

function fitCanvasToDPR() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.width;   
  const cssH = canvas.clientHeight || canvas.height; 

  
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}


window.addEventListener('resize', () => { fitCanvasToDPR(); draw(); });


function cellSize() {
  const cssW = canvas.clientWidth || canvas.width;
  return cssW / CFG.GRID;
}


const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();


// Всё текущее состояние игры хранится в одном объекте S.
const S = {
  snake: [],                 // массив сегментов змейки [{x,y}, ...]; 0-й — голова
  dir: { x: 1, y: 0 },       
  nextDir: { x: 1, y: 0 },   
  food: null,                
  score: 0,                  
  running: false,            
  dead: false,               
  acc: 0,                    
  lastTs: performance.now() 
};

function getHi() {
  return parseInt(localStorage.getItem(CFG.STORAGE_KEY) || '0', 10);
}
function setHi(v) {
  localStorage.setItem(CFG.STORAGE_KEY, String(v));
}

hiscoreEl.textContent = getHi();

// (reset / place / step)

function resetGame() {
  const mid = Math.floor(CFG.GRID / 2);
  S.snake = [{ x: mid, y: mid }]; // стартовая голова в центре
  S.dir = { x: 1, y: 0 };
  S.nextDir = { x: 1, y: 0 };
  S.score = 0;
  S.running = false;
  S.dead = false;
  S.acc = 0;
  scoreEl.textContent = '0';
  placeFood(); // кладём еду в свободную клетку
  draw();      // сразу отрисовываем стартовое состояние
}

function start() {
  if (S.dead) resetGame();          // если были мертвы — начнём заново
  S.lastTs = performance.now();
  S.acc = 0;
  S.running = true;
}

function restart() {
  resetGame();
  start();
}


function placeFood() {
  while (true) {
    const p = { x: rnd(CFG.GRID), y: rnd(CFG.GRID) };
    if (!S.snake.some(s => s.x === p.x && s.y === p.y)) {
      S.food = p;
      return;
    }
  }
}


function step() {
  S.dir = S.nextDir;

  let nx = S.snake[0].x + S.dir.x;
  let ny = S.snake[0].y + S.dir.y;

  // Поведение на границах
  if (CFG.WRAP) {
    // Телепорт через край:  -1 -> GRID-1, GRID -> 0
    nx = (nx + CFG.GRID) % CFG.GRID;
    ny = (ny + CFG.GRID) % CFG.GRID;
  } else {
    // Классические стены — смерть при выходе за поле
    if (nx < 0 || ny < 0 || nx >= CFG.GRID || ny >= CFG.GRID) {
      return gameOver();
    }
  }

  const head = { x: nx, y: ny };

  if (S.snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  S.snake.unshift(head);

  if (head.x === S.food.x && head.y === S.food.y) {
    S.score++;
    scoreEl.textContent = S.score;
    placeFood();
  } else {
    // Если не съели — удаляем последний сегмент (движение без роста)
    S.snake.pop();
  }
}

function gameOver() {
  S.running = false;
  S.dead = true;
  const hi = getHi();
  if (S.score > hi) setHi(S.score);
  hiscoreEl.textContent = getHi();
}

// РЕНДЕР

function draw() {
  // 1) Сбрасываем трансформации, очищаем буфер полностью
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  fitCanvasToDPR();

  const W = canvas.clientWidth || canvas.width;
  const H = canvas.clientHeight || canvas.height;
  const CELL = cellSize();

  // Фоновая подложка поля
  ctx.fillStyle = cssVar('--board') || 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 0, W, H);

  // ЕДА — кружок
  circle(
    S.food.x * CELL + CELL / 2,
    S.food.y * CELL + CELL / 2,
    CELL * 0.32,
    cssVar('--food') || '#ff4d4d'
  );

  for (let i = S.snake.length - 1; i >= 1; i--) {
    const s = S.snake[i];
    roundRect(
      s.x * CELL + 2,
      s.y * CELL + 2,
      CELL - 4,
      CELL - 4,
      Math.max(1, Math.floor(CELL * 0.08)),
      cssVar('--snake'),
      CFG.OUTLINE_ALPHA
    );
  }

  const h = S.snake[0];
  roundRect(
    h.x * CELL + 1,
    h.y * CELL + 1,
    CELL - 2,
    CELL - 2,
    Math.max(1, Math.floor(CELL * 0.08)),
    cssVar('--snake-head'),
    CFG.OUTLINE_ALPHA
  );

  drawFace(h, S.dir, CELL);

  // Экран смерти
  if (S.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Вы погибли', W / 2, H / 2 - 10);

    ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillStyle = 'rgba(230,233,255,0.9)';
    ctx.fillText('Нажмите R или «Заново», чтобы начать сначала', W / 2, H / 2 + 18);
  }
}

function drawFace(head, dir, CELL) {
  const cx = head.x * CELL + CELL / 2; 
  const cy = head.y * CELL + CELL / 2;
  const nx = -dir.y, ny = dir.x;

  // Расстояние между глазами и смещение вперёд
  const spread = CELL * 0.18;
  const forward = CELL * 0.10;
  const baseX = cx + dir.x * forward;
  const baseY = cy + dir.y * forward;

  const eye1 = { x: baseX + nx * spread, y: baseY + ny * spread };
  const eye2 = { x: baseX - nx * spread, y: baseY - ny * spread };
  const r = Math.max(3, CELL * 0.12);

  circle(eye1.x, eye1.y, r, '#000');
  circle(eye2.x, eye2.y, r, '#000');
}

function circle(x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(x, y, w, h, r, fill, outlineAlpha = 0.1) {
  
  x = Math.round(x); y = Math.round(y);
  w = Math.round(w); h = Math.round(h); r = Math.round(r);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  if (outlineAlpha > 0) {
    ctx.strokeStyle = `rgba(0,0,0,${outlineAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

//  ЦИКЛ
function loop(ts) {
  if (!S.running) {
    S.lastTs = ts;
    requestAnimationFrame(loop);
    draw();
    return;
  }

  const dt = (ts - S.lastTs) / 1000; 
  S.lastTs = ts;
  S.acc += dt;

  const stepTime = 1 / CFG.SPEED;
  while (S.acc >= stepTime && S.running && !S.dead) {
    step();
    S.acc -= stepTime;
  }

  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  // стрелки
  if (k === 'arrowup') return turn(0, -1);
  if (k === 'arrowdown') return turn(0, 1);
  if (k === 'arrowleft') return turn(-1, 0);
  if (k === 'arrowright') return turn(1, 0);

  // WASD
  if (k === 'w') return turn(0, -1);
  if (k === 's') return turn(0, 1);
  if (k === 'a') return turn(-1, 0);
  if (k === 'd') return turn(1, 0);

  // русская раскладка (фывац)
  if (k === 'ц') return turn(0, -1); 
  if (k === 'ы') return turn(0, 1);  
  if (k === 'ф') return turn(-1, 0); 
  if (k === 'в') return turn(1, 0); 

  // рестарт
  if (k === 'r' || k === 'к') return restart();
});

function turn(x, y) {
  if ((x !== 0 && S.dir.x === -x) || (y !== 0 && S.dir.y === -y)) return;
  S.nextDir = { x, y };
}

$('#startBtn').addEventListener('click', start);
$('#restartBtn').addEventListener('click', restart);

resetGame();
fitCanvasToDPR();
requestAnimationFrame(loop);

function rnd(n) { return Math.floor(Math.random() * n); }
