import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composeMail,createGoogleWrite,signatureText} from '../google-write.mjs';
import {createGoogleServices} from '../google-services.mjs';
function fixture(){const calls=[];const auth={status:()=>({email:'owner@example.test'}),serviceWrite:async(...args)=>{calls.push(args);return {id:'fa4e',...args[2]};},gmailRequest:async()=>({drafts:[]})};const services={file:async()=>({mimeType:'text/plain'}),event:async()=>({etag:'"v1"'})};return {writer:createGoogleWrite(auth,services),calls,services};}
test('Gmail MIME čuva UTF-8, primaoce, odgovor i priloge i odbija ubacivanje zaglavlja',()=>{
  const message=composeMail({to:['test@example.test'],cc:['cc@example.test'],subject:'Čćšđž provera',text:'Zdravo čćšđž',attachments:[{filename:'izveštaj.txt',mimeType:'text/plain',contentBase64:Buffer.from('Prilog').toString('base64')}],threadId:'thread1',inReplyTo:'<original@example.test>'},'owner@example.test');
  const mime=Buffer.from(message.raw,'base64url').toString();assert.match(mime,/From: owner@example.test/);assert.match(mime,/Cc: cc@example.test/);assert.match(mime,/In-Reply-To: <original@example.test>/);assert.match(mime,/filename\*=UTF-8''izve%C5%A1taj.txt/);assert.ok(mime.includes(Buffer.from('Zdravo čćšđž').toString('base64')));assert.equal(message.threadId,'thread1');
  assert.throws(()=>composeMail({to:'test@example.test\r\nBcc: evil@example.test',subject:'X',text:'Y'},'owner@example.test'),/adrese/);
  assert.throws(()=>composeMail({to:'test@example.test',subject:'X\nBcc: evil',text:'Y'},'owner@example.test'),/novi red/);
  assert.throws(()=>composeMail({to:'test@example.test',subject:'X',text:'Y',attachments:[{filename:'X',contentBase64:'!bad'}]},'owner@example.test'),/base64/);
});
test('Gmail slanje zahteva odobrenje, nacrt ne šalje, a izmena koristi ograničene oznake',async()=>{
  const f=fixture(),message={to:'test@example.test',subject:'Test',text:'Tekst'};await assert.rejects(f.writer.sendMail(message),/confirmed/);assert.equal(f.calls.length,0);
  await f.writer.saveDraft(message);assert.equal(f.calls.at(-1)[1],'/drafts');assert.ok(f.calls.at(-1)[2].message.raw);
  await f.writer.sendMail({...message,confirmed:true});assert.equal(f.calls.at(-1)[1],'/messages/send');
  await f.writer.sendDraft('draft1',{confirmed:true});assert.deepEqual(f.calls.at(-1)[2],{id:'draft1'});
  await f.writer.modifyMail('abc123',{removeLabelIds:['UNREAD','INBOX']});assert.equal(f.calls.at(-1)[1],'/messages/abc123/modify');
  await f.writer.importMail({raw:Buffer.from('Subject: X\r\n\r\nY').toString('base64url'),labelIds:['Label_1']});const upload=f.calls.at(-2);assert.equal(upload[1],'/messages/import');assert.equal(upload[3].params.internalDateSource,'dateHeader');assert.equal(upload[3].contentType,'message/rfc822');assert.equal(upload[3].raw.toString(),'Subject: X\r\n\r\nY');assert.deepEqual(f.calls.at(-1)[2],{addLabelIds:['Label_1']});
  await assert.rejects(f.writer.importMail({raw:'ne valja!'}),/base64url/);await assert.rejects(f.writer.importMail({raw:'QQ',labelIds:['SENT']}),/SENT/);await assert.rejects(f.writer.importMail({raw:'QQ',to:'x'}));
  await assert.rejects(f.writer.modifyMail('abc123',{raw:'forbidden'}));await f.writer.trashMail('abc123');assert.equal(f.calls.at(-1)[1],'/messages/abc123/trash');
});
test('Tasks kreira i menja zadatak sa datumom, završava, pomera i potvrđuje brisanje',async()=>{
  const f=fixture();await f.writer.saveList({title:'Test'});assert.equal(f.calls.at(-1)[1],'/users/@me/lists');
  await f.writer.saveTask('list1',{title:'Danas pogledati mejl',due:'2026-10-07'});assert.deepEqual(f.calls.at(-1)[2],{title:'Danas pogledati mejl',due:'2026-10-07T00:00:00.000Z'});
  await f.writer.saveTask('list1',{status:'completed'},'task1');assert.equal(f.calls.at(-1)[3].method,'PATCH');await f.writer.moveTask('list1','task1',{previous:'task2'});assert.equal(f.calls.at(-1)[3].params.previous,'task2');
  await assert.rejects(f.writer.saveTask('list1',{title:'Test',due:'2026-02-30'}),/due/);await assert.rejects(f.writer.saveTask('list1',{status:'invalid'},'task1'),/status/);await assert.rejects(f.writer.deleteTask('list1','task1',{}),/confirmed/);await f.writer.deleteTask('list1','task1',{confirmed:true});assert.equal(f.calls.at(-1)[3].method,'DELETE');
});
test('Drive otprema bytes na multipart, pomera i vraća iz smeća bez lokalnog čitanja',async()=>{
  const f=fixture();await f.writer.saveFile({name:'Test',mimeType:'text/plain',text:'Čćšđž'});const call=f.calls.at(-1);assert.equal(call[0],'drive');assert.equal(call[3].params.uploadType,'multipart');assert.ok(call[3].raw.toString().includes('Čćšđž'));
  await f.writer.saveFile({name:'Folder',mimeType:'application/vnd.google-apps.folder',parents:['parent1']});assert.equal(f.calls.at(-1)[3].raw,undefined);
  await f.writer.saveFile({trashed:false,addParents:['new'],removeParents:['old']},'file1');assert.deepEqual(f.calls.at(-1)[2],{trashed:false});assert.equal(f.calls.at(-1)[3].params.addParents,'new');
  await assert.rejects(f.writer.saveFile({name:'X',path:'/private/secret'}),/polja/);await assert.rejects(f.writer.saveFile({name:'X',mimeType:'text/plain\r\nBad: header',text:'Y'}),/MIME/);
  f.services.file=async()=>({mimeType:'application/vnd.google-apps.document'});await assert.rejects(f.writer.saveFile({text:'Y'},'file1'),/posebnim API/);
});
test('Calendar pozivnice zahtevaju eksplicitnu odluku, brisanje čuva verziju',async()=>{
  const calls=[];const s=createGoogleServices({serviceRequest:async()=>({etag:'"v1"',attendees:[{email:'test@example.test'}]}),calendarWrite:async(...args)=>{calls.push(args);return {};}});
  await assert.rejects(s.updateEvent('primary','event1',{notifyAttendees:true}),/Nema izmena/);await assert.rejects(s.updateEvent('primary','event1',{summary:'Test'}),/učesnicima/);await s.updateEvent('primary','event1',{summary:'Test',notifyAttendees:true});assert.equal(calls.at(-1)[2].notifyAttendees,true);assert.equal(calls.at(-1)[1].notifyAttendees,undefined);
  const f=fixture();await f.writer.deleteEvent('primary','event1',{confirmed:true});assert.equal(f.calls.at(-1)[3].etag,'"v1"');assert.equal(f.calls.at(-1)[3].method,'DELETE');
});

