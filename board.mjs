// Tabla projekata: jedan pogled na sve projekte, pitanja koja čekaju korisnika i ponašanje pri radu.
import fs from 'node:fs';
import path from 'node:path';
import {projectDir} from './chat-project.mjs';

const HOUR=3600000,DAY=24*HOUR;
const userOrigins=new Set(['user','queue','board']);
const clean=(text,max=300)=>String(text || '').replace(/\[\/?[rgb]\]/g,'').replace(/\s+/g,' ').trim().slice(0,max);

// Pomoćni četovi (dispečer, prilagođavanje, misli) ne pripadaju radu korisnika na projektu.
export function boardChat(chat){return !chat.dispatcher && !chat.adaptiveAgent && !chat.adaptivePropose && !chat.thoughts;}
export function chatDir(chat){const dir=projectDir(chat) || chat.settings?.cwd;return dir && path.isAbsolute(dir)?path.resolve(dir):null;}
export function isUserMessage(m){return m?.role==='user' && (!m.origin || userOrigins.has(m.origin));}

// Najuži projekat iz spiska koji sadrži folder; folder van spiska postaje sopstveni projekat.
export function projectFor(dir,rows){
 let best=null;
 for(const row of rows){const p=path.resolve(row.path);if((dir===p || dir.startsWith(p+path.sep)) && (!best || p.length>best.path.length))best={...row,path:p};}
 return best || (dir?{name:path.basename(dir),path:dir,state:'',date:''}:null);
}

const lastAt=chat=>Math.max(chat.updatedAt || 0,...(chat.messages || []).map(m=>m.completedAt || m.createdAt || 0));
// Tekst posle „Pitanje:“ u poslednjem redu za akciju.
export function questionText(text){
 const lines=String(text || '').split('\n');
 for(let i=lines.length-1;i>=0;i--){const m=lines[i].match(/^\s*\**Pitanje:\**\s*(.+)/);if(m)return clean(m[1],600);}
 return '';
}
// Red „Sledeće:“ ili „Sledeći korak“ iz STANJE.md, ako ga agent zapisao.
export function nextFromState(text){
 for(const line of String(text || '').split('\n')){const m=line.match(/Sledeć(?:e|i korak)\s*:\s*(.+)/i);if(m)return clean(m[1],240);}
 return '';
}

export function buildBoard({rows=[],chats=[],isRunning=()=>false,memoryView=()=>null,now=Date.now(),activeDays=14}={}){
 const groups=new Map();
 for(const chat of chats){
  if(!boardChat(chat))continue;
  const project=projectFor(chatDir(chat),rows);if(!project)continue;
  const group=groups.get(project.path) || {project,chats:[]};group.chats.push(chat);groups.set(project.path,group);
 }
 const list=[];
 for(const {project,chats:own} of groups.values()){
  const roots=own.filter(c=>!c.parentChatId && !c.continuedTo).sort((a,b)=>lastAt(b)-lastAt(a));
  const running=own.filter(c=>isRunning(c.id));
  const memory=memoryView(roots[0] || own[0]) || {};
  // Čeka korisnika samo pitanje iz poslednjeg odgovora četa, posle kog korisnik nije ništa napisao.
  const byMessage=new Map((memory.openQuestions || []).map(q=>[q.messageId,q]));
  const questions=roots.map(c=>{const last=(c.messages || []).at(-1);if(last?.role!=='assistant' || last.status!=='done' || isRunning(c.id))return null;const text=questionText(last.text);if(!text)return null;const q=byMessage.get(last.id);return {id:q?.id || null,text,chatId:c.id,chatTitle:clean(c.title,80),at:last.completedAt || last.createdAt || 0};}).filter(Boolean).sort((a,b)=>b.at-a.at);
  const stale=Math.max(0,(memory.openQuestions || []).length-questions.filter(q=>q.id).length);
  const record=(memory.records || [])[0];
  const activity=Math.max(0,...own.map(lastAt));
  if(now-activity>activeDays*DAY && !questions.length && !running.length)continue;
  list.push({
   name:project.name,path:project.path,stateLine:clean(project.state,240),date:project.date || '',
   status:questions.length?'ceka':running.length?'radi':'stoji',
   lastActivity:activity,
   mainChatId:roots[0]?.id || own[0]?.id,
   chats:roots.slice(0,5).map(c=>({id:c.id,title:clean(c.title,80),agent:c.settings?.agent,running:isRunning(c.id) || own.some(x=>x.parentChatId===c.id && isRunning(x.id)),lastAt:lastAt(c)})),
   running:running.length,questions,staleQuestions:stale,
   lastResult:record?.result?{text:clean(record.result),at:record.at,chatId:record.chatId}:null,
   next:clean(record?.remaining,240) || nextFromState(memory.state?.text),
   warnings:memory.warnings || []
  });
 }
 const order={ceka:0,radi:1,stoji:2};
 return list.sort((a,b)=>order[a.status]-order[b.status] || b.lastActivity-a.lastActivity);
}

