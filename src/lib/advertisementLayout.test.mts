import assert from 'node:assert/strict';
import test from 'node:test';

import { HORIZONTAL_AD_ASPECT, VERTICAL_AD_ASPECT, advertisementFrameRatio, advertisementWidths } from './advertisementLayout.ts';

test('keeps advertisement frames at stable newspaper ratios', () => {
  assert.equal(advertisementFrameRatio(2.4), HORIZONTAL_AD_ASPECT);
  assert.equal(advertisementFrameRatio(0.4), VERTICAL_AD_ASPECT);
});

test('sizes a single horizontal or vertical ad without cropping', () => {
  assert.deepEqual(advertisementWidths([16 / 9]), ['100%']);
  assert.deepEqual(advertisementWidths([9 / 16]), ['34%']);
});

test('places two ads with the same orientation side by side', () => {
  assert.deepEqual(advertisementWidths([16 / 9, 4 / 3]), ['49%', '49%']);
  assert.deepEqual(advertisementWidths([9 / 16, 3 / 4]), ['42%', '42%']);
});

test('wraps mixed-orientation pairs at natural readable widths in either order', () => {
  assert.deepEqual(advertisementWidths([16 / 9, 9 / 16]), ['100%', '44%']);
  assert.deepEqual(advertisementWidths([9 / 16, 16 / 9]), ['44%', '100%']);
});