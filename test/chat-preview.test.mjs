import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLine,unreadMark,folderAvatar,noticeCard} from '../public/chat-preview.mjs';
test('pregled uzima poslednju poruku bez markdowna i priloga',()=>{
 const chat={messages:[{role:'user',text:'pitanje'},{role:'assistant',text:'**Gotovo** je, vidi `kod`.\n\nPovezane putanje na računaru (pročitaj po potrebi):\n- "/x"'}]};
 assert.equal(previewLine(chat).text,'Gotovo je, vidi kod.');
 assert.equal(previewLine({messages:[{role:'user',text:'Zdravo svete'}]}).text,'Ti: Zdravo svete');
});
test('pregled skraćuje i javlja da agent piše',()=>{
 assert.equal(previewLine({messages:[{role:'assistant',text:'a'.repeat(200)}]},{max:10}).text,'aaaaaaaaaa…');
 assert.deepEqual(previewLine({running:true,messages:[]}),{text:'Piše...',working:true});
 assert.equal(previewLine({messages:[]}).text,'');
});
test('prazna greška je Blokiran, a odgovor ili prekid mreže nisu',()=>{
 const reply={role:'assistant',status:'error',text:''};
 assert.deepEqual(previewLine({messages:[reply]}),{text:'Blokiran',working:false,blocked:true});
 assert.deepEqual(previewLine({messages:[],latestReply:reply}),{text:'Blokiran',working:false,blocked:true});
 assert.deepEqual(previewLine({running:true,latestReply:reply}),{text:'Piše...',working:true});
 assert.equal(previewLine({messages:[reply,{role:'assistant',status:'done',text:'Gotovo'}]}).text,'Gotovo');
 assert.equal(previewLine({messages:[{role:'assistant',status:'stopped',text:'Zaustavljeno'}]}).text,'Zaustavljeno');
 const answered={role:'assistant',status:'error',text:'Nastavio sam. Sve je spremno.',error:'TLS handshake timeout'};
 assert.equal(previewLine({messages:[answered]}).text,'Nastavio sam. Sve je spremno.');
 assert.equal(previewLine({messages:[answered]}).blocked,undefined);
 const limit={role:'assistant',status:'error',text:'',error:"You've hit your usage limit"};
 assert.equal(previewLine({messages:[limit]}).text,'Blokiran');
 const timeout={role:'assistant',status:'error',text:'',error:'net/http: TLS handshake timeout'};
 assert.deepEqual(previewLine({messages:[timeout]}),{text:'Greška',working:false});
 const stale={summary:true,latestReply:{role:'assistant',status:'error',error:'TLS handshake timeout'},latestPreview:{text:'Blokiran'}};
 assert.equal(previewLine(stale).text,'Greška');
 const fresh={summary:true,latestReply:{role:'assistant',status:'error',error:'TLS handshake timeout'},latestPreview:{text:'Nastavio sam. Sve je spremno.'},messages:[]};
 assert.equal(previewLine(fresh).text,'Nastavio sam. Sve je spremno.');
 const opened={summary:true,latestReply:{role:'assistant',status:'error',error:'TLS handshake timeout'},latestPreview:{text:'Blokiran'},messages:[answered]};
 assert.equal(previewLine(opened).text,'Nastavio sam. Sve je spremno.');
});

test('pregled sa servera ima prednost nad starim porukama u kešu',()=>{
 const chat={summary:true,latestPreview:{text:'Ti: Sveže pitanje',time:Date.UTC(2026,9,8,10,5)},messages:[{role:'assistant',text:'Staro',createdAt:Date.UTC(2026,9,6)}]};
 assert.equal(previewLine(chat).text,'Ti: Sveže pitanje');
 assert.equal(previewLine({...chat,latestPreview:{text:'',time:null}}).text,'');
});

test('oznaka nove poruke postoji samo za nepročitan završetak ili prekid',()=>{
 assert.deepEqual(unreadMark('completed'),{kind:'completed',label:'Nova poruka'});
 assert.equal(unreadMark('unread').label,'Nepročitano');
 assert.equal(unreadMark(''),null);
 assert.equal(unreadMark('working'),null);
});

test('obaveštenje čuva naziv, agenta, sliku i avatar',()=>{
 const card=noticeCard({title:'Dizajn',settings:{agent:'claude'},messages:[{role:'assistant',status:'done',text:'**Gotovo** je.'}]},{folderName:'Rad'});
 assert.equal(card.title,'Rad');
 assert.equal(card.body,'Dizajn: Gotovo je.');
 assert.equal(card.agent,'claude');
 assert.equal(noticeCard({title:'Sam',settings:{agent:'grok'},summary:true,latestPreview:{text:'Odgovor spreman'},latestReply:{status:'done'}}).body,'Odgovor spreman');
 const photo='/Users/a/data/prilozi/c1/slika.png';
 assert.deepEqual(noticeCard({title:'Sam',settings:{agent:'grok'},messages:[{role:'assistant',status:'done',text:`Evo\n${photo}`}]}),{title:'Sam',body:'Evo',agent:'grok',image:photo});
 const avatar=folderAvatar('šuma');
 assert.equal(avatar.letter,'Š');
 assert.equal(avatar.hue,folderAvatar('šuma').hue);
 assert.ok(avatar.hue>=0 && avatar.hue<6);
});
