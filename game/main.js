// main.js — the Ember Court game loop: state, input (keyboard and mouse),
// trick flow, debug staging hooks, and the seeded start of every duel.
import { buildDeck, makePrng, shuffleDeck, dealHands, suitById } from './cards.js';
import { HAND_SIZE, STARTING_LIFE, resolveTrick, surgeBonus, trickSummary } from './rules.js';
import { chooseRivalCard, pickLeaning, LEAN_EVERY } from './ai.js';
import { renderApp } from './render.js';
import {
  isMuted, toggleMute, unlockAudio,
  playSelect, playDeal, playFlip, playDamage, playWin, playLose, playTie,
} from './audio.js';

const TOTAL_TRICKS = 12;
const REVEAL_MS = 1150;

const root = document.getElementById('app');
const params = new URLSearchParams(window.location.search);

let state = null;
let revealTimer = null;

function freshState(seed) {
  const random = makePrng(seed);
  const deck = shuffleDeck(buildDeck(), random);
  const dealt = dealHands(deck, HAND_SIZE);
  return {
    phase: 'title',
    seed,
    random,
    youHand: dealt.you,
    rivalHand: dealt.rival,
    drawPile: dealt.drawPile,
    playedYou: null,
    playedRival: null,
    youLife: STARTING_LIFE,
    rivalLife: STARTING_LIFE,
    trickNumber: 1,
    totalTricks: TOTAL_TRICKS,
    streakYou: 0,
    streakRival: 0,
    tricksYou: 0,
    tricksRival: 0,
    tricksTie: 0,
    leaning: pickLeaning(dealt.rival, random, null),
    previousYou: null,
    previousRival: null,
    selectedIndex: null,
    message: 'Choose a card. Read the rival\u2019s leaning — then counter it.',
    lastResult: null,
    lastWinner: null,
    justDealt: true,
    revealRival: false,
    muted: isMuted(),
    winner: null,
  };
}

function drawPhase() {
  renderApp(root, state, {
    onAction: handleAction,
    onCardClick: handleCardClick,
  });
}

function startGame(seed) {
  if (revealTimer) clearTimeout(revealTimer);
  state = freshState(seed);
  state.phase = 'choosing';
  playDeal();
  drawPhase();
}

function handleAction(action) {
  unlockAudio();
  if (action === 'start') startGame(Date.now() % 2147483647);
  if (action === 'restart') startGame(Date.now() % 2147483647);
  if (action === 'play') playSelectedCard();
  if (action === 'mute') {
    state.muted = toggleMute();
    drawPhase();
  }
}

function handleCardClick(index) {
  if (!state || state.phase !== 'choosing') return;
  unlockAudio();
  if (state.selectedIndex === index) {
    playSelectedCard();
    return;
  }
  state.selectedIndex = index;
  playSelect();
  drawPhase();
}

function selectCard(index) {
  if (!state || state.phase !== 'choosing') return;
  if (index < 0 || index >= state.youHand.length) return;
  state.selectedIndex = index;
  playSelect();
  drawPhase();
}

function playSelectedCard() {
  if (!state || state.phase !== 'choosing') return;
  if (state.selectedIndex === null) return;
  const yourCard = state.youHand[state.selectedIndex];
  const rivalCard = chooseRivalCard(
    state.rivalHand, state.leaning, state.random, state.previousYou, state.previousRival,
  );
  state.youHand = state.youHand.filter((c) => c !== yourCard);
  state.rivalHand = state.rivalHand.filter((c) => c !== rivalCard);
  state.playedYou = yourCard;
  state.playedRival = rivalCard;
  state.selectedIndex = null;
  state.phase = 'reveal';
  playFlip();
  drawPhase();
  revealTimer = setTimeout(resolveReveal, REVEAL_MS);
}

