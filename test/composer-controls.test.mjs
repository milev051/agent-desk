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
    linkedFiles:new Map([['a',['/fajl.pdf']]]),textRefs:new Map(),current:()=>({running}),needsCacheConfirm:()=>false,
    messageWithRefs:(id,draft)=>draft,clearCompose(){},renderLinkedFiles(){},renderTextRefs(){},resizePrompt(){},recordDraft(){},render(){},putChat(){},finishMessageInput(){},
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

test('citat i slika ulaze u poruku sa navodnicima i izvorom',()=>{
  const start=source.indexOf('function quoteBlock(');
  const end=source.indexOf('function segList(');
  const context=vm.createContext({});
  vm.runInContext(source.slice(start,end),context);
  assert.equal(context.quoteBlock('Pasus','grok, 1. 11.'),'„Pasus“\nIz poruke: grok, 1. 11.');
  assert.equal(context.fileBlock('/tmp/a.webp'),'„a.webp“\n/tmp/a.webp');
  const text=context.composeDraft([
    {type:'text',text:'O prvoj'},
    {type:'file',path:'/tmp/a.webp'},
    {type:'quote',text:'Drugi deo',label:'korisnik'},
    {type:'text',text:'  '},
    {type:'text',text:'O drugoj'}
  ],'nastavak');
  assert.equal(text,'O prvoj\n\n„a.webp“\n/tmp/a.webp\n\n„Drugi deo“\nIz poruke: korisnik\n\nO drugoj\n\nnastavak');
  const split=context.insertPiece([{type:'text',text:'ranije'}],'levo desno',4,5,{type:'quote',text:'C'});
  assert.equal(split.tail,'desno');
  assert.deepEqual(split.list.map(s=>s.type),['text','text','quote']);
  assert.equal(split.list[1].text,'levo');
  const mid=context.insertIntoText([{type:'text',text:'abXcd'}],0,2,3,{type:'file',path:'/a.webp'});
  assert.deepEqual(mid.map(s=>s.type==='text'?s.text:s.type),['ab','file','cd']);
  assert.equal(context.insertIntoText([{type:'quote',text:'C'}],0,0,0,{type:'file',path:'/a'}),null);
});

test('⌘E je prečica za citat, bez Shift i Alt',()=>{
  const start=source.indexOf('function citeShortcut(');
  const end=source.indexOf('function runComposerAction(');
  const context=vm.createContext({});
  vm.runInContext(source.slice(start,end),context);
  assert.equal(context.citeShortcut({metaKey:true,key:'e'}),true);
  assert.equal(context.citeShortcut({ctrlKey:true,key:'E'}),true);
  assert.equal(context.citeShortcut({metaKey:true,shiftKey:true,key:'e'}),false);
  assert.equal(context.citeShortcut({metaKey:true,altKey:true,key:'e'}),false);
  assert.equal(context.citeShortcut({metaKey:true,isComposing:true,key:'e'}),false);
  assert.equal(context.citeShortcut({key:'e'}),false);
  assert.match(source,/citeShortcut\(e\) && current\(\)/);
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

test('slika i citat su tekst u istom nacrtu: brisanje, undo i redo čuvaju raspored',async()=>{
 const {createDraftHistory}=await import('../public/draft-history.mjs');
 class Control extends EventTarget{value='Pre  posle';selectionStart=4;selectionEnd=4;focus(){}setSelectionRange(a,b=a){this.selectionStart=a;this.selectionEnd=b;}}
 class Input extends Event{constructor(type,options){super(type,options);this.inputType=options.inputType;this.data=options.data;}}
 const input=new Control();let previews=0;
 const context=vm.createContext({$:()=>input,InputEvent:Input,renderCompose(){previews++;}});
 vm.runInContext(source.slice(source.indexOf('function quoteBlock('),source.indexOf('function segList(')),context);
 vm.runInContext(source.slice(source.indexOf('function applyInsert('),source.indexOf('function messageWithRefs(')),context);
 const history=createDraftHistory(input,{chatId:()=>'a',changed(){previews++;}});history.refresh();
 const path='/Users/test/Agent Desk/data/prilozi/a/slika.webp';
 context.applyInsert({type:'file',path});
 const imageDraft=input.value;
 assert.equal(imageDraft,`Pre \n\n„slika.webp“\n${path}\n\n posle`);
 function key(props){const e=new Event('keydown',{cancelable:true});Object.assign(e,props);input.dispatchEvent(e);}
 key({key:'z',metaKey:true});assert.equal(input.value,'Pre  posle');
 key({key:'z',ctrlKey:true,shiftKey:true});assert.equal(input.value,imageDraft);
 input.dispatchEvent(new Input('beforeinput',{inputType:'deleteContentBackward'}));input.value='';input.setSelectionRange(0);input.dispatchEvent(new Input('input',{}));
 key({key:'z',ctrlKey:true});assert.equal(input.value,imageDraft);
 context.applyInsert({type:'quote',text:'Ceo citat',label:'korisnik'});
 assert.ok(input.value.includes('„Ceo citat“\nIz poruke: korisnik'));assert.ok(input.value.includes(path));
 key({key:'z',metaKey:true});assert.equal(input.value,imageDraft);assert.ok(previews>=4);
});
