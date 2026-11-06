import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';

export const webprosEndpoint='https://mcp.webpros.com/api/mcp';
const clientId='Hf3QmY8LpRs2KaV7NxTwJe6CgUz9BdMiP4vXnLq1Zo';
const issuer='https://login.webpros.com';
const versions=['2025-06-18','2025-03-26','2024-11-05'];
// Conservative local policy. Remote annotations alone cannot authorize writes.
const readTools=new Set(['si_cpanel_allowed_hosts_list','dashboard_servers_list','dashboard_websites_list','dashboard_api_tokens_list','dashboard_api_tokens_get','si_cpanel_whm_api_method_list','si_cpanel_whm_api_method_usage','si_cpanel_user_api_method_list','si_cpanel_user_api_method_usage','si_plesk_api_method_list','si_plesk_api_method_usage']);

export function createWebpros({configDir,fetchImpl=fetch,openBrowser=async()=>{},now=Date.now,callbackPort=64474,loginTimeoutMs=600000}={}){
  const file=path.join(configDir,'webpros','connection.json');
  let saved={};try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  let tokens=saved.tokens?.access_token?saved.tokens:null,canWrite=saved.canWrite===true;
  let epoch=0,pending=null,starting=false,refreshing=null,session='',version=versions[0],initialized=false,tools=[],checkedAt=null,error='',serial=Promise.resolve(),id=0;
  const status=()=>({configured:true,connected:!!tokens,state:starting || pending?'connecting':tokens?'connected':'disconnected',canWrite:!!tokens && canWrite,readOnly:!tokens || !canWrite,toolCount:tools.length,checkedAt,error,endpoint:webprosEndpoint});
  function persist(){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(file),0o700);fs.writeFileSync(file,JSON.stringify({tokens,canWrite}),{mode:0o600});fs.chmodSync(file,0o600);}
  function guard(g){if(g!==epoch)throw Error('WebPros veza je promenjena. Pokušaj ponovo.');}
  function clearSession(){session='';initialized=false;tools=[];checkedAt=null;}
  function stopLogin(){starting=false;if(pending){clearTimeout(pending.timer);pending.server.close();pending.server.closeAllConnections();pending=null;}}
  function cancel(){epoch++;stopLogin();clearSession();return status();}
  async function network(url,options){try{return await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw Error('WebPros nije dostupan ili je zahtev prekinut. Ishod radnje proveri pre ponavljanja.');}}
  async function tokenRequest(params,g){
    const response=await network(issuer+'/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:clientId,resource:webprosEndpoint,...params})});
    let data={};try{data=await response.json();}catch{}
    guard(g);
    if(!response.ok || typeof data.access_token!=='string'){
      if(params.grant_type==='refresh_token' && data.error==='invalid_grant'){tokens=null;clearSession();persist();}
      throw Error('WebPros prijava nije uspela. Ponovo poveži nalog; proveri OAuth klijent i povratnu adresu localhost:64474/callback.');
    }
    return {access_token:data.access_token,...(typeof data.refresh_token==='string'?{refresh_token:data.refresh_token}:{}),expiresAt:now()+Math.max(0,Number(data.expires_in)||3600)*1000};
  }
  async function access(g){
    guard(g);if(!tokens)throw Error('Poveži WebPros u podešavanjima Agent Deska.');
    if(tokens.expiresAt>now()+60000)return tokens.access_token;
    if(!tokens.refresh_token)throw Error('WebPros prijava je istekla. Ponovo poveži nalog.');
    if(!refreshing){const old=tokens;const work=(async()=>{const fresh=await tokenRequest({grant_type:'refresh_token',refresh_token:old.refresh_token},g);guard(g);tokens={...old,...fresh};persist();return tokens.access_token;})();refreshing=work;work.finally(()=>{if(refreshing===work)refreshing=null;}).catch(()=>{});}
    return refreshing;
  }
  async function rpc(method,params,g,notification=false){
    const token=await access(g);guard(g);const requestId=++id;
    const response=await network(webprosEndpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(initialized?{'MCP-Protocol-Version':version}:{}),...(session?{'Mcp-Session-Id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:requestId}),method,params})});
    guard(g);
    if(!response.ok){if(response.status===404)clearSession();throw Error('WebPros MCP zahtev nije uspeo (HTTP '+response.status+'). Ishod radnje proveri pre ponavljanja; za HTTP 401 ponovo poveži nalog.');}
    if(notification){await response.body?.cancel();return;}
    const sessionId=response.headers.get('mcp-session-id');
    let message;
    const parse=text=>{try{return JSON.parse(text);}catch{throw Error('WebPros je vratio neispravan MCP odgovor.');}};
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',size=0;
    try{
      const sse=response.headers.get('content-type')?.includes('text/event-stream');
      for(;;){const {done,value}=await reader.read();if(value){size+=value.length;if(size>4*1024*1024)throw Error('WebPros odgovor je veći od 4 MB. Suzi zahtev.');buffer+=decoder.decode(value,{stream:true});}
        if(sse){let boundary;while((boundary=/\r?\n\r?\n/.exec(buffer))){const event=buffer.slice(0,boundary.index).replace(/\r\n/g,'\n');buffer=buffer.slice(boundary.index+boundary[0].length);const data=event.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data){const item=parse(data);if(item.id===requestId){message=item;break;}}}if(message)break;}
        else if(done){message=parse(buffer);break;}
        if(done)break;
      }
    }finally{await reader.cancel().catch(()=>{});}
    guard(g);
    if(!message || message.id!==requestId || message.error)throw Error('WebPros MCP nije vratio uspešan odgovor za '+method+'. Proveri dozvole i vezu u podešavanjima.');
    if(method==='initialize' && sessionId)session=sessionId;
    return message.result;
  }
  async function initialize(g){
    if(initialized)return;
    const result=await rpc('initialize',{protocolVersion:versions[0],capabilities:{},clientInfo:{name:'agent-desk',version:'0.1.0'}},g);
    if(!versions.includes(result?.protocolVersion))throw Error('WebPros koristi nepodržanu MCP verziju.');
    version=result.protocolVersion;initialized=true;
    try{await rpc('notifications/initialized',{},g,true);}catch(e){clearSession();throw e;}
  }
  async function discover(g){
    await initialize(g);const found=[],seen=new Set();let cursor;
    do{const result=await rpc('tools/list',cursor?{cursor}:{},g);if(!Array.isArray(result?.tools))throw Error('WebPros nije vratio spisak alata.');found.push(...result.tools);cursor=result.nextCursor;if(found.length>500 || cursor && seen.has(cursor))throw Error('WebPros spisak alata je prevelik.');seen.add(cursor);}while(cursor);
    guard(g);tools=found.filter(t=>typeof t.name==='string').map(t=>({...t,localReadOnly:readTools.has(t.name)}));checkedAt=now();error='';return {tools};
  }
  function enqueue(work){const g=epoch;const next=serial.catch(()=>{}).then(()=>{guard(g);return work(g);});serial=next;return next.catch(e=>{if(g===epoch)error=e.message;throw e;});}
  async function connect(){
    if(starting || pending)throw Error('WebPros prijava je već otvorena. Završi je ili otkaži.');
    const g=++epoch;starting=true;error='';clearSession();refreshing=null;
    const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
    const server=http.createServer(async(req,res)=>{
      const url=new URL(req.url,'http://localhost');
      const respond=(code,text)=>{res.writeHead(code,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end('<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><title>Agent Desk · WebPros</title><h1>Agent Desk · WebPros</h1><p>'+text+'</p><p>Vrati se u Agent Desk. Ovaj prozor možeš zatvoriti.</p></html>');};
      if(req.method!=='GET' || url.pathname!=='/callback')return respond(404,'Stranica nije pronađena.');
      const expected='localhost:'+server.address()?.port;
      if(!pending || pending.server!==server || pending.busy || req.headers.host!==expected || url.searchParams.get('state')!==state)return respond(400,'Prijava nije prepoznata ili je istekla.');
      pending.busy=true;
      try{
        if(url.searchParams.has('error'))throw Error('WebPros prijava je otkazana ili nije odobrena.');
        const code=url.searchParams.get('code');if(!code || code.length>4096)throw Error('WebPros nije vratio kod za prijavu.');
        const fresh=await tokenRequest({grant_type:'authorization_code',code,code_verifier:verifier,redirect_uri:pending.redirect},g);
        guard(g);tokens=fresh;persist();
        let text='WebPros prijava je sačuvana.';
        try{await enqueue(discover);text+=' MCP veza je proverena.';}catch{text+=' Proveri status MCP veze u podešavanjima.';}
        guard(g);respond(200,text);
      }catch(e){if(g===epoch)error=e.message;respond(400,'Povezivanje nije završeno. Detalji su u podešavanjima Agent Deska.');}
      finally{if(pending?.server===server){clearTimeout(pending.timer);pending=null;server.close();}}
    });
    try{
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(callbackPort,'127.0.0.1',resolve);});guard(g);
      const redirect='http://localhost:'+server.address().port+'/callback';
      const url=new URL(issuer+'/oauth2/auth');url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'openid offline_access email profile mcp',resource:webprosEndpoint,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
      const timer=setTimeout(()=>{if(pending?.server===server){cancel();error='WebPros prijava je istekla. Ponovo klikni Poveži WebPros.';}},loginTimeoutMs);timer.unref();
      pending={server,timer,redirect,busy:false};starting=false;await openBrowser(url.href);guard(g);return status();
    }catch(e){server.close();if(g===epoch){stopLogin();error=e.code==='EADDRINUSE'?'Port 64474 je zauzet. Završi drugu MCP prijavu pa pokušaj ponovo.':e.message;}throw Error(error || 'WebPros povezivanje je otkazano.');}
  }
  return {
    status,connect,cancel,close:cancel,
    listTools:()=>enqueue(discover),
    async verify(){await enqueue(discover);return status();},
    setWrite(value){if(typeof value!=='boolean')throw Error('Dozvola mora biti true ili false.');canWrite=value;persist();return status();},
    disconnect(){cancel();tokens=null;canWrite=false;refreshing=null;error='';fs.rmSync(file,{force:true});return status();},
    call({name,arguments:args={},confirmed=false,readOnly=false}){return enqueue(async g=>{
      if(typeof name!=='string' || !args || typeof args!=='object' || Array.isArray(args))throw Error('Neispravan MCP alat ili argumenti.');
      await discover(g);if(!tools.some(t=>t.name===name))throw Error('WebPros alat nije dostupan.');
      if(!readTools.has(name) && (readOnly || !canWrite || confirmed!==true))throw Error('Ovaj alat zahteva dozvolu izmena u podešavanjima, full access čet i confirmed:true na osnovu korisnikovog zahteva.');
      // No retries: an interrupted write may already have succeeded upstream.
      return rpc('tools/call',{name,arguments:args},g);
    });}
  };
}
