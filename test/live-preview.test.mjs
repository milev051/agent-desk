import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {createLivePreview,validatePreviewTarget,addressKind,previewResponseHeaders,previewRequestHeaders} from '../live-preview.mjs';
import {createPhoneAuth} from '../phone-access.mjs';
import {previewScale,livePreviewLink,ownAppLink} from '../public/live-preview.mjs';

const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const request=(server,path='/',headers={})=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:0',...headers}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));}).on('error',reject);});
test('mete: javne i loopback dozvoljene, privatne i portovi aplikacije odbijeni',async()=>{
 for(const ip of ['10.0.0.1','172.16.1.2','192.168.1.1','169.254.1.1','fc00::1','fe80::1','::ffff:c0a8:101','100.64.0.1'])assert.equal(addressKind(ip),'private',ip);
 assert.equal(addressKind('::1'),'loopback');assert.equal(addressKind('8.8.8.8'),'public');
 await validatePreviewTarget('http://[::1]:3000');await validatePreviewTarget('https://8.8.8.8/');
 for(const url of ['file:///etc/passwd','data:text/html,hello','http://user:pass@example.com','http://10.0.0.1','http://127.0.0.1:4317','http://localhost:4321','http://[::1]:4319'])await assert.rejects(validatePreviewTarget(url));
 await assert.rejects(validatePreviewTarget('https://public.test',{resolve:async()=>[{address:'192.168.1.1',family:4}]}));
 await assert.rejects(validatePreviewTarget('https://mixed.test',{resolve:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}],blockedPorts:[443]}));
});
test('zaglavlja: uklanja frame-ancestors, Domain i prijavu aplikacije, čuva CSP i kolačiće sajta',()=>{
 const target=new URL('https://example.com');const input={'content-security-policy':"default-src 'self'; frame-ancestors 'none'; script-src 'self'",'x-frame-options':'SAMEORIGIN',location:'https://example.com/page?q=1','set-cookie':['site=1; Domain=example.com; Secure; HttpOnly','__Host-agent-desk=bad; Secure']};
 const out=previewResponseHeaders(input,target);assert.equal(out['x-frame-options'],undefined);assert.equal(out.location,'/page?q=1');assert.equal(out['content-security-policy'],"default-src 'self'; script-src 'self'");assert.deepEqual(out['set-cookie'],['site=1; HttpOnly']);assert.match(previewResponseHeaders(input,target,{secure:true})['set-cookie'][0],/Secure/);
 assert.equal(previewResponseHeaders({location:'https://other.test/a'},target).location,'https://other.test/a');
 const req=previewRequestHeaders({cookie:'site=1; __Host-agent-desk=secret; other=2','tailscale-user-login':'private','x-forwarded-host':'app',origin:'http://127.0.0.1:4320',authorization:'site-token'},target,'http://127.0.0.1:4320');
 assert.equal(req.host,'example.com');assert.equal(req.cookie,'site=1; other=2');assert.equal(req.origin,target.origin);assert.equal(req.authorization,'site-token');assert.equal(req['tailscale-user-login'],undefined);assert.equal(req['x-forwarded-host'],undefined);
});
test('proxy streamuje root resurse, prepisuje preusmerenje i štiti telefonski port',async t=>{
 let received;const upstream=http.createServer((req,res)=>{received=req.headers;res.writeHead(200,{'X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'",'Set-Cookie':'site=ok; Domain=localhost; Secure'});res.end(req.url==='/asset.js'?'window.loaded=true':'<script src="/asset.js"></script>');});await listen(upstream);t.after(()=>{upstream.closeAllConnections();upstream.close();});
 const auth=createPhoneAuth();const phone={auth,info:async()=>({origin:'https://phone.test'})};const preview=createLivePreview({port:4317,localPort:0,phonePort:0,phone});await listen(preview.local);await listen(preview.mobile);t.after(()=>preview.close());
 const target=`http://127.0.0.1:${upstream.address().port}`;const info=await preview.set(target+'/page?q=1#intro');assert.equal(info.path,'/page?q=1#intro');assert.equal(info.phoneOrigin,'https://phone.test:8443');
 const response=await request(preview.local,'/',{cookie:'__Host-agent-desk=secret; site=yes'});assert.match(response.body,/src="\/asset.js"/);assert.equal(response.headers['x-frame-options'],undefined);assert.doesNotMatch(response.headers['content-security-policy'],/frame-ancestors/);assert.equal(received.cookie,'site=yes');assert.equal((await request(preview.local,'/asset.js')).body,'window.loaded=true');
 assert.equal((await request(preview.local,'/',{host:'evil.test'})).status,403);
 assert.equal((await request(preview.mobile,'/',{host:'phone.test:8443'})).status,401);
 const cookie=auth.redeem(auth.pairing().token);assert.equal((await request(preview.mobile,'/asset.js',{host:'phone.test:8443',cookie:`__Host-agent-desk=${cookie}`})).status,200);
 const health=await request(preview.mobile,'/.agent-desk-preview/health',{host:'phone.test:8443',cookie:`__Host-agent-desk=${cookie}`,origin:'https://phone.test'});assert.equal(health.headers['access-control-allow-origin'],'https://phone.test');assert.equal(health.headers['access-control-allow-credentials'],'true');
 auth.revoke();assert.equal((await request(preview.mobile,'/',{host:'phone.test:8443',cookie:`__Host-agent-desk=${cookie}`})).status,401);
 assert.equal((await request(preview.local,'/worker.js',{'service-worker':'script'})).status,403);
 preview.clear();assert.equal((await request(preview.local)).status,404);
});
test('DNS se ponovo proverava pri zahtevu i odbijeno razrešenje ne dolazi do LAN-a',async t=>{
 let safe=true;const preview=createLivePreview({localPort:0,phonePort:0,resolve:async()=>[{address:safe?'8.8.8.8':'10.0.0.1',family:4}]});await listen(preview.local);t.after(()=>preview.close());await preview.set('https://site.test');safe=false;assert.equal((await request(preview.local)).status,502);
});
test('websocket upgrade prosleđuje HMR tok i uklanja kolačić prijave',async t=>{
 const upstream=http.createServer();upstream.on('upgrade',(req,socket,head)=>{assert.equal(req.headers.cookie,'site=1');socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');if(head.length)socket.write(head);socket.on('data',data=>socket.write(data));});await listen(upstream);t.after(()=>upstream.close());
 const preview=createLivePreview({localPort:0,phonePort:0});await listen(preview.local);t.after(()=>preview.close());await preview.set(`http://127.0.0.1:${upstream.address().port}`);
 const socket=net.connect(preview.local.address().port,'127.0.0.1');t.after(()=>socket.destroy());await once(socket,'connect');socket.write('GET /hmr HTTP/1.1\r\nHost: 127.0.0.1:0\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nCookie: site=1; __Host-agent-desk=secret\r\n\r\n');const [first]=await once(socket,'data');assert.match(first.toString(),/101 Switching Protocols/);socket.write('hmr-update');const [echo]=await once(socket,'data');assert.equal(echo.toString(),'hmr-update');socket.end();
});
test('frontend: klik prihvata samo pune http(s) poruke, prečice i prilozi ostaju',()=>{
 const event=(href,props={})=>({button:0,target:{closest:()=>({getAttribute:()=>href,closest:selector=>selector==='.message-body'?{}:null,matches:()=>false})},...props});
 assert.equal(livePreviewLink(event('https://milev.rs/')),'https://milev.rs/');assert.equal(livePreviewLink(event('http://localhost:3000/')),'http://localhost:3000/');for(const href of ['/Users/name/a.txt','/api/chats/x/prilog','mailto:test@example.com'])assert.equal(livePreviewLink(event(href)),null);
 for(const props of [{ctrlKey:true},{metaKey:true},{button:1},{defaultPrevented:true}])assert.equal(livePreviewLink(event('https://milev.rs',props)),null);
 const phone={href:'https://mac.tail.ts.net/#chat=1',origin:'https://mac.tail.ts.net'};
 assert.equal(ownAppLink('http://127.0.0.1:4317/',phone),'https://mac.tail.ts.net/');assert.equal(ownAppLink('http://localhost:4321/x?a=1',phone),'https://mac.tail.ts.net/x?a=1');assert.equal(ownAppLink('https://mac.tail.ts.net/#chat=2',phone),'https://mac.tail.ts.net/#chat=2');
 for(const href of ['http://127.0.0.1:3000/','https://milev.rs/','http://127.0.0.1:4322/'])assert.equal(ownAppLink(href,phone),null,href);
 assert.deepEqual(previewScale(390,300),{scale:390/1920,width:1920,height:300/(390/1920)});assert.equal(previewScale(390,300,390).scale,1);
});

const {readFileSync,mkdtempSync,rmSync}=await import('node:fs');
const {fileURLToPath}=await import('node:url');
const {capturePage,findChrome}=await import('../page-snapshot.mjs');
test('browser: stvarni klik, promena širine i visine, zatvaranje i unos ispod pregleda', {skip:!findChrome(),timeout:60000},async t=>{
 const upstream=http.createServer((req,res)=>{res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Content-Type',req.url==='/asset.js'?'text/javascript':'text/html; charset=utf-8');res.end(req.url==='/asset.js'?'document.body.dataset.loaded="yes"':'<!doctype html><script src="/asset.js"></script><h1>Stranica uživo</h1>');});await listen(upstream);
 const reservation=http.createServer();await listen(reservation);const localPort=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 let preview;
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const panel=html.match(/    <section id="live-preview"[\s\S]*?<\/section>/)[0];
 let base;const app=http.createServer(async(req,res)=>{
  if(req.url==='/live-preview.mjs'||req.url==='/style.css'){res.setHeader('Content-Type',req.url.endsWith('css')?'text/css':'text/javascript');return res.end(readFileSync(new URL('../public'+req.url,import.meta.url)));}
  if(req.url==='/api/preview'){if(req.headers.origin!==base){res.writeHead(403);return res.end();}let text='';for await(const b of req)text+=b;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(req.method==='DELETE'?(preview.clear(),{ok:true}):await preview.set(JSON.parse(text).url)));}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="ready chat-view"><header id="mobile-agent-header">Zaglavlje</header><main>${panel}<div id="chat-workspace"><div id="chat-workspace-main"><div id="conversation"><div class="message-body"><a href="http://127.0.0.1:${upstream.address().port}/">Otvori</a></div></div></div><div class="composer-area"><form id="composer"><div class="prompt-wrap"><textarea id="prompt"></textarea></div><button>Pošalji</button></form></div></div></main><script type="module">
  import {createLivePreview} from '/live-preview.mjs';
  const root=document.querySelector('#live-preview'),frame=root.querySelector('iframe'),pause=ms=>new Promise(r=>setTimeout(r,ms));
  const ui=createLivePreview({root,conversation:document.querySelector('#conversation'),api:async(url,method,data)=>(await fetch(url,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined})).json()});
  window.addEventListener('popstate',()=>ui.handleHistory());
  window.addEventListener('error',e=>window.lastError=e.message);window.addEventListener('unhandledrejection',e=>window.lastError=String(e.reason));window.phase='open';
  const a=document.querySelector('.message-body a');a.click();
  for(let i=0;i<100&&(frame.hidden||!(frame.dataset.previewUrl||'').startsWith('http://127.0.0.1:${localPort}'));i++)await pause(25);
  window.phase='loaded';const initialWidth=frame.style.width;const opened=ui.isOpen&&!frame.hidden&&(frame.dataset.previewUrl||'').startsWith('http://127.0.0.1:${localPort}');
  const width=root.querySelector('select');width.value='1440';width.dispatchEvent(new Event('change'));const changed=frame.style.width==='1440px';
  const before=root.offsetHeight;root.querySelector('[role=separator]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));const taller=root.offsetHeight>before;
  root.querySelector('[data-preview-close]').click();await pause(150);const closed=!ui.isOpen;
  a.click();await pause(150);const reopened=ui.isOpen;
  window.phase='back';history.back();await pause(150);const backClosed=!ui.isOpen;
  a.click();await pause(200);document.querySelector('#prompt').value='Još jedna poruka';
  const r=root.getBoundingClientRect(),c=document.querySelector('#conversation').getBoundingClientRect(),p=document.querySelector('#composer').getBoundingClientRect();
  window.results={initialWidth,opened,changed,taller,closed,reopened,backClosed,input:document.querySelector('#prompt').value,panelBottom:r.bottom,messagesTop:c.top,composerBottom:p.bottom,viewport:innerHeight,width:frame.style.width};
  </script>`);
 });await listen(app);base=`http://127.0.0.1:${app.address().port}`;preview=createLivePreview({port:app.address().port,localPort,phonePort:0});await new Promise(resolve=>preview.local.listen(localPort,'127.0.0.1',resolve));
 const dir=mkdtempSync(fileURLToPath(new URL('../.live-preview-browser-',import.meta.url)));
 t.after(()=>{preview.close();app.closeAllConnections();app.close();upstream.closeAllConnections();upstream.close();rmSync(dir,{recursive:true,force:true});});
 const shot=await capturePage({url:base,device:'mobile',target:dir+'/mobile.webp',settle:900,inspect:'({results:window.results,error:window.lastError,phase:window.phase,href:location.href})'});
 const result=shot.inspected.results;assert.ok(result,JSON.stringify(shot.inspected));for(const key of ['opened','changed','taller','closed','reopened','backClosed'])assert.equal(result[key],true,key);
 assert.equal(result.input,'Još jedna poruka');assert.ok(result.messagesTop>=result.panelBottom-1,JSON.stringify(result));assert.ok(result.composerBottom<=result.viewport+1,JSON.stringify(result));assert.equal(result.initialWidth,'1920px');assert.equal(result.width,'1440px');
});
