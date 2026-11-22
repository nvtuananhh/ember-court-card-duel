// cards.js — the deck: four original suits, values 1-6, and a small seeded
// shuffle so a playtest can be reproduced from a seed.
export const SUITS = [
  { id: 'ember', name: 'Ember', color: '#ff5a2e', beats: 'thorn', losesTo: 'tide' },
  { id: 'tide', name: 'Tide', color: '#2e9bff', beats: 'ember', losesTo: 'thorn' },
  { id: 'thorn', name: 'Thorn', color: '#37b24d', beats: 'tide', losesTo: 'ember' },
  { id: 'star', name: 'Star', color: '#f2c531', beats: null, losesTo: null },
];

export function suitById(id) {
  return SUITS.find((s) => s.id === id);
}

// Mulberry32: a tiny deterministic PRNG. Runtime randomness is fine for a
// card game, but a seeded shuffle makes any reported playtest reproducible.
export function makePrng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 6; value += 1) {
      deck.push({ suit: suit.id, value, key: `${suit.id}-${value}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck, random) {
  const cards = deck.slice();
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function dealHands(deck, handSize) {
  return {
    you: deck.slice(0, handSize),
    rival: deck.slice(handSize, handSize * 2),
    drawPile: deck.slice(handSize * 2),
  };
}
