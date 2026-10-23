import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopPresence,replyNotification,extractNotificationLine} from '../notification-presence.mjs';

test('računar utišava telefon samo dok postoji svež aktivan prozor, svaki tab se prati odvojeno',()=>{
 let clock=1000;const presence=createDesktopPresence({now:()=>clock,ttl:45});
 assert.equal(presence.view().desktopActive,false);
 presence.update({clientId:'a',active:true});clock=1010;presence.update({clientId:'b',active:true});
 presence.update({clientId:'a',active:false});assert.equal(presence.view().desktopActive,true);
 clock=1055;assert.deepEqual(presence.view(),{desktopActive:false,clearBefore:1010});
 clock=1060;presence.update({clientId:'a',active:true});assert.equal(presence.view().clearBefore,1060);
 presence.update({clientId:'a',active:false});assert.equal(presence.view().desktopActive,false);
 assert.throws(()=>presence.update({clientId:'a',active:'true'}),/Neispravno/);
});

test('obaveštenje podagenta ima naziv foldera i čitljiv izvod rezultata, bez najave rada',()=>{
 const parent={id:'parent',folderId:'f'},chat={id:'child',parentChatId:'parent',title:'Dostava'};
 const notification=replyNotification(chat,{status:'done',text:'Proveriću adresu.\n\n**Dodao sam adresu** u [porudžbinu](https://example.test).\n\nDetalji.'},[parent,chat],[{id:'f',name:'FON knjižara'}]);
 assert.deepEqual(notification,{title:'FON knjižara',body:'Dostava · Završeno: Dodao sam adresu u porudžbinu.'});
 assert.equal(replyNotification(chat,{status:'error',error:'Prijava je istekla.'},[],[]).body,'Dostava · Greška: Prijava je istekla.');
 assert.equal(replyNotification(chat,{status:'stopped'},[],[]).body,'Dostava · Zaustavljeno');
 assert.ok(replyNotification(chat,{status:'done',text:'a'.repeat(400)},[],[]).body.length<=240);
});

test('izdvajanje reda: Pitanje ima prednost nad Urađeno, ograničeno na oko 120 znakova',()=>{
 const oba='Urađeno: Sve je pripremljeno.\nProveri: Pokreni testove.\nPitanje: Da li želiš da nastavim sa radom?';
 assert.equal(extractNotificationLine(oba),'Pitanje: Da li želiš da nastavim sa radom?');

 const samoUradjeno='Urađeno: Ispravljeni su bagovi u modulu.\nProveri: Otvori ekran.';
 assert.equal(extractNotificationLine(samoUradjeno),'Urađeno: Ispravljeni su bagovi u modulu.');

 const boldFormat='**Urađeno:** Dodat je novi zvučni efekat.\n**Pitanje:** Kako ti zvuči?';
 assert.equal(extractNotificationLine(boldFormat),'Pitanje: Kako ti zvuči?');

 const lista='- Urađeno: Prvi korak je gotov.';
 assert.equal(extractNotificationLine(lista),'Urađeno: Prvi korak je gotov.');

 const predugacak='Urađeno: '+ 'x'.repeat(150);
 const izvucen=extractNotificationLine(predugacak);
 assert.ok(izvucen.length<=120);
 assert.ok(izvucen.endsWith('…'));

 assert.equal(extractNotificationLine('Neki običan tekst bez oznaka.'),'');
 assert.equal(extractNotificationLine(''),'');
 assert.equal(extractNotificationLine(null),'');
});

test('obaveštenje koristi red Pitanje ili Urađeno kao tekst u jednom redu',()=>{
 const chat={id:'c1',title:'Novi zadatak'};
 const withQuestion=replyNotification(chat,{status:'done',text:'Urađeno: Završeno.\nPitanje: Da li je sve u redu?'},[],[]);
 assert.equal(withQuestion.title,'Novi zadatak');
 assert.equal(withQuestion.body,'Pitanje: Da li je sve u redu?');

 const withDone=replyNotification(chat,{status:'done',text:'Urađeno: Izmenjeni su fajlovi.\nProveri: Pokreni testove.'},[],[]);
 assert.equal(withDone.body,'Urađeno: Izmenjeni su fajlovi.');
});
