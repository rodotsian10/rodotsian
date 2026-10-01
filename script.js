'use strict';
const $ = (selector) => document.querySelector(selector);
const dialog = $('#game-dialog');
const board = $('#board');
let game = '';
let cleanup = () => {};
let records = {};
try { records = JSON.parse(localStorage.getItem('rodotsian-playroom-v1') || '{}') || {}; } catch {}
const definitions = {
  memory: { title: '너 아까 봤는데?', help: '카드를 뒤집어서 같은 그림 6쌍을 찾아봐. 적게 뒤집을수록 좋아!', unit: '번' },
  reaction: { title: '지금이야!', help: '시작하고 기다려. 초록색으로 바뀌는 순간 눌러! 키보드는 Space 또는 Enter.', unit: 'ms' },
  catch: { title: '아메 잡아라', help: '20초 동안 나타나는 아메를 눌러봐. 한 번 나타날 때 한 번만 잡을 수 있어!', unit: '점' }
};
function recordText(key) {
  const value = records[key];
  return Number.isFinite(value) ? '최고 ' + value + definitions[key].unit : '기록 없음';
}
function updateRecords() {
  document.querySelectorAll('[data-best]').forEach(el => { el.textContent = recordText(el.dataset.best); });
  if (game) $('#best').textContent = recordText(game);
}
function saveRecord(value) {
  const previous = records[game];
  if (!Number.isFinite(previous) || (game === 'catch' ? value > previous : value < previous)) {
    records[game] = value;
    try { localStorage.setItem('rodotsian-playroom-v1', JSON.stringify(records)); } catch {}
  }
  updateRecords();
}
function launch(key) {
  cleanup();
  game = key;
  $('#game-title').textContent = definitions[key].title;
  $('#instructions').textContent = definitions[key].help;
  $('#status').textContent = '';
  $('#score').textContent = '';
  board.replaceChildren();
  updateRecords();
  ({memory: memoryGame, reaction: reactionGame, catch: catchGame})[key]();
}
document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
  launch(button.dataset.game);
  dialog.showModal();
}));
$('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => cleanup());
dialog.addEventListener('cancel', () => cleanup());
$('.restart').addEventListener('click', () => launch(game));
// Switching away cancels active rounds so background timer throttling cannot alter scores.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && dialog.open) dialog.close();
});
function memoryGame() {
  const names = ['기본아이콘','놀기아이콘','쇼핑아이콘','삐엥고양이','침대아이콘','컴터아이콘'];
  const cards = [...names, ...names];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  board.className = 'memory-grid';
  let first = null, locked = false, moves = 0, pairs = 0, timer;
  $('#score').textContent = '0번 · 0 / 6쌍';
  cards.forEach((name, index) => {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.textContent = '✦';
    tile.setAttribute('aria-label', (index + 1) + '번 카드 뒤집기');
    const hide = (el) => {
      el.classList.remove('revealed'); el.textContent = '✦';
      el.setAttribute('aria-label', el.dataset.position + '번 카드 뒤집기');
    };
    tile.dataset.position = index + 1;
    tile.addEventListener('click', () => {
      if (locked || tile.classList.contains('revealed') || tile.classList.contains('matched')) return;
      tile.classList.add('revealed');
      const img = document.createElement('img');
      img.src = 'assets/' + name + '-bg-removed.webp'; img.alt = name;
      tile.replaceChildren(img); tile.setAttribute('aria-label', name);
      if (!first) { first = {tile, name}; return; }
      moves++;
      if (first.name === name) {
        tile.classList.add('matched'); first.tile.classList.add('matched');
        tile.disabled = true; first.tile.disabled = true; first = null; pairs++;
        if (pairs === 6) {
          saveRecord(moves);
          $('#status').textContent = '완성! ' + moves + '번 만에 다 찾았어 ♡';
        } else $('#status').textContent = '짝 찾았다! ✦';
      } else {
        locked = true;
        const other = first.tile;
        timer = setTimeout(() => { hide(tile); hide(other); first = null; locked = false; }, 800);
      }
      $('#score').textContent = moves + '번 · ' + pairs + ' / 6쌍';
    });
    board.append(tile);
  });
  cleanup = () => clearTimeout(timer);
}
function reactionGame() {
  board.className = '';
  const pad = document.createElement('button');
  pad.className = 'reaction-pad';
  board.append(pad);
  let phase = 'idle', timer, readyAt;
  const label = (title, sub) => {
    const strong = document.createElement('strong'), small = document.createElement('span');
    strong.textContent = title; small.textContent = sub; pad.replaceChildren(strong, small);
  };
  label('준비됐어?', '눌러서 시작');
  $('#score').textContent = '빠를수록 좋아';
  const act = () => {
    if (phase === 'idle' || phase === 'done') {
      phase = 'waiting'; pad.className = 'reaction-pad wait';
      $('#status').textContent = '';
      label('아직이야…', '초록색이 될 때까지 기다려');
      timer = setTimeout(() => {
        phase = 'ready'; pad.className = 'reaction-pad ready';
        label('지금!', '빨리 눌러!');
        readyAt = performance.now();
      }, 1600 + Math.random() * 3000);
    } else if (phase === 'waiting') {
      clearTimeout(timer); phase = 'done'; pad.className = 'reaction-pad';
      label('너무 빨랐어!', '눌러서 다시 도전');
      $('#status').textContent = '초록색으로 바뀐 뒤에 눌러줘.';
    } else if (phase === 'ready') {
      const ms = Math.round(performance.now() - readyAt);
      phase = 'done'; pad.className = 'reaction-pad'; saveRecord(ms);
      label(ms + ' ms', '눌러서 한 번 더');
      $('#score').textContent = ms + ' ms';
      $('#status').textContent = ms < 250 ? '혹시 고양이야? 엄청 빠르다!' : '좋아! 한 번 더 해볼까?';
    }
  };
  pad.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); pad.focus(); act(); });
  pad.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!event.repeat) act(); }
  });
  pad.addEventListener('click', event => { if (event.detail === 0 && !event.pointerType) act(); });
  cleanup = () => clearTimeout(timer);
}
function catchGame() {
  board.className = '';
  board.innerHTML = '<div class="game-start"><span>쏙! 어디서 나올까? ♡</span><button class="start-catch">20초 도전 시작</button></div>';
  $('#score').textContent = '20.0초 · 0점';
  let spawnTimer, clockTimer, active = -1, points = 0, deadline, running = false;
  const finish = () => {
    running = false; clearTimeout(spawnTimer); clearInterval(clockTimer);
    board.querySelectorAll('button').forEach(el => { el.disabled = true; el.classList.remove('active'); el.replaceChildren(); });
    $('#score').textContent = '0.0초 · ' + points + '점';
    saveRecord(points); $('#status').textContent = '끝! 아메를 ' + points + '번 잡았어 ♡';
  };
  board.querySelector('button').addEventListener('click', () => {
    board.replaceChildren(); board.className = 'catch-grid'; running = true; deadline = performance.now() + 20000;
    const holes = Array.from({length: 9}, (_, i) => {
      const hole = document.createElement('button');
      hole.className = 'hole'; hole.setAttribute('aria-label', (i + 1) + '번 자리');
      hole.addEventListener('click', () => {
        if (!running) return;
        if (performance.now() >= deadline) { finish(); return; }
        if (i !== active) return;
        points++; active = -1;
        hole.replaceChildren(); hole.classList.remove('active'); hole.setAttribute('aria-label', (i + 1) + '번 자리');
        $('#status').textContent = points + '번 잡았다!';
      });
      board.append(hole); return hole;
    });
    const spawn = () => {
      if (!running) return;
      if (performance.now() >= deadline) { finish(); return; }
      holes.forEach((el, i) => { el.replaceChildren(); el.classList.remove('active'); el.setAttribute('aria-label', (i + 1) + '번 자리'); });
      const previous = active;
      do { active = Math.floor(Math.random() * 9); } while (active === previous);
      const img = document.createElement('img');
      img.src = 'assets/카와이아메-bg-removed.webp'; img.alt = ''; img.draggable = false;
      holes[active].append(img); holes[active].classList.add('active'); holes[active].setAttribute('aria-label', '아메 잡기');
      spawnTimer = setTimeout(spawn, Math.max(450, 950 - points * 18));
    };
    spawn();
    clockTimer = setInterval(() => {
      const remaining = Math.max(0, deadline - performance.now());
      $('#score').textContent = (remaining / 1000).toFixed(1) + '초 · ' + points + '점';
      if (!remaining) finish();
    }, 80);
  }, {once:true});
  cleanup = () => { running = false; clearTimeout(spawnTimer); clearInterval(clockTimer); };
}
updateRecords();
