// Automatski zapis iteracija: doslovne poruke korisnika, pravilo za agente, provera na kraju rada i podsetnik.
// Sve ostaje lokalno. Greška ovde nikad ne sme da prekine slanje poruke ili završetak odgovora.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {projectDir} from './chat-project.mjs';
import {projectSnapshot} from './project-memory.mjs';

const run=promisify(execFile);
const DAY=86400000;
export const LATER_DAYS=3;
export const DEFAULT_SETTINGS=Object.freeze({enabled:true,reminders:true,intervalDays:7});
const hidden='[uklonjeno]';
const logFile='ITERACIJE.md';
const notes=new Set(['STANJE.md','ODLUKE.md','HRONOLOGIJA.md']);
const skippedOrigins=new Set(['project-state','warmup','thoughts','thoughts-improve','adaptive','upwork-watch']);
const imageTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
const attachmentMarker='\n\nPovezane putanje na računaru (pročitaj po potrebi):\n';

export function redactSecrets(value){
 return String(value ?? '')
  .replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g,hidden)
  .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s\/:@]+:[^\s\/@]+@/gi,`$1${hidden}@`)
  .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]{8,}/gi,`$1 ${hidden}`)
  .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,}|xox[abeoprs]-[A-Za-z0-9-]{10,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|ya29\.[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,})/g,hidden)
  .replace(/((?<![\p{L}\p{N}])(?:password|passwd|pwd|pass|lozink[aeuoi]?|šifr[aeuoi]?|sifr[aeuoi]?|secret|tajn[aeuoi]?|token|api[_ -]?key|access[_ -]?key|private[_ -]?key|client[_ -]?secret|ključ|kljuc)["']?\s*[:=]\s*["']?)[^\s"',;]+/giu,`$1${hidden}`)
  .replace(/((?<![\p{L}\p{N}])(?:password|lozinka|šifra|sifra)\s+je\s+["']?)(?=\S*[\d!@#$%^&*])[^\s"',;]+/giu,`$1${hidden}`)
  .replace(/(?<![\p{L}\p{N}_\/.-])(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{40,}(?![\p{L}\p{N}_-])/gu,hidden);
}

// Agent Desk dodaje putanje priloga na kraj poruke; u zapis idu tekst i samo nazivi fajlova.
export function splitAttachments(value){
 const text=String(value ?? ''),at=text.lastIndexOf(attachmentMarker);
 if(at<0)return {text,attachments:[]};
 const attachments=[];
 for(const line of text.slice(at+attachmentMarker.length).split('\n')){
  try{attachments.push(path.basename(JSON.parse(line.replace(/^- /,''))));}catch{}
 }
 return {text:text.slice(0,at),attachments};
}

// Unos je naslov sa datumom. Bez datuma u naslovima broje se naslovi drugog nivoa.
export function readEntries(text){
 let fenced=false,dated=0,plain=0,lastDate='';
 for(const line of String(text ?? '').split('\n')){
  if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;continue;}
  if(fenced)continue;
  if(/^##\s+\S/.test(line))plain++;
  if(!/^#{2,4}\s+\S/.test(line))continue;
  const iso=line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/),local=line.match(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\b/);
  const date=iso?iso[0]:local?`${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`:'';
  if(!date)continue;
  dated++;if(date>lastDate)lastDate=date;
 }
 return {count:dated || plain,lastDate};
}

export function excludeLines(prefix=''){
 const base=prefix.replace(/[\\*?[\]]/g,'\\$&');
 return [`/${base}iteracije/izvor/`,`/${base}iteracije/snimci/`];
}

// Dodaje samo redove koji nedostaju; .gitignore projekta i git hookovi ostaju netaknuti.
export async function excludePrivateFolders(dir){
 let output;
 try{({stdout:output}=await run('git',['-C',dir,'rev-parse','--git-path','info/exclude','--show-prefix'],{timeout:5000}));}catch{return false;}
 const [gitPath,prefix='']=output.split('\n');
 if(!gitPath)return false;
 const file=path.resolve(dir,gitPath);
 let current='';try{current=await fs.promises.readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const present=new Set(current.split('\n').map(line=>line.trim()));
 const missing=excludeLines(prefix).filter(line=>!present.has(line));
 if(!missing.length)return true;
 await fs.promises.mkdir(path.dirname(file),{recursive:true});
 await fs.promises.appendFile(file,`${current && !current.endsWith('\n')?'\n':''}# Agent Desk: lokalni zapis iteracija\n${missing.join('\n')}\n`);
 return true;
}

export function iterationRule(dir){
 return `\nZapis iteracija: posle bitne izmene dopiši unos na kraj ${path.join(dir,'iteracije',logFile)} (format iz iteracije/README.md ako postoji, inače naslov „## YYYY-MM-DD HH:MM · oblast“, pa Citat korisnika doslovno, Razlog, Urađeno, Dokaz, Status: zadržano, zamenjeno, uklonjeno ili otvoreno). Razlog ne izmišljaj; ako nije poznat, napiši „nije naveden“. Kod vidljive izmene interfejsa sačuvaj snimak pre i posle u iteracije/snimci/ ako imaš pregledač ili alat za snimak, bez stranica za prijavu, tajni i ličnih podataka; ako snimak ne može, napiši to u unosu.\n`;
}

export function iterationPrompt(dir,files){
 const shown=files.slice(0,8).join(', ')+(files.length>8?` i još ${files.length-8}`:'');
 return `Automatska provera Agent Deska: u prethodnom zadatku promenjeni su fajlovi projekta (${shown}), a u ${path.join(dir,'iteracije',logFile)} nema novog unosa. Dopiši jedan unos na kraj tog fajla za taj zadatak: datum i vreme, oblast, doslovan citat korisnika (iz razgovora ili iteracije/izvor/auto-poruke.jsonl), razlog, šta je urađeno, dokaz i status (zadržano, zamenjeno, uklonjeno ili otvoreno). Razlog ne izmišljaj; ako nije poznat, napiši „nije naveden“. Ne menjaj kod, ne pokreći radnike, ne šalji poruke i ne ponavljaj restart, objavu ili spoljašnje upise. Ovaj podsetnik se neće ponavljati.`;
}

export function createIterationLog(file,{knownProjects=()=>[],findChat=()=>null,appRoot='',now=()=>Date.now(),onChange=()=>{},home=os.homedir()}={}){
 let state={settings:{...DEFAULT_SETTINGS},projects:{}};
 try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));state={settings:{...DEFAULT_SETTINGS,...saved.settings},projects:saved.projects || {}};}catch(error){if(error.code!=='ENOENT')console.error('Zapis iteracija:',error.message);}
 const save=()=>{fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 const real=dir=>{try{return fs.realpathSync(dir);}catch{return null;}};
 const broad=new Set([home,path.join(home,'Desktop'),path.join(home,'Documents'),path.join(home,'Downloads')].map(dir=>real(dir) || dir));
 const application=appRoot?real(appRoot) || appRoot:'';
 const idOf=dir=>createHash('sha256').update(dir).digest('hex').slice(0,16);
 const clean=dir=>{
  if(!dir || !path.isAbsolute(dir))return null;
  const value=real(dir);
  try{return value && value!==path.parse(value).root && !broad.has(value) && fs.statSync(value).isDirectory()?value:null;}catch{return null;}
 };
 const knownRow=dir=>knownProjects().find(row=>row.path===dir || real(row.path)===dir);
 const looksLikeProject=dir=>!!knownRow(dir) || fs.existsSync(path.join(dir,'.git')) || fs.existsSync(path.join(dir,'STANJE.md'));

 // Podčet u podrazumevanom folderu aplikacije radi na projektu glavnog četa.
 function resolve(chat,depth=0){
  if(!chat || chat.dispatcher || chat.thoughts || chat.adaptiveAgent || chat.adaptivePropose)return null;
  const own=clean(projectDir(chat));if(own)return own;
  const cwd=clean(chat.settings?.cwd);
  if(cwd && cwd!==application && looksLikeProject(cwd))return cwd;
  return chat.parentChatId && depth<3?resolve(findChat(chat.parentChatId),depth+1):null;
 }
 function touch(dir){
  if(state.projects[dir])return state.projects[dir];
  state.projects[dir]={name:knownRow(dir)?.name || path.basename(dir),firstSeenAt:now(),openedAt:0,seenCount:0,snoozeUntil:0,muted:false};
  save();return state.projects[dir];
 }
 const counts=new Map();
 function entries(dir){
  const target=path.join(dir,'iteracije',logFile);
  try{
   const stat=fs.statSync(target),key=`${stat.size}:${stat.mtimeMs}`,cached=counts.get(dir);
   if(cached?.key===key)return cached.value;
   const value={...readEntries(stat.size>8000000?'':fs.readFileSync(target,'utf8')),exists:true,updatedAt:stat.mtimeMs};
   counts.set(dir,{key,value});return value;
  }catch{return {count:0,lastDate:'',exists:false,updatedAt:0};}
 }
 function view(dir,at=now()){
  const row=touch(dir),log=entries(dir),newCount=Math.max(0,log.count-(row.seenCount || 0));
  const quietSince=row.openedAt || row.firstSeenAt;
  const due=!row.muted && newCount>0 && at>=(row.snoozeUntil || 0) && at-quietSince>=state.settings.intervalDays*DAY;
  return {id:idOf(dir),name:row.name,dir,count:log.count,lastDate:log.lastDate || (log.updatedAt?new Date(log.updatedAt).toISOString().slice(0,10):''),exists:log.exists,muted:!!row.muted,newCount,openedAt:row.openedAt || 0,due};
 }
 function list(){
  const dirs=new Set(Object.keys(state.projects));
  for(const row of knownProjects()){const dir=clean(row.path);if(dir && fs.existsSync(path.join(dir,'iteracije',logFile)))dirs.add(dir);}
  return [...dirs].filter(dir=>fs.existsSync(dir)).map(dir=>view(dir)).filter(item=>item.exists).sort((a,b)=>b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name,'sr-Latn'));
 }
 const reminders=()=>state.settings.enabled && state.settings.reminders?list().filter(item=>item.due).sort((a,b)=>b.newCount-a.newCount):[];
 const overview=()=>({settings:{...state.settings},projects:list(),reminders:reminders()});
 const changed=()=>{try{onChange(overview());}catch(error){console.error('Zapis iteracija:',error.message);}};
 const byId=id=>Object.keys(state.projects).find(dir=>idOf(dir)===id) || [...knownProjects().map(row=>clean(row.path))].find(dir=>dir && idOf(dir)===id);

 const privacy=new Map();
 function ensurePrivate(dir){
  if(!privacy.has(dir))privacy.set(dir,excludePrivateFolders(dir).catch(error=>{privacy.delete(dir);console.error('Zapis iteracija, git exclude:',error.message);return false;}));
  return privacy.get(dir);
 }
 let tail=Promise.resolve();
 function enqueue(job){
  const next=tail.then(job).catch(error=>{console.error('Zapis iteracija:',error.message);return false;});
  tail=next;return next;
 }
 async function appendMessage(dir,line){
  await ensurePrivate(dir);
  const folder=path.join(dir,'iteracije'),source=path.join(folder,'izvor');
  for(const item of [folder,source]){try{if(fs.lstatSync(item).isSymbolicLink())throw Error('Folder zapisa je simbolička veza.');}catch(error){if(error.code!=='ENOENT')throw error;}}
  await fs.promises.mkdir(source,{recursive:true,mode:0o700});
  await fs.promises.appendFile(path.join(source,'auto-poruke.jsonl'),line,{mode:0o600});
  return true;
 }
 function recordMessage(chat,text,{at=now()}={}){
  try{
   if(!state.settings.enabled)return Promise.resolve(false);
   const dir=resolve(chat);if(!dir)return Promise.resolve(false);
   touch(dir);
   const parts=splitAttachments(text);
   const line=JSON.stringify({vreme:new Date(at).toISOString(),chatId:chat.id,tekst:redactSecrets(parts.text),prilozi:parts.attachments.map(redactSecrets)})+'\n';
   return enqueue(()=>appendMessage(dir,line));
  }catch(error){console.error('Zapis iteracija:',error.message);return Promise.resolve(false);}
 }
 function rule(chat){
  try{const dir=state.settings.enabled?resolve(chat):null;return dir?iterationRule(dir):'';}catch{return '';}
 }
 function begin(chat,memoryBefore){
  try{
   if(!state.settings.enabled)return null;
   const dir=resolve(chat);
   if(dir){touch(dir);void ensurePrivate(dir);}
   return {dir,startedAt:now(),snapshot:dir && memoryBefore?.dir!==dir?projectSnapshot(dir):null};
  }catch(error){console.error('Zapis iteracija:',error.message);return null;}
 }
 // Vraća tekst podsetnika kad je krug promenio projekat bez novog unosa, inače null.
 function finish(chat,reply,before,{origin='user',memoryDir=null,changed:memoryChanged=null,concurrent=false}={}){
  try{
   if(!before || !state.settings.enabled || reply?.status!=='done' || skippedOrigins.has(origin) || chat.settings?.access==='read')return null;
   const dir=resolve(chat);if(!dir)return null;
   const own=(reply.actions || []).filter(a=>a.kind==='file' && a.change && a.text).map(a=>path.relative(dir,path.resolve(dir,a.text))).filter(name=>name && !name.startsWith('..') && !path.isAbsolute(name));
   let files=own;
   if(memoryDir===dir && Array.isArray(memoryChanged))files=memoryChanged;
   else if(before.dir===dir && before.snapshot){const after=projectSnapshot(dir);files=[...new Set([...before.snapshot.files.keys(),...after.files.keys()])].filter(name=>before.snapshot.files.get(name)!==after.files.get(name));}
   if(concurrent)files=files.filter(name=>own.includes(name));
   files=files.filter(name=>name!=='iteracije' && !name.startsWith('iteracije'+path.sep) && !notes.has(name));
   if(!files.length)return null;
   try{if(fs.statSync(path.join(dir,'iteracije',logFile)).mtimeMs>=before.startedAt)return null;}catch{}
   return iterationPrompt(dir,files);
  }catch(error){console.error('Zapis iteracija:',error.message);return null;}
 }
 function open(dir){
  const row=touch(dir),log=entries(dir);
  row.openedAt=now();row.seenCount=log.count;row.snoozeUntil=0;save();
  let text='',truncated=false;
  try{const target=path.join(dir,'iteracije',logFile),size=fs.statSync(target).size,limit=2000000;text=fs.readFileSync(target,'utf8');if(size>limit){text=text.slice(-limit);truncated=true;}}catch{}
  changed();return {...view(dir),text,truncated};
 }
 function later(dir){touch(dir).snoozeUntil=now()+LATER_DAYS*DAY;save();changed();return view(dir);}
 function configure(input={}){
  const next={...state.settings};
  if(typeof input.enabled==='boolean')next.enabled=input.enabled;
  if(typeof input.reminders==='boolean')next.reminders=input.reminders;
  if(input.intervalDays!==undefined){const days=Number(input.intervalDays);if(!Number.isInteger(days) || days<1 || days>90)throw Error('Učestalost podsetnika je od 1 do 90 dana.');next.intervalDays=days;}
  state.settings=next;save();changed();return overview();
 }
 function mute(dir,muted){touch(dir).muted=!!muted;save();changed();return view(dir);}
 function image(dir,name){
  const type=imageTypes[path.extname(String(name)).toLowerCase()];if(!type)return null;
  const folder=real(path.join(dir,'iteracije','snimci')),target=real(path.join(dir,'iteracije','snimci',String(name)));
  if(!folder || !target || !target.startsWith(folder+path.sep))return null;
  const stat=fs.statSync(target);return stat.isFile() && stat.size<=15000000?{type,buffer:fs.readFileSync(target)}:null;
 }
 // Vraća {status,body} ili {status,image}; null znači da ruta nije ovog modula.
 async function handle(method,pathname,params,readBody){
  if(pathname==='/api/iterations' && method==='GET')return {status:200,body:overview()};
  if(pathname==='/api/iterations/settings' && method==='PUT'){try{return {status:200,body:configure(await readBody())};}catch(error){return {status:400,body:{error:error.message}};}}
  const forChat=pathname.match(/^\/api\/iterations\/chat\/([^/]+)$/);
  if(forChat && method==='GET'){const chat=findChat(forChat[1]),dir=state.settings.enabled && chat?resolve(chat):null;return {status:200,body:{project:dir?view(dir):null}};}
  const match=pathname.match(/^\/api\/iterations\/([a-f0-9]{16})(?:\/(open|later|snimak))?$/);
  if(!match)return pathname.startsWith('/api/iterations')?{status:404,body:{error:'Ruta zapisa iteracija ne postoji.'}}:null;
  const dir=byId(match[1]);if(!dir)return {status:404,body:{error:'Projekat nije pronađen.'}};
  if(match[2]==='open' && method==='POST')return {status:200,body:open(dir)};
  if(match[2]==='later' && method==='POST')return {status:200,body:later(dir)};
  if(match[2]==='snimak' && method==='GET'){const found=image(dir,params.get('name') || '');return found?{status:200,image:found}:{status:404,body:{error:'Snimak nije pronađen.'}};}
  if(!match[2] && method==='PUT'){const input=await readBody();return {status:200,body:mute(dir,input.muted===true)};}
  return {status:405,body:{error:'Metod nije podržan.'}};
 }
 return {resolve,recordMessage,rule,begin,finish,list,reminders,overview,open,later,configure,mute,handle,view,idle:()=>tail};
}