const median=values=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const dayKey=(at,offset)=>new Date(at+offset).toISOString().slice(0,10);

// Ponašanje korisnika iz istorije četova i događaja table. Samo merenja, bez tumačenja sadržaja poruka.
export function analyzeBehavior({chats=[],rows=[],events=[],now=Date.now(),days=7,tzOffset=60*60000}={}){
 const since=now-days*DAY,messages=[],latencies=[],questionLatencies=[];
 let questionsAsked=0,questionsAnswered=0,questionsOpen=0;
 for(const chat of chats){
  if(!boardChat(chat))continue;
  const project=projectFor(chatDir(chat),rows)?.path || '?',list=chat.messages || [];
  for(let i=0;i<list.length;i++){
   const m=list[i];
   if(isUserMessage(m) && m.createdAt>=since){
    messages.push({at:m.createdAt,project,chatId:chat.id,origin:m.origin});
    const prev=list.slice(0,i).reverse().find(x=>x.role==='assistant');
    const done=prev?.completedAt;
    // Pauze duže od 8 sati su prekid dana, ne vreme reakcije.
    if(done && m.createdAt>done && m.createdAt-done<8*HOUR){latencies.push(m.createdAt-done);if(/Pitanje:/.test(prev.text || ''))questionLatencies.push(m.createdAt-done);}
   }
   if(m.role==='assistant' && m.status==='done' && (m.completedAt || 0)>=since && /(^|\n)\s*\**Pitanje:/m.test(m.text || '')){
    questionsAsked++;
    if(list.slice(i+1).some(isUserMessage))questionsAnswered++;else questionsOpen++;
   }
  }
 }
 messages.sort((a,b)=>a.at-b.at);
 const perDay=new Map();
 let previous=null;
 for(const m of messages){
  const key=dayKey(m.at,tzOffset),day=perDay.get(key) || {day:key,messages:0,projects:new Set(),switches:0,hours:new Set()};
  day.messages++;day.projects.add(m.project);day.hours.add(new Date(m.at+tzOffset).getUTCHours());
  // Prelaz: sledeća poruka istog dana u drugom projektu, u roku od sat vremena.
  if(previous && previous.project!==m.project && dayKey(previous.at,tzOffset)===key && m.at-previous.at<HOUR)day.switches++;
  perDay.set(key,day);previous=m;
 }
 const daily=[...perDay.values()].map(d=>({day:d.day,messages:d.messages,projects:d.projects.size,switches:d.switches,activeHours:d.hours.size}));
 const projectCounts={};for(const m of messages){const name=projectFor(m.project,rows)?.name || path.basename(m.project);projectCounts[name]=(projectCounts[name] || 0)+1;}
 const boardEvents=events.filter(e=>e.at>=since);
 const count=type=>boardEvents.filter(e=>e.type===type).length;
 const viaBoard=messages.filter(m=>m.origin==='board').length;
 const summary={
  days,messages:messages.length,
  activeDays:daily.length,
  avgProjectsPerDay:daily.length?+(daily.reduce((s,d)=>s+d.projects,0)/daily.length).toFixed(1):0,
  avgSwitchesPerDay:daily.length?+(daily.reduce((s,d)=>s+d.switches,0)/daily.length).toFixed(1):0,
  medianReplyMinutes:median(latencies)!==null?Math.round(median(latencies)/60000):null,
  medianQuestionReplyMinutes:median(questionLatencies)!==null?Math.round(median(questionLatencies)/60000):null,
  questionsAsked,questionsAnswered,questionsOpen,
  boardOpens:count('open'),boardAnswers:count('answer'),boardAccepts:count('accept'),boardContinues:count('continue'),viaBoard,
  topProjects:Object.entries(projectCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,n])=>({name,messages:n}))
 };
 return {summary,daily,suggestions:suggest(summary)};
}

