import test from 'node:test';
import assert from 'node:assert/strict';
import {needsGoogleContext,googleHint,clipForParent} from '../context-scope.mjs';

test('Google uputstvo ide samo uz poruke o Google servisima', () => {
  for(const text of ['Pročitaj mejl od Ane','Zakaži sastanak u utorak','Šta imam u kalendaru','Nađi fajl na Drive','Dodaj u Google Tasks'])assert.equal(needsGoogleContext(text),true,text);
  for(const text of ['Popravi CSS u headeru','Napravi zadatak za podagenta','Široko polje za unos','Pošalji mi fajl'])assert.equal(needsGoogleContext(text),false,text);
  assert.match(googleHint('/x/docs/google.md'),/\/x\/docs\/google\.md/);
});

test('dug izveštaj podagenta se skraćuje za glavni čet', () => {
  const messages=[{role:'user',text:'x'.repeat(3000)},{role:'assistant',text:'a'.repeat(3000)},{role:'assistant',text:'kratko'}];
  const out=clipForParent(messages,'dete',100);
  assert.equal(out[0].text.length,3000);
  assert.match(out[1].text,/^a{100}…\n\[Skraćeno: 3000 znakova\. Ceo tekst: GET \/api\/chats\/dete\]$/);
  assert.equal(out[2],messages[2]);
  assert.equal(messages[1].text.length,3000);
});
