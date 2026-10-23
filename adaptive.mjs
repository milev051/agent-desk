// Prilagodljivi agenti: za svaki projekat agent predloži šta da meri i šta da podešava, server ga odobri prema korisnikovom podešavanju,
// a posle svakog pokretanja agent sam bira sledeći termin (1 do 30 dana). Propušten termin kreće čim je aplikacija slobodna.
// Agent menja samo pravila i podešavanja iz svog opisa; izmene koda upisuje kao predlog.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const day=86400000;
export const minIntervalDays=1,maxIntervalDays=30,weeklyRuns=6;
export const adaptiveRules={
 prelazak:{
  title:'Prelazak u nov čet',
  report:'prelasci.md',
  values:{
   coldMinContext:{default:50000,min:20000,max:200000,text:'Keš je istekao: sam prelazak kad je kontekst bar ovoliki.'},
   warmMinContext:{default:150000,min:80000,max:400000,text:'Keš važi: sam prelazak tek kad je kontekst bar ovoliki.'}
  }
 }
};
// Neispravna ili nepoznata vrednost vraća podrazumevanu; ispravna se ograničava na granice.
export function clampRules(def,raw){
 const out={};
 for(const [k,v] of Object.entries(def.values)){const n=raw?.[k];out[k]=Number.isFinite(n)?Math.min(v.max,Math.max(v.min,Math.round(n))):v.default;}
 return out;
}
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const clampDays=n=>Number.isFinite(n)?Math.min(maxIntervalDays,Math.max(minIntervalDays,Math.round(n))):null;
export const statuses=['predlog','aktivan','pauziran','odbijen'];
// Polja koja agent sme da postavi; status menja samo korisnik.
export function cleanAgent(input,now){
 const days=clampDays(Number(input.intervalDays));
 const out={};
 for(const [k,max] of [['name',80],['goal',400],['measure',600],['adapt',600],['sources',600],['reason',400]])if(input[k]!==undefined)out[k]=text(input[k],max);
 if(days)out.intervalDays=days;
 if(input.nextRun!==undefined){const t=Number(new Date(input.nextRun));if(Number.isFinite(t))out.nextRun=Math.min(now+maxIntervalDays*day,Math.max(now+3600000,t));}
 return out;
}
export function createAdaptive(dataDir,{now=Date.now,root='',autoApprove=false}={}){
 const dir=path.join(dataDir,'prilagodjavanje'),agentsFile=path.join(dir,'agenti.json');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=name=>path.join(dir,name+'.json');
 const readJson=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}};
 const writeJson=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2)+'\n',{mode:0o600});fs.renameSync(f+'.tmp',f);};
 // Fajl sa granicama i opisom pravi se odmah, da agent vidi šta sme da menja.
 for(const [name,def] of Object.entries(adaptiveRules))if(!fs.existsSync(file(name))){
  writeJson(file(name),{_opis:`${def.title}. Menja ga prilagodljivi agent; vrednosti van granica server vraća na granicu.`,_granice:Object.fromEntries(Object.entries(def.values).map(([k,v])=>[k,{min:v.min,max:v.max,podrazumevano:v.default,opis:v.text}])),...Object.fromEntries(Object.entries(def.values).map(([k,v])=>[k,v.default]))});
 }
 let store=readJson(agentsFile)||{agents:[],runs:[]};store.agents||=[];store.runs||=[];
 store.autoApprove=typeof store.autoApprove==='boolean'?store.autoApprove:autoApprove;
 const approvePending=()=>{const t=now();for(const a of store.agents)if(a.status==='predlog')Object.assign(a,{status:'aktivan',approvedAt:t,approvedAutomatically:true,nextRun:t});};
 if(store.autoApprove)approvePending();
 // Ugrađen agent za prelazak u nov čet postoji od početka i već je odobren.
 if(root && !store.agents.some(a=>a.builtin==='prelazak')){const t=now();store.agents.push({id:'prelazak',builtin:'prelazak',project:root,name:'Prelazak u nov čet',goal:'Da prelazak u nov čet štedi, a ne troši limit.',measure:'Cena i kontekst pre i posle prelaska (data/prelasci.md).',adapt:'Pragovi u data/prilagodjavanje/prelazak.json.',sources:'data/prelasci.md',intervalDays:3,status:'aktivan',createdAt:t,approvedAt:t,nextRun:t});}
 const save=()=>writeJson(agentsFile,store);save();
 const find=id=>{const a=store.agents.find(a=>a.id===id);if(!a)throw Object.assign(Error('Prilagodljivi agent ne postoji.'),{status:404});return a;};
 return {
  dir,file,
  read(name){return clampRules(adaptiveRules[name],readJson(file(name)));},
  notesDir(id){const d=path.join(dir,id.replace(/[^\w-]/g,''));fs.mkdirSync(d,{recursive:true,mode:0o700});return d;},
  list(){return structuredClone(store.agents);},
  settings(){return {autoApprove:store.autoApprove};},
  setSettings(input){if(typeof input.autoApprove!=='boolean')throw Error('autoApprove mora biti true ili false.');store.autoApprove=input.autoApprove;if(store.autoApprove)approvePending();save();return this.settings();},
  get(id){return structuredClone(find(id));},
  // Predlog agenta iz četa; automatsko odobravanje prati sačuvan korisnikov izbor.
  propose(input,{chatId}={}){
   const t=now(),a={id:randomUUID().slice(0,8),...cleanAgent(input,t),project:path.resolve(String(input.project||'')),status:'predlog',createdAt:t,proposedBy:chatId||''};
   if(!a.name || !a.goal || !a.measure)throw Error('Predlog treba name, goal i measure.');
   if(!input.project)throw Error('Predlog treba project (putanju projekta).');
   if(store.autoApprove)Object.assign(a,{status:'aktivan',approvedAt:t,approvedAutomatically:true,nextRun:t});
   a.intervalDays||=7;store.agents.push(a);save();return structuredClone(a);
  },
  update(id,input){const a=find(id),t=now();Object.assign(a,cleanAgent(input,t),{updatedAt:t});if(input.intervalDays && input.nextRun===undefined && a.lastRun)a.nextRun=a.lastRun+a.intervalDays*day;save();return structuredClone(a);},
  setStatus(id,status){if(!statuses.includes(status))throw Error('Nepoznat status.');const a=find(id),t=now();a.status=status;if(status==='aktivan'){a.approvedAt||=t;a.nextRun=a.nextRun && a.nextRun>t?a.nextRun:t;}save();return structuredClone(a);},
  remove(id){find(id);store.agents=store.agents.filter(a=>a.id!==id);save();},
  // Najstariji propušten termin; ukupno najviše weeklyRuns pokretanja u 7 dana.
  due(){const t=now();if(store.runs.filter(r=>t-r<7*day).length>=weeklyRuns)return null;return structuredClone(store.agents.filter(a=>a.status==='aktivan' && (a.nextRun||0)<=t).sort((a,b)=>(a.nextRun||0)-(b.nextRun||0))[0]||null);},
  // Rezervni termin, ako agent sam ne postavi sledeći.
  markRun(id,chatId){const a=find(id),t=now();a.lastRun=t;a.chatId=chatId;a.runs=(a.runs||0)+1;a.nextRun=t+(a.intervalDays||7)*day;store.runs=[...store.runs.filter(r=>t-r<7*day),t];save();return structuredClone(a);},
  setChat(id,chatId){const a=find(id);a.chatId=chatId;save();}
 };
}
function scheduling(address,id){
 return `Na kraju odredi kada je sledeće merenje korisno: PATCH ${address}/api/adaptive/agents/${id} sa {"nextRun":"RFC3339","reason":"zašto tada"} (od 1 h do ${maxIntervalDays} dana; po potrebi menjaj i "intervalDays", "measure", "adapt"). Ako to ne uradiš, sledeće pokretanje je posle intervalDays. Status agenta menja samo korisnik.`;
}
export function adaptivePrompt(agent,{address,dataDir,notes}){
 const history=path.join(notes,'istorija.md');
 const rules=agent.builtin?`\nPravila koja smeš da menjaš: ${path.join(dataDir,'prilagodjavanje',agent.builtin+'.json')}, samo brojeve, unutar _granice, najviše jednu vrednost po pregledu. Ako merenja nisu dovoljna ili su protivrečna, ništa ne menjaj.`:'';
 return `Pokretanje prilagodljivog agenta „${agent.name}“ za projekat ${agent.project}.
Cilj: ${agent.goal}
Šta meriš: ${agent.measure}
Šta smeš da prilagodiš: ${agent.adapt||'ništa bez korisnikove potvrde, samo predlozi'}
Izvori: ${agent.sources||'odredi sam iz projekta'}${rules}
Prethodni nalazi i merenja su u ${history}, ako postoji; pročitaj ga prvo i uporedi sa novim stanjem. Prethodno pokretanje: ${agent.lastRun?new Date(agent.lastRun).toISOString().slice(0,10):'nema'}.
Dopiši u ${history}: datum, šta si izmerio (brojevi), šta si promenio ili „bez promene“, i šta očekuješ do sledećeg merenja. Menjaj samo ono iz „Šta smeš da prilagodiš“. Izmene koda, objavu sajta ili restart servera ne radiš; upiši ih u ${path.join(notes,'predlozi.md')} kao predlog.
${scheduling(address,agent.id)}
Kratko mi reci šta si video, šta si promenio i kada je sledeće merenje.`;
}
export function proposePrompt({address,project,existing,autoApprove=false}){
 return `Proceni da li projektu ${project} trebaju prilagodljivi agenti: agenti koji se sami pokreću u razmacima, mere kako se projekat stvarno koristi i po tome podešavaju pravila ili predlažu izmene.
Pročitaj STANJE.md, README.md i ODLUKE.md projekta ako postoje, i proveri koji izvori podataka stvarno postoje (npr. Search Console, Cloudflare analitika, logovi, statistika). Agent bez stvarnih podataka ne predlaži.
${existing.length?`Postojeći agenti za ovaj projekat: ${existing.map(a=>`${a.name} (${a.status})`).join(', ')}. Ne predlaži iste.\n`:''}Predloži od 0 do 3 agenta, svaki sa jasnom koristi. Svaki predlog pošalji: POST ${address}/api/adaptive/agents sa {"project":"${project}","name":"kratko","goal":"šta treba da se poboljša","measure":"šta tačno meri i odakle","adapt":"šta sme sam da menja (pravila, podešavanja), ili prazno ako samo predlaže","sources":"putanje ili API-ji","intervalDays":broj od 1 do 30}.
${autoApprove?'Automatsko odobravanje je uključeno: server sam aktivira poslate predloge.':'Predlozi čekaju korisnikovo odobrenje u delu „Prilagođavanje“.'} Ne pozivaj /status. Kratko mi reci šta predlažeš i zašto, ili zašto nijedan agent ne treba.`;
}
