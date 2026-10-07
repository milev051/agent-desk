import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleServices} from '../google-services.mjs';
function fixture(handler){const calls=[];const services=createGoogleServices({status:()=>({state:'connected',email:'fake@example.test',services:{drive:{connected:true},tasks:{connected:false}}}),serviceRequest:async(...args)=>{calls.push(args);return handler(...args);}});return {services,calls};}
test('Drive pretraga čuva q sintaksu, isključuje obrisane i podržava paginaciju',async()=>{
  const f=fixture(()=>({files:[{id:'file1'}],nextPageToken:'next'}));
  const result=await f.services.files({q:"name contains 'Test'",maxResults:5,pageToken:'page'});
  assert.equal(result.nextPageToken,'next');assert.equal(f.calls[0][2].q,"trashed = false and (name contains 'Test')");assert.equal(f.calls[0][2].pageSize,5);assert.equal(f.calls[0][2].pageToken,'page');
  await assert.rejects(f.services.files({maxResults:101}));await assert.rejects(f.services.file('../token'));assert.equal(f.services.status('tasks').connected,false);assert.equal(f.services.status('tasks').state,'reconnect_required');
});
test('Drive izvozi Docs i prvi Sheets list u tekst, binarne fajlove omogućava za preuzimanje',async()=>{
  let mime='application/vnd.google-apps.document';const f=fixture((service,route,params,content)=>content?Buffer.from('čćšđž'):({id:'doc1',mimeType:mime,name:'Test'}));
  assert.equal((await f.services.text('doc1')).text,'čćšđž');assert.equal(f.calls.at(-1)[1],'/files/doc1/export');assert.equal(f.calls.at(-1)[2].mimeType,'text/plain');
  mime='application/vnd.google-apps.spreadsheet';assert.match((await f.services.text('doc1')).note,/prvi list/);assert.equal(f.calls.at(-1)[2].mimeType,'text/csv');
  mime='application/pdf';await assert.rejects(f.services.text('doc1'),/binaran/);const content=await f.services.content('doc1');assert.equal(content.mimeType,'application/pdf');assert.equal(f.calls.at(-1)[2].alt,'media');
  mime='application/vnd.google-apps.folder';await assert.rejects(f.services.content('doc1'),/Folder/);
});
test('Drive označava skraćen tekst i odbija prevelike fajlove pre preuzimanja',async()=>{
  let size=1;const f=fixture((service,route,params,content)=>content?Buffer.from('x'.repeat(100001)):({id:'file',mimeType:'text/plain',size}));
  const text=await f.services.text('file');assert.equal(text.truncated,true);assert.equal(text.text.length,100000);size=11*1024*1024;await assert.rejects(f.services.content('file'),/10 MB/);
});
test('Tasks čita liste, zadatke i pojedinačan zadatak uz uključivanje završenih',async()=>{
  const f=fixture(()=>({items:[{id:'task'}],nextPageToken:'next'}));assert.equal((await f.services.lists({pageToken:'p'})).nextPageToken,'next');assert.equal(f.calls.at(-1)[1],'/users/@me/lists');
  const list=await f.services.tasks('list1',{showCompleted:true});assert.equal(list.tasks[0].id,'task');assert.equal(f.calls.at(-1)[2].showHidden,true);
  await f.services.task('list1','task1');assert.equal(f.calls.at(-1)[1],'/lists/list1/tasks/task1');await assert.rejects(f.services.tasks('list1',{showCompleted:'true'}));
});

test('Calendar čita kalendare i pojedinačne termine uz zonu, paginaciju i kodirane ID-je',async()=>{
  const calls=[];const services=createGoogleServices({serviceRequest:async(...args)=>{calls.push(args);return {items:[{id:'event1',start:{date:'2026-10-07'}}],nextPageToken:'next',timeZone:'Europe/Belgrade'};}},{now:()=>Date.parse('2026-10-07T10:00:00Z')});
  assert.equal((await services.calendars({maxResults:5,pageToken:'first'})).nextPageToken,'next');assert.equal(calls.at(-1)[1],'/users/me/calendarList');
  const found=await services.events('en.serbian#holiday@group.v.calendar.google.com',{q:'sastanak',timeMin:'2026-10-07T00:00:00+02:00',timeMax:'2026-10-08T00:00:00+02:00',pageToken:'next'});
  assert.equal(found.events[0].start.date,'2026-10-07');assert.equal(found.timeZone,'Europe/Belgrade');assert.equal(calls.at(-1)[1],'/calendars/en.serbian%23holiday%40group.v.calendar.google.com/events');
  assert.equal(calls.at(-1)[2].singleEvents,true);assert.equal(calls.at(-1)[2].orderBy,'startTime');assert.equal(calls.at(-1)[2].timeMin,'2026-10-07T00:00:00+02:00');
  const upcoming=await services.events();assert.equal(upcoming.timeMin,'2026-10-07T10:00:00.000Z');assert.equal(upcoming.timeMax,'2026-10-14T10:00:00.000Z');
  await services.event('primary','event1');assert.equal(calls.at(-1)[1],'/calendars/primary/events/event1');
  await assert.rejects(services.events('primary',{timeMin:'2026-10-07'}),/vremenskom zonom/);await assert.rejects(services.events('primary',{timeMin:'2026-10-07T00:00:00Z',timeMax:'2026-10-06T00:00:00Z'}),/posle/);await assert.rejects(services.events('../tokens'));
});

test('Calendar kreira lični događaj i menja samo tražena polja uz ETag',async()=>{
  const writes=[];const services=createGoogleServices({serviceRequest:async()=>({id:'event1',etag:'"version1"',description:'Staro'}),calendarWrite:async(...args)=>{writes.push(args);return {id:args[1].id || 'event1',...args[1]};}});
  const data={summary:'Provera',start:{dateTime:'2026-10-08T10:00:00+02:00',timeZone:'Europe/Belgrade'},end:{dateTime:'2026-10-08T11:00:00+02:00',timeZone:'Europe/Belgrade'}};
  const created=await services.createEvent('primary',data);assert.match(created.id,/^[0-9a-f]{32}$/);assert.equal(writes[0][0],'/calendars/primary/events');assert.equal(data.id,undefined);
  await services.updateEvent('primary','event1',{summary:'Novi naziv'});assert.deepEqual(writes.at(-1)[1],{summary:'Novi naziv'});assert.deepEqual(writes.at(-1)[2],{method:'PATCH',etag:'"version1"'});
  await services.createEvent('primary',{summary:'Celodnevni',start:{date:'2026-10-08'},end:{date:'2026-10-09'},id:'abc012345'});assert.equal(writes.at(-1)[1].id,'abc012345');
  await assert.rejects(services.createEvent('primary',{...data,attendees:[{email:'fake@example.test'}]}),/Dozvoljeni/);
  await assert.rejects(services.createEvent('primary',{...data,end:data.start}),/posle/);
  await assert.rejects(services.updateEvent('primary','event1',{start:data.start}),/start i end/);
  await assert.rejects(services.createEvent('primary',{summary:'X',start:{date:'2026-02-30'},end:{date:'2026-03-03'}}),/datum/);
  const group=createGoogleServices({serviceRequest:async()=>({etag:'"version1"',attendees:[{email:'fake@example.test'}]}),calendarWrite:()=>assert.fail('Ne sme menjati sastanak sa učesnicima')});await assert.rejects(group.updateEvent('primary','event1',{summary:'X'}),/učesnicima/);
});
