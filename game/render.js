// render.js — every pixel of the table is built here: suit shapes as inline
// SVG (colour AND shape, never text alone), card faces, the arena, and the
// title / win / loss overlays. Pure DOM building; the game loop lives in
// main.js and hands this module a state object plus callbacks.
import { suitById } from './cards.js';

const SUIT_PATHS = {
  ember: 'M12 3 L21 20 L3 20 Z',
  tide: 'M12 2.5 C12 2.5 5 10.5 5 15 a7 7 0 0 0 14 0 C19 10.5 12 2.5 12 2.5 Z',
  thorn: 'M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z M5 19 L15 9',
  star: 'M12 2 L14.9 8.6 L22 9.3 L16.7 14 L18.2 21 L12 17.5 L5.8 21 L7.3 14 L2 9.3 L9.1 8.6 Z',
};

export function suitSymbol(suitId, size) {
  const suit = suitById(suitId);
  const path = SUIT_PATHS[suitId] ?? SUIT_PATHS.star;
  const stroke = suitId === 'thorn' ? `stroke="${suit.color}" stroke-width="1.6" fill="none"` : '';
  const fill = suitId === 'thorn' ? '' : `fill="${suit.color}"`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" ${fill} ${stroke}/></svg>`;
}

export function cardFace(card, options) {
  const opts = options ?? {};
  const suit = suitById(card.suit);
  const classes = ['card', `suit-${card.suit}`];
  if (opts.small) classes.push('small');
  if (opts.selected) classes.push('selected');
  if (opts.dealt) classes.push('dealt');
  if (opts.played) classes.push('played');
  if (opts.winnerGlow) classes.push('winner-glow');
  const keyHint = opts.keyHint ? `<span class="key-hint">${opts.keyHint}</span>` : '';
  return `<div class="${classes.join(' ')}" data-card="${card.key}" role="button" tabindex="0" aria-label="${card.value} of ${suit.name}">
    <div class="corner"><div class="num">${card.value}</div>${suitSymbol(card.suit, 18)}</div>
    <div class="big"><div class="value">${card.value}</div>${suitSymbol(card.suit, 44)}<div class="suitname">${suit.name.toUpperCase()}</div></div>
    <div class="corner br">${suitSymbol(card.suit, 18)}</div>
    ${keyHint}
  </div>`;
}

export function cardBack() {
  return `<div class="card back" aria-label="Face-down card"><span class="back-star">✦</span></div>`;
}

function lifeBlock(who, life) {
  const low = life <= 5 ? ' low' : '';
  return `<div class="life${low}"><div class="who">${who}</div><div class="hp">${life} <small>/ 20</small></div></div>`;
}

function legendHtml() {
  return `<div class="legend">${['ember', 'tide', 'thorn', 'star'].map((id) => {
    const suit = suitById(id);
    const beats = suit.beats ? `Beats ${suitById(suit.beats).name}` : 'Neutral — no advantage';
    return `<div class="legend-item">${suitSymbol(id, 34)}<b>${suit.name}</b><span>${beats}</span></div>`;
  }).join('')}</div>`;
}

function confettiHtml() {
  const colors = ['#ff5a2e', '#2e9bff', '#37b24d', '#f2c531', '#ff8fd3', '#ffffff'];
  let pieces = '';
  for (let i = 0; i < 36; i += 1) {
    const left = (i * 29) % 100;
    const delay = ((i * 37) % 26) / 10;
    pieces += `<i style="left:${left}%;background:${colors[i % colors.length]};animation-delay:${delay}s"></i>`;
  }
  return `<div class="confetti" aria-hidden="true">${pieces}</div>`;
}

export function renderTitle(callbacks) {
  return `<div class="overlay"><div class="panel">
    <h1>EMBER COURT</h1>
    <h2>A DUEL OF FOUR SUITS</h2>
    <p>Both duelists choose a card in secret, then reveal. Higher power wins the
    trick and deals damage equal to the difference. First to empty the rival's
    20 life — or ahead when the deck runs out — takes the Court.</p>
    ${legendHtml()}
    <div class="cycle">Ember beats Thorn &nbsp;•&nbsp; Thorn beats Tide &nbsp;•&nbsp; Tide beats Ember &nbsp;•&nbsp; Star is neutral.<br>
    Advantage is worth +2. Same suit twice in a row: Echo +1. Three wins in a row: Surge +3 damage.</div>
    <p>Watch the rival's glowing leaning — it tells you which suit it favours. Counter it.</p>
    <div class="controls"><button data-action="start">⚔ &nbsp;Enter the Court</button></div>
    <p class="hint" style="color:#555">Click a card or press 1–5 to select, Enter / Space to play. R restarts, M mutes.</p>
  </div></div>`;
}

