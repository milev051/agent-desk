import http from 'node:http';
import {createArchive} from './archive.mjs';
import {browseFiles,withFiles,filePath} from './files.mjs';
import {createLimits} from './limits.mjs';
import {createPhoneAccess} from './phone-access.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { command, parseEvent, names } from './adapters.mjs';
import { catalog, quickCatalog, validateEffort } from './models.mjs';
import { transferableMessages, transferPlan, historyText, contextEstimate } from './context.mjs';
import { createTitleManager } from './titles.mjs';
import { usageDelta } from './usage.mjs';
import { buildAccounting } from './accounting.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.AGENT_DESK_DATA || path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const archive=createArchive(dataDir);archive.prune();const archiveCleanup=setInterval(()=>archive.prune(),3600000);archiveCleanup.unref();
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
const limits=createLimits({cacheFile:path.join(dataDir,'limits-cache.json'),enabled:process.platform==='darwin' && process.env.AGENT_DESK_DISABLE_LIMITS!=='1'});
const phoneOriginFile=path.join(process.env.AGENT_DESK_CONFIG || path.join(os.homedir(),'.config','agent-desk'),'phone-origin');
const savedPhoneOrigin=fs.existsSync(phoneOriginFile)?fs.readFileSync(phoneOriginFile,'utf8').trim():'';
const phone=createPhoneAccess({sessionFile:path.join(path.dirname(phoneOriginFile),'phone-sessions.json'),port,gatewayPort:Number(process.env.AGENT_DESK_PHONE_PORT || port+2),origin:process.env.AGENT_DESK_PHONE_ORIGIN || savedPhoneOrigin});
const save = () => { fs.writeFileSync(dataFile + '.tmp', JSON.stringify(chats, null, 2), { mode: 0o600 }); fs.renameSync(dataFile + '.tmp', dataFile); };
let usageCache;
const historyCounts=new Map();
const accounting=()=>usageCache ||= buildAccounting(chats);
const historyForCount=c=>historyText(c.messages.filter(m=>m.text));
const historyHash=text=>createHash('sha256').update(text).digest('hex');
const publicChat = c => ({ ...c, historyTokenCount:c.historyTokenCount?.hash===historyHash(historyForCount(c))?c.historyTokenCount:null, usageSummary:accounting().chats[c.id], running: running.has(c.id), context:contextEstimate(c), transferEstimates:Object.fromEntries(Object.keys(names).map(agent=>[agent,contextEstimate(c,agent)])), transfers:Object.fromEntries(Object.keys(names).map(agent=>[agent,contextEstimate(c,agent).transfer])) });
function broadcast() { const payload = `data: ${JSON.stringify(chats.map(publicChat))}\n\n`; for (const res of listeners) res.write(payload); }
function update() { usageCache=null;save(); broadcast(); }
const titleManager=createTitleManager({settingsFile:path.join(dataDir,'title-settings.json'),keyFile:path.join(process.env.AGENT_DESK_CONFIG || path.join(os.homedir(),'.config','agent-desk'),'google-api-key'),getChat:id=>chats.find(c=>c.id===id),changed:update});
function locate(name) {
  const dirs = [...(process.env.PATH || '').split(path.delimiter), '/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'), path.join(os.homedir(), '.grok/bin')];
  for (const dir of dirs) { const p = path.join(dir, name); try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {} }
  return null;
}
const binaries = { codex: locate('codex'), claude: locate('claude'), grok: locate('grok'), antigravity: locate('agy') };
function metadata() { return { cwd: root, chatFork: true, titleSettings:titleManager.settings(), agents: Object.entries(names).map(([id, name]) => ({ id, name, available: !!binaries[id], detail: binaries[id] ? 'CLI pronađen · koristi postojeću prijavu' : 'CLI nije pronađen' })) }; }
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
function stopRelated(id) {for(const c of chats)if(c.parentChatId===id)stop(c.id);stop(id);}
function resolveLocalFile(p){for(const cwd of new Set([root,...chats.map(c=>c.settings.cwd)])){try{return filePath(p,cwd);}catch{}}throw Error('Fajl nije dostupan.');}
function appContext(chat) {
  const address=`http://127.0.0.1:${port}`;
  const children=chats.filter(c=>c.parentChatId===chat.id).map(c=>({id:c.id,naziv:c.title,agent:c.settings.agent,stanje:running.has(c.id)?'radi':'spreman za nastavak',sesija:!!c.sessions[c.settings.agent]}));
  return `Postojeći podčetovi: ${JSON.stringify(children)}. Završen CLI proces ne znači da je podagent izgubljen: čet i sesija su sačuvani. Za nastavak istog zadatka koristi postojeći podčet, ne pravi zamenu. POST ${address}/api/chats/${chat.id}/delegate sa telom {"childId":"postojeći ID","task":"nastavi zadatak"} nastavlja podčet sa njegovom istorijom i sesijom. Novi podčet napravi samo za nov zadatak ili izričit zahtev korisnika.\nOkruženje: Agent Desk; čet ${chat.id}; radni folder ${chat.settings.cwd}; agent ${chat.settings.agent}; model ${chat.settings.model || 'CLI podrazumevani'}. Datumi poruka su ISO UTC.\nAko zadatak zahteva podagenta, možeš lokalnim HTTP zahtevom napraviti podčet: POST ${address}/api/chats/${chat.id}/delegate, header Origin: ${address}, Content-Type: application/json, telo {"agent":"codex","name":"Provera testova","task":"konkretan zadatak"} (agenti: codex, claude, grok, antigravity). Polje name je kratak naziv uloge ili zadatka podagenta, ne samo broj radnika. Odgovor sadrži id. GET ${address}/api/chats/ID vraća running i messages. Podčet koristi isti folder i zasebnu sesiju; rezultat pročitaj i objedini. Najviše dva aktivna podčeta, samo jedan nivo delegiranja. Ne otvaraj podčet bez potrebe za korisnikov zadatak.`;
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
  const spec = command(chat,`${appContext(chat)}\n\n${history}`, binaries[agent]);
  const child = spawn(spec.executable, spec.args, { cwd: chat.settings.cwd, env: { ...process.env, NO_COLOR: '1' }, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const reply = { id: randomUUID(), role: 'assistant', agent, model: chat.settings.model || '', configuredModel: chat.settings.model || '', historyTransferred, usageTracked:true, usageCwd:chat.settings.cwd, text: '', status: 'running', activity: 'Pokrećem agenta…', createdAt: Date.now() };
  delete chat.ephemeral;
  chat.messages.push({ id: randomUUID(), role: 'user', text: prompt, createdAt,sentAt,origin:options.origin || 'user',...(options.requestId?{requestId:options.requestId}:{}) }, reply);
  if (chat.title === 'Novi čet') chat.title = prompt.slice(0, 52);
  chat.updatedAt = Date.now();
  const run = { child, stopped: false }; run.done = new Promise(resolve=>run.resolve=resolve); running.set(chat.id, run); update();
  if(chat.messages.filter(m=>m.role==='user').length===1)titleManager.request(chat,prompt,chats.find(c=>c.id===chat.parentChatId)?.title || '');
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
    if (e.session) { chat.sessions[agent] = e.session; reply.sessionId=e.session; save(); }
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
    if (e.error) reply.error = e.error;
    broadcast();
  }
  child.stdout.on('data', chunk => { buffer += chunk.toString(); let i; while ((i = buffer.indexOf('\n')) >= 0) { event(buffer.slice(0, i)); buffer = buffer.slice(i + 1); } });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-6000); });
  function finish(code, error) {
    if (finished) return; finished = true; clearTimeout(run.timeout); clearTimeout(run.killTimer);
    if (buffer.trim()) event(buffer);
    running.delete(chat.id); reply.activity = '';
    reply.status = run.stopped ? 'stopped' : code === 0 && !error && !reply.error ? 'done' : 'error';
    if (reply.status === 'error') reply.error ||= error?.message || stderr.trim() || `Agent je završio sa kodom ${code}.`;
    if (!reply.text && reply.status === 'done') { reply.status = 'error'; reply.error = 'Agent je završio bez tekstualnog odgovora. Proveri CLI prijavu.'; }
    if(reply.status==='done')chat.transferPending=false;
    if(chat.sessions[agent]){chat.sessionOffsets ||= {};chat.sessionOffsets[agent]=chat.messages.length;}
    if(reply.status==='error' || reply.status==='stopped')chat.queuePaused=true;
    chat.updatedAt = Date.now(); update();run.resolve(reply);setImmediate(()=>drainQueue(chat));
  }
  child.on('error', error => finish(null, error)); child.on('close', code => finish(code));
  child.stdin.on('error', () => {}); child.stdin.end(spec.input || undefined);
  run.timeout = setTimeout(() => { reply.error = 'Prekinuto posle 30 minuta. Možeš poslati novu poruku.'; stop(chat.id); }, 30 * 60 * 1000); run.timeout.unref();
  return run;
}
const server = http.createServer(async (req, res) => {
  const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
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
    if(req.method==='GET' && url.pathname==='/api/limits')return json(200,limits.snapshot());
    if(req.method==='GET' && url.pathname==='/api/usage')return json(200,accounting());
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
      const restored=record.chats;if(restored.some(c=>chats.some(x=>x.id===c.id)))throw Error('Čet je već u listi.');
      for(const c of restored)if(c.parentChatId && ![...chats,...restored].some(x=>x.id===c.parentChatId)){c.formerParentChatId=c.parentChatId;c.formerParentTurnId=c.parentTurnId;delete c.parentChatId;delete c.parentTurnId;}
      chats.unshift(...restored);for(const c of chats)if(restored.some(x=>x.id===c.formerParentChatId)){c.parentChatId=c.formerParentChatId;c.parentTurnId=c.formerParentTurnId;delete c.formerParentChatId;delete c.formerParentTurnId;}
      update();archive.remove(record.id);return json(200,{ok:true});
    }
    const queueMatch=url.pathname.match(/^\/api\/chats\/([\w-]+)\/queue(?:\/([\w-]+))?$/);
    if(queueMatch) {
      const chat=chats.find(c=>c.id===queueMatch[1]);if(!chat)return json(404,{error:'Čet nije pronađen.'});
      if(req.method==='POST') {
        if(queueMatch[2]==='resume'){chat.queuePaused=false;delete chat.queueError;update();drainQueue(chat);return json(200,publicChat(chat));}
        const b=await body(req);if(typeof b.text!=='string'||!b.text.trim()||b.text.length>100000)throw new Error('Unesi poruku do 100.000 karaktera.');
        chat.queue ||= [];if(chat.queue.length>=10)throw new Error('Red čekanja je ograničen na 10 poruka.');
        chat.queue.push({id:randomUUID(),text:withFiles(b.text.trim(),b.files,chat.settings.cwd),createdAt:Date.now()});chat.queuePaused=false;delete chat.queueError;update();drainQueue(chat);return json(202,publicChat(chat));
      }
      if(req.method==='DELETE' && queueMatch[2]){chat.queue=(chat.queue || []).filter(m=>m.id!==queueMatch[2]);update();return json(200,publicChat(chat));}
    }
    if (req.method === 'GET' && url.pathname === '/api/chats') return json(200, chats.map(publicChat));
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      listeners.add(res); res.write(`data: ${JSON.stringify(chats.map(publicChat))}\n\n`);
      const timer = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { listeners.delete(res); clearInterval(timer); }); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/chats') {
      const b = await body(req);
      const chat = { id: randomUUID(), title: 'Novi čet', ephemeral:true, createdAt: Date.now(), updatedAt: Date.now(), settings: validate({ agent: 'codex', model: '', access: 'full', cwd: root, instructions: '', effort: '', ...defaults[b.settings?.agent || 'codex'], ...b.settings }), sessions: {}, sessionOffsets:{}, messages: [] };
      validateEffort(quickCatalog(binaries), chat.settings);
      chats.unshift(chat); update(); return json(201, publicChat(chat));
    }
    const emptyMatch=url.pathname.match(/^\/api\/chats\/([\w-]+)\/discard-empty$/);
    if(req.method==='POST' && emptyMatch){const chat=chats.find(c=>c.id===emptyMatch[1]);if(!chat)return json(200,{ok:true});
      if(running.has(chat.id)||chat.messages.length||chat.queue?.length||Object.keys(chat.sessions).length||chats.some(c=>c.parentChatId===chat.id))return json(409,{error:'Čet više nije prazan.'});
      chats=chats.filter(c=>c.id!==chat.id);update();return json(200,{ok:true});}
    const match = url.pathname.match(/^\/api\/chats\/([\w-]+)(?:\/(send|stop|fork|delegate|reveal|record|count-tokens|files))?$/);
    if (match) {
      const chat = chats.find(c => c.id === match[1]); if (!chat) return json(404, { error: 'Čet nije pronađen.' });
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
        if(process.platform!=='darwin')throw new Error('Finder je dostupan samo na macOS-u.');
        await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/open',['-R',dataFile]);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Finder nije otvoren.')));});
        return json(200,{ok:true});
      }

      if(req.method==='POST' && match[2]==='delegate') {
        if(chat.parentChatId)throw new Error('Podčet ne može da kreira novi nivo podčetova.');
        if(chats.filter(c=>c.parentChatId===chat.id && running.has(c.id)).length>=2)throw new Error('Najviše dva aktivna podčeta.');
        const parentTurnId=chat.messages.at(-1)?.id || 'manual';

        const b=await body(req);if(typeof b.task!=='string'||!b.task.trim()||b.task.length>10000)throw new Error('Unesi konkretan zadatak do 10.000 karaktera.');
        if(b.childId!==undefined){const child=chats.find(c=>c.id===b.childId && c.parentChatId===chat.id);if(!child)throw Error('Izaberi postojeći podčet ovog roditelja.');if(running.has(child.id))return json(409,{error:'Podagent već radi.'});await send(child,b.task.trim(),{origin:'delegate'});return json(202,publicChat(child));}
        if(chats.filter(c=>c.parentChatId===chat.id && c.parentTurnId===parentTurnId).length>=2)throw new Error('Najviše dva podčeta po odgovoru roditeljskog agenta.');
        if(b.name!==undefined && (typeof b.name!=='string'||!b.name.trim()||b.name.length>80))throw new Error('Naziv podagenta mora imati 1-80 znakova.');
        const agent=b.agent || chat.settings.agent;if(!binaries[agent])throw new Error('Agent nije povezan.');
        const child={id:randomUUID(),title:b.name?.trim() || b.task.slice(0,52),...(b.name?{agentRole:b.name.trim(),titleManual:true}:{}),parentChatId:chat.id,parentTurnId,createdAt:Date.now(),updatedAt:Date.now(),settings:validateEffort(quickCatalog(binaries),validate({...chat.settings,agent,...defaults[agent]})),sessions:{},sessionOffsets:{},messages:[]};
        chats.unshift(child);update();await send(child,`Podzadatak iz četa ${chat.title}.\n\n${b.task}`,{origin:'delegate'});return json(202,publicChat(child));
      }
      if(req.method==='POST' && match[2]==='stop'){chat.queuePaused=true;stopRelated(chat.id);update();return json(200,{ok:true});}
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
        if (running.has(chat.id) && b.settings) return json(409, {error:'Sačekaj odgovor ili zaustavi agenta.'});
        if (b.settings?.agent && b.settings.agent !== chat.settings.agent) {
          if (!binaries[b.settings.agent]) throw new Error('Izabrani agent nije povezan.');
          chat.transferPending=true;
          chat.settings=validateEffort(quickCatalog(binaries),validate({...chat.settings,model:'',effort:'',...defaults[b.settings.agent],...b.settings}));
          chat.updatedAt=Date.now();update();return json(200,publicChat(chat));
        }
        if (b.settings) {
          const next = validate({ ...chat.settings, ...b.settings });
          if (b.settings.model !== undefined && b.settings.model !== chat.settings.model && b.settings.effort === undefined) next.effort = '';
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
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/sidebar-groups.mjs': ['sidebar-groups.mjs', 'text/javascript'], '/folder-columns.mjs': ['folder-columns.mjs', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/marked.js': ['../node_modules/marked/lib/marked.esm.js', 'text/javascript'], '/purify.js': ['../node_modules/dompurify/dist/purify.es.mjs', 'text/javascript'] };
    if (req.method === 'GET' && files[url.pathname]) {
      const [file, mime] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
      return res.end(fs.readFileSync(path.join(root, 'public', file)));
    }
    json(404, { error: 'Nije pronađeno.' });
  } catch (error) { json(400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => {phone.start();limits.start();console.log(`Agent Desk: http://127.0.0.1:${port}`);});
function shutdown() {shuttingDown=true;clearInterval(archiveCleanup);limits.close();phone.close();titleManager.close();for (const id of running.keys()) stop(id); setTimeout(() => process.exit(0), 2200); server.close(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
