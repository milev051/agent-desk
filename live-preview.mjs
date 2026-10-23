import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {lookup} from 'node:dns/promises';

const sessionName='__Host-agent-desk';
export const previewCookie=cookie=>cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(sessionName+'='))?.slice(sessionName.length+1);
function ipv4Kind(ip){const a=ip.split('.').map(Number);if(a[0]===127)return 'loopback';return a[0]===0||a[0]===10||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&a[1]===168||a[0]===169&&a[1]===254||a[0]===100&&a[1]>=64&&a[1]<=127||a[0]>=224?'private':'public';}
export function addressKind(ip){ip=ip.toLowerCase();if(net.isIPv4(ip))return ipv4Kind(ip);if(!net.isIPv6(ip))return 'private';if(ip==='::1')return 'loopback';if(ip.startsWith('::ffff:')){const tail=ip.slice(7);if(net.isIPv4(tail))return ipv4Kind(tail);const parts=tail.split(':');if(parts.length===2){const n=parseInt(parts[0],16)*65536+parseInt(parts[1],16);return ipv4Kind([n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.'));}}return /^(fc|fd|fe[89ab]|ff)/.test(ip)||ip==='::'||!ip.startsWith('2')&& !ip.startsWith('3')?'private':'public';}
export async function validatePreviewTarget(value,{port=4317,blockedPorts=[],resolve=lookup}={}){
 let url;try{url=new URL(value);}catch{throw Error('Unesi punu http(s) adresu.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Dozvoljene su samo http(s) adrese bez lozinke.');
 const host=url.hostname.replace(/^\[|\]$/g,'');const addresses=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await resolve(host,{all:true});
 if(!addresses.length||addresses.some(a=>addressKind(a.address)==='private'))throw Error('Privatne mrežne adrese nisu dozvoljene.');
 const targetPort=Number(url.port||(url.protocol==='https:'?443:80));
 if(addresses.some(a=>addressKind(a.address)==='loopback')&&[port,port+1,port+2,port+3,port+4,...blockedPorts].includes(targetPort))throw Error('Portovi Agent Deska nisu dozvoljeni.');
 return {url,addresses};
}
export function previewRequestHeaders(headers,target,previewOrigin){
 const out={...headers,host:target.host};for(const key of Object.keys(out))if(key.startsWith('tailscale-')||key.startsWith('x-forwarded-')||['forwarded','proxy-authorization','connection','keep-alive','transfer-encoding'].includes(key))delete out[key];
 if(out.cookie){out.cookie=out.cookie.split(';').map(s=>s.trim()).filter(s=>s.trim().split('=')[0]!==sessionName).join('; ');if(!out.cookie.trim())delete out.cookie;}
 if(out.origin===previewOrigin)out.origin=target.origin;
 if(out.referer?.startsWith(previewOrigin+'/'))out.referer=target.origin+out.referer.slice(previewOrigin.length);
 return out;
}
export function previewResponseHeaders(headers,target,{secure=false}={}){
 const out={...headers};for(const k of ['x-frame-options','connection','transfer-encoding','clear-site-data','service-worker-allowed','access-control-allow-origin','access-control-allow-credentials'])delete out[k];
 for(const k of ['content-security-policy','content-security-policy-report-only'])if(out[k])out[k]=out[k].split(',').map(policy=>policy.split(';').filter(d=>!/^\s*frame-ancestors\b/i.test(d)).join(';')).join(',');
 if(out.location){try{const u=new URL(out.location,target.origin);if(u.origin===target.origin)out.location=u.pathname+u.search+u.hash;}catch{}}
 if(out['set-cookie'])out['set-cookie']=out['set-cookie'].filter(c=>!c.trim().startsWith(sessionName+'=')).map(c=>c.replace(/;\s*Domain=[^;]*/ig,'').replace(secure?/$^/:/;\s*Secure\b/ig,''));
 // Never cache another target's resources or permit persistent service workers on this shared origin.
 out['cache-control']='no-store';return out;
}
export function createLivePreview({port=4317,localPort=Number(process.env.AGENT_DESK_PREVIEW_PORT||port+3),phonePort=Number(process.env.AGENT_DESK_PREVIEW_PHONE_PORT||port+4),phone,resolve=lookup}={}){
 let target=null,targetRevision=0;const active=new Map();const servers=[],connections=new Set(),upgraded=new Set();
 const localOrigin=`http://127.0.0.1:${localPort}`;
 async function phoneOrigin(){const info=await phone?.info();if(!info?.origin)return '';const url=new URL(info.origin);url.port='8443';return url.origin;}
 const allowedOrigins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
 async function authorize(req,remote){const origin=remote?await phoneOrigin():localOrigin;
  if(remote){if(!origin||req.headers.host!==new URL(origin).host)return {status:403};if(!phone.auth.valid(previewCookie(req.headers.cookie)))return {status:401};}
  else if(![`127.0.0.1:${localPort}`,`localhost:${localPort}`].includes(req.headers.host))return {status:403};
  return {origin};
 }
 const options=(checked,req,origin)=>({hostname:checked.url.hostname.replace(/^\[|\]$/g,''),port:checked.url.port||undefined,path:req.url,method:req.method,headers:previewRequestHeaders(req.headers,checked.url,origin),lookup:(_host,opts,cb)=>{const a=checked.addresses[0];cb(null,opts?.all?checked.addresses:a.address,a.family);}});
 function make(remote){
 const server=http.createServer(async(req,res)=>{const fail=(status,message)=>{if(res.headersSent)return res.destroy();res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);};
 try{const access=await authorize(req,remote);if(access.status)return fail(access.status,'Pregled zahteva važeću prijavu i adresu.');
 if(req.url==='/.agent-desk-preview/health'){
  const appOrigin=remote?(await phone.info()).origin:null;
  if(allowedOrigins.includes(req.headers.origin)||req.headers.origin===appOrigin){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
  res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});return res.end('ok');
 }
 if(req.headers['service-worker'])return fail(403,'Service worker nije dozvoljen u pregledu.');
 if(!target)return fail(404,'Nema otvorene stranice.');
 if(!req.url.startsWith('/')||req.url.startsWith('//'))return fail(400,'Neispravna putanja.');
 const current=target;const checked=await validatePreviewTarget(current.origin,{port,blockedPorts:[localPort,phonePort],resolve});
 const upstream=(current.protocol==='https:'?https:http).request(options(checked,req,access.origin),response=>{res.writeHead(response.statusCode,previewResponseHeaders(response.headers,current,{secure:remote}));response.pipe(res);response.on('error',()=>res.destroy());});
 upstream.on('error',()=>fail(502,'Stranica nije dostupna.'));req.pipe(upstream);res.on('close',()=>upstream.destroy());if(remote){active.set(res,previewCookie(req.headers.cookie));res.on('close',()=>active.delete(res));}
 }catch{fail(502,'Adresa stranice nije dostupna ili nije dozvoljena.');}});
 server.on('connection',socket=>{connections.add(socket);socket.on('close',()=>connections.delete(socket));});
 server.on('upgrade',async(req,socket,head)=>{upgraded.add(socket);socket.on('close',()=>upgraded.delete(socket));try{
 const access=await authorize(req,remote);if(access.status){socket.end(`HTTP/1.1 ${access.status} Unauthorized\r\nConnection: close\r\n\r\n`);return;}
 if(!target||!req.url.startsWith('/')||req.url.startsWith('//'))return socket.destroy();
 const current=target;const checked=await validatePreviewTarget(current.origin,{port,blockedPorts:[localPort,phonePort],resolve});const opts=options(checked,req,access.origin);opts.headers.connection='Upgrade';opts.headers.upgrade=req.headers.upgrade;
 const upstream=(current.protocol==='https:'?https:http).request(opts);
 upstream.on('upgrade',(response,peer,upHead)=>{const headers=previewResponseHeaders(response.headers,current,{secure:remote});headers.connection='Upgrade';headers.upgrade=response.headers.upgrade;
 socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`+Object.entries(headers).flatMap(([k,v])=>(Array.isArray(v)?v:[v]).map(x=>`${k}: ${x}\r\n`)).join('')+'\r\n');if(upHead.length)socket.write(upHead);if(head.length)peer.write(head);peer.pipe(socket);socket.pipe(peer);peer.on('error',()=>socket.destroy());socket.on('close',()=>peer.destroy());if(remote){active.set(socket,previewCookie(req.headers.cookie));socket.on('close',()=>active.delete(socket));}});
 upstream.on('response',response=>{response.resume();socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());upstream.end();
 }catch{socket.destroy();}});servers.push(server);return server;
 }
 const local=make(false),mobile=make(true);const expiry=setInterval(()=>{for(const [connection,cookie]of active)if(!phone.auth.valid(cookie))connection.destroy();},10000);expiry.unref();
 return {local,mobile,localOrigin,async origins(){return [localOrigin,`http://localhost:${localPort}`,await phoneOrigin()].filter(Boolean);},async set(url){const revision=++targetRevision;const checked=await validatePreviewTarget(url,{port,blockedPorts:[localPort,phonePort],resolve});if(revision!==targetRevision)throw Error('Otvorena je novija adresa.');target=new URL(checked.url.origin);for(const c of upgraded)c.destroy();return {path:checked.url.pathname+checked.url.search+checked.url.hash,localOrigin,phoneOrigin:await phoneOrigin()};},clear(){++targetRevision;target=null;for(const c of upgraded)c.destroy();},start(){for(const [server,p]of [[local,localPort],[mobile,phonePort]]){server.on('error',e=>console.error('Pregled uživo: '+e.message));server.listen(p,'127.0.0.1');}},close(){clearInterval(expiry);for(const c of connections)c.destroy();for(const server of servers){server.close();server.closeAllConnections();}}};
}
