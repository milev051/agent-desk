import test from 'node:test';
import assert from 'node:assert/strict';
import {noticeTone,chooseNoticeSound} from '../public/notice-sound.mjs';

test('svaki zvuk obaveštenja ima ton, a isključen nema',()=>{
 assert.equal(noticeTone('none').length,0);
 assert.ok(noticeTone('Ping').length>=1);
 assert.deepEqual(noticeTone('nepoznat'),noticeTone('default'));
 assert.ok(noticeTone('Glass').every(([freq,dur])=>freq>0 && dur>0 && dur<1));
});

test('tri zvuka: gotovo (uzlazni ton), pitanje (dva tona), greška (nizak ton)',()=>{
 const done=noticeTone('gotovo');
 assert.ok(done.length>=2);
 assert.ok(done[1][0]>done[0][0],'gotovo je uzlazni ton');

 const question=noticeTone('pitanje');
 assert.equal(question.length,2,'pitanje ima dva tona');
 assert.ok(question.every(([f,d])=>f>0 && d>0));

 const error=noticeTone('greška');
 assert.ok(error.length>=1);
 assert.ok(error.every(([f])=>f<=250),'greška ima nizak ton');
});

test('izbor zvuka na osnovu odgovora i statusa',()=>{
 assert.equal(chooseNoticeSound({status:'done',text:'Urađeno: Završio zadatak.\nPitanje: Želiš li nastavak?'}),'question');
 assert.equal(chooseNoticeSound({status:'done',text:'**Pitanje:** Šta je sledeće?'}),'question');
 assert.equal(chooseNoticeSound({status:'error',text:'Nešto je puklo.'}),'error');
 assert.equal(chooseNoticeSound({status:'error'}),'error');
 assert.equal(chooseNoticeSound({status:'done',text:'Urađeno: Sve je podešeno.\nProveri: npm test'}),'done');
 assert.equal(chooseNoticeSound({status:'done',text:'Običan tekst bez oznaka'}),'done');
 assert.equal(chooseNoticeSound(null),'done');
});
