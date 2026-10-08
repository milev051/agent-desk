import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textMatches} from '../public/chat-search.mjs';
test('pretraga ne razlikuje velika slova, nalazi ponavljanja i tretira znakove doslovno',()=>{
 assert.deepEqual(textMatches('Čet i ČET','čet'),[{start:0,end:3},{start:6,end:9}]);
 assert.deepEqual(textMatches('A [x] B [x]','[x]'),[{start:2,end:5},{start:8,end:11}]);
 assert.deepEqual(textMatches('Primer','  '),[]);
 assert.deepEqual(textMatches('Primer','drugo'),[]);
});
test('dijagonala gore-levo otvara pretragu i ne šalje ili zaustavlja poruku',()=>{
 const line=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function joystickDirection('));
 const direction=new Function(line+';return joystickDirection;')();
 assert.equal(direction(-35,-35),'menu');assert.equal(direction(0,-35),'send');assert.equal(direction(0,35),'stop');assert.equal(direction(-35,0),'menu');assert.equal(direction(35,0),null);assert.equal(direction(35,-35),null);assert.equal(direction(-10,-10),null);
});
