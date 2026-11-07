import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isImageTask,needsImageSlot,busyImageJob,startWaitingImageJobs} from '../image-queue.mjs';

test('prepoznaje zadatak generisanja slika, a ne svaki pomen slike',()=>{
  assert.equal(isImageTask({kind:'media'}),true);
  assert.equal(isImageTask({task:'Generiši tri varijante police na fotografiji sobe'}),true);
  assert.equal(isImageTask({task:'Postavi postojeće slike na sajt'}),false);
  assert.equal(isImageTask({task:'Ispravi CSS na početnoj'}),false);
});

test('red važi samo za GPT (codex)',()=>{
  assert.equal(needsImageSlot('codex',{kind:'media'}),true);
  for(const agent of ['grok','antigravity','claude'])assert.equal(needsImageSlot(agent,{kind:'media'}),false);
});

test('drugi GPT generator iz drugog četa čeka i kreće tek kad prvi završi',()=>{
  const running=new Set(['a']);
  const a={id:'a',parentChatId:'p1',imageJob:true,settings:{agent:'codex'}};
  const b={id:'b',parentChatId:'p2',imageJob:true,imageWaiting:{at:2,prompt:'B'},settings:{agent:'codex'}};
  const c={id:'c',parentChatId:'p1',imageJob:true,imageWaiting:{at:1,prompt:'C'},settings:{agent:'codex'}};
  const chats=[a,b,c],started=[];
  const start=(chat,prompt)=>{running.add(chat.id);started.push(prompt);};
  assert.equal(busyImageJob(chats,'codex',id=>running.has(id)),a);
  assert.deepEqual(startWaitingImageJobs({chats,isRunning:id=>running.has(id),start}),[]);
  running.delete('a');
  assert.deepEqual(startWaitingImageJobs({chats,isRunning:id=>running.has(id),start}),['c']);
  assert.deepEqual(started,['C']);assert.equal(c.imageWaiting,undefined);
  assert.deepEqual(startWaitingImageJobs({chats,isRunning:id=>running.has(id),start}),[]);
  running.delete('c');
  assert.deepEqual(startWaitingImageJobs({chats,isRunning:id=>running.has(id),start}),['b']);
});
