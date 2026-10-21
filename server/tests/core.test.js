const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateVerificationScore } = require('../utils/verificationScore');
const { canTransitionOrder, canTransitionLogistics } = require('../utils/workflowRules');
const { calculatePriceRecommendation, parseReferences } = require('../utils/pricing');

test('verification score reaches 100 only when all documented evidence checks score fully', () => {
  const result = calculateVerificationScore({ isProduce: true, productMatchStatus: 'match', appearanceScore: 100, quantityStatus: 'roughly_consistent' });
  assert.equal(result.verificationScore, 100);
  assert.match(result.verificationScoreMethod, /not a probability/i);
  assert.equal(result.verificationScoreReasons.length, 4);
});

test('verification score is capped when product identity is not matched', () => {
  const result = calculateVerificationScore({ isProduce: true, productMatchStatus: 'possible_mismatch', appearanceScore: 100, quantityStatus: 'roughly_consistent' });
  assert.equal(result.verificationScore, 40);
});

test('verification score does not award quantity points when quantity is not assessed', () => {
  const result = calculateVerificationScore({ isProduce: true, productMatchStatus: 'match', appearanceScore: 50, quantityStatus: 'not_assessed' });
  assert.equal(result.verificationScore, 70);
});

test('verification score ignores out-of-range appearance values', () => {
  const result = calculateVerificationScore({ isProduce: true, productMatchStatus: 'match', appearanceScore: 200, quantityStatus: 'not_assessed' });
  assert.equal(result.verificationScore, 60);
});

test('order workflow allows only sequential fulfilment and unpaid cancellation', () => {
  assert.equal(canTransitionOrder('placed', 'cancelled'), true);
  assert.equal(canTransitionOrder('placed', 'accepted'), true);
  assert.equal(canTransitionOrder('packed', 'delivered'), false);
  assert.equal(canTransitionOrder('delivered', 'cancelled'), false);
});

test('logistics workflow cannot reopen completed or cancelled groups', () => {
  assert.equal(canTransitionLogistics('open', 'forming'), true);
  assert.equal(canTransitionLogistics('ready', 'in_transit'), true);
  assert.equal(canTransitionLogistics('completed', 'open'), false);
  assert.equal(canTransitionLogistics('cancelled', 'forming'), false);
});

test('price recommendation refuses to invent values when no dated source matches', () => {
  const result = calculatePriceRecommendation({ name: 'Tomato', category: 'Vegetables', unit: 'kg', expectedPrice: 40, references: [] });
  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.suggestedRange, null);
  assert.match(result.explanation, /cannot currently be calculated/i);
});

test('price recommendation requires a matching unit and dated source', () => {
  const references = parseReferences(JSON.stringify([{ name: 'Tomato', category: 'Vegetables', unit: 'kg', location: 'Chennai', min: 20, max: 35, source: 'Test market record', date: '2026-10-18' }]));
  const match = calculatePriceRecommendation({ name: 'Tomato', category: 'Vegetables', unit: 'kg', location: 'Chennai', expectedPrice: 40, references });
  const mismatch = calculatePriceRecommendation({ name: 'Tomato', category: 'Vegetables', unit: 'piece', location: 'Chennai', expectedPrice: 40, references });
  assert.equal(match.status, 'available');
  assert.deepEqual(match.suggestedRange, { min: 20, max: 35 });
  assert.equal(match.source, 'Test market record');
  assert.equal(mismatch.status, 'insufficient_data');
});

const { normalizeProductName, unitsCompatible } = require('../utils/textMatching');
test('buyer matching normalizes common singular/plural product names', () => {
  assert.equal(normalizeProductName('Tomatoes'), normalizeProductName('Tomato'));
  assert.equal(normalizeProductName('Potatoes'), normalizeProductName('Potato'));
  assert.equal(normalizeProductName('Green Apples'), normalizeProductName('Green Apple'));
});
test('buyer matching accepts equivalent unit labels but not incompatible units', () => {
  assert.equal(unitsCompatible('gram', 'g'), true);
  assert.equal(unitsCompatible('kg', 'g'), false);
  assert.equal(unitsCompatible('litre', 'piece'), false);
});
