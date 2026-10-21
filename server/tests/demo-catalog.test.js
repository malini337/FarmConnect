const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../utils/demoCatalog');

test('demo catalog contains 30 distinct products in requested category groups', () => {
  assert.equal(catalog.length, 30);
  assert.equal(new Set(catalog.map(row => row[0])).size, 30);
  assert.equal(catalog.filter(row => row[2] === 'Vegetables').length, 10);
  assert.equal(catalog.filter(row => row[2] === 'Fruits').length, 8);
  assert.equal(catalog.filter(row => ['Grains','Pulses','Spices'].includes(row[2])).length, 7);
  assert.equal(catalog.filter(row => row[2] === 'Other Agricultural Products').length, 5);
});

test('demo catalog quantities and illustrative prices are finite and positive', () => {
  for (const [slug, name, category, quantity, unit, price] of catalog) {
    assert.ok(slug && name.trim() && category.trim());
    assert.ok(Number.isFinite(quantity) && quantity > 0, `${name} quantity`);
    assert.ok(Number.isFinite(price) && price > 0, `${name} price`);
    assert.ok(['kg','piece','quintal'].includes(unit), `${name} unit`);
  }
});

test('each demo product has a matching local SVG image asset', () => {
  const publicDir = path.join(__dirname, '../../client/public/demo-products');
  for (const [slug] of catalog) {
    const file = path.join(publicDir, `${slug}.svg`);
    assert.ok(fs.existsSync(file), `missing image ${slug}.svg`);
    assert.match(fs.readFileSync(file, 'utf8'), /<svg[\s>]/);
  }
});

test('every demo product uses an existing local photo and bundled SVG fallback', () => {
  const clientDir = path.join(__dirname, '../../client/public');
  for (const [slug, name, category, quantity, unit, price, imageUrl] of catalog) {
    assert.match(imageUrl, /^\/products\//, `${name} local photo URL`);
    assert.ok(fs.existsSync(path.join(clientDir, imageUrl.replace(/^\//, ''))), `${name} local photo`);
    assert.ok(fs.existsSync(path.join(clientDir, 'demo-products', `${slug}.svg`)), `${name} local fallback`);
  }
});
