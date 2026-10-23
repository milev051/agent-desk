import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const fn=name=>app.split('\n').find(line=>line.startsWith(`function ${name}(`));
test('podagenti se vide samo dok je izabran roditelj ili njegov podčet',()=>{
 const chats=[{id:'a'},{id:'b',parentChatId:'a'},{id:'c'},{id:'old',continuedTo:'a'}];
 const context=vm.createContext({chats,active:null});
 vm.runInContext(fn('showChildren'),context);
 assert.equal(context.showChildren('a'),false);
 context.active='a';assert.equal(context.showChildren('a'),true);
 context.active='b';assert.equal(context.showChildren('a'),true);
 context.active='old';assert.equal(context.showChildren('a'),true);
 context.active='c';assert.equal(context.showChildren('a'),false);
 // Aktivnost ne sme sama da otvara podčetove.
 const watch=app.slice(app.indexOf('function watchReplies()'),app.indexOf('function scrollSidebarChat('));
 assert.equal(watch.includes('expandedParents.set'),false);
});
test('bočni i dijagonalni gestovi ne izvršavaju komandu; gore i dole ostaju aktivni',()=>{
 const context=vm.createContext({});vm.runInContext(fn('joystickDirection')+'\n'+fn('joystickAction'),context);
 const action=(x,y)=>context.joystickAction({clientX:x,clientY:y},{x:0,y:0}).action;
 assert.equal(action(-40,0),null);assert.equal(action(-35,-35),null);assert.equal(action(40,0),null);
 assert.equal(action(0,-40),'send');assert.equal(action(0,40),'stop');
});

test('napuštanje briše samo nov nekorišćen čet, a čuva poruke, nacrte i priloge',async()=>{
 const source=app.slice(app.indexOf('async function discardEmptyChat('),app.indexOf('function choose('));
 for(const kind of ['empty','draft','input','file','message','running','pending','parent','old','offline']){
  const chat={id:'new',discardOnLeave:true,messages:[],settings:{}};const requests=[];
  const context={chats:[chat],drafts:new Map(),draftDirty:new Map(),draftServer:new Map(),pendingMessages:new Map(),linkedFiles:new Map(),uploading:false,submitting:false,active:'other',
   $:()=>({value:kind==='input'?'tekst':''}),persistDrafts(){},render(){},
   fetch:async url=>{requests.push(url);if(kind==='offline')throw Error('offline');return {ok:true,json:async()=>({deleted:true})};}};
  if(kind==='draft')context.drafts.set('new','nacrt');
  if(kind==='input')context.active='new';
  if(kind==='file')context.linkedFiles.set('new',['/slika.png']);
  if(kind==='message')chat.messageCount=1;
  if(kind==='running')chat.running=true;
  if(kind==='pending')context.pendingMessages.set('new',{});
  if(kind==='parent')context.chats.push({id:'child',parentChatId:'new'});
  if(kind==='old')delete chat.discardOnLeave;
  vm.runInNewContext(source,context);await context.discardEmptyChat('new');
  assert.equal(requests.length,['empty','offline'].includes(kind)?1:0,kind);
  assert.equal(context.chats.some(c=>c.id==='new'),kind!=='empty',kind);
 }
});