test('mejl koristi ime i potvrđene adrese iz Gmail podešavanja „Šalji poštu kao“', async()=>{
  const calls=[],sendAs=[{sendAsEmail:'owner@example.test',displayName:'Marko Milev',isPrimary:true},{sendAsEmail:'posao@example.test',displayName:'Marko Milev',verificationStatus:'accepted'},{sendAsEmail:'nepotvrdjena@example.test',verificationStatus:'pending'}];
  const auth={status:()=>({email:'owner@example.test'}),serviceWrite:async(...args)=>{calls.push(args);return {id:'x'};},gmailRequest:async route=>route==='/settings/sendAs'?{sendAs}:{}};
  const writer=createGoogleWrite(auth,{}),raw=()=>Buffer.from((calls.at(-1)[2].message || calls.at(-1)[2]).raw,'base64url').toString();
  const from=()=>raw().match(/^From: (.*)$/m)[1],name='=?UTF-8?B?'+Buffer.from('Marko Milev').toString('base64')+'?=';
  await writer.sendMail({to:'a@example.test',subject:'S',text:'T',confirmed:true});assert.equal(from(),name+' <owner@example.test>');
  await writer.saveDraft({from:'posao@example.test',to:'a@example.test',subject:'S',text:'T'});assert.equal(from(),name+' <posao@example.test>');
  await assert.rejects(writer.sendMail({from:'nepotvrdjena@example.test',to:'a@example.test',subject:'S',text:'T',confirmed:true}),/Šalji poštu kao/);
  auth.gmailRequest=async()=>{throw Error('mreža');};await writer.sendMail({to:'a@example.test',subject:'S',text:'T',confirmed:true});assert.equal(from(),'owner@example.test');
});

