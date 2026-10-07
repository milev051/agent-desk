import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes, createHash} from 'node:crypto';
import {execFile, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function parseTailscaleStatus(stdout,stderr=''){for(const output of [stdout,stderr]){const start=output.indexOf('{'),end=output.lastIndexOf('}');if(start<0||end<start)continue;try{const status=JSON.parse(output.slice(start,end+1));if(typeof status.BackendState==='string')return status;}catch{}}throw Error('Tailscale nije vratio JSON stanje.');}
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createPhoneAuth({now=Date.now, lifetime=60000, sessionLifetime=30*86400000,sessionFile}={}) {
 let pairing=null;const sessions=new Map();
 const persist=()=>{if(!sessionFile)return;fs.mkdirSync(path.dirname(sessionFile),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(sessionFile),0o700);fs.writeFileSync(sessionFile+'.tmp',JSON.stringify([...sessions]),{mode:0o600});fs.chmodSync(sessionFile+'.tmp',0o600);fs.renameSync(sessionFile+'.tmp',sessionFile);};
 if(sessionFile && fs.existsSync(sessionFile)){fs.chmodSync(sessionFile,0o600);try{const records=JSON.parse(fs.readFileSync(sessionFile,'utf8'));if(!Array.isArray(records))throw Error();for(const row of records)if(Array.isArray(row) && /^[a-f0-9]{64}$/.test(row[0]) && Number.isSafeInteger(row[1]) && row[1]>now())sessions.set(row[0],row[1]);}catch{console.error('Sačuvane prijave telefona nisu čitljive. Potrebna je nova prijava.');}}
 const cleanup=()=>{let changed=false;for(const [key,until] of sessions)if(until<=now()){sessions.delete(key);changed=true;}if(changed)persist();};
 return {
  pairing(){if(!pairing || pairing.expiresAt<=now())pairing={token:randomBytes(32).toString('base64url'),expiresAt:now()+lifetime};return {...pairing};},
  redeem(token){cleanup();if(typeof token!=='string' || token.length>100 || !pairing || pairing.expiresAt<=now() || hash(token)!==hash(pairing.token))return null;pairing=null;const secret=randomBytes(32).toString('base64url');sessions.set(hash(secret),now()+sessionLifetime);persist();return secret;},
  valid(secret){cleanup();return typeof secret==='string' && secret.length<=100 && sessions.has(hash(secret));},
  revoke(){pairing=null;sessions.clear();persist();},
  get count(){cleanup();return sessions.size;}
 };
}
export function createPhoneAccess({port, gatewayPort=port+2, origin:configuredOrigin, sessionFile,sessionLifetime=30*86400000,tailscale='/Applications/Tailscale.app/Contents/MacOS/Tailscale'}={}) {
 const auth=createPhoneAuth({sessionFile,sessionLifetime});const active=new Map();let origin=configuredOrigin || '', lastDiscovery=0, qrCache=null,discoveryError='' ;
 async function discover(){if(configuredOrigin || Date.now()-lastDiscovery<15000)return origin;lastDiscovery=Date.now();try {const output=await new Promise((resolve,reject)=>execFile(tailscale,['status','--json'],{timeout:4000,maxBuffer:1000000},(e,s,err)=>e?reject(e):resolve({stdout:s,stderr:err})));const s=parseTailscaleStatus(output.stdout,output.stderr);origin=s.BackendState==='Running' && s.Self?.DNSName?'https://'+s.Self.DNSName.replace(/\.$/,''):'';discoveryError='';}catch(e){origin='';discoveryError='Tailscale provera nije uspela ('+(e.code||e.name||'greška')+').';}return origin;}
 const info=async()=>{await discover();const p=auth.pairing();return {origin,discoveryError,gatewayPort,url:origin?origin+'/login#pair='+p.token:'',expiresAt:p.expiresAt,sessions:auth.count,sessionDays:sessionLifetime/86400000};};
 async function qr(){const p=await info();if(!p.url)throw Error('Tailscale nije povezan.');if(qrCache?.url===p.url)return qrCache.png;
 const png=await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/swift',[fileURLToPath(new URL('./phone-qr.swift',import.meta.url))],{stdio:['pipe','pipe','pipe']});let data=[],size=0;const timer=setTimeout(()=>{child.kill();reject(Error('QR nije dostupan. Koristi link.'));},30000);child.stdout.on('data',b=>{size+=b.length;if(size<1000000)data.push(b);});child.on('error',reject);child.on('close',code=>{clearTimeout(timer);code===0?resolve(Buffer.concat(data)):reject(Error('QR nije dostupan. Koristi link.'));});child.stdin.on('error',()=>{});child.stdin.end(p.url);});qrCache={url:p.url,png};return png;}
 const server=http.createServer(async(req,res)=>{
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  await discover();if(!origin || req.headers.host!==new URL(origin).host)return json(403,{error:'Neispravna adresa.'});
  const url=new URL(req.url,origin);
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.origin && req.headers.origin!==origin)return json(403,{error:'Neispravno poreklo zahteva.'});
  if(!['GET','HEAD'].includes(req.method) && req.headers.origin!==origin)return json(403,{error:'Neispravno poreklo zahteva.'});
  const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-agent-desk='))?.slice('__Host-agent-desk='.length);
  if(req.method==='GET' && url.pathname==='/login' && auth.valid(cookie)){res.writeHead(302,{Location:'/#'});return res.end();}
  if(req.method==='GET' && url.pathname==='/api/phone/session')return json(auth.valid(cookie)?200:401,{authenticated:auth.valid(cookie)});
  if(req.method==='GET' && ['/login','/phone-login.js'].includes(url.pathname)){
   res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
   res.setHeader('Content-Type',url.pathname==='/login'?'text/html; charset=utf-8':'text/javascript');
   return res.end(url.pathname==='/login'?'<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"><meta name="color-scheme" content="dark"><title>Agent Desk</title><style>html{color-scheme:dark}html,body{margin:0;height:100%;background:#000;color:#eee;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{display:flex;align-items:center;justify-content:center}p{margin:0;color:#aaa}</style></head><body><p id="status">Povezivanje</p><script src="/phone-login.js" defer></script></body></html>':`const token=new URLSearchParams(location.hash.slice(1)).get('pair');history.replaceState(null,'','/login');fetch('/api/phone/session').then(async r=>{if(r.ok){location.replace('/');return;}if(!token){document.querySelector('#status').textContent='Skeniraj QR kod u podešavanjima na računaru.';return;}const login=await fetch('/api/phone/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!login.ok)throw Error();location.replace('/');}).catch(()=>document.querySelector('#status').textContent='Link je istekao ili je već iskorišćen. Skeniraj novi QR kod na računaru.');`);
  }
  if(url.pathname==='/api/phone/login' && req.method==='POST'){
   let body='';try{for await(const b of req){body+=b;if(body.length>1024)throw Error();}const secret=auth.redeem(JSON.parse(body).token);if(!secret)return json(401,{error:'Link je istekao ili je iskorišćen.'});res.setHeader('Set-Cookie',`__Host-agent-desk=${secret}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionLifetime/1000)}`);return json(200,{ok:true});}catch{return json(400,{error:'Neispravan zahtev.'});}
  }
  // Ikonice i manifest nisu tajni, a telefon ih pri instalaciji ponekad traži bez kolačića.
  const publicAsset=req.method==='GET' && /^\/(manifest\.webmanifest|icon-(192|512)\.png|apple-touch-icon\.png|badge-96\.png)$/.test(url.pathname);
  if(!publicAsset && !auth.valid(cookie)){if(req.method==='GET' && url.pathname==='/'){res.writeHead(302,{Location:'/login'});return res.end();}return json(401,{error:'Prijavi se novim QR kodom sa računara.'});}
  active.set(res,cookie);res.on('close',()=>active.delete(res));
  // Local desktop actions never reach the loopback API through this gateway.
  if(/^\/api\/(phone(?:\/|$)|title-settings(?:\/|$)|antigravity\/login|open-file(?:\/|$)|statistics\/reveal(?:\/|$)|notifications\/preview(?:\/|$))/.test(url.pathname) || /\/api\/chats\/[^/]+\/(reveal|record)$/.test(url.pathname))return json(403,{error:'Ova radnja je dostupna samo na računaru.'});
  if(url.pathname.startsWith('/api/integrations/gmail') && !['GET','HEAD'].includes(req.method))return json(403,{error:'Povezivanje i prekid Gmail veze dostupni su samo na računaru.'});
  const headers={...req.headers,host:`127.0.0.1:${port}`};delete headers.cookie;for(const k of Object.keys(headers))if(k.startsWith('tailscale-')||k.startsWith('x-forwarded-'))delete headers[k];if(headers.origin)headers.origin=`http://127.0.0.1:${port}`;
  const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},response=>{res.writeHead(response.statusCode,{...response.headers,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});response.pipe(res);});
  upstream.on('error',()=>{if(!res.headersSent)json(502,{error:'Server nije dostupan.'});else res.destroy();});req.pipe(upstream);res.on('close',()=>upstream.destroy());
 });
 const expiry=setInterval(()=>{for(const [res,cookie] of active)if(!auth.valid(cookie))res.destroy();},10000);expiry.unref();
 let started=false;
 return {info,qr,revoke:()=>{auth.revoke();qrCache=null;for(const res of active.keys())res.destroy();},start(){if(started)return;started=true;server.on('error',e=>console.error('Telefon: '+e.message));server.listen(gatewayPort,'127.0.0.1');},close(){clearInterval(expiry);server.close();server.closeAllConnections();},server,auth};
}
