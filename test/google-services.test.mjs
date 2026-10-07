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