test('Gmail potpis adrese dodaje se sam, jednom, i može se izostaviti', async()=>{
  const calls=[],sendAs=[{sendAsEmail:'owner@example.test',isPrimary:true},{sendAsEmail:'studio@example.test',displayName:'Marko',verificationStatus:'accepted',signature:'<div>Marko Milev<br>ROOM211 &amp; studio</div><img src="https://x.test/logo.png">'}];
  const auth={status:()=>({email:'owner@example.test'}),serviceWrite:async(...args)=>{calls.push(args);return {id:'x'};},gmailRequest:async()=>({sendAs})};
  const writer=createGoogleWrite(auth,{}),raw=()=>Buffer.from(calls.at(-1)[2].raw,'base64url').toString();
  const parts=()=>[...raw().matchAll(/\r\n\r\n([A-Za-z0-9+/=\r\n]+)\r\n--/g)].map(m=>Buffer.from(m[1].replace(/\s/g,''),'base64').toString());
  assert.equal(signatureText(sendAs[1].signature),'Marko Milev\nROOM211 & studio');
  await writer.sendMail({from:'studio@example.test',to:'a@example.test',subject:'S',text:'Zdravo <svete>',confirmed:true});
  assert.match(raw(),/multipart\/alternative/);const [plain,html]=parts();assert.equal(plain,'Zdravo <svete>\n\nMarko Milev\nROOM211 & studio');assert.match(html,/Zdravo &lt;svete&gt;<\/div><br><div class="gmail_signature"><div>Marko Milev/);assert.match(html,/logo\.png/);
  await writer.sendMail({from:'studio@example.test',to:'a@example.test',subject:'S',text:'Ok\n\nMarko Milev\nROOM211 & studio',confirmed:true});assert.doesNotMatch(raw(),/alternative/);
  await writer.sendMail({from:'studio@example.test',signature:false,to:'a@example.test',subject:'S',text:'Ok',confirmed:true});assert.doesNotMatch(raw(),/alternative/);
  await writer.sendMail({to:'a@example.test',subject:'S',text:'Ok',confirmed:true});assert.doesNotMatch(raw(),/alternative/);
  await assert.rejects(writer.sendMail({signature:'da',to:'a@example.test',subject:'S',text:'Ok',confirmed:true}),/signature/);
});

test('spisak adresa za slanje prikazuje ime i tekst potpisa', async()=>{
  const writer=createGoogleWrite({status:()=>({email:'o@example.test'}),gmailRequest:async()=>({sendAs:[{sendAsEmail:'o@example.test',displayName:'M',isPrimary:true,isDefault:true,signature:'<b>M</b><br>Tel'}]})},{});
  assert.deepEqual(await writer.senders(),{sendAs:[{email:'o@example.test',name:'M',isDefault:true,isPrimary:true,verificationStatus:'',signature:'M\nTel'}]});
});

test('glavna adresa bez imena u Gmailu uzima ime sa druge adrese', async()=>{
  const calls=[],writer=createGoogleWrite({status:()=>({email:'o@example.test'}),serviceWrite:async(...a)=>{calls.push(a);return {};},gmailRequest:async()=>({sendAs:[{sendAsEmail:'o@example.test',isPrimary:true,displayName:''},{sendAsEmail:'p@example.test',displayName:'Marko Milev',verificationStatus:'accepted'}]})},{});
  await writer.sendMail({to:'a@example.test',subject:'S',text:'T',confirmed:true});
  assert.match(Buffer.from(calls[0][2].raw,'base64url').toString(),new RegExp('^From: =\\?UTF-8\\?B\\?'+Buffer.from('Marko Milev').toString('base64').replace(/[+/=]/g,'\\$&')+'\\?= <o@example.test>$','m'));
});
