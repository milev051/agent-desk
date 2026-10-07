import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGmail,gmailScope,gmailMessage} from '../gmail.mjs';
const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const encode=text=>Buffer.from(text).toString('base64url');
function fixture(t,options={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gmail-test-')),source=path.join(dir,'client.json'),calls=[];
  fs.writeFileSync(source,JSON.stringify({installed:{client_id:'test.apps.googleusercontent.com',client_secret:'fake-client-secret'}}));
  let auth,time=1000,handler=options.handler;
  const gmail=createGmail({configDir:dir,now:()=>time,openBrowser:async url=>{auth=new URL(url);},fetchImpl:async(url,opts)=>{calls.push({url:String(url),opts});return handler?handler(String(url),opts):result({});},...options});
  t.after(()=>{gmail.close();fs.rmSync(dir,{recursive:true,force:true});});
  const defaultHandler=(url,opts)=>{
    if(url.endsWith('/token'))return result({access_token:'fake-access',refresh_token:'fake-refresh',scope:gmailScope,expires_in:3600});
    if(url.endsWith('/profile'))return result({emailAddress:'test@example.test'});
    if(url.includes('/messages/'))return result({id:'a123',threadId:'thread',payload:{mimeType:'text/plain',headers:[{name:'Subject',value:'Test mejl'}],body:{data:encode('Zdravo, čćšđž')}}});
    if(new URL(url).pathname.endsWith('/messages'))return result({messages:[{id:'a123'}],nextPageToken:'next',resultSizeEstimate:2});
    return result({});
  };
  return {gmail,dir,source,calls,get auth(){return auth;},set handler(value){handler=value;},clock(value){time=value;},async login(){handler=defaultHandler;gmail.configure(source);await gmail.connect();const callback=new URL(auth.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({state:auth.searchParams.get('state'),code:'fake-code'});const response=await fetch(callback);assert.equal(response.status,200);return auth;}};
}

test('Gmail OAuth traži samo readonly, proverava state i PKCE, a tajne ostaju u privatnim fajlovima',async t=>{
  const f=fixture(t);f.gmail.configure(f.source);f.handler=(url)=>url.endsWith('/profile')?result({emailAddress:'test@example.test'}):result({access_token:'fake-access',refresh_token:'fake-refresh',scope:gmailScope,expires_in:3600});
  await f.gmail.connect();assert.equal(f.gmail.status().state,'connecting');
  assert.equal(f.auth.origin,'https://accounts.google.com');assert.equal(f.auth.searchParams.get('scope'),gmailScope);assert.equal(f.auth.searchParams.get('access_type'),'offline');
  const callback=new URL(f.auth.searchParams.get('redirect_uri'));callback.search='state=wrong&code=fake-code';
  assert.equal((await fetch(callback)).status,400);assert.equal(f.calls.length,0);
  callback.search=new URLSearchParams({state:f.auth.searchParams.get('state'),code:'fake-code'});assert.equal((await fetch(callback)).status,200);
  const tokenCall=f.calls.find(c=>c.url.endsWith('/token')),verifier=tokenCall.opts.body.get('code_verifier');
  assert.equal(createHash('sha256').update(verifier).digest('base64url'),f.auth.searchParams.get('code_challenge'));
  assert.equal(f.gmail.status().email,'test@example.test');assert.equal(f.gmail.status().readOnly,true);
  assert.doesNotMatch(JSON.stringify(f.gmail.status()),/fake-access|fake-refresh|fake-client-secret/);
  for(const file of ['oauth-client.json','tokens.json'])assert.equal(fs.statSync(path.join(f.dir,'gmail',file)).mode & 0o777,0o600);
  assert.equal(fs.statSync(path.join(f.dir,'gmail')).mode & 0o777,0o700);
});

test('Gmail pretraga koristi GET, Gmail upit, paginaciju i metapodatke, a čitanje dekodira telo',async t=>{
  const f=fixture(t);await f.login();const found=await f.gmail.search({q:'from:someone@example.test newer_than:7d',maxResults:5,pageToken:'page'});
  assert.equal(found.nextPageToken,'next');assert.equal(found.messages[0].subject,'Test mejl');assert.equal(found.messages[0].text,undefined);
  const list=new URL(f.calls.find(c=>new URL(c.url).pathname.endsWith('/messages')).url);
  assert.equal(list.searchParams.get('q'),'from:someone@example.test newer_than:7d');assert.equal(list.searchParams.get('pageToken'),'page');
  const metadata=new URL(f.calls.find(c=>c.url.includes('/messages/a123')).url);assert.deepEqual(metadata.searchParams.getAll('metadataHeaders'),['From','To','Subject','Date']);
  assert.equal((await f.gmail.read('a123')).text,'Zdravo, čćšđž');
  for(const c of f.calls.filter(c=>c.url.includes('gmail.googleapis.com')))assert.equal(c.opts.method,undefined);
  await assert.rejects(f.gmail.read('../send'),/ID/);await assert.rejects(f.gmail.search({maxResults:100}),/1 do 20/);
});

test('privatna prijava opstaje nakon restarta, obnavljanje je zajedničko za paralelne zahteve, opoziv traži ponovnu prijavu',async t=>{
  const f=fixture(t);await f.login();f.clock(4000000);let refreshes=0;
  f.handler=(url,opts)=>{if(url.endsWith('/token')){refreshes++;assert.equal(opts.body.get('grant_type'),'refresh_token');return result({access_token:'fake-new-access',expires_in:3600});}return result({emailAddress:'test@example.test'});};
  await Promise.all([f.gmail.verify(),f.gmail.verify()]);assert.equal(refreshes,1);
  const restarted=createGmail({configDir:f.dir,now:()=>9000000,fetchImpl:async()=>result({error:'invalid_grant',error_description:'sensitive-detail'},400)});t.after(()=>restarted.close());
  assert.equal(restarted.status().connected,true);await assert.rejects(restarted.verify(),/istekla ili opozvana/);assert.equal(restarted.status().state,'reconnect_required');assert.doesNotMatch(restarted.status().error,/sensitive-detail/);
});

test('prekid veze opoziva Google token i briše lokalni zapis, čak i kada mreža ne radi',async t=>{
  const f=fixture(t);await f.login();f.handler=async()=>{throw Error('offline');};
  const disconnected=await f.gmail.disconnect();assert.equal(disconnected.connected,false);assert.equal(disconnected.email,'');assert.match(disconnected.error,/opoziv nije potvrđen/);assert.equal(fs.existsSync(path.join(f.dir,'gmail','tokens.json')),false);
  await assert.rejects(f.gmail.read('a123'),/nije povezan/);assert.equal(f.calls.at(-1).url,'https://oauth2.googleapis.com/revoke');
});

test('prekid tokom obnavljanja ne vraća obrisanu prijavu na disk',async t=>{
  const f=fixture(t);await f.login();f.clock(4000000);let release,started;
  const ready=new Promise(resolve=>started=resolve);
  f.handler=(url)=>{if(url.endsWith('/token')){started();return new Promise(resolve=>release=()=>resolve(result({access_token:'fake-late',expires_in:3600})));}return result({});};
  const reading=f.gmail.verify();await ready;await f.gmail.disconnect();release();await assert.rejects(reading,/veza je promenjena/);assert.equal(fs.existsSync(path.join(f.dir,'gmail','tokens.json')),false);
});

test('odbijena prijava i rok povezivanja zatvaraju lokalni callback bez čuvanja tokena',async t=>{
  const f=fixture(t);f.gmail.configure(f.source);await f.gmail.connect();const callback=new URL(f.auth.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({state:f.auth.searchParams.get('state'),error:'access_denied'});
  assert.equal((await fetch(callback)).status,400);assert.equal(f.gmail.status().connected,false);assert.match(f.gmail.status().error,/otkazana/);assert.equal(fs.existsSync(path.join(f.dir,'gmail','tokens.json')),false);
  const short=fixture(t,{loginTimeoutMs:10});short.gmail.configure(short.source);await short.gmail.connect();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(short.gmail.status().state,'disconnected');assert.match(short.gmail.status().error,/istekla/);
});

test('MIME bira plain tekst umesto duplog HTML-a, ne uključuje priloge i ograničava velika tela',()=>{
  const message=gmailMessage({id:'a',payload:{parts:[{mimeType:'text/plain',body:{data:encode('Plain')}},{mimeType:'text/html',body:{data:encode('<p>HTML</p>')}},{filename:'test.txt',mimeType:'text/plain',body:{data:encode('Sadržaj priloga'),size:15}}]}});
  assert.equal(message.text,'Plain');assert.equal(message.attachments[0].filename,'test.txt');
  assert.equal(gmailMessage({payload:{mimeType:'text/html',body:{data:encode('<style>x</style><script>x</script><p>A &amp; B</p>')}}}).text.trim(),'A & B');
  const large=gmailMessage({payload:{mimeType:'text/plain',body:{data:encode('x'.repeat(100001))}}});assert.equal(large.truncated,true);assert.equal(large.text.length,100000);
});

test('Web application JSON se odbija uz jasno uputstvo, bez otkrivanja ključa',t=>{
  const f=fixture(t);fs.writeFileSync(f.source,JSON.stringify({web:{client_id:'test.apps.googleusercontent.com',client_secret:'fake-secret'}}));
  assert.throws(()=>f.gmail.configure(f.source),/Web application.*Desktop app/);
  assert.equal(f.gmail.status().configured,false);
});

test('zajednička Google prijava traži readonly servise i poštuje pojedinačno odobrene dozvole',async t=>{
  const {driveScope,tasksScope}=await import('../gmail.mjs');
  const f=fixture(t,{scopes:[gmailScope,driveScope,tasksScope]});await f.login();
  assert.deepEqual(f.auth.searchParams.get('scope').split(' '),[gmailScope,driveScope,tasksScope]);
  assert.equal(f.gmail.status().services.gmail.connected,true);assert.equal(f.gmail.status().services.drive.connected,false);assert.equal(f.gmail.status().upgradeRequired,true);
  await assert.rejects(f.gmail.serviceRequest('drive','/files'),/dozvola/);
  await assert.rejects(f.gmail.serviceRequest('unknown','/files'),/servis/);
});

test('Google servis koristi GET i fiksnu API adresu, a veliko preuzimanje je ograničeno',async t=>{
  const {driveScope,tasksScope}=await import('../gmail.mjs');
  const f=fixture(t,{scopes:[gmailScope,driveScope,tasksScope]});f.gmail.configure(f.source);
  f.handler=url=>url.endsWith('/token')?result({access_token:'fake-access',refresh_token:'fake-refresh',scope:[gmailScope,driveScope,tasksScope].join(' '),expires_in:3600}):result({emailAddress:'test@example.test'});
  await f.gmail.connect();const callback=new URL(f.auth.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({state:f.auth.searchParams.get('state'),code:'fake-code'});assert.equal((await fetch(callback)).status,200);
  f.handler=()=>new Response('čćšđž');const content=await f.gmail.serviceRequest('drive','/files/doc/export',{mimeType:'text/plain'},true);assert.equal(content.toString(),'čćšđž');assert.equal(new URL(f.calls.at(-1).url).origin,'https://www.googleapis.com');assert.equal(f.calls.at(-1).opts.method,undefined);
  await assert.rejects(f.gmail.serviceRequest('drive','/../token'),/putanja/);f.handler=()=>new Response(Buffer.alloc(10*1024*1024+1));await assert.rejects(f.gmail.serviceRequest('drive','/files/doc',{alt:'media'},true),/10 MB/);
});

test('Calendar proširenje čuva Gmail vezu pri otkazu, proverava dozvolu i koristi fiksan Calendar GET',async t=>{
  const {driveScope,tasksScope,calendarScope}=await import('../gmail.mjs');
  const f=fixture(t,{scopes:[gmailScope,driveScope,tasksScope,calendarScope]});await f.login();assert.equal(f.gmail.status().services.calendar.connected,false);assert.equal(f.gmail.status().upgradeRequired,true);
  await assert.rejects(f.gmail.serviceRequest('calendar','/users/me/calendarList'),/dozvola/);
  await f.gmail.connect();f.gmail.cancel();assert.equal(f.gmail.status().connected,true);assert.equal(f.gmail.status().services.gmail.connected,true);
  f.handler=url=>url.endsWith('/token')?result({access_token:'fake-access',refresh_token:'fake-refresh',scope:[gmailScope,driveScope,tasksScope,calendarScope].join(' '),expires_in:3600}):result({emailAddress:'test@example.test'});
  await f.gmail.connect();const callback=new URL(f.auth.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({state:f.auth.searchParams.get('state'),code:'fake-code'});assert.equal((await fetch(callback)).status,200);assert.equal(f.gmail.status().services.calendar.connected,true);assert.equal(f.gmail.status().upgradeRequired,false);
  f.handler=()=>result({items:[]});await f.gmail.serviceRequest('calendar','/calendars/test%40example.test/events');const call=f.calls.at(-1);assert.equal(new URL(call.url).origin,'https://www.googleapis.com');assert.equal(new URL(call.url).pathname,'/calendar/v3/calendars/test%40example.test/events');assert.equal(call.opts.method,undefined);
});

test('Calendar upis traži posebnu dozvolu, šalje JSON i If-Match i ne ponavlja mrežne greške',async t=>{
  const {calendarScope,calendarWriteScope}=await import('../gmail.mjs');
  const f=fixture(t,{scopes:[gmailScope,calendarScope,calendarWriteScope]});await f.login();await assert.rejects(f.gmail.calendarWrite('/calendars/primary/events',{summary:'Fake'}),/dozvola/);
  f.handler=url=>url.endsWith('/token')?result({access_token:'fake-access',refresh_token:'fake-refresh',scope:[gmailScope,calendarScope,calendarWriteScope].join(' '),expires_in:3600}):result({emailAddress:'test@example.test'});
  await f.gmail.connect();const callback=new URL(f.auth.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({state:f.auth.searchParams.get('state'),code:'fake-code'});assert.equal((await fetch(callback)).status,200);assert.equal(f.gmail.status().services.calendar.canWrite,true);assert.equal(f.gmail.status().services.calendar.readOnly,false);assert.equal(f.gmail.status().services.gmail.readOnly,true);
  f.handler=()=>result({id:'fakeevent'});await f.gmail.calendarWrite('/calendars/primary/events/fakeevent',{summary:'Fake'},{method:'PATCH',etag:'"v1"'});const call=f.calls.at(-1);assert.equal(call.opts.method,'PATCH');assert.equal(call.opts.headers['If-Match'],'"v1"');assert.equal(new URL(call.url).searchParams.get('sendUpdates'),'none');assert.deepEqual(JSON.parse(call.opts.body),{summary:'Fake'});
  await assert.rejects(f.gmail.calendarWrite('/files',{},{method:'POST'}),/operacija/);await assert.rejects(f.gmail.calendarWrite('/calendars/primary/events/fakeevent',{},{method:'DELETE'}),/operacija/);
  let attempts=0;f.handler=()=>{attempts++;throw Error('offline');};await assert.rejects(f.gmail.calendarWrite('/calendars/primary/events',{summary:'Fake'}),/Google nije dostupan/);assert.equal(attempts,1);
  f.handler=()=>result({},412);await assert.rejects(f.gmail.calendarWrite('/calendars/primary/events/fakeevent',{summary:'Fake'},{method:'PATCH',etag:'"v1"'}),/u međuvremenu/);
});