function resolveReveal() {
  const result = resolveTrick(
    state.playedYou, state.playedRival, state.previousYou, state.previousRival,
  );
  let damage = result.damage;
  if (result.winner === 'you') {
    state.streakYou += 1;
    state.streakRival = 0;
    state.tricksYou += 1;
    damage += surgeBonus('you', state.streakYou);
    state.rivalLife = Math.max(0, state.rivalLife - damage);
  } else if (result.winner === 'rival') {
    state.streakRival += 1;
    state.streakYou = 0;
    state.tricksRival += 1;
    damage += surgeBonus('rival', state.streakRival);
    state.youLife = Math.max(0, state.youLife - damage);
  } else {
    state.streakYou = 0;
    state.streakRival = 0;
    state.tricksTie += 1;
  }
  const surgeNote = damage > result.damage ? ' Surge! +3 bonus damage.' : '';
  state.message = `<strong>${trickSummary({ ...result, damage }, state.playedYou, state.playedRival)}</strong>${surgeNote}`;
  state.lastResult = { ...result, damage };
  state.lastWinner = result.winner;
  state.previousYou = state.playedYou;
  state.previousRival = state.playedRival;
  state.playedYou = null;
  state.playedRival = null;

  if (result.winner === 'tie') playTie();
  else playDamage();

  const deckEmpty = state.drawPile.length === 0;
  const handsEmpty = state.youHand.length === 0 && state.rivalHand.length === 0;
  if (state.youLife <= 0 || state.rivalLife <= 0 || (deckEmpty && handsEmpty)) {
    finishGame();
    return;
  }

  // Draw back up to a full hand while the pile lasts, then next trick.
  if (state.drawPile.length > 0 && state.youHand.length < HAND_SIZE) {
    state.youHand.push(state.drawPile.shift());
  }
  if (state.drawPile.length > 0 && state.rivalHand.length < HAND_SIZE) {
    state.rivalHand.push(state.drawPile.shift());
  }
  state.trickNumber += 1;
  if (state.trickNumber % LEAN_EVERY === 1) {
    state.leaning = pickLeaning(state.rivalHand, state.random, state.leaning);
  }
  state.phase = 'choosing';
  state.justDealt = true;
  drawPhase();
  state.justDealt = false;
}

function finishGame() {
  if (state.youLife > state.rivalLife) state.winner = 'you';
  else if (state.rivalLife > state.youLife) state.winner = 'rival';
  else state.winner = state.tricksYou >= state.tricksRival ? 'you' : 'rival';
  state.phase = 'over';
  if (state.winner === 'you') playWin();
  else playLose();
  drawPhase();
}

// Debug staging: real end/mid-game states built through the same constructors
// and the same render path, so screenshots are true renders of this code.
function stageDebug(kind) {
  const seed = Number(params.get('seed') ?? 7);
  state = freshState(seed);
  state.phase = 'choosing';
  if (kind === 'table') {
    state.trickNumber = 4;
    state.youLife = 14;
    state.rivalLife = 17;
    state.tricksYou = 2;
    state.tricksRival = 1;
    state.streakYou = 2;
    state.playedYou = { suit: 'ember', value: 6, key: 'ember-6' };
    state.playedRival = { suit: 'thorn', value: 4, key: 'thorn-4' };
    state.lastResult = { winner: 'you', yourPower: 8, rivalPower: 4, damage: 4 };
    state.lastWinner = 'you';
    state.message = '<strong>You win the trick, 8 to 4 — 4 damage.</strong> Your win streak: 2 (next win Surges!)';
    state.revealRival = true;
    state.leaning = 'ember';
  } else if (kind === 'win') {
    state.youLife = 12;
    state.rivalLife = 0;
    state.trickNumber = 12;
    state.drawPile = [];
    state.tricksYou = 7;
    state.tricksRival = 4;
    state.tricksTie = 1;
    state.winner = 'you';
    state.phase = 'over';
  } else if (kind === 'loss') {
    state.youLife = 0;
    state.rivalLife = 9;
    state.trickNumber = 12;
    state.drawPile = [];
    state.tricksYou = 4;
    state.tricksRival = 7;
    state.tricksTie = 1;
    state.winner = 'rival';
    state.phase = 'over';
  }
  drawPhase();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    if (!state) return;
    state.muted = toggleMute();
    drawPhase();
    return;
  }
  if (!state) return;
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    startGame(Date.now() % 2147483647);
    return;
  }
  if (state.phase === 'over' && (event.key === 'r' || event.key === 'R')) {
    startGame(Date.now() % 2147483647);
    return;
  }
  if (state.phase !== 'choosing') return;
  if (event.key >= '1' && event.key <= '5') {
    selectCard(Number(event.key) - 1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    playSelectedCard();
  } else if (event.key === 'r' || event.key === 'R') {
    startGame(Date.now() % 2147483647);
  }
});

document.addEventListener('pointerdown', unlockAudio, { once: true });

// Boot: title screen, or a staged debug state for screenshots.
const debugKind = params.get('debug');
if (debugKind === 'win' || debugKind === 'loss' || debugKind === 'table') {
  stageDebug(debugKind);
} else {
  const seed = Number(params.get('seed') ?? Date.now() % 2147483647);
  state = freshState(Number.isFinite(seed) ? seed : 7);
  state.phase = 'title';
  drawPhase();
}

// A small window for automated playtests: read-only state plus the same
// actions a player can take. Never used by the game itself.
window.emberCourt = {
  getState: () => state,
  start: (seed) => startGame(seed ?? 7),
  select: selectCard,
  play: playSelectedCard,
};
void suitById;
