import dns from 'node:dns/promises';
import https from 'node:https';

// Kad padne internet, CLI agent završi greškom i čet ostaje u stanju „greška“.
// Ovaj modul prepoznaje prolazne mrežne greške, čeka da se veza vrati i nastavlja isti čet u istoj sesiji.
export const networkResumeOrigin='network-resume';
export const networkResumeLimit=5;
export const networkResumeWindow=24*3600000;
export const networkCheckDelays=[30000,60000,120000,300000];

const transient=/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|ENETDOWN|EPIPE|UND_ERR_SOCKET|UND_ERR_CONNECT|can'?t reach the api server|connection (?:lost|error|reset|closed|refused)|fetch failed|socket hang up|network (?:error|is unreachable)|getaddrinfo|stream disconnected|websocket (?:closed|error)|error sending request|failed to (?:connect|send request)|\[errno 1\] operation not permitted|\b(?:502|503|504|529)\b|overloaded|bad gateway|service (?:temporarily )?unavailable|gateway time-?out/i;
// Greške koje novi pokušaj ne rešava: potrošen limit, odbijen ili neispravan zahtev, prijava.
const permanent=/rate.?limit|usage limit|limit (?:reached|exceeded)|hit your limit|quota|credit balance|insufficient|invalid.?request|invalid api key|authenticat|unauthori[sz]ed|forbidden|permission denied|not logged in|please (?:run )?\/?login|\b(?:400|401|403|404|413|422|429)\b|prompt is too long|context (?:length|window)/i;

export function isNetworkError(text){
 const value=String(text || '');
 return !!value && transient.test(value) && !permanent.test(value);
}
export const nextCheckDelay=checks=>networkCheckDelays[Math.min(checks,networkCheckDelays.length-1)];
export function networkResumePrompt(error){
 const short=String(error || '').replace(/\s+/g,' ').trim().slice(0,160);
 return `Veza je bila prekinuta (greška: ${short || 'nepoznata'}). Agent Desk je sačekao da se veza vrati i automatski nastavlja ovaj čet. Nastavi isti zadatak od mesta gde si stao; prvo proveri šta je već urađeno i ugasi zaostale procese i zaključavanja. Ne ponavljaj uspešne upise ni slanja. Ako je posao već gotov, pošalji samo završni odgovor.`;
}
const recent=(chat,now)=>(chat.networkResumeLog || []).filter(at=>now-at<networkResumeWindow);

// Poziva se kad odgovor završi. Vraća true kad je čet stavljen u red za nastavak.
export function markNetworkFailure(chat,reply,{now=Date.now(),stopped=false,shuttingDown=false}={}){
 if(!chat || !reply || reply.status!=='error' || stopped || shuttingDown || chat.networkAutoResume===false)return false;
 if(chat.continuedTo && !chat.continuedUnlocked)return false;
 if(!isNetworkError(reply.error))return false;
 chat.networkResumeLog=recent(chat,now);
 if(chat.networkResumeLog.length>=networkResumeLimit){reply.networkResumeLimit=true;delete chat.networkResume;return false;}
 chat.networkResume={status:'waiting',messageId:reply.id,agent:reply.agent || chat.settings?.agent,error:String(reply.error).slice(0,300),since:now,checks:0,nextCheckAt:now+nextCheckDelay(0)};
 return true;
}

const hosts={claude:'api.anthropic.com',codex:'api.openai.com',grok:'api.x.ai',antigravity:'generativelanguage.googleapis.com'};
export const probeHost=agent=>hosts[agent] || hosts.claude;
// Veza radi kad DNS razreši adresu i HTTPS server odgovori bilo kojim statusom.
export function probeConnection(host,{timeoutMs=8000}={}){
 return dns.lookup(host).then(()=>new Promise(resolve=>{
  const req=https.request({host,method:'HEAD',path:'/',timeout:timeoutMs},res=>{res.resume();resolve(true);});
  req.on('timeout',()=>{req.destroy();resolve(false);});
  req.on('error',()=>resolve(false));
  req.end();
 }),()=>false);
}

// Jedan prolaz: za čet čiji je rok stigao proveri vezu i nastavi ga ili odloži sledeću proveru.
export async function checkNetworkChats({chats,isRunning,resume,changed,probe=probeConnection,now=()=>Date.now(),isShuttingDown=()=>false}){
 const results=new Map(),started=[];
 for(const chat of chats){
  const pending=chat.networkResume;
  if(isShuttingDown())break;
  if(pending?.status!=='waiting' || pending.nextCheckAt>now())continue;
  const reply=chat.messages?.at(-1);
  if(isRunning(chat.id) || reply?.id!==pending.messageId || reply?.status!=='error' || (chat.continuedTo && !chat.continuedUnlocked)){delete chat.networkResume;changed();continue;}
  const host=probeHost(pending.agent);
  if(!results.has(host))results.set(host,await probe(host).catch(()=>false));
  if(!results.get(host)){pending.checks=(pending.checks || 0)+1;pending.lastCheckAt=now();pending.nextCheckAt=now()+nextCheckDelay(pending.checks);changed();continue;}
  chat.networkResumeLog=[...recent(chat,now()),now()];
  pending.status='starting';changed();
  try{await resume(chat,networkResumePrompt(pending.error),pending);started.push(chat.id);}
  catch(error){delete chat.networkResume;reply.error=`${reply.error}\nAutomatski nastavak posle prekida veze nije pokrenut: ${error.message}`;changed();}
 }
 return started;
}

export function createNetworkResume(options){
 let timer=null,busy=false;
 const schedule=()=>{
  clearTimeout(timer);
  const waiting=options.chats().filter(c=>c.networkResume?.status==='waiting');
  if(!waiting.length)return;
  const at=Math.min(...waiting.map(c=>c.networkResume.nextCheckAt || 0));
  timer=setTimeout(tick,Math.max(1000,Math.min(at-Date.now(),networkCheckDelays.at(-1))));timer.unref?.();
 };
 async function tick(){
  if(busy)return;busy=true;
  try{await checkNetworkChats({...options,chats:options.chats()});}
  catch(error){console.error('Nastavak posle prekida veze:',error.message);}
  finally{busy=false;}
  schedule();
 }
 return {schedule,tick,stop:()=>clearTimeout(timer)};
}
