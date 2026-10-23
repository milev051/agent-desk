import test from 'node:test';
import assert from 'node:assert/strict';
import {compactCount,money} from '../public/number-format.mjs';

test('kratki brojevi nemaju tačku za hiljade', () => {
  assert.equal(compactCount(950),'950');
  assert.equal(compactCount(1200),'1,2k');
  assert.equal(compactCount(156383),'156k');
  assert.equal(compactCount(3215413),'3,2M');
  assert.equal(compactCount(25000000),'25M');
});

test('cena ima decimalni zarez i znak dolara iza', () => {
  assert.equal(money(1.8041),'1,80 $');
  assert.equal(money(2.1942),'2,19 $');
  assert.equal(money(0.0002),'<0,01 $');
  assert.equal(money(0),'0,00 $');
});
