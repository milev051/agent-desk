import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function worker({notifications=[],chat}={}) {
  const handlers={},shown=[];
  const self={clients:{matchAll:async()=>[],openWindow:async()=>{}},addEventListener:(type,handler)=>handlers[type]=handler,registration:{getNotifications:async()=>notifications,showNotification:async(title,options)=>shown.push({title,...options})}};
  vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self,fetch:async()=>({ok:true,json:async()=>chat})});
  return {shown,async click(notification){let work;handlers.notificationclick({notification,waitUntil:value=>work=value});await work;},async send(type,data){let work;handlers[type]({data:type==='push'?{json:()=>data}:data,waitUntil:value=>work=value});await work;}};
}
function notification(chatId,messageId,messageCreatedAt){return {data:{chatId,messageId,messageCreatedAt},closed:false,close(){this.closed=true;}};}

test('pročitano uklanja stare oznake samo tog četa i čuva noviji odgovor',async()=>{
  const notifications=[notification('a','old',10),notification('a','read',20),notification('a','new',30),notification('b','other',10),notification('a','')];
  const sw=worker({notifications});
  await sw.send('message',{type:'read',chatId:'a',messageId:'read',readBefore:20});
  assert.deepEqual(notifications.map(n=>n.closed),[true,true,false,false,true]);
  assert.equal(sw.shown.length,0);
});

test('otvoren telefon uklanja obaveštenje preko poruke iz aplikacije',async()=>{
  const n=notification('a','read',20),sw=worker({notifications:[n]});
  await sw.send('message',{type:'read',chatId:'a',messageId:'read',readBefore:20});
  assert.equal(n.closed,true);
});

test('obaveštenje nosi identitet odgovora za kasnije uklanjanje',async()=>{
  const sw=worker();
  await sw.send('push',{chatId:'a',messageId:'new',messageCreatedAt:30});
  assert.equal(sw.shown.length,1);
  assert.equal(sw.shown[0].data.messageId,'new');
  assert.equal(sw.shown[0].data.messageCreatedAt,30);
});

test('ulazak u čet uklanja sva njegova obaveštenja bez diranja drugih četova',async()=>{
  const notifications=[notification('a','old',10),notification('a','new',30),notification('a',''),notification('b','other',10)];const sw=worker({notifications});
  await sw.send('message',{type:'read',chatId:'a',all:true});assert.deepEqual(notifications.map(n=>n.closed),[true,true,true,false]);
});
test('sinhronizovan ulazak čuva kasnije obaveštenje i za odgovor započet ranije',async()=>{
  const old=notification('a','old',10),later=notification('a','later',10),other=notification('b','other',10);old.data.notificationCreatedAt=15;later.data.notificationCreatedAt=30;
  const sw=worker({notifications:[old,later,other]});await sw.send('message',{type:'read',chatId:'a',notificationsBefore:20});assert.deepEqual([old.closed,later.closed,other.closed],[true,false,false]);
});

test('klik na obaveštenje zatvara i ostala obaveštenja njegovog četa',async()=>{
  const notifications=[notification('a','first',10),notification('a','second',20),notification('b','other',10)];const sw=worker({notifications});
  await sw.click(notifications[0]);assert.deepEqual(notifications.map(n=>n.closed),[true,true,false]);
});

test('prisustvo računara uklanja obaveštenja svih četova do granice, a novija čuva',async()=>{
 const old=notification('a','old',10),other=notification('b','other',20),newer=notification('a','new',10);
 old.data.notificationCreatedAt=15;other.data.notificationCreatedAt=25;newer.data.notificationCreatedAt=35;
 const sw=worker({notifications:[old,other,newer]});
 await sw.send('message',{type:'desktop-read',notificationsBefore:30});
 assert.deepEqual([old.closed,other.closed,newer.closed],[true,true,false]);assert.equal(sw.shown.length,0);
});

