import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createThoughts,parseDay,dayLabel,thoughtsPrompt} from '../thoughts.mjs';

test('misli se čuvaju po danu sa vremenom upisa', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'misli-'));
  const thoughts=createThoughts(dir);
  thoughts.add('umor',new Date(2026,9,19,7,5));
  thoughts.add('ne znam šta sa X\ni sa Y',new Date(2026,9,19,13,40));
  const text=fs.readFileSync(path.join(dir,'2026-10-19.md'),'utf8');
  assert.match(text,/^# 19\.10\.2026\.\n\n07:05 umor\n13:40 ne znam šta sa X\n  i sa Y\n$/);
  assert.deepEqual(thoughts.list('2026-10-19'),[{time:'07:05',text:'umor'},{time:'13:40',text:'ne znam šta sa X\ni sa Y'}]);
  assert.deepEqual(thoughts.days(),['2026-10-19']);
  assert.equal((fs.statSync(path.join(dir,'2026-10-19.md')).mode & 0o777),0o600);
  assert.throws(()=>thoughts.add('   '));
  assert.throws(()=>thoughts.list('../x'));
});

test('večernja pitanja stižu jednom, posle 21 h i samo uz zapis', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'misli-'));
  const thoughts=createThoughts(dir);
  assert.equal(thoughts.due(new Date(2026,9,19,22,0)),null);
  thoughts.add('nešto',new Date(2026,9,19,9,0));
  assert.equal(thoughts.due(new Date(2026,9,19,20,59)),null);
  assert.deepEqual(thoughts.due(new Date(2026,9,19,21,0)),{date:'2026-10-19',weekly:false});
  thoughts.markAsked('2026-10-19');
  assert.equal(thoughts.due(new Date(2026,9,19,23,0)),null);
  thoughts.add('nedelja',new Date(2026,9,25,10,0));
  assert.equal(thoughts.due(new Date(2026,9,25,21,30)).weekly,true);
  assert.match(thoughtsPrompt({date:'2026-10-25',weekly:true,dir}),/Nedeljni pregled \(25\.10\.2026\.\)/);
});

test('parsiranje preskače naslov i prazne redove', () => {
  assert.deepEqual(parseDay('# 1.1.2026.\n\n08:00 a\n'),[{time:'08:00',text:'a'}]);
  assert.equal(dayLabel('2026-01-05'),'5.1.2026.');
});

test('dnevnik korišćenja nema tekst, a pregled sistema čeka dva dana', async () => {
  const {createThoughts}=await import('../thoughts.mjs');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'misli-'));
  const thoughts=createThoughts(dir);
  thoughts.log({type:'note',time:'08:00',length:12},new Date(2026,9,19,8,0));
  assert.equal(thoughts.improveDue(new Date(2026,9,19,22,0)),null);
  thoughts.log({type:'note',time:'09:00',length:5},new Date(2026,9,20,9,0));
  thoughts.log({type:'reply'},new Date(2026,9,20,21,10));
  assert.equal(thoughts.improveDue(new Date(2026,9,20,21,59)),null);
  assert.deepEqual(thoughts.improveDue(new Date(2026,9,20,22,0)),{date:'2026-10-20'});
  thoughts.markImproved('2026-10-20');
  assert.equal(thoughts.improveDue(new Date(2026,9,21,22,0)),null);
  assert.deepEqual(thoughts.improveDue(new Date(2026,9,22,22,0)),{date:'2026-10-22'});
  const report=fs.readFileSync(thoughts.reportFile,'utf8');
  assert.match(report,/\| 20\.10\.2026\. \| 1 \| 5 \| 09:00 \| ne \| 1 \| da \|/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir,'koriscenje.jsonl'),'utf8'),/"text"/);
});
