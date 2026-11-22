// ai.js — the rival. It has a readable leaning: one favoured suit, shown
// glowing in the interface, which it plays most of the time. Read the lean,
// counter it with the suit that beats it, and the rival becomes beatable.
import { SUITS, suitById } from './cards.js';
import { advantageBonus } from './rules.js';

export const LEAN_EVERY = 3;

// The rival re-picks its leaning every few tricks, favouring a suit it holds.
export function pickLeaning(hand, random, previousLeaning) {
  const held = SUITS.filter((s) => hand.some((c) => c.suit === s.id));
  const pool = held.length > 0 ? held : SUITS;
  let choice = pool[Math.floor(random() * pool.length)];
  if (pool.length > 1 && choice.id === previousLeaning) {
    choice = pool[Math.floor(random() * pool.length)];
  }
  return choice.id;
}

// Choose a card. Mostly the leaned suit; otherwise the cheapest card that
// still wins the player's likely range, or the weakest card when beaten.
// The Echo temptation uses the rival's OWN previous card, since the bonus
// rewards repeating its own suit.
export function chooseRivalCard(hand, leaning, random, yourPreviousCard, rivalPreviousCard) {
  if (hand.length === 0) return null;
  const leaned = hand.filter((c) => c.suit === leaning);
  const roll = random();
  if (leaned.length > 0 && roll < 0.62) {
    // Inside its leaning it still spends its best card only when threatened:
    // if you just played a big card, answer big; otherwise answer mid.
    leaned.sort((a, b) => a.value - b.value);
    if (yourPreviousCard && yourPreviousCard.value >= 5) return leaned[leaned.length - 1];
    return leaned[Math.floor(leaned.length / 2)] ?? leaned[0];
  }
  // Off-lean play: keep high cards, spend the weakest card that is not
  // obviously throwing the trick away, unless the Echo bonus tempts it.
  const sorted = hand.slice().sort((a, b) => {
    const aScore = a.value + advantageBonus(a.suit, yourPreviousCard?.suit ?? 'star');
    const bScore = b.value + advantageBonus(b.suit, yourPreviousCard?.suit ?? 'star');
    return aScore - bScore;
  });
  const echoCard = hand.find((c) => rivalPreviousCard && c.suit === rivalPreviousCard.suit);
  if (echoCard && random() < 0.3) return echoCard;
  return sorted[0];
}

export function leaningLabel(leaning) {
  const suit = suitById(leaning);
  return suit ? suit.name : 'None';
}