function readSender(serviceWorker){
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function sendNotificationRead('),end=source.indexOf('function clearReadNotifications(',start);
 return vm.runInNewContext(source.slice(start,end)+';sendNotificationRead',{navigator:{serviceWorker}});
}

test('ulazak uklanja push i pre nego što service worker preuzme stranicu',async()=>{
 const sent=[];
 const send=readSender({getRegistration:async()=>({active:{postMessage:data=>sent.push(data)}})});
 await send({chatId:'a',all:true});
 assert.equal(sent.length,1);assert.equal(sent[0].chatId,'a');assert.equal(sent[0].all,true);
});

test('kontrolisan prozor šalje brisanje svom workeru i bez podrške nastavlja rad',async()=>{
 const sent=[];
 await readSender({controller:{postMessage:data=>sent.push(data)},getRegistration:()=>{throw Error('ne treba');}})({chatId:'b',all:true});
 assert.equal(sent.length,1);assert.equal(sent[0].chatId,'b');
 await readSender(undefined)({chatId:'a',all:true});
 await readSender({getRegistration:async()=>{throw Error('nedostupno');}})({chatId:'a',all:true});
});

test('ulazak u čet briše Mac obaveštenja i kad nema novog završenog odgovora',async()=>{
 const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=source.indexOf("if(req.method==='POST' && match[2]==='access'){");
 const end=source.indexOf("if(req.method==='PUT' && match[2]==='read'){",start);
 const chat={id:'a'},removed=[];
 const call=vm.runInNewContext('(async()=>{'+source.slice(start,end)+'})',{
  req:{method:'POST'},match:[null,'a','access'],chat,
  body:async()=>({requestId:'11111111-1111-4111-8111-111111111111'}),
  save(){},scheduleChatFiles(){},broadcast(){},clearDesktopNotification:id=>removed.push(id),json:(status,data)=>({status,data})
 });
 assert.equal((await call()).status,200);assert.equal((await call()).status,200);
 assert.deepEqual(removed,['a','a']);assert.equal(chat.accessLog.length,1);
});

test('završetak nema popup; zvuk se čuva van trenutno vidljivog četa',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('function showReplyNotice('),end=source.indexOf('function announceReplies(',start);
 let sounds=0;
 const document={hidden:false,hasFocus:()=>true,body:{classList:{contains:()=>true}}};
 const show=vm.runInNewContext(source.slice(start,end)+';showReplyNotice',{
  active:'a',document,chooseNoticeSound:()=> 'done',playNoticeSound:()=>sounds++
 });
 show({id:'a'});assert.equal(sounds,0);
 show({id:'b'});assert.equal(sounds,1);
 document.hidden=true;show({id:'a'});assert.equal(sounds,2);
 assert.equal(source.slice(start,end).includes('createElement'),false);
});

for(const phoneRemote of [false,true])test(`podagent nema plutajuću karticu, a aktivnost i rezultat ostaju u stanju četa (${phoneRemote?'telefon':'računar'})`,()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('function showReplyNotice('),end=source.indexOf("$('#completion-notices').onclick",start);
 const elements=new Map(),chats=[];let sounds=0;
 const find=selector=>elements.get(selector.match(/data-notice-chat="([^"]+)"/)?.[1]);
 const host={querySelector:find,prepend:el=>elements.set(el.dataset.noticeChat,el)};
 const document={hidden:false,hasFocus:()=>true,body:{classList:{contains:()=>true}},querySelector:find,
  createElement:()=>({dataset:{},setAttribute(){},remove(){elements.delete(this.dataset.noticeChat);}})};
 const announce=vm.runInNewContext(source.slice(start,end)+';announceReplies',{
  chats,phoneRemote,mobileNavigation:()=>phoneRemote,active:'open',document,CSS:{escape:value=>value},$:()=>host,
  noticeCard:chat=>({title:chat.title,body:chat.latestPreview?.text || '',agent:'codex'}),noticeFolderName:()=>'',
  agentLogos:{},folderAvatar:()=>({letter:'P'}),escape:value=>value,attachmentUrl:value=>value,
  syncNoticeLayer(){},chooseNoticeSound:()=> 'done',playNoticeSound(){sounds++;},
  completion:chat=>chat.latestReply && {token:chat.latestReply.id+':'+chat.latestReply.status}
 });
 for(const status of ['done','stopped','error','interrupted']){
  const child={id:'child',parentChatId:'parent',title:'Provera',running:true,latestPreview:{text:'Proveravam fajlove'}};
  // Kartica iz ranije verzije mora se ukloniti i dok podagent još radi.
  elements.set('child',{remove(){elements.delete('child');}});
  chats.splice(0,chats.length,child);announce([]);
  assert.equal(elements.size,0);assert.equal(child.running,true);assert.equal(child.latestPreview.text,'Proveravam fajlove');
  child.latestPreview.text='Pokrećem testove';announce([]);
  assert.equal(elements.size,0);assert.equal(child.latestPreview.text,'Pokrećem testove');
  child.running=false;child.latestReply={id:'reply',status};announce([{...child,running:true}]);
  assert.equal(elements.size,0);assert.equal(sounds,0);assert.equal(child.latestReply.status,status);
 }
 for(const legacy of [false,true]){
  const report={id:'dispatcher',dispatcher:true,running:false,latestReply:{id:'report',status:'done',...(!legacy?{notificationOrigin:'dispatcher-watch'}:{})},messages:legacy?[{role:'user',origin:'dispatcher-watch'}]:[]};
  chats.splice(0,chats.length,report);announce([{...report,running:true}]);
  assert.equal(elements.size,0,'automatski izveštaj Dispečera nema završni popup');assert.equal(sounds,0);
 }
 const chat={id:'regular',title:'Samostalan čet',running:false,latestReply:{id:'answer',status:'done'}};
 chats.splice(0,chats.length,chat);announce([{...chat,running:true}]);
 assert.equal(elements.size,0);assert.equal(sounds,1);
});

