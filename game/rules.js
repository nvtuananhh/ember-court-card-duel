// rules.js — trick resolution for Ember Court: simultaneous reveal, suit
// advantage, Echo combos and Surge streaks. Pure functions, no DOM.
import { suitById } from './cards.js';

export const STARTING_LIFE = 20;
export const HAND_SIZE = 5;
export const ECHO_BONUS = 1;
export const SURGE_BONUS = 3;
export const SURGE_STREAK = 3;

// Advantage: each suit beats one other and loses to one other; Star is neutral
// and never gains or grants an advantage bonus.
export function advantageBonus(attackerSuit, defenderSuit) {
  const attacker = suitById(attackerSuit);
  if (!attacker || !attacker.beats) return 0;
  return attacker.beats === defenderSuit ? 2 : 0;
}

// Echo: playing the same suit as your own previous trick's card is worth +1.
export function echoBonus(card, previousCard) {
  if (!previousCard) return 0;
  return card.suit === previousCard.suit ? ECHO_BONUS : 0;
}

export function effectivePower(card, opponentCard, previousCard) {
  return (
    card.value +
    advantageBonus(card.suit, opponentCard.suit) +
    echoBonus(card, previousCard)
  );
}

// Resolves one trick. Returns the winner ('you' | 'rival' | 'tie'), the two
// effective powers, and the damage dealt (0 on a tie).
export function resolveTrick(yourCard, rivalCard, yourPrevious, rivalPrevious) {
  const yourPower = effectivePower(yourCard, rivalCard, yourPrevious);
  const rivalPower = effectivePower(rivalCard, yourCard, rivalPrevious);
  if (yourPower === rivalPower) {
    return { winner: 'tie', yourPower, rivalPower, damage: 0 };
  }
  const winner = yourPower > rivalPower ? 'you' : 'rival';
  const damage = Math.abs(yourPower - rivalPower);
  return { winner, yourPower, rivalPower, damage };
}

// Surge: a third consecutive trick win lands bonus damage. Call with the
// winner's streak AFTER this trick, and the streak resets on a tie or loss.
export function surgeBonus(winner, streakAfterTrick) {
  if (winner === 'tie') return 0;
  return streakAfterTrick > 0 && streakAfterTrick % SURGE_STREAK === 0
    ? SURGE_BONUS
    : 0;
}

export function trickSummary(result, yourCard, rivalCard) {
  const youSuit = suitById(yourCard.suit).name;
  const rivalSuit = suitById(rivalCard.suit).name;
  if (result.winner === 'tie') {
    return `Tie — ${yourCard.value} ${youSuit} meets ${rivalCard.value} ${rivalSuit}. No damage.`;
  }
  const who = result.winner === 'you' ? 'You win' : 'Rival wins';
  return `${who} the trick, ${result.yourPower} to ${result.rivalPower} — ${result.damage} damage.`;
}
