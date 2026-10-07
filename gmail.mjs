import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';

export const calendarWriteScope='https://www.googleapis.com/auth/calendar.events';
export const calendarScope='https://www.googleapis.com/auth/calendar.readonly';
export const driveScope='https://www.googleapis.com/auth/drive.readonly';
export const tasksScope='https://www.googleapis.com/auth/tasks.readonly';
export const gmailScope='https://www.googleapis.com/auth/gmail.readonly';
const tokenUrl='https://oauth2.googleapis.com/token';
const apiRoot='https://gmail.googleapis.com/gmail/v1/users/me';
function privateWrite(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(file),0o700);
  fs.writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});fs.chmodSync(file+'.tmp',0o600);fs.renameSync(file+'.tmp',file);fs.chmodSync(file,0o600);
}
function readPrivate(file){if(!fs.existsSync(file))return null;fs.chmodSync(file,0o600);try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function clientFrom(value){
  const c=value?.installed;
  if(!c || typeof c.client_id!=='string' || !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(c.client_id) || typeof c.client_secret!=='string' || !c.client_secret || c.client_secret.length>300)throw Error('Izaberi Google OAuth JSON fajl za Desktop app, ne API ključ ili Web application.');
  return {installed:{client_id:c.client_id,client_secret:c.client_secret}};
}
function htmlText(value){return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\s*(br|\/p|\/div|\/tr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&');}
export function gmailMessage(message){
  const headers=message.payload?.headers || [];
  const header=name=>String(headers.find(h=>h.name?.toLowerCase()===name)?.value || '').slice(0,2000);
  const plain=[],html=[],attachments=[];
  function part(p,depth=0){
    if(!p || depth>30)return;
    if(p.filename){attachments.push({filename:String(p.filename).slice(0,500),mimeType:p.mimeType,size:p.body?.size || 0});return;}
    if(p.body?.data){const decoded=Buffer.from(p.body.data,'base64url').toString('utf8');if(p.mimeType==='text/plain')plain.push(decoded);else if(p.mimeType==='text/html')html.push(decoded);}
    for(const child of p.parts || [])part(child,depth+1);
  }
  part(message.payload);
  const text=plain.length?plain.join('\n'):htmlText(html.join('\n'));
  return {id:message.id,threadId:message.threadId,from:header('from'),to:header('to'),subject:header('subject'),date:header('date'),snippet:message.snippet || '',labels:message.labelIds || [],text:text.slice(0,100000),truncated:text.length>100000,attachments};
}

export function createGmail({configDir,fetchImpl=fetch,now=Date.now,openBrowser=async()=>{},loginTimeoutMs=600000,scopes=[gmailScope]}={}){
  if(!scopes.length || scopes.some(scope=>![gmailScope,driveScope,tasksScope,calendarScope,calendarWriteScope].includes(scope)))throw Error('Nepodržana Google dozvola.');
  const clientFile=path.join(configDir,'gmail','oauth-client.json'),tokenFile=path.join(configDir,'gmail','tokens.json');
  let client=null,tokens=readPrivate(tokenFile),pending=null,starting=false,refreshing=null,epoch=0,error='',needsReconnect=false;
  try{const saved=readPrivate(clientFile);if(saved)client=clientFrom(saved).installed;}catch{error='OAuth podešavanje nije ispravno. Ponovo uvezi Desktop app JSON fajl.';}
  if(tokens && (!tokens.refresh_token || !tokens.email || !tokens.scope?.split(' ').includes(gmailScope))){tokens=null;needsReconnect=true;}
  function status(){return {configured:!!client,connected:!!tokens && !needsReconnect,email:tokens?.email || '',state:starting || pending?'connecting':needsReconnect?'reconnect_required':tokens?'connected':client?'disconnected':'unconfigured',error,readOnly:true,services:Object.fromEntries([['gmail',gmailScope],['drive',driveScope],['tasks',tasksScope],['calendar',calendarScope]].map(([name,scope])=>[name,{connected:!!tokens && !needsReconnect && tokens.scope.split(' ').includes(scope),readOnly:name!=='calendar' || !tokens?.scope.split(' ').includes(calendarWriteScope),canWrite:name==='calendar' && !!tokens && !needsReconnect && tokens.scope.split(' ').includes(calendarWriteScope)}])),upgradeRequired:!!tokens && scopes.some(scope=>!tokens.scope.split(' ').includes(scope))};}
  function cancel(){epoch++;starting=false;if(pending){clearTimeout(pending.timer);pending.server.close();pending.server.closeAllConnections();pending=null;}}
  async function google(url,options={},content=false){
    let response;
    try{response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(20000)});}catch{throw Error('Google nije dostupan. Proveri internet vezu i pokušaj ponovo.');}
    let data={};if(content && response.ok){const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>10*1024*1024){await response.body.cancel().catch(()=>{});throw Error('Fajl je veći od ograničenja od 10 MB.');}chunks.push(chunk);}data=Buffer.concat(chunks);}else {try{data=await response.json();}catch{}}
    return {response,data};
  }
  function tokenError(data){if(data.error==='invalid_grant'){needsReconnect=true;error='Google prijava je istekla ili opozvana. Ponovo poveži Gmail.';}else error='Google prijava nije uspela. Proveri OAuth klijent i pristup test korisnika.';return Error(error);}
  async function refresh(force=false){
    if(!tokens || needsReconnect)throw Error('Gmail nije povezan. Poveži nalog u podešavanjima Agent Deska.');
    if(!force && tokens.access_token && tokens.expiresAt>now()+60000)return tokens.access_token;
    if(refreshing)return refreshing;
    const generation=epoch,saved=tokens,c=client;
    if(!c)throw Error('Google OAuth klijent nije podešen.');
    const work=(async()=>{
      const {response,data}=await google(tokenUrl,{method:'POST',body:new URLSearchParams({client_id:c.client_id,client_secret:c.client_secret,grant_type:'refresh_token',refresh_token:saved.refresh_token})});
      if(generation!==epoch)throw Error('Gmail veza je promenjena. Pokušaj ponovo.');
      if(!response.ok || !data.access_token)throw tokenError(data);
      tokens={...saved,access_token:data.access_token,expiresAt:now()+Number(data.expires_in || 3600)*1000};privateWrite(tokenFile,tokens);error='';return tokens.access_token;
    })();refreshing=work;
    try{return await work;}finally{if(refreshing===work)refreshing=null;}
  }
  async function request(resource,params={},retry=true,root=apiRoot,scope=gmailScope,content=false,write=null){
    const generation=epoch,access=await refresh();
    if(!tokens.scope.split(' ').includes(scope))throw Error('Google dozvola za ovaj servis nije odobrena. Ponovo poveži Google nalog.');
    const url=new URL(root+resource);for(const [key,value] of Object.entries(params))if(value!==undefined && value!==''){for(const item of Array.isArray(value)?value:[value])url.searchParams.append(key,String(item));}
    const {response,data}=await google(url,{headers:{Authorization:'Bearer '+access,...(write?{'Content-Type':'application/json',...(write.etag?{'If-Match':write.etag}:{})}:{})},...(write?{method:write.method,body:JSON.stringify(write.data)}:{})},content);
    if(generation!==epoch)throw Error('Gmail veza je promenjena. Pokušaj ponovo.');
    if(response.status===401 && retry){await refresh(true);return request(resource,params,false,root,scope,content,write);}
    if(!response.ok){if(response.status===401){needsReconnect=true;error='Google je opozvao pristup. Ponovo poveži Gmail.';}else if(response.status===403)error='Google pristup je odbijen. Proveri da je API tog servisa uključen i potrebna dozvola odobrena.';else if(response.status===412)throw Error('Događaj je u međuvremenu promenjen. Ponovo pročitaj događaj pre izmene.');else if(response.status===409)throw Error('Događaj sa ovim ID-jem već postoji. Pročitaj ga pre ponavljanja upisa.');else if(response.status===404)throw Error('Traženi sadržaj nije pronađen.');else error='Gmail zahtev nije uspeo. Pokušaj ponovo.';throw Error(error);}
    error='';return data;
  }
  async function connect(){
    if(!client)throw Error('Prvo uvezi Google OAuth JSON fajl za Desktop app.');
    if(starting || pending)throw Error('Google prijava je već otvorena. Završi je ili otkaži povezivanje.');
    starting=true;error='';const generation=++epoch,c=client;
    const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
    const server=http.createServer(async(req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      const respond=(code,text)=>{res.writeHead(code,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"});res.end(`<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Agent Desk · Gmail</title><body style="font:18px system-ui;padding:40px;background:#171717;color:#eee"><h1>Agent Desk · Gmail</h1><p>${text}</p><p>Vrati se u Agent Desk. Ovaj prozor možeš zatvoriti.</p></body></html>`);};
      if(req.method!=='GET' || url.pathname!=='/oauth/gmail/callback')return respond(404,'Stranica nije pronađena.');
      if(!pending || pending.server!==server || pending.busy || url.searchParams.get('state')!==state || req.headers.host!==`127.0.0.1:${server.address()?.port}`)return respond(400,'Prijava nije prepoznata ili je istekla. Ponovo poveži Gmail iz podešavanja.');
      pending.busy=true;
      try{
        if(url.searchParams.has('error'))throw Error('Google prijava je otkazana ili pristup nije odobren.');
        const code=url.searchParams.get('code');if(!code || code.length>4000)throw Error('Google nije vratio kod za prijavu.');
        const {response,data}=await google(tokenUrl,{method:'POST',body:new URLSearchParams({client_id:c.client_id,client_secret:c.client_secret,code,code_verifier:verifier,redirect_uri:pending.redirect,grant_type:'authorization_code'})});
        if(generation!==epoch)throw Error('Povezivanje je otkazano.');
        if(!response.ok || !data.access_token || !data.refresh_token)throw Error('Google nije odobrio trajni pristup. Ponovo poveži Gmail i odobri čitanje.');
        const scope=String(data.scope || '');if(!scope.split(' ').includes(gmailScope))throw Error('Dozvola za čitanje Gmaila nije odobrena.');
        const profile=await google(apiRoot+'/profile',{headers:{Authorization:'Bearer '+data.access_token}});
        if(generation!==epoch)throw Error('Povezivanje je otkazano.');
        if(!profile.response.ok || !profile.data.emailAddress)throw Error('Nalog nije potvrđen. Proveri da je Gmail API uključen u Google projektu.');
        tokens={access_token:data.access_token,refresh_token:data.refresh_token,scope,email:profile.data.emailAddress,expiresAt:now()+Number(data.expires_in || 3600)*1000};privateWrite(tokenFile,tokens);needsReconnect=false;error='';respond(200,'Google nalog je povezan. Agent Desk ima samo odobrene dozvole za čitanje.');
      }catch(e){if(generation===epoch)error=e.message;respond(400,'Povezivanje nije završeno. Detalji su u podešavanjima Agent Deska.');}
      finally{if(pending?.server===server){clearTimeout(pending.timer);pending=null;}server.close();}
    });
    try{
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
      if(generation!==epoch){server.close();throw Error('Povezivanje je otkazano.');}
      const redirect=`http://127.0.0.1:${server.address().port}/oauth/gmail/callback`;
      const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:c.client_id,redirect_uri:redirect,response_type:'code',scope:scopes.join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',access_type:'offline',prompt:'consent select_account'}).toString();
      const timer=setTimeout(()=>{if(pending?.server===server){cancel();error='Google prijava je istekla. Ponovo klikni Poveži Gmail.';}},loginTimeoutMs);timer.unref();
      pending={server,timer,redirect,busy:false};starting=false;await openBrowser(url.href);return status();
    }catch(e){if(generation===epoch){cancel();error=e.message;}server.close();throw e;}
    finally{if(generation===epoch)starting=false;}
  }
  return {
    status,connect,close:cancel,
    async serviceRequest(service,resource,params={},content=false){
      const config={drive:['https://www.googleapis.com/drive/v3',driveScope],tasks:['https://tasks.googleapis.com/tasks/v1',tasksScope],calendar:['https://www.googleapis.com/calendar/v3',calendarScope]}[service];
      if(!config || typeof resource!=='string' || !/^\/(?:[a-zA-Z0-9_@/.-]|%[a-fA-F0-9]{2})+$/.test(resource) || resource.includes('..'))throw Error('Neispravan Google servis ili putanja.');
      return request(resource,params,true,config[0],config[1],content);
    },
    async calendarWrite(resource,data,{method='POST',etag=''}={}){
      if(!['POST','PATCH'].includes(method) || typeof resource!=='string' || !/^\/calendars\/(?:[a-zA-Z0-9_@.#-]|%[a-fA-F0-9]{2})+\/events(?:\/[a-zA-Z0-9_@-]+)?$/.test(resource) || resource.includes('..'))throw Error('Neispravna Calendar operacija.');
      if(method==='POST' && !resource.endsWith('/events') || method==='PATCH' && resource.endsWith('/events'))throw Error('Neispravna Calendar operacija.');
      return request(resource,{sendUpdates:'none'},true,'https://www.googleapis.com/calendar/v3',calendarWriteScope,false,{method,data,etag});
    },
    async verify(){await request('/profile');return status();},
    configure(source){
      if(typeof source!=='string' || !path.isAbsolute(source) || !fs.existsSync(source) || !fs.statSync(source).isFile() || fs.statSync(source).size>20000)throw Error('Unesi punu putanju do preuzetog Google OAuth JSON fajla na ovom računaru.');
      let value;try{value=JSON.parse(fs.readFileSync(source,'utf8'));}catch{throw Error('Fajl nije ispravan JSON. Preuzmi OAuth klijent iz Google Cloud konzole.');}
      if(value?.web)throw Error('Ovaj JSON je za Web application. Agent Desk koristi Desktop app OAuth klijent. Napravi Desktop app klijent i preuzmi njegov JSON.');
      const saved=clientFrom(value);
      if(tokens)throw Error('Pre promene OAuth klijenta prekini postojeću Gmail vezu.');
      cancel();client=saved.installed;privateWrite(clientFile,saved);needsReconnect=false;error='';return status();
    },
    cancel(){cancel();return status();},
    async disconnect(){
      const saved=tokens;cancel();tokens=null;refreshing=null;needsReconnect=false;error='';fs.rmSync(tokenFile,{force:true});
      if(saved){try{const response=await fetchImpl('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:saved.refresh_token}),signal:AbortSignal.timeout(10000)});if(!response.ok && response.status!==400)throw Error();}catch{error='Lokalna veza je prekinuta. Google opoziv nije potvrđen; ukloni Agent Desk i u dozvolama Google naloga.';}}
      return status();
    },
    async search({q='',maxResults=10,pageToken=''}={}){
      if(typeof q!=='string' || q.length>2000 || typeof pageToken!=='string' || pageToken.length>2000 || !Number.isInteger(maxResults) || maxResults<1 || maxResults>20)throw Error('Pretraga prihvata Gmail upit do 2000 znakova i maxResults od 1 do 20.');
      const list=await request('/messages',{q,maxResults,pageToken}),messages=[];
      for(let i=0;i<(list.messages || []).length;i+=5){const batch=await Promise.all(list.messages.slice(i,i+5).map(m=>request('/messages/'+encodeURIComponent(m.id),{format:'metadata',metadataHeaders:['From','To','Subject','Date']})));messages.push(...batch.map(m=>{const {text,truncated,attachments,...summary}=gmailMessage(m);return summary;}));}
      return {messages,nextPageToken:list.nextPageToken || null,resultSizeEstimate:list.resultSizeEstimate || 0};
    },
    async read(id){if(typeof id!=='string' || !/^[a-f0-9]{1,100}$/i.test(id))throw Error('Neispravan Gmail ID poruke.');return gmailMessage(await request('/messages/'+id,{format:'full'}));}
  };
}