export function renderEnd(state, callbacks) {
  const won = state.winner === 'you';
  const heading = won ? '👑 YOU TAKE THE COURT!' : 'THE COURT FALLS SILENT';
  const blurb = won
    ? 'The rival bows. Every trick you read, every suit you countered, brought this crown.'
    : 'The rival keeps the Court — this time. Read its leaning, counter its suit, and duel again.';
  const confetti = won ? confettiHtml() : '';
  return `${confetti}<div class="overlay"><div class="panel ${won ? 'glow-win' : ''}">
    <h1 class="${won ? 'win' : ''}">${heading}</h1>
    <h2>${won ? 'VICTORY' : 'DEFEAT'}</h2>
    <p>${blurb}</p>
    <div class="stats">Final life — You <strong>${state.youLife}</strong> &nbsp;•&nbsp; Rival <strong>${state.rivalLife}</strong><br>
    Tricks won — You <strong>${state.tricksYou}</strong> &nbsp;•&nbsp; Rival <strong>${state.tricksRival}</strong> &nbsp;•&nbsp; Ties <strong>${state.tricksTie}</strong></div>
    <div class="controls"><button data-action="restart">↻ &nbsp;Duel Again (R)</button></div>
    <p class="hint" style="color:#555">Press R or click Duel Again to restart.</p>
  </div></div>`;
}

export function renderTable(state, callbacks) {
  const rivalHand = state.revealRival
    ? state.rivalHand.map((c) => cardFace(c, { small: true })).join('')
    : state.rivalHand.map(() => cardBack()).join('');
  const yourHand = state.youHand.map((c, i) => cardFace(c, {
    selected: state.selectedIndex === i,
    dealt: state.justDealt,
    keyHint: String(i + 1),
  })).join('');

  const arenaYou = state.playedYou
    ? cardFace(state.playedYou, { played: true, winnerGlow: state.lastWinner === 'you' })
    : '<div class="arena-empty">Your card awaits…</div>';
  const arenaRival = state.playedRival
    ? cardFace(state.playedRival, { played: true, winnerGlow: state.lastWinner === 'rival' })
    : '<div class="arena-empty">Rival card hidden…</div>';
  const powerLine = state.playedYou && state.playedRival && state.lastResult
    ? `<div class="power-badge">Power ${state.lastResult.yourPower} — ${state.lastResult.rivalPower}</div>`
    : '';

  const leanSuit = suitById(state.leaning);
  const streakLine = state.streakYou >= 2
    ? ` &nbsp;•&nbsp; Your win streak: <strong>${state.streakYou}</strong> (next win Surges!)`
    : state.streakRival >= 2
      ? ` &nbsp;•&nbsp; Rival win streak: <strong>${state.streakRival}</strong>`
      : '';

  return `<header class="topbar">
    <div class="brand">EMBER COURT<small>FOUR-SUIT DUEL</small></div>
    <div class="lifeboard">${lifeBlock('YOU', state.youLife)}${lifeBlock('RIVAL', state.rivalLife)}</div>
  </header>
  <div class="roundline">Trick ${state.trickNumber} of ${state.totalTricks} &nbsp;•&nbsp; Deck: ${state.drawPile.length} cards left${streakLine}</div>
  <div class="leanline">Rival leans toward <span class="lean-chip ${state.leaning}" style="color:${state.leaning === 'star' || state.leaning === 'thorn' ? '#1c2430' : '#fff'}">${suitSymbol(state.leaning, 16)} ${leanSuit.name.toUpperCase()}</span> — counter it with ${leanSuit.beats ? suitById(suitById(state.leaning).losesTo).name : 'any suit'}.</div>
  <div class="hand-label">RIVAL'S HAND ${state.revealRival ? '(REVEALED)' : ''}</div>
  <div class="hand">${rivalHand}</div>
  <div class="arena">
    <div class="arena-slot"><div class="slot-name">RIVAL</div>${arenaRival}</div>
    <div class="arena-vs">VS</div>
    <div class="arena-slot"><div class="slot-name">YOU</div>${arenaYou}</div>
  </div>
  ${powerLine}
  <div class="message">${state.message}</div>
  <div class="hand-label">YOUR HAND — CLICK A CARD OR PRESS 1–5, THEN ENTER</div>
  <div class="hand your-hand">${yourHand}</div>
  <div class="controls">
    <button data-action="play" ${state.selectedIndex === null || state.phase !== 'choosing' ? 'disabled' : ''}>Play Selected Card ⏎</button>
    <button class="ghost" data-action="restart">Restart (R)</button>
    <button class="ghost" data-action="mute">${state.muted ? '🔇 Unmute (M)' : '🔊 Mute (M)'}</button>
  </div>
  <p class="hint">Echo: repeat a suit for +1 &nbsp;•&nbsp; Advantage: +2 &nbsp;•&nbsp; 3-win streak: Surge +3 damage</p>
  <footer>Ember Court — an original four-suit duel. No network, no files but this page.</footer>`;
}

// Renders the whole app for a state, then wires the buttons and cards.
export function renderApp(root, state, callbacks) {
  if (state.phase === 'title') {
    root.innerHTML = renderTitle(callbacks);
  } else if (state.phase === 'over') {
    root.innerHTML = renderTable(state, callbacks) + renderEnd(state, callbacks);
  } else {
    root.innerHTML = renderTable(state, callbacks);
  }
  root.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => callbacks.onAction(el.getAttribute('data-action')));
  });
  root.querySelectorAll('.card[data-card]').forEach((el) => {
    el.addEventListener('click', () => {
      const index = state.youHand.findIndex((c) => c.key === el.getAttribute('data-card'));
      if (index >= 0) callbacks.onCardClick(index);
    });
  });
}
