import fs from 'node:fs';
import path from 'node:path';

// Lične misli: jedan fajl po danu (2026-10-19.md), svaki upis počinje vremenom „HH:MM“.
// Folder je u data/, pa ne ide u Git.
const pad=n=>String(n).padStart(2,'0');
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
export const dayLabel=key=>{const [y,m,d]=key.split('-');return `${Number(d)}.${Number(m)}.${y}.`;};
const validDay=key=>typeof key==='string' && /^\d{4}-\d{2}-\d{2}$/.test(key);

export function parseDay(text){
 const entries=[];
 for(const line of String(text || '').split('\n')){
  const start=line.match(/^(\d{2}:\d{2}) (.*)$/);
  if(start)entries.push({time:start[1],text:start[2]});
  else if(line.startsWith('  ') && entries.length)entries.at(-1).text+='\n'+line.slice(2);
 }
 return entries;
}

export function createThoughts(dir){
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=key=>path.join(dir,key+'.md');
 const stateFile=path.join(dir,'pitanja.json');
 function list(key=dayKey()){
  if(!validDay(key))throw Error('Neispravan datum.');
  try{return parseDay(fs.readFileSync(file(key),'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}
 }
 function days(){return fs.readdirSync(dir).filter(name=>/^\d{4}-\d{2}-\d{2}\.md$/.test(name)).map(name=>name.slice(0,10)).sort().reverse();}
 function add(text,now=new Date()){
  const clean=String(text || '').replace(/\r/g,'').trim();
  if(!clean)throw Error('Misao je prazna.');
  if(clean.length>5000)throw Error('Misao je predugačka.');
  const key=dayKey(now),time=`${pad(now.getHours())}:${pad(now.getMinutes())}`,target=file(key);
  const header=fs.existsSync(target)?'':`# ${dayLabel(key)}\n\n`;
  fs.appendFileSync(target,header+time+' '+clean.split('\n').join('\n  ')+'\n',{mode:0o600});
  return {date:key,time,text:clean};
 }
 const readState=()=>{try{return JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{return {};}};
 const writeState=value=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(stateFile+'.tmp',stateFile);};
 // Pitanja stižu jednom dnevno posle zadatog sata, samo ako je tog dana nešto zapisano.
 function due(now=new Date(),hour=21){
  const key=dayKey(now);
  if(now.getHours()<hour || readState().askedDay===key || !list(key).length)return null;
  return {date:key,weekly:now.getDay()===0};
 }
 function markAsked(key){writeState({...readState(),askedDay:key});log({type:'asked',day:key});}
 // Dnevnik korišćenja beleži samo metapodatke (vreme, dužinu, broj odgovora), nikad tekst misli.
 const logFile=path.join(dir,'koriscenje.jsonl'),reportFile=path.join(dir,'koriscenje.md');
 function events(){try{return fs.readFileSync(logFile,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return [];throw error;}}
 function log(event,now=new Date()){
  fs.appendFileSync(logFile,JSON.stringify({at:now.toISOString(),day:dayKey(now),...event})+'\n',{mode:0o600});
  fs.writeFileSync(reportFile+'.tmp',usageReport(events()),{mode:0o600});fs.renameSync(reportFile+'.tmp',reportFile);
 }
 // Pregled sistema kreće tek posle bar dva dana sa zapisima, najviše jednom u dva dana, posle večernjih pitanja.
 function improveDue(now=new Date(),hour=22){
  const key=dayKey(now),state=readState(),used=new Set(events().filter(e=>e.type==='note').map(e=>e.day));
  if(now.getHours()<hour || state.improvedDay===key || used.size<2)return null;
  if(state.improvedDay && (new Date(key)-new Date(state.improvedDay))/86400000<2)return null;
  return {date:key};
 }
 function markImproved(key){writeState({...readState(),improvedDay:key});log({type:'improve',day:key});}
 return {dir,file,list,days,add,due,markAsked,log,events,improveDue,markImproved,reportFile};
}

export function usageReport(events){
 const byDay=new Map();
 for(const e of events){
  const row=byDay.get(e.day) || {notes:0,chars:0,times:[],asked:false,replies:0,improve:false};
  if(e.type==='note'){row.notes++;row.chars+=e.length || 0;row.times.push(e.time);}
  if(e.type==='asked')row.asked=true;
  if(e.type==='reply')row.replies++;
  if(e.type==='improve')row.improve=true;
  byDay.set(e.day,row);
 }
 const lines=['# Korišćenje „Procesa“','','Automatski dnevnik, bez teksta misli. Ocene i promene su u ocene.md i pravila.md.','','| Dan | Upisa | Znakova | Vreme upisa | Pitanja | Odgovora | Pregled sistema |','|---|---|---|---|---|---|---|'];
 for(const [day,row] of [...byDay].sort((a,b)=>b[0].localeCompare(a[0])))
  lines.push(`| ${dayLabel(day)} | ${row.notes} | ${row.chars} | ${row.times.join(', ') || '-'} | ${row.asked?'da':'ne'} | ${row.replies} | ${row.improve?'da':'-'} |`);
 return lines.join('\n')+'\n';
}

export function improvePrompt({date,dir}){
 return `Pregled sistema „Procesi“ (${dayLabel(date)}). Pročitaj ${path.join(dir,'koriscenje.md')}, ${path.join(dir,'ocene.md')} i ${path.join(dir,'pravila.md')} ako postoje, beleške poslednjih dana i naš raniji razgovor. Proceni kako koristim sistem i šta mi pomaže da iznesem više iz sebe i bolje se razumem. Ako treba, promeni pravila.md (najviše 20 redova) i uvedi najviše jednu probu, označenu sa „Proba:“ i datumom. Ideje koje traže izmenu koda upiši u predlozi.md. Kratko mi reci šta si promenio i zašto, pa me pitaj da ocenim prethodnu probu.`;
}

export function thoughtsPrompt({date,weekly,dir}){
 const today=path.join(dir,date+'.md');
 return weekly
  ?`Nedeljni pregled (${dayLabel(date)}). Pročitaj ${today} i fajlove prethodnih 7 dana u ${dir}. Uporedi šta iz beležaka izgleda da želim sa onim na šta mi stvarno ide vreme i pažnja. Navedi jedan do dva obrasca koje možda ne primećujem i jedan konkretan predlog, pa postavi 2 do 3 kratka pitanja.`
  :`Večernja pitanja za ${dayLabel(date)}. Pročitaj ${today}. Postavi mi 2 do 3 kratka pitanja o onome što sam zapisao, tako da lako odgovorim.`;
}

export function thoughtsContext({address,dir}){
 return `Ti si lični savetnik korisnika u Agent Desku. Korisnik tokom dana zapisuje kratke misli, bez sređivanja, jer mu je neprijatno da ih izgovori. Beleške su u ${dir}, jedan fajl po danu (GGGG-MM-DD.md), svaki upis počinje vremenom. To su privatni podaci: ne kopiraj ih van tog foldera, ne šalji ih spoljnim servisima i ne menjaj fajlove beležaka ni koriscenje.*. Smeš da pišeš samo u pravila.md, ocene.md i predlozi.md u tom folderu; kod Agent Deska ne menjaš.
Ako postoji ${path.join(dir,'pravila.md')}, pročitaj ga i drži se njega; to su pravila koja si sam podesio na osnovu korisnikovih ocena. Kad korisnik oceni pitanja ili probu (npr. „dobro je“, „ne valja“), dopiši u ocene.md red sa datumom, šta je ocenjeno i ocenom.
Pravila: piši na srpskom, latinicom, toplo i kratko, bez osuđivanja i bez predavanja. Ne ponavljaj korisniku šta je napisao. Kad postavljaš pitanja, najviše 3, svako u jednom redu, na koja se odgovara jednom rečenicom. Iz njegovih odgovora i beležaka pretpostavi šta su mu ciljevi i problemi, i reci to kao pretpostavku koju može da ispravi. Kad primetiš razliku između onoga što želi i onoga što radi, reci je blago i konkretno.
Za nedeljni pregled smeš da pročitaš metapodatke o radu u Agent Desku: GET ${address}/api/planner/activity (bez tekstova poruka). Ako je Google Calendar povezan, smeš da pročitaš događaje te nedelje: GET ${address}/api/integrations/calendar/calendars/primary/events?timeMin=RFC3339&timeMax=RFC3339. Ništa ne upisuj u kalendar, mejl ili zadatke.
Ne koristi format Urađeno:/Proveri:. Red Ponuđeno: dodaj samo ako u odgovoru postoji stvarno otvoreno pitanje koje traži korisnikov izbor ili podatak; ponudi samo konkretne odgovore na to pitanje, razdvojene znakom |. Ako takvog pitanja nema, izostavi ceo red. Ne izmišljaj nove zadatke radi nastavka razgovora i ne obećavaj fizičke radnje koje ne možeš da izvršiš. Ovo pravilo zamenjuje ranije obavezno dodavanje ponuđenih nastavaka.`;
}
