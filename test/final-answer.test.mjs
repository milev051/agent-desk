import test from 'node:test';
import assert from 'node:assert/strict';
import {answerText} from '../public/final-answer.mjs';
import {exportMessages,copiedMessage} from '../public/sidebar-groups.mjs';
const text = 'Proveriću vezu.\n\nJoš proveravam.\n\nUrađeno: provereno.\nDetalj.';
test('završen odgovor skriva najave i pri kopiranju', () => {
  const m = {role:'assistant',status:'done',text};
  assert.equal(answerText(m), 'Urađeno: provereno.\nDetalj.');
  assert.ok(!copiedMessage(m).includes('Proveriću'));
});
test('tok rada, greške, korisnički tekst i odgovori bez oznake ostaju celi', () => {
  for (const status of ['running','error','stopped','interrupted',undefined]) assert.equal(answerText({role:'assistant',status,text}),text);
  assert.equal(answerText({role:'user',status:'done',text}),text);
  assert.equal(answerText({role:'assistant',status:'done',text:'Prvi pasus.\n\nDrugi.'}),'Prvi pasus.\n\nDrugi.');
});
test('oznake u kodu se ne smatraju završnim odgovorom', () => {
  const source='Primer:\n````txt\n```\nUrađeno: primer\n````\n\n**Urađeno:** završeno.';
  assert.equal(answerText({role:'assistant',status:'done',text:source}),'**Urađeno:** završeno.');
});

test('posebno kopiranje uključuje tok rada, običan izvoz ga skriva i ne menja istoriju', () => {
  const m={id:'m',role:'assistant',status:'done',text};
  const chats=[{id:'c',title:'Čet',settings:{cwd:'/projekat'},messages:[m]}];
  assert.equal(answerText(m,{includeProgress:true}),text);
  assert.ok(copiedMessage(m,{includeProgress:true}).includes(text));
  assert.ok(exportMessages(chats,'c',['m'],{includeProgress:true}).includes(text));
  assert.ok(!exportMessages(chats,'c',['m'],{includeProgress:false}).includes('Proveriću'));
  assert.ok(exportMessages(chats,'c',['m']).includes(text)); // čuvanje zapisa je uvek potpuno
  assert.equal(m.text,text);
});