test('podagenti ne šalju završni push telefonu ni desktop popup, ostali četovi ih zadržavaju',()=>{
 const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=source.indexOf('    const outcome={done:'),end=source.indexOf('    // Greška podčeta',start);
 for(const status of ['done','error','stopped','interrupted'])for(const child of [false,true])for(const origin of ['user','dispatcher-watch']){
  const sent=[],opened=[],chat={id:'chat',...(child?{parentChatId:'parent'}:{})},reply={id:'reply',createdAt:123,status};
  vm.runInNewContext(source.slice(start,end),{
   chat,reply,watchReport:null,options:{origin},run:{},chats:[],folders:{list:()=>[]},
   replyNotification:()=>({title:'Rezultat',body:'Poruka',agent:'codex'}),
   desktopNotify:()=>sent.push('desktop'),phonePush:{notify:()=>sent.push('phone')},
   desktopPresence:{view:()=>({desktopActive:false})},warnPhoneOffline(){},openFinishedWork:()=>opened.push('work')
  });
  const notify=!child && status!=='interrupted' && origin!=='dispatcher-watch';
  assert.deepEqual(sent,notify?['desktop','phone']:[],`${child?'podagent':'samostalan'}: ${status}`);
  assert.equal(opened.length,!child && status!=='interrupted'?1:0);
 }
});

test('Mac obaveštenja istog četa brišu se i posle restarta servera',()=>{
 const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function clearDesktopNotification('),end=source.indexOf('function desktopNotify(',start);
 const calls=[];
 const clear=vm.runInNewContext(source.slice(start,end)+';clearDesktopNotification',{
  shownDesktopNotifications:new Map(),dataDir:'/data',path:{join:(...parts)=>parts.join('/')},
  fs:{existsSync:p=>p.includes('/codex.app/') || p.includes('/claude.app/')},
  desktopNotificationRemoveArgs:id=>['-remove','agent-desk-'+id],
  spawn:(executable,args)=>{calls.push({executable,args});return {on(){},unref(){}};}
 });
 clear('a');assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.args[1]==='agent-desk-a'));
});
