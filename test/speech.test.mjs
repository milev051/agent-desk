import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spokenText,speechSlice,speechChunk,createSpeech,repairWav,joinWavs,speechLabel} from '../speech.mjs';

function brokenWav(samples){
  const data=Buffer.alloc(samples.length*2);
  samples.forEach((sample,index)=>data.writeInt16LE(sample,index*2));
  const out=Buffer.alloc(44+data.length);
  out.write('RIFF',0);out.writeUInt32LE(0xFFFFFFFF,4);out.write('WAVE',8);
  out.write('fmt ',12);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
  out.writeUInt32LE(24000,24);out.writeUInt32LE(48000,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
  out.write('data',36);out.writeUInt32LE(0xFFFFFFFF,40);data.copy(out,44);
  return out;
}

test('čitanje izostavlja kod, putanje i oznake, a seče na rečenici',()=>{
  const text=spokenText('Vidi ovo.\n\n```js\nconst tajna="x"\n```\n\nLink [primer](https://example.com) i <cough> oznaka.\n\nPovezane putanje na računaru (pročitaj po potrebi):\n- "/tmp/tajna.txt"');
  assert.equal(text,'Vidi ovo. Link primer i oznaka.');
  const long='Aaa. '.repeat(300);
  const first=speechSlice(long,0);
  assert.ok(first.text.endsWith('.'));
  assert.ok(first.text.length<=speechChunk+2);
  assert.ok(first.next>0);
  const rest=speechSlice(long,first.next);
  assert.ok(rest.text.length>0);
  assert.equal(speechSlice('Kratko.',0).next,0);
});

test('čitanje traži zvuk od OpenAI modela i ne šalje ključ nazad',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-speech-'));
  const keyFile=path.join(dir,'openai-tts-key');
  fs.writeFileSync(keyFile,'test-only-key');
  const wav=brokenWav([1,2,3,4]);
  let seen;
  const speech=createSpeech({keyFile,fetchFn:async(url,opts)=>{seen={url,auth:opts.headers.Authorization,body:JSON.parse(opts.body)};return {ok:true,arrayBuffer:async()=>Uint8Array.from(wav).buffer};}});
  const audio=await speech.speak('Proba čitanja.');
  assert.equal(audio.toString('ascii',0,4),'RIFF');
  assert.equal(audio.readUInt32LE(4),36+8);
  assert.equal(audio.readUInt32LE(40),8);
  assert.equal(seen.url,'https://api.openai.com/v1/audio/speech');
  assert.equal(seen.auth,'Bearer test-only-key');
  assert.equal(seen.body.model,'gpt-4o-mini-tts');
  assert.equal(seen.body.input,'Proba čitanja.');
  assert.equal(seen.body.response_format,'wav');
  assert.equal(JSON.stringify(speech.configured()),'true');
  fs.rmSync(dir,{recursive:true,force:true});
});

test('pokvareno WAV zaglavlje se spaja u jedan snimak sa imenom četa',()=>{
  const one=repairWav(brokenWav([1,2]));
  const two=repairWav(brokenWav([3,4,5]));
  const joined=joinWavs([brokenWav([1,2]),brokenWav([3,4,5])]);
  assert.equal(one.readUInt32LE(4),0xFFFFFFFF>0 && one.readUInt32LE(4));
  assert.notEqual(one.readUInt32LE(4),0xFFFFFFFF);
  assert.equal(joined.readUInt32LE(40),one.readUInt32LE(40)+two.readUInt32LE(40));
  assert.equal(speechLabel('Agent Desk','2026-10-05T12:42:03.581Z','gpt-4o-mini-tts'),'Agent Desk 2026-10-05T12-42-03Z gpt-4o-mini-tts');
});
