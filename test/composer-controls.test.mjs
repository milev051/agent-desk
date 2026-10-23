import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function setup({running=true,failAt='',switchChat=false}={}){
  const nodes=new Map();
  const $=key=>{if(!nodes.has(key))nodes.set(key,{value:'Nova poruka',disabled:false,setAttribute(){}});return nodes.get(key);};
  const calls=[];
  const context=vm.createContext({$,active:'a',submitting:false,uploading:false,connected:true,
    linkedFiles:new Map([['a',['/fajl.pdf']]]),current:()=>({running}),needsCacheConfirm:()=>false,
    renderLinkedFiles(){},resizePrompt(){},recordDraft(){},render(){},putChat(){},finishMessageInput(){},
    api:async(path,method,body)=>{calls.push({path,method,body});if(path.endsWith(failAt) && failAt)throw Error('Bez veze');if(switchChat)context.active='b';return {running};}
  });
  vm.runInContext(source.slice(source.indexOf('function renderComposerControls()'),source.indexOf('function renderQueue()')),context);
  vm.runInContext(source.slice(source.indexOf('async function enqueueMessage('),source.indexOf("$('#queue').onclick=")),context);
  return {context,calls,$};
}

test('kontrole menjaju naziv slanja i blokiraju slanje tokom otpremanja',()=>{
  const {context,$}=setup();context.renderComposerControls();
  assert.equal($('#send').textContent,'Dodaj u red');assert.equal($('#send-now').hidden,false);
  context.uploading=true;context.renderComposerControls();assert.equal($('#send').disabled,true);assert.equal($('#send-now').disabled,true);
  const idle=setup({running:false});idle.context.renderComposerControls();
  assert.equal(idle.$('#send').textContent,'Pošalji');assert.equal(idle.$('#send-now').hidden,true);
});
test('dodavanje u red čuva priloge i ne prekida odgovor',async()=>{
  const {context,calls,$}=setup();await context.enqueueMessage();
  assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/chats/a/queue');
  assert.equal(calls[0].body.text,'Nova poruka');assert.deepEqual(calls[0].body.files,['/fajl.pdf']);
  assert.equal($('#prompt').value,'');assert.equal(context.submitting,false);
});
test('prekid šalje nacrt u red pre prekida i ostaje u izvornom četu',async()=>{
  const {context,calls}=setup({switchChat:true});await context.enqueueMessage({interrupt:true});
  assert.deepEqual(calls.map(c=>c.path),['/api/chats/a/queue','/api/chats/a/queue/now']);
});
test('neuspešan upis čuva nacrt i priloge bez prekida agenta',async()=>{
  const {context,calls,$}=setup({failAt:'/queue'});
  await assert.rejects(context.enqueueMessage({interrupt:true}),/Bez veze/);
  assert.equal(calls.length,1);assert.equal($('#prompt').value,'Nova poruka');
  assert.equal(context.linkedFiles.has('a'),true);assert.equal(context.submitting,false);
});
test('neuspešan prekid ostavlja već sačuvanu poruku u redu bez duplog nacrta',async()=>{
  const {context,$}=setup({failAt:'/now'});
  await assert.rejects(context.enqueueMessage({interrupt:true}),/Poruka je sačuvana u redu/);
  assert.equal($('#prompt').value,'');assert.equal(context.submitting,false);
});

test('osvežavanje konteksta svaki put traži potvrdu i pre nje ne poziva API',()=>{
 let shown=0,requests=0,chat={id:'a',title:'Projekat',settings:{agent:'codex'},sessions:{codex:'session'}};
 const nodes=new Map();const $=key=>{if(!nodes.has(key))nodes.set(key,{showModal(){shown++;}});return nodes.get(key);};
 const context=vm.createContext({$,current:()=>chat,connected:true,pendingFolderDelete:null,deleteTarget:null,pendingReset:null,api(){requests++;}});
 vm.runInContext(source.slice(source.indexOf('function confirmContextReset()'),source.indexOf("$('#context-reset').onclick=")),context);
 context.confirmContextReset();assert.equal(shown,1);assert.equal(requests,0);assert.equal(context.pendingReset,'a');
 context.pendingReset=null;context.confirmContextReset();assert.equal(shown,2);assert.equal(requests,0);
 chat={...chat,running:true};context.confirmContextReset();assert.equal(shown,2);
});
