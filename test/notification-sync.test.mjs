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
