import test from 'node:test';
import assert from 'node:assert/strict';
import {shareLabel,chatShare} from '../public/limit-share.mjs';

test('potrošnja limita po odgovoru i četu', () => {
 assert.equal(shareLabel(3.4),'−3%');
 assert.equal(shareLabel(0.4),'−0,4%');
 assert.equal(shareLabel(0.05),'');
 assert.equal(shareLabel(undefined),'');
 assert.equal(chatShare({a:2.5,b:9.8}),'≈ 12% od 5h limita');
 assert.equal(chatShare({}),'');
});
