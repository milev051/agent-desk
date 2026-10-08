import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopPresence,replyNotification} from '../notification-presence.mjs';

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