// Pravila za predloge; pragovi su početna procena i menjaju se posle merenja (docs/tabla-projekata.md).
export function suggest(s){
 const out=[];
 if(s.avgSwitchesPerDay>=15)out.push(`Prosečno ${s.avgSwitchesPerDay} prelaza između projekata dnevno. Probaj blokove: odgovori na sva pitanja odjednom sa table, pa radi na jednom projektu 30-60 min.`);
 if(s.avgProjectsPerDay>4)out.push(`Dnevno diraš ${s.avgProjectsPerDay} projekata. Izaberi najviše 3 za danas, ostali čekaju u redu.`);
 if(s.questionsOpen>=3)out.push(`${s.questionsOpen} odgovora sa pitanjem još čeka tebe. Kreni od vrha table.`);
 if(s.medianQuestionReplyMinutes!==null && s.medianQuestionReplyMinutes>60)out.push(`Na pitanje agenta odgovaraš za oko ${s.medianQuestionReplyMinutes} min (medijana). Agenti za to vreme stoje.`);
 if(s.questionsAsked>=5 && s.boardAccepts===0 && s.boardAnswers===0)out.push('Pitanja sa table još nisu korišćena. Dugme „Prihvati preporuku“ zatvara pitanje jednim klikom.');
 if(!out.length && s.messages)out.push('Nema većih zastoja u ovom periodu.');
 return out;
}

// Dnevnik radnji na tabli: jedan JSON red po događaju, bez teksta poruka.
export function createBoardLog(file,{now=()=>Date.now()}={}){
 const types=new Set(['open','answer','accept','continue','instruct','open-chat']);
 function add(type,data={}){
  if(!types.has(type))throw Error('Nepoznat događaj table.');
  const row={at:now(),type,...(data.project?{project:String(data.project).slice(0,300)}:{}),...(data.chatId?{chatId:String(data.chatId).slice(0,80)}:{}),...(Number.isFinite(data.waitedMs)?{waitedMs:Math.max(0,Math.round(data.waitedMs))}:{})};
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.appendFileSync(file,JSON.stringify(row)+'\n',{mode:0o600});return row;
 }
 function read(since=0){
  let text='';try{text=fs.readFileSync(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  return text.split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(e=>e && e.at>=since);
 }
 return {add,read};
}

// Tekst poruke koju tabla šalje agentu.
export function boardMessage({kind,text='',question=''}){
 if(kind==='accept')return `Prihvatam tvoju preporuku za pitanje: „${clean(question,500)}“. Nastavi.`;
 if(kind==='continue')return text.trim()?`Nastavi sa sledećim korakom: ${text.trim()}`:'Nastavi sa sledećim korakom.';
 if(kind==='answer')return question?`Odgovor na pitanje „${clean(question,300)}“: ${text.trim()}`:text.trim();
 return text.trim();
}
