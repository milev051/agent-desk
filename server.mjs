import {createWarmup,lightModel} from './warmup.mjs';
import {createChatFiles} from './chat-files.mjs';
import {preferredEffort} from './public/reasoning.mjs';
import http from 'node:http';
import {createArchive} from './archive.mjs';
import {createFolders} from './folders.mjs';
import {browseFiles,withFiles,filePath} from './files.mjs';
import {chatStructure,linkedPaths} from './public/sidebar-groups.mjs';
import {createQuotaHistory} from './quota-history.mjs';
import {createLimits} from './limits.mjs';
import {createPhoneAccess} from './phone-access.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import zlib from 'node:zlib';
import { command, parseEvent, names } from './adapters.mjs';
import { catalog, quickCatalog, validateEffort } from './models.mjs';
import { transferableMessages, transferPlan, historyText, contextEstimate } from './context.mjs';
import { createTitleManager } from './titles.mjs';
import { createSpeech, spokenText, speechInput, speechSlice, speechHash, speechLabel, speechModel, joinWavs } from './speech.mjs';
import { usageDelta } from './usage.mjs';
import { buildAccounting } from './accounting.mjs';
import {createBatteryStatus} from './battery.mjs';
import { createPush } from './push.mjs';
import { createProgressPush } from './progress-push.mjs';
import webpush from 'web-push';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.AGENT_DESK_DATA || path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const archive=createArchive(dataDir);archive.prune();const archiveCleanup=setInterval(()=>archive.prune(),3600000);archiveCleanup.unref();
const folders=createFolders(path.join(dataDir,'folders.json'));
function broadcastFolders(){const payload=`event: folders\ndata: ${JSON.stringify(folders.list())}\n\n`;for(const res of listeners)res.write(payload);}
const dataFile = path.join(dataDir, 'chats.json');
const defaultsFile = path.join(dataDir, 'defaults.json');
let defaults = Object.fromEntries(Object.keys(names).map(agent => [agent, {model:'',effort:''}]));
if (fs.existsSync(defaultsFile)) defaults = {...defaults, ...JSON.parse(fs.readFileSync(defaultsFile,'utf8'))};
let chats = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];
for (const chat of chats) { chat.sessionOffsets ||= {};if(chat.queue?.length)chat.queuePaused=true; if(chat.sessions[chat.settings.agent] && chat.sessionOffsets[chat.settings.agent]===undefined)chat.sessionOffsets[chat.settings.agent]=chat.messages.length; }
for (const chat of chats) for (const m of chat.messages) if (m.status === 'running') { m.status = 'interrupted'; m.error = 'Aplikacija je restartovana tokom odgovora.'; }
for(const chat of chats)for(const m of chat.messages)if(m.agent==='codex' && m.usage?.scope==='run' && !m.usageTotal)m.usage.scope='session';
const running = new Map(), listeners = new Set();
let shuttingDown=false;
const port = Number(process.env.PORT || 4317);
const quotaHistory=createQuotaHistory(path.join(dataDir,'limit-history.json'),{turns:()=>chats.flatMap(c=>c.messages.filter(m=>m.role==='assistant' && m.createdAt && (m.completedAt || m.status==='running')).map(m=>({chatId:c.id,parentChatId:c.parentChatId,title:c.title,messageId:m.id,agent:m.agent,model:m.model,createdAt:m.createdAt,completedAt:m.completedAt || null})))});
const limits=createLimits({onSample:sample=>{if(quotaHistory.observe(sample)){broadcast();scheduleChatFiles();}},cacheFile:path.join(dataDir,'limits-cache.json'),enabled:process.platform==='darwin' && process.env.AGENT_DESK_DISABLE_LIMITS!=='1'});
const phoneOriginFile=path.join(process.env.AGENT_DESK_CONFIG || path.join(os.homedir(),'.config','agent-desk'),'phone-origin');
const savedPhoneOrigin=fs.existsSync(phoneOriginFile)?fs.readFileSync(phoneOriginFile,'utf8').trim():'';
const phone=createPhoneAccess({sessionFile:path.join(path.dirname(phoneOriginFile),'phone-sessions.json'),port,gatewayPort:Number(process.env.AGENT_DESK_PHONE_PORT || port+2),origin:process.env.AGENT_DESK_PHONE_ORIGIN || savedPhoneOrigin});
const batteryStatus=createBatteryStatus();
const phonePush=createPush({keysFile:path.join(dataDir,'vapid.json'),subscriptionsFile:path.join(dataDir,'push-subscriptions.json'),sender:webpush});
const chatFiles=createChatFiles(dataDir);
let chatFilesTimer;
const statisticsFile=path.join(dataDir,'statistika.json');let statisticsSnapshot='';
function syncChatFiles(){clearTimeout(chatFilesTimer);chatFilesTimer=null;try{chatFiles.sync(chats);const report={note:'Tokeni su iz CLI zapisa. Cena je procena po API tarifama, ne račun pretplate. Promene limita su očitani intervali, ne precizna potrošnja jednog četa.',accounting:buildAccounting(chats),limits:quotaHistory.list()};const snapshot=JSON.stringify(report);if(snapshot!==statisticsSnapshot){fs.writeFileSync(statisticsFile+'.tmp',JSON.stringify({updatedAt:new Date().toISOString(),...report},null,2),{mode:0o600});fs.renameSync(statisticsFile+'.tmp',statisticsFile);statisticsSnapshot=snapshot;}}catch(error){console.error('Čitljivi zapisi i statistika:',error.message);}}
syncChatFiles();
function scheduleChatFiles(){if(!chatFilesTimer){chatFilesTimer=setTimeout(syncChatFiles,1000);chatFilesTimer.unref();}}
const save = () => { fs.writeFileSync(dataFile + '.tmp', JSON.stringify(chats, null, 2), { mode: 0o600 }); fs.renameSync(dataFile + '.tmp', dataFile);scheduleChatFiles(); };
let usageCache;
const historyCounts=new Map();
const accounting=()=>usageCache ||= buildAccounting(chats);
const historyForCount=c=>historyText(c.messages.filter(m=>m.text));
const historyHash=text=>createHash('sha256').update(text).digest('hex');
// Procene za sve četove i agente traju stotinama ms, a broadcast ide i 10 puta u sekundi dok agent piše.
// Računaju se ponovo samo kad se promeni nešto od čega zavise; menja se praktično samo poslednja poruka.
// Izmena fajlova interfejsa javlja otvorenim pregledačima da učitaju novu verziju; serverski kod i dalje traži restart.
let reloadTimer=null;
try{fs.watch(path.join(root,'public'),{recursive:true},()=>{clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{for(const res of listeners)res.write('event: reload\ndata: {}\n\n');},500);});}catch(error){console.error('Praćenje interfejsa:',error.message);}
const estimateCache=new WeakMap();
function estimates(c){
  const last=c.messages.at(-1),key=[c.settings.agent,c.settings.instructions || '',JSON.stringify(c.sessions),JSON.stringify(c.sessionOffsets || {}),c.messages.length,last?.id,last?.text?.length,last?.actions?.length,last?.model,last?.createdAt,last?.sentAt].join('|');
  let hit=estimateCache.get(c);
  if(hit?.key!==key){
    const transferEstimates=Object.fromEntries(Object.keys(names).map(agent=>[agent,contextEstimate(c,agent)]));
    hit={key,hash:historyHash(historyForCount(c)),context:contextEstimate(c),transferEstimates,transfers:Object.fromEntries(Object.entries(transferEstimates).map(([agent,est])=>[agent,est.transfer]))};estimateCache.set(c,hit);
  }
  return hit;
}
const publicChat = c => {
  const {hash,context,transferEstimates,transfers}=estimates(c);
  return { ...c, quotaChanges:quotaHistory.forChat(c.id), historyTokenCount:c.historyTokenCount?.hash===hash?c.historyTokenCount:null, usageSummary:accounting().chats[c.id], running: running.has(c.id), context, transferEstimates, transfers };
};
// Tok događaja posle prve pune liste šalje samo izmenjene četove, a u njima samo izmenjene poruke.
let sent=new Map(),sentOrder='';
function eventPayload(){
  const list=chats.map(publicChat),next=new Map(),changed=[],order=JSON.stringify(list.map(c=>c.id));
  for(const {messages,...rest} of list){
    const meta=JSON.stringify(rest),before=sent.get(rest.id),strings=new Map(),fresh=[];
    for(const m of messages){const text=JSON.stringify(m);strings.set(m.id,text);if(before?.messages.get(m.id)!==text)fresh.push(text);}
    next.set(rest.id,{meta,messages:strings});
    if(!before || before.meta!==meta || fresh.length || before.messages.size!==strings.size)changed.push(`{"chat":${meta},"order":${JSON.stringify(messages.map(m=>m.id))},"messages":[${fresh.join(',')}]}`);
  }
  const same=!changed.length && order===sentOrder;sent=next;sentOrder=order;
  return same?null:`data: {"order":${order},"changed":[${changed.join(',')}]}\n\n`;
}
let broadcastTimer = null, broadcastPending = false;
function broadcast(immediate = false) {
  if (immediate) {
    if (broadcastTimer) { clearTimeout(broadcastTimer); broadcastTimer = null; }
    broadcastPending = false;
    const payload = eventPayload();
    if (payload) for (const res of listeners) res.write(payload);
    return;
  }
  if (!broadcastTimer) {
    const payload = eventPayload();
    if (payload) for (const res of listeners) res.write(payload);
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      if (broadcastPending) {
        broadcastPending = false;
        broadcast();
      }
    }, 100);
  } else {
    broadcastPending = true;
  }
}
function update() { usageCache=null;save(); broadcast(true); }
const googleKeyFile=path.join(process.env.AGENT_DESK_CONFIG || path.join(os.homedir(),'.config','agent-desk'),'google-api-key');
const titleManager=createTitleManager({settingsFile:path.join(dataDir,'title-settings.json'),keyFile:googleKeyFile,getChat:id=>chats.find(c=>c.id===id),changed:update});
const speech=createSpeech({keyFile:path.join(path.dirname(googleKeyFile),'openai-tts-key')});
function speechDir(chatId){return path.join(dataDir,'govor',chatId);}
function speechClips(chatId){const file=path.join(speechDir(chatId),'index.json');if(!fs.existsSync(file))return [];try{const data=JSON.parse(fs.readFileSync(file,'utf8'));return Array.isArray(data)?data:[];}catch{return [];}}
function sendAudio(req,res,file,filename){
  const size=fs.statSync(file).size, range=req.headers.range, headers={'Content-Type':'audio/wav','Accept-Ranges':'bytes','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(filename)}`};
  if(!range){res.writeHead(200,{...headers,'Content-Length':size});return fs.createReadStream(file).pipe(res);}
  const found=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!found){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
  let start=found[1]?Number(found[1]):0, end=found[2]?Number(found[2]):size-1;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
  end=Math.min(end,size-1);
  res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
  return fs.createReadStream(file,{start,end}).pipe(res);
}
function locate(name) {
  const dirs = [...(process.env.PATH || '').split(path.delimiter), '/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'), path.join(os.homedir(), '.grok/bin')];
  for (const dir of dirs) { const p = path.join(dir, name); try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {} }
  return null;
}
const binaries = { codex: locate('codex'), claude: locate('claude'), grok: locate('grok'), antigravity: locate('agy') };
function metadata() { return { cwd: root, chatFork: true, limitHistory:true, titleSettings:titleManager.settings(), agents: Object.entries(names).map(([id, name]) => ({ id, name, available: !!binaries[id], detail: binaries[id] ? 'CLI pronađen · koristi postojeću prijavu' : 'CLI nije pronađen' })) }; }
function validate(s) {
  if (!Object.hasOwn(names, s.agent)) throw new Error('Nepoznat agent.');
  if (!['full', 'read'].includes(s.access)) throw new Error('Nepoznat pristup.');
  if (typeof s.effort !== 'string' || !/^[a-z0-9_-]{0,40}$/.test(s.effort)) throw new Error('Nepoznat nivo razmišljanja.');
  for (const key of ['cwd', 'model', 'instructions']) if (typeof s[key] !== 'string') throw new Error('Neispravna podešavanja.');
  if (s.instructions.length > 20000 || s.model.length > 200) throw new Error('Podešavanja su predugačka.');
  s.cwd = s.cwd.startsWith('~/') ? path.join(os.homedir(), s.cwd.slice(2)) : s.cwd;
  if (!path.isAbsolute(s.cwd) || !fs.statSync(s.cwd).isDirectory()) throw new Error('Radni folder mora biti postojeća apsolutna putanja.');
  return s;
}
async function body(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 200000) throw new Error('Poruka je predugačka.'); }
  return JSON.parse(data || '{}');
}
function stop(id) { const run = running.get(id); if (run) { run.stopped = true; try { process.kill(-run.child.pid, 'SIGTERM'); } catch {} run.killTimer = setTimeout(() => { try { process.kill(-run.child.pid, 'SIGKILL'); } catch {} }, 2000); run.killTimer.unref(); } }
function desktopNotify(title, body) {
  if (process.platform !== 'darwin' || process.env.AGENT_DESK_DISABLE_LIMITS === '1') return;
  const quoted = value => `"${String(value).replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ').slice(0, 140)}"`;
  const child = spawn('/usr/bin/osascript', ['-e', `display notification ${quoted(body)} with title ${quoted(title)}`], {stdio:'ignore'});
  child.unref();
}
function stopRelated(id) {for(const c of chats)if(c.parentChatId===id)stop(c.id);stop(id);}
function resolveLocalFile(p){for(const cwd of new Set([root,...chats.map(c=>c.settings.cwd)])){try{return filePath(p,cwd);}catch{}}throw Error('Fajl nije dostupan.');}
function appContext(chat) {
  const address=`http://127.0.0.1:${port}`;
  const structure=chatStructure(chats,chat.id,{isRunning:c=>running.has(c.id)});const children=structure.filter(c=>c.parentChatId===chat.id);const paths=linkedPaths(chat);
  const brief=structure.map(({id,parentChatId,title,agent,status})=>({id,parentChatId,title,agent,status}));
  // Sesija agenta već ima pun tekst iz prve poruke, pa se ponavlja samo stanje.
  if(chat.sessions?.[chat.settings.agent])return `Snimak strukture povezanih četova u trenutku slanja: ${JSON.stringify(brief)}.${paths.length?` Povezane putanje (sadržaj nije učitan): ${JSON.stringify(paths)}.`:''} Okruženje: Agent Desk; čet ${chat.id}; radni folder ${chat.settings.cwd}; agent ${chat.settings.agent}; model ${chat.settings.model || 'CLI podrazumevani'}. Datumi poruka su ISO UTC. Statistika tokena, procene cene i promena limita je u ${statisticsFile}; pročitaj samo kada je potrebna. Fajl koji korisnik treba da preuzme, i na telefonu, kopiraj u ${path.join(dataDir,'prilozi',chat.id)}/ i navedi punu putanju u odgovoru; interfejs prikazuje sliku ili link za preuzimanje. Podčetovi i dalje samo kroz POST ${address}/api/chats/${chat.id}/delegate (pravila iz prve poruke važe; "childId" nastavlja postojeći podčet).`;
  return `Snimak strukture povezanih četova u trenutku slanja: ${JSON.stringify(brief)}. Povezane putanje (sadržaj nije učitan): ${JSON.stringify(paths)}. Stanja su snimak pri slanju; tokom rada koristi GET za aktuelno stanje.\nPostojeći podčetovi (ID): ${JSON.stringify(children.map(c=>c.id))}. Završen CLI proces ne znači da je podagent izgubljen: čet i sesija su sačuvani. Za nastavak istog zadatka koristi postojeći podčet, ne pravi zamenu. POST ${address}/api/chats/${chat.id}/delegate sa telom {"childId":"postojeći ID","task":"nastavi zadatak"} nastavlja podčet sa njegovom istorijom i sesijom. Novi podčet napravi samo za nov zadatak ili izričit zahtev korisnika.\nOkruženje: Agent Desk; čet ${chat.id}; radni folder ${chat.settings.cwd}; agent ${chat.settings.agent}; model ${chat.settings.model || 'CLI podrazumevani'}. Datumi poruka su ISO UTC. Statistika tokena, procene cene i promena limita je u ${statisticsFile}; pročitaj samo kada je potrebna. Fajl koji korisnik treba da preuzme, i na telefonu, kopiraj u ${path.join(dataDir,'prilozi',chat.id)}/ i navedi punu putanju u odgovoru; interfejs prikazuje sliku ili link za preuzimanje.\nAko zadatak zahteva podagenta, možeš lokalnim HTTP zahtevom napraviti podčet: POST ${address}/api/chats/${chat.id}/delegate, header Origin: ${address}, Content-Type: application/json, telo {"agent":"codex","name":"Provera testova","task":"konkretan zadatak"} (agenti: codex, claude, grok, antigravity). Polje name je kratak naziv uloge ili zadatka podagenta, ne samo broj radnika. Odgovor sadrži id. GET ${address}/api/chats/ID vraća running i messages. Podčet koristi isti folder i zasebnu sesiju; rezultat pročitaj i objedini. Najviše dva istovremeno aktivna podčeta, samo jedan nivo delegiranja. Ukupan broj podčetova po odgovoru nije ograničen. Za više zadataka sačekaj završetak aktivnih podčetova preko GET, pa pozovi delegate za sledeće. Ako delegate vrati 409 zbog kapaciteta, sačekaj slobodno mesto; ne zaobilazi Agent Desk direktnim pokretanjem drugih CLI agenata. Sve podagente ovog zadatka pokreni kroz delegate da budu vidljivi u interfejsu, sa sačuvanim četom i potrošnjom. Ne otvaraj podčet bez potrebe za korisnikov zadatak.`;
}
function drainQueue(chat) {
  if(shuttingDown || chat.queuePaused || chat.queueError || running.has(chat.id) || !chat.queue?.length)return;
  const next=chat.queue.shift();
  send(chat,next.text,{createdAt:next.createdAt,origin:'queue'}).catch(error=>{chat.queue.unshift(next);chat.queueError=error.message;update();});
}
async function send(chat, prompt, options={}) {
  const agent = chat.settings.agent;
  const previousSession=chat.sessions[agent];
  const previousMessage=agent==='codex' && previousSession ? [...chat.messages.slice(0,chat.sessionOffsets?.codex ?? chat.messages.length)].reverse().find(m=>m.agent==='codex' && (m.usageTotal || m.usage?.scope==='session')) : null;
  const baseline=previousSession && chat.usageBaselines?.[agent]?.sessionId===previousSession ? chat.usageBaselines[agent].usage : previousMessage?.usageTotal || previousMessage?.usage;
  if (!binaries[agent]) throw new Error(metadata().agents.find(a => a.id === agent).detail);
  validateEffort(quickCatalog(binaries), validate(chat.settings));
  const plan=transferPlan(chat,agent), historyTransferred=!!plan.text;
  const sentAt=Date.now(),createdAt=options.createdAt || sentAt;
  const newMessage=historyText([{role:'user',text:prompt,createdAt,sentAt}]);
  const history = historyTransferred ? `Prethodne poruke iz ovog četa (istorija razgovora${chat.sessions[agent]?', dopuna od prethodnog odgovora ovog agenta':''}):\n${plan.text}\n\nNova poruka korisnika:\n${newMessage}` : newMessage;
  const spec = command(chat,options.minimalContext?prompt:`${appContext(chat)}\n\n${history}`, binaries[agent]);
  const child = spawn(spec.executable, spec.args, { cwd: chat.settings.cwd, env: { ...process.env, NO_COLOR: '1' }, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const reply = { id: randomUUID(), role: 'assistant', agent, model: chat.settings.model || '', configuredModel: chat.settings.model || '', historyTransferred, usageTracked:true, usageCwd:chat.settings.cwd, text: '', status: 'running', activity: 'Pokrećem agenta…', createdAt: Date.now() };
  delete chat.ephemeral;
  chat.messages.push({ id: randomUUID(), role: 'user', text: prompt, createdAt,sentAt,origin:options.origin || 'user',...(options.requestId?{requestId:options.requestId}:{}) }, reply);
  if (chat.title === 'Novi čet') chat.title = prompt.slice(0, 52);
  chat.updatedAt = Date.now();
  const run = { child, stopped: false }; run.done = new Promise(resolve=>run.resolve=resolve); running.set(chat.id, run); update();
  const progressPush=createProgressPush({notify:body=>!options.silent && phonePush.notify({title:chat.title||'Agent Desk',body,chatId:chat.id,tag:chat.id})});
  let buffer = '', stderr = '', streamedBlock = false, finished = false;
  function event(line) {
    if (!line.trim()) return;
    let data; try { data = JSON.parse(line); } catch { reply.activity = line.slice(-300); broadcast(); return; }
    const e = parseEvent(agent, data);
    if (e.model) reply.model = e.model;
    if (e.usage) {
      if(e.usage.scope==='session') {
        const zero=Object.fromEntries(Object.keys(e.usage).filter(k=>typeof e.usage[k]==='number').map(k=>[k,0]));
        reply.usageTotal=e.usage;
        reply.usage=usageDelta(e.usage,!previousSession || chat.sessions[agent]!==previousSession ? zero : baseline);
        chat.usageBaselines ||= {};chat.usageBaselines[agent]={sessionId:chat.sessions[agent],usage:e.usage};
      } else reply.usage=e.usage;
    }
    if (e.session && chat.sessions[agent] !== e.session) { chat.sessions[agent] = e.session; reply.sessionId=e.session; save(); }
    // Tekst između alata stiže kao zasebni blokovi; bez razmaka bi se rečenice slepile.
    if (e.textStart && reply.text && !reply.text.endsWith('\n\n')) reply.text += '\n\n';
    if (e.delta) { reply.text += e.delta; streamedBlock = true; }
    if (e.text) { if (!streamedBlock) reply.text += (reply.text ? '\n\n' : '') + e.text; streamedBlock = false; }
    if (typeof e.replace === 'string') reply.text = e.replace;
    if (e.final && !reply.text) reply.text = e.final;
    if (e.activity) reply.activity = e.activity;
    for (const a of e.actions || []) {
      reply.actions ||= [];
      const last = reply.actions.at(-1);
      if (a.key ? reply.actions.some(x => x.key === a.key) : a.kind === 'tool' && last?.kind === 'tool' && last.text === a.text) continue;
      if (reply.actions.length < 300) reply.actions.push({ ...a, text: String(a.text || '').slice(0, 300) });
    }
    if (e.activity || e.actions?.length) progressPush.tool(reply.text);
    if (e.error) reply.error = e.error;
    broadcast();
  }
  child.stdout.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) event(line);
  });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-6000); });
  function finish(code, error) {
    if (finished) return; finished = true; clearTimeout(run.timeout); clearTimeout(run.killTimer);
    if (buffer.trim()) event(buffer);
    progressPush.close();
    running.delete(chat.id); reply.activity = '';reply.completedAt=Date.now();
    reply.status = run.stopped ? 'stopped' : code === 0 && !error && !reply.error ? 'done' : 'error';
    if (reply.status === 'error') reply.error ||= error?.message || stderr.trim() || `Agent je završio sa kodom ${code}.`;
    if (!reply.text && reply.status === 'done') { reply.status = 'error'; reply.error = 'Agent je završio bez tekstualnog odgovora. Proveri CLI prijavu.'; }
    if(reply.status==='done')chat.transferPending=false;
    if(chat.sessions[agent]){chat.sessionOffsets ||= {};chat.sessionOffsets[agent]=chat.messages.length;}
    if(reply.status==='error' || reply.status==='stopped')chat.queuePaused=true;
    chat.updatedAt = Date.now(); update();run.resolve(reply);setImmediate(()=>drainQueue(chat));
    const outcome={done:'Završeno',error:'Greška',stopped:'Zaustavljeno'}[reply.status];
    if(outcome && !options.silent){void phonePush.notify({title:chat.title||'Agent Desk',body:outcome,chatId:chat.id,tag:chat.id});desktopNotify(chat.title||'Agent Desk',outcome);}
  }
  child.on('error', error => finish(null, error)); child.on('close', code => finish(code));
  child.stdin.on('error', () => {}); child.stdin.end(spec.input || undefined);
  run.timeout = setTimeout(() => { reply.error = `Prekinuto posle ${(options.timeoutMs || 1800000)/60000} minuta. Možeš poslati novu poruku.`; stop(chat.id); }, options.timeoutMs || 30 * 60 * 1000); run.timeout.unref();
  return run;
}
const warmup=createWarmup(path.join(dataDir,'provera-agenata.json'),{execute:async(agent,chosen,prompt)=>{
 if(!binaries[agent])return {status:'skipped',error:'CLI nije dostupan.'};
 const available=(await catalog(binaries))[agent]?.models||[],model=chosen||lightModel(agent,available);
 if(!model)throw Error('Lakši model nije dostupan. Izaberi model u podešavanjima.');
 if(!available.some(m=>m.id===model))throw Error('Model nije u spisku dostupnih modela.');
 const efforts=available.find(m=>m.id===model)?.efforts||[],effort=efforts.some(e=>e.id==='low')?'low':preferredEffort(quickCatalog(binaries),agent,model);
 const chat={id:randomUUID(),title:'Jednokratna provera · '+agent,createdAt:Date.now(),settings:validate({agent,model,access:['grok','antigravity'].includes(agent)?'full':'read',cwd:root,instructions:'',effort}),sessions:{},sessionOffsets:{},messages:[]};
 // Temporary chat never enters the saved chat list. Only its outcome and usage remain.
 const run=await send(chat,prompt,{origin:'warmup',minimalContext:true,silent:true,timeoutMs:120000});const reply=await run.done;
 return {model,status:reply.status,usage:reply.usage||null,...(reply.error?{error:reply.error.slice(0,500)}:{})};
}});
const server = http.createServer(async (req, res) => {
  // Lista četova ima više od 1 MB; gzip je oko pet puta manji, što se oseća na telefonu.
  const gzip=/\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const respond=(status,headers,body)=>{if(gzip && body.length>1024){headers={...headers,'Content-Encoding':'gzip',Vary:'Accept-Encoding'};body=zlib.gzipSync(body,{level:4});}res.writeHead(status,headers);res.end(body);};
  const json = (status, value) => respond(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, Buffer.from(JSON.stringify(value)));
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return json(403, { error: 'Dozvoljen je samo lokalni pristup.' });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (!['GET', 'HEAD'].includes(req.method) && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return json(403, { error: 'Neispravno poreklo zahteva.' });
    if(url.pathname.startsWith('/api/phone')){if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(403,{error:'Samo lokalni pristup.'});if(req.method==='GET' && url.pathname==='/api/phone')return json(200,await phone.info());if(req.method==='GET' && url.pathname==='/api/phone/qr'){const png=await phone.qr();res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});return res.end(png);}if(req.method==='POST' && url.pathname==='/api/phone/revoke'){phone.revoke();return json(200,{ok:true});}return json(404,{error:'Nije pronađeno.'});}
    if(url.pathname==='/api/title-settings'){if(req.method==='GET')return json(200,titleManager.settings());if(req.method==='PUT'){if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(403,{error:'Samo lokalni pristup.'});return json(200,titleManager.configure(await body(req)));}}
    if(req.method==='POST' && url.pathname==='/api/title-settings/check')return json(200,await titleManager.verify());
    if(req.method==='POST' && url.pathname==='/api/open-file'){
      if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(403,{error:'Samo lokalni pristup.'});
      const b=await body(req),p=resolveLocalFile(b.path);if(process.platform!=='darwin')throw Error('Otvaranje fajla je dostupno na macOS-u.');
      await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/open',[p]);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Fajl nije otvoren.')));});return json(200,{ok:true});
    }
    if(req.method==='GET' && (url.pathname.startsWith('/files/')||url.pathname.startsWith('/Users/')||url.pathname.startsWith('/Volumes/'))){
      const p=resolveLocalFile(decodeURIComponent(url.pathname.startsWith('/files/')?url.pathname.slice(6):url.pathname));const stat=fs.statSync(p);if(!stat.isFile()||stat.size>20000000)throw Error('Izaberi fajl do 20 MB.');
      const types={'.html':'text/html','.htm':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
      res.writeHead(200,{'Content-Type':(types[path.extname(p).toLowerCase()]||'text/plain')+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox allow-scripts; default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'"});fs.createReadStream(p).pipe(res);return;
    }
    if(req.method==='GET' && url.pathname==='/api/limit-history')return json(200,quotaHistory.list());
    if(req.method==='GET' && url.pathname==='/api/limits')return json(200,limits.snapshot());
    if(url.pathname==='/api/warmup'){if(req.method==='GET')return json(200,warmup.view());if(req.method==='PUT')return json(200,warmup.configure(await body(req)));}
    if(req.method==='POST' && url.pathname==='/api/warmup/run'){if(warmup.view().running)return json(409,{error:'Provera agenata je već u toku.'});void warmup.run().catch(error=>console.error('Provera agenata:',error.message));return json(202,warmup.view());}
    if(req.method==='GET' && url.pathname==='/api/statistics/file'){
      syncChatFiles();const content=fs.readFileSync(statisticsFile);
      return respond(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="statistika.json"','Cache-Control':'no-store'},content);
    }
    if(req.method==='POST' && url.pathname==='/api/statistics/reveal'){
      if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(403,{error:'Samo lokalni pristup.'});
      if(process.platform!=='darwin')throw Error('Finder je dostupan samo na macOS-u.');
      syncChatFiles();await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/open',['-R',statisticsFile]);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Folder statistike nije otvoren.')));});
      return json(200,{ok:true});
    }
    if(req.method==='GET' && url.pathname==='/api/usage')return json(200,accounting());
    if(req.method==='GET' && url.pathname==='/api/battery')return json(200,await batteryStatus.status());
    if(req.method==='POST' && url.pathname==='/api/battery/phone'){batteryStatus.report(await body(req));return json(200,{ok:true});}
    if(req.method==='GET' && url.pathname==='/api/push/key')return json(200,{publicKey:phonePush.publicKey()});
    if(req.method==='POST' && url.pathname==='/api/push/subscribe'){phonePush.save(await body(req));return json(200,{ok:true});}
    if(req.method==='DELETE' && url.pathname==='/api/push/subscribe'){phonePush.remove(await body(req));return json(200,{ok:true});}
    if (req.method === 'GET' && url.pathname === '/api/meta') return json(200, metadata());
    if (req.method === 'GET' && url.pathname === '/api/defaults') return json(200, defaults);
    if (req.method === 'PUT' && url.pathname === '/api/defaults') {
      const b = await body(req), next = {};
      const models = quickCatalog(binaries);
      for (const agent of Object.keys(names)) {
        const d = b[agent];
        if (!d || typeof d.model !== 'string' || d.model.length > 200 || typeof d.effort !== 'string' || !/^[a-z0-9_-]{0,40}$/.test(d.effort)) throw new Error('Neispravna podrazumevana podešavanja.');
        next[agent] = {model:d.model,effort:d.effort};
        validateEffort(models, {agent,...next[agent]});
      }
      fs.writeFileSync(defaultsFile + '.tmp', JSON.stringify(next,null,2), {mode:0o600}); fs.renameSync(defaultsFile + '.tmp',defaultsFile);
      defaults = next; return json(200, defaults);
    }
    if (req.method === 'POST' && url.pathname === '/api/antigravity/login') {
      if (!binaries.antigravity) throw new Error('Antigravity CLI nije pronađen.');
      if (process.platform !== 'darwin') throw new Error('Pokreni agy u terminalu za prijavu.');
      const child = spawn('/usr/bin/open', [path.join(root,'Antigravity nalog.command')], {stdio:'ignore'});
      await new Promise((resolve,reject) => {child.on('error',reject);child.on('close',code => code === 0 ? resolve() : reject(new Error('Terminal nije otvoren.')));});
      return json(200,{ok:true});
    }
    if (req.method === 'GET' && url.pathname === '/api/models') return json(200, await catalog(binaries));
    if(req.method==='GET' && url.pathname==='/api/archive')return json(200,archive.list().map(r=>({id:r.id,archivedAt:r.archivedAt,expiresAt:r.expiresAt,chats:r.chats.map(c=>({id:c.id,title:c.title,agent:c.settings.agent,model:c.settings.model}))})));
    const restoreMatch=url.pathname.match(/^\/api\/archive\/([\w-]+)\/restore$/);
    if(req.method==='POST' && restoreMatch){
      const record=archive.read(restoreMatch[1]);if(!record)return json(404,{error:'Arhivirani čet nije pronađen.'});
      // Podčetovi arhivirani zasebno vraćaju se zajedno sa roditeljem.
      const ids=new Set(record.chats.map(c=>c.id)),children=archive.list().filter(r=>r.id!==record.id && r.chats.every(c=>ids.has(c.parentChatId)));
      const restored=[...record.chats,...children.flatMap(r=>r.chats)];if(restored.some(c=>chats.some(x=>x.id===c.id)))throw Error('Čet je već u listi.');
      for(const c of restored)if(c.parentChatId && ![...chats,...restored].some(x=>x.id===c.parentChatId)){c.formerParentChatId=c.parentChatId;c.formerParentTurnId=c.parentTurnId;delete c.parentChatId;delete c.parentTurnId;}
      chats.unshift(...restored);for(const c of chats)if(restored.some(x=>x.id===c.formerParentChatId)){c.parentChatId=c.formerParentChatId;c.parentTurnId=c.formerParentTurnId;delete c.formerParentChatId;delete c.formerParentTurnId;}
      update();archive.remove(record.id);for(const r of children)archive.remove(r.id);return json(200,{ok:true});
    }
    const queueMatch=url.pathname.match(/^\/api\/chats\/([\w-]+)\/queue(?:\/([\w-]+))?$/);
    if(queueMatch) {
      const chat=chats.find(c=>c.id===queueMatch[1]);if(!chat)return json(404,{error:'Čet nije pronađen.'});
      if(req.method==='POST') {
        if(queueMatch[2]==='resume'){chat.queuePaused=false;delete chat.queueError;update();drainQueue(chat);return json(200,publicChat(chat));}
        const b=await body(req);if(typeof b.text!=='string'||!b.text.trim()||b.text.length>100000)throw new Error('Unesi poruku do 100.000 karaktera.');
        chat.queue ||= [];
        const text=withFiles(b.text.trim(),b.files,chat.settings.cwd),last=chat.queue.at(-1);
        if(last){const joined=`${last.text}\n\n${text}`;if(joined.length>100000)throw new Error('Unesi poruku do 100.000 karaktera.');last.text=joined;}
        else{if(chat.queue.length>=10)throw new Error('Red čekanja je ograničen na 10 poruka.');chat.queue.push({id:randomUUID(),text,createdAt:Date.now()});}
        chat.queuePaused=false;delete chat.queueError;update();drainQueue(chat);return json(202,publicChat(chat));
      }
      if(req.method==='DELETE' && queueMatch[2]){chat.queue=(chat.queue || []).filter(m=>m.id!==queueMatch[2]);update();return json(200,publicChat(chat));}
    }
    if (req.method === 'GET' && url.pathname === '/api/chats') return json(200, chats.map(publicChat));
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...(gzip?{'Content-Encoding':'gzip',Vary:'Accept-Encoding'}:{}) });
      const stream=gzip?zlib.createGzip({level:4}):null;stream?.pipe(res);
      const sink=stream?{write:text=>{stream.write(text);stream.flush();}}:res;
      listeners.add(sink); sink.write(`data: ${JSON.stringify(chats.map(publicChat))}\n\n`);
      const timer = setInterval(() => sink.write(': ping\n\n'), 15000);
      req.on('close', () => { listeners.delete(sink); clearInterval(timer); stream?.destroy(); }); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/folders') return json(200, folders.list());
    if (req.method === 'POST' && url.pathname === '/api/folders') { const made=folders.add((await body(req)).name); broadcastFolders(); return json(201, made); }
    const folderMatch=url.pathname.match(/^\/api\/folders\/([\w-]+)$/);
    if (folderMatch && req.method === 'PATCH') { const renamed=folders.rename(folderMatch[1], (await body(req)).name); broadcastFolders(); return json(200, renamed); }
    if (folderMatch && req.method === 'DELETE') { folders.remove(folderMatch[1]); for (const chat of chats) if (chat.folderId===folderMatch[1]) delete chat.folderId; update(); broadcastFolders(); return json(200, {ok:true}); }
    if (req.method === 'POST' && url.pathname === '/api/chats') {
      const b = await body(req);
      const chat = { id: randomUUID(), title: 'Novi čet', ephemeral:true, createdAt: Date.now(), updatedAt: Date.now(), settings: validate({ agent: 'codex', model: '', access: 'full', cwd: root, instructions: '', effort: '', ...defaults[b.settings?.agent || 'codex'], ...b.settings }), sessions: {}, sessionOffsets:{}, messages: [] };
      if(b.folderId!==undefined){if(!folders.has(b.folderId))throw new Error('Folder nije pronađen.');chat.folderId=b.folderId;}
      if(b.settings?.model!==undefined && b.settings.effort===undefined)chat.settings.effort=preferredEffort(quickCatalog(binaries),chat.settings.agent,chat.settings.model);
      validateEffort(quickCatalog(binaries), chat.settings);
      chats.unshift(chat); update(); return json(201, publicChat(chat));
    }
    const emptyMatch=url.pathname.match(/^\/api\/chats\/([\w-]+)\/discard-empty$/);
    if(req.method==='POST' && emptyMatch){const chat=chats.find(c=>c.id===emptyMatch[1]);if(!chat)return json(200,{ok:true});
      if(running.has(chat.id)||chat.messages.length||chat.queue?.length||Object.keys(chat.sessions).length||chats.some(c=>c.parentChatId===chat.id))return json(409,{error:'Čet više nije prazan.'});
      chats=chats.filter(c=>c.id!==chat.id);update();return json(200,{ok:true});}
    const match = url.pathname.match(/^\/api\/chats\/([\w-]+)(?:\/(send|stop|reset-session|speak|speech|fork|delegate|reveal|record|count-tokens|files|upload|prilog)(?:\/([a-f0-9]{16}))?)?$/);
    if (match) {
      const chat = chats.find(c => c.id === match[1]); if (!chat) return json(404, { error: 'Čet nije pronađen.' });
      // Prilog sa telefona ili iz privremene memorije čuva se u data/prilozi/<čet>/ i povezuje kao obična putanja.
      if(req.method==='POST' && match[2]==='upload'){
        const name=decodeURIComponent(req.headers['x-file-name'] || 'prilog').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,' ').replace(/^[.\s]+/,'').slice(-80).trim() || 'prilog';
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>25*1024*1024)return json(413,{error:'Prilog može imati najviše 25 MB.'});chunks.push(chunk);}
        const dir=path.join(dataDir,'prilozi',chat.id);fs.mkdirSync(dir,{recursive:true,mode:0o700});
        const target=path.join(dir,new Date().toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15)+'-'+name);
        fs.writeFileSync(target,Buffer.concat(chunks),{mode:0o600});return json(201,{path:target});
      }
      if(req.method==='GET' && match[2]==='prilog'){
        const name=url.searchParams.get('name') || '',file=path.join(dataDir,'prilozi',chat.id,name),types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
        if(!name || name!==path.basename(name) || name.startsWith('.') || !fs.existsSync(file) || !fs.statSync(file).isFile())return json(404,{error:'Prilog nije pronađen.'});
        const type=types[path.extname(name).toLowerCase()];
        res.writeHead(200,{'Content-Type':type || 'application/octet-stream','Content-Disposition':`${type?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res);
      }
      if(req.method==='GET' && match[2]==='files'){const place=url.searchParams.get('place');let target=url.searchParams.get('path');if(place==='home')target=os.homedir();if(place==='desktop')target=fs.existsSync(path.join(os.homedir(),'Desktop'))?path.join(os.homedir(),'Desktop'):os.homedir();return json(200,browseFiles(target,chat.settings.cwd));}
      if(req.method==='GET' && !match[2])return json(200,publicChat(chat));
      if(req.method==='POST' && match[2]==='count-tokens'){
        const b=await body(req);if(b.consent!==true)return json(400,{error:'Brojanje šalje vidljivu istoriju Google-u. Potrebna je potvrda.'});
        if(running.has(chat.id))return json(409,{error:'Sačekaj završetak odgovora za brojanje.'});
        const text=historyForCount(chat),hash=historyHash(text);if(chat.historyTokenCount?.hash===hash)return json(200,publicChat(chat));
        const key=chat.id+':'+hash;let request=historyCounts.get(key);if(!request){request=text?titleManager.countTokens(text):Promise.resolve({tokens:0,model:'gemini-3.5-flash-lite',createdAt:Date.now()});historyCounts.set(key,request);}
        let result;try{result=await request;}finally{if(historyCounts.get(key)===request)historyCounts.delete(key);}
        if(chats.includes(chat) && historyHash(historyForCount(chat))===hash){chat.historyTokenCount={...result,hash};update();}return json(200,publicChat(chat));
      }
      if(['reveal','record'].includes(match[2])) {
        if(req.method!=='POST')return json(405,{error:'Koristi POST.'});
        if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(403,{error:'Samo 127.0.0.1.'});
        if(match[2]==='record')return json(200,{text:JSON.stringify(chat,null,2)});
        if(process.platform!=='darwin')throw new Error('Finder je dostupan samo na macOS-u.');syncChatFiles();
        await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/open',['-R',fs.existsSync(chatFiles.file(chat))?chatFiles.file(chat):dataFile]);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Finder nije otvoren.')));});
        return json(200,{ok:true});
      }

      if(req.method==='POST' && match[2]==='delegate') {
        if(chat.parentChatId)throw new Error('Podčet ne može da kreira novi nivo podčetova.');
        const parentTurnId=chat.messages.at(-1)?.id || 'manual';

        const b=await body(req);if(chats.filter(c=>c.parentChatId===chat.id && running.has(c.id)).length>=2)return json(409,{error:'Najviše dva aktivna podčeta. Sačekaj da jedan završi, pa ponovi delegate zahtev.'});if(typeof b.task!=='string'||!b.task.trim()||b.task.length>10000)throw new Error('Unesi konkretan zadatak do 10.000 karaktera.');
        if(b.childId!==undefined){const child=chats.find(c=>c.id===b.childId && c.parentChatId===chat.id);if(!child)throw Error('Izaberi postojeći podčet ovog roditelja.');if(running.has(child.id))return json(409,{error:'Podagent već radi.'});await send(child,b.task.trim(),{origin:'delegate'});return json(202,publicChat(child));}

        if(b.name!==undefined && (typeof b.name!=='string'||!b.name.trim()||b.name.length>80))throw new Error('Naziv podagenta mora imati 1-80 znakova.');
        const agent=b.agent || chat.settings.agent;if(!binaries[agent])throw new Error('Agent nije povezan.');
        const child={id:randomUUID(),title:b.name?.trim() || b.task.slice(0,52),...(b.name?{agentRole:b.name.trim(),titleManual:true}:{}),parentChatId:chat.id,parentTurnId,createdAt:Date.now(),updatedAt:Date.now(),settings:validateEffort(quickCatalog(binaries),validate({...chat.settings,agent,...defaults[agent]})),sessions:{},sessionOffsets:{},messages:[]};
        chats.unshift(child);update();await send(child,`Podzadatak iz četa ${chat.title}.\n\n${b.task}`,{origin:'delegate'});return json(202,publicChat(child));
      }
      if(req.method==='POST' && match[2]==='stop'){chat.queuePaused=true;stopRelated(chat.id);update();return json(200,{ok:true});}
      if(req.method==='POST' && match[2]==='reset-session'){
        if(running.has(chat.id))return json(409,{error:'Sačekaj odgovor ili zaustavi agenta.'});
        const agent=chat.settings.agent;
        delete chat.sessions[agent];
        if(chat.sessionOffsets)delete chat.sessionOffsets[agent];
        if(chat.usageBaselines)delete chat.usageBaselines[agent];
        chat.updatedAt=Date.now();update();return json(200,publicChat(chat));
      }
      if(req.method==='GET' && match[2]==='speech'){
        const clipId=match[3], clips=speechClips(chat.id), clip=clips.find(item=>item.id===clipId);
        const stored=clip?.file || (clipId?`${clipId}.wav`:'');
        const file=stored && path.basename(stored)===stored && path.join(speechDir(chat.id), stored);
        if(!clip || !file || !fs.existsSync(file) || !fs.statSync(file).isFile())return json(404,{error:'Snimak nije pronađen.'});
        return sendAudio(req, res, file, `${clip.label}.wav`);
      }
      if(req.method==='POST' && match[2]==='speak'){
        const b=await body(req);
        const message=chat.messages.find(m=>m.id===b.messageId && m.text);
        const spoken=speechInput(message?.text || '',b.selectedText);
        if(!spoken)return json(400,{error:'Poruka nema tekst za čitanje.'});
        const hash=speechHash(spoken);
        const clips=speechClips(chat.id);
        const found=clips.find(item=>item.hash===hash && item.file && path.basename(item.file)===item.file && fs.existsSync(path.join(speechDir(chat.id), item.file)));
        if(found)return json(200,{...found, messageId:message.id, selected:b.selectedText!==undefined, cached:true});
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),180000);
        res.on('close',()=>{if(!res.writableEnded)controller.abort();});
        try{
          const parts=[];
          let offset=0;
          while(!controller.signal.aborted){
            const slice=speechSlice(spoken, offset);
            if(!slice.text)break;
            parts.push(await speech.speak(slice.text, controller.signal));
            if(!slice.next)break;
            offset=slice.next;
          }
          if(controller.signal.aborted || res.writableEnded)return;
          const audio=joinWavs(parts);
          const createdAt=Date.now();
          const label=speechLabel(chat.title, createdAt, speechModel);
          const clip={id:hash, messageId:message.id, hash, label, file:`${label} ${hash}.wav`, model:speechModel, createdAt, bytes:audio.length};
          const dir=speechDir(chat.id);
          fs.mkdirSync(dir,{recursive:true, mode:0o700});
          fs.writeFileSync(path.join(dir, clip.file), audio, {mode:0o600});
          fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify([clip, ...clips.filter(item=>item.id!==clip.id)]), {mode:0o600});
          return json(200,{...clip, selected:b.selectedText!==undefined, cached:false});
        }catch(error){if(res.headersSent||res.writableEnded)return;return json(error.name==='AbortError'?504:400,{error:error.name==='AbortError'?'Čitanje je prekinuto.':error.message});}
        finally{clearTimeout(timer);}
      }
      if(req.method==='POST' && match[2]==='send'){const b=await body(req);req.sendBody=b;if(b.requestId!==undefined && (typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(b.requestId)))throw Error('Neispravan ID poruke.');if(b.requestId && chat.messages.some(m=>m.requestId===b.requestId))return json(202,{ok:true});}
      if (running.has(chat.id) && !(req.method === 'PATCH' && !match[2])) return json(409, { error: 'Sačekaj odgovor ili zaustavi agenta.' });

      if (req.method === 'POST' && match[2] === 'send') {
        const b = req.sendBody; if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 100000) throw new Error('Unesi poruku do 100.000 karaktera.');
        await send(chat, withFiles(b.text.trim(),b.files,chat.settings.cwd),{requestId:b.requestId}); return json(202, { ok: true });
      }
      if(req.method==='POST' && match[2]==='fork') {
        const copy={...structuredClone(chat),id:randomUUID(),title:chat.title,createdAt:Date.now(),updatedAt:Date.now(),sessions:{},sessionOffsets:{},usageBaselines:{},queue:[],queuePaused:false,queueError:null,messages:structuredClone(chat.messages).map(m=>({...m,id:randomUUID(),usageInherited:true})),accountingEvents:(chat.accountingEvents || []).map(e=>({...e,usageInherited:true})),duplicatedFrom:chat.id};
        chats.unshift(copy);update();return json(201,publicChat(copy));
      }
      if (req.method === 'PATCH' && !match[2]) {
        const b = await body(req);
        if (b.folderId!==undefined && b.settings===undefined && typeof b.title!=='string') {
          if (chat.parentChatId) throw new Error('Podčet ostaje u četu roditelja.');
          if (b.folderId===null) delete chat.folderId;
          else if (folders.has(b.folderId)) chat.folderId=b.folderId;
          else throw new Error('Folder nije pronađen.');
          chat.updatedAt=Date.now();update();return json(200,publicChat(chat));
        }
        if (running.has(chat.id) && b.settings) return json(409, {error:'Sačekaj odgovor ili zaustavi agenta.'});
        if (b.settings?.agent && b.settings.agent !== chat.settings.agent) {
          if (!binaries[b.settings.agent]) throw new Error('Izabrani agent nije povezan.');
          chat.transferPending=true;
          chat.settings=validateEffort(quickCatalog(binaries),validate({...chat.settings,model:'',effort:'',...defaults[b.settings.agent],...b.settings}));
          chat.updatedAt=Date.now();update();return json(200,publicChat(chat));
        }
        if (b.settings) {
          const next = validate({ ...chat.settings, ...b.settings });
          if (b.settings.model !== undefined && b.settings.model !== chat.settings.model && b.settings.effort === undefined) next.effort = preferredEffort(quickCatalog(binaries),next.agent,next.model);
          chat.settings = validateEffort(quickCatalog(binaries), next);
        }
        if (typeof b.title === 'string' && b.title.trim()){chat.title=b.title.trim().slice(0,100);chat.titleManual=true;}
        chat.updatedAt = Date.now(); update(); return json(200, publicChat(chat));
      }
      if (req.method === 'DELETE' && !match[2]) {
        const ids=new Set([chat.id]);if(url.searchParams.get('children')==='1'){let size;do{size=ids.size;for(const c of chats)if(ids.has(c.parentChatId))ids.add(c.id);}while(size!==ids.size);}
        if([...ids].some(id=>running.has(id)))return json(409,{error:'Zaustavi agente pre brisanja.'});
        const archiveId=archive.add(chats.filter(c=>ids.has(c.id)));
        chats=chats.filter(c=>!ids.has(c.id));for(const c of chats)if(ids.has(c.parentChatId)){c.formerParentChatId=c.parentChatId;c.formerParentTurnId=c.parentTurnId;delete c.parentChatId;delete c.parentTurnId;}
        update();return json(200,{ok:true,deleted:[...ids],archiveId});
      }
    }
    const files = { '/battery.mjs':['battery.mjs','text/javascript'], '/pdf-view.mjs':['pdf-view.mjs','text/javascript'], '/pdfjs.mjs':['../node_modules/pdfjs-dist/build/pdf.min.mjs','text/javascript'], '/pdfjs-worker.mjs':['../node_modules/pdfjs-dist/build/pdf.worker.min.mjs','text/javascript'], '/wav.mjs':['wav.mjs','text/javascript'], '/reasoning.mjs':['reasoning.mjs','text/javascript'], '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/sw.js': ['sw.js', 'text/javascript'], '/sidebar-groups.mjs': ['sidebar-groups.mjs', 'text/javascript'], '/folder-columns.mjs': ['folder-columns.mjs', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/marked.js': ['../node_modules/marked/lib/marked.esm.js', 'text/javascript'], '/purify.js': ['../node_modules/dompurify/dist/purify.es.mjs', 'text/javascript'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/icon-192.png': ['icon-192.png', 'image/png'], '/icon-512.png': ['icon-512.png', 'image/png'], '/apple-touch-icon.png': ['apple-touch-icon.png', 'image/png'], '/badge-96.png': ['badge-96.png', 'image/png'] };
    if (req.method === 'GET' && files[url.pathname]) {
      const [file, mime] = files[url.pathname];
      const headers = { 'Content-Type': mime.startsWith('image/') ? mime : `${mime}; charset=utf-8`, 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' blob:; worker-src 'self'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' };
      if (url.pathname === '/sw.js') headers['Cache-Control'] = 'no-cache';
      return respond(200, headers, fs.readFileSync(path.join(root, 'public', file)));
    }
    json(404, { error: 'Nije pronađeno.' });
  } catch (error) { json(400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => {phone.start();limits.start();warmup.start();console.log(`Agent Desk: http://127.0.0.1:${port}`);});
function shutdown() {syncChatFiles();shuttingDown=true;clearInterval(archiveCleanup);limits.close();warmup.stop();phone.close();titleManager.close();for (const id of running.keys()) stop(id); setTimeout(() => process.exit(0), 2200); server.close(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
