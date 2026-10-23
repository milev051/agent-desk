import test from 'node:test';
import assert from 'node:assert/strict';
import {quotaShares} from '../quota-share.mjs';

const event=(turns,drop=6)=>({from:0,to:100,windows:[{period:'fiveHour',drop}],turns});

test('dva paralelna agenta dele pad po ceni odgovora', () => {
 const shares=quotaShares([event([{messageId:'a',createdAt:0,completedAt:100},{messageId:'b',createdAt:0,completedAt:100}])],id=>({a:2,b:1})[id]);
 assert.equal(shares.get('a'),4);
 assert.equal(shares.get('b'),2);
});

test('odgovor koji je u intervalu radio samo delom dobija manji deo', () => {
 const shares=quotaShares([event([{messageId:'a',createdAt:0,completedAt:100},{messageId:'b',createdAt:50,completedAt:150}],3)],()=>1);
 assert.equal(shares.get('a'),2);
 assert.equal(shares.get('b'),1);
});

test('bez cene pad se deli na jednake delove, a zbir ostaje isti', () => {
 const shares=quotaShares([event([{messageId:'a',createdAt:0,completedAt:100},{messageId:'b',createdAt:0,completedAt:100}],5),event([{messageId:'a',createdAt:0,completedAt:100}],2)],()=>undefined);
 assert.equal(shares.get('a'),4.5);
 assert.equal(shares.get('b'),2.5);
});
