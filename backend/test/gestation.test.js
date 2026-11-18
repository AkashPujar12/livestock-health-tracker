const test = require('node:test');
const assert = require('node:assert');
const { expectedDate } = require('../src/gestation');

test('cow mated 2026-11-01 is due 2027-08-11 (283 days)', () => {
  assert.strictEqual(expectedDate('cow', '2026-11-01').toISOString().slice(0, 10), '2027-08-11');
});
test('goat is 150 days', () => {
  assert.strictEqual(expectedDate('goat', '2026-01-01').toISOString().slice(0, 10), '2026-05-31');
});
test('rejects unknown species', () => {
  assert.throws(() => expectedDate('dog', '2026-01-01'));
});
