// Opterećenje računara po četu (macOS): jedan poziv `ps` na oko 5 s dok neki čet radi.
// Svaki čet dobija zbir CPU % i RSS memorije za stablo procesa koje je pokrenuo (CLI i deca).
// Dugotrajni deljeni procesi (dev server, headless Chrome) idu u posebnu grupu „deljeno“,
// da se ne pripišu četu koji ih je slučajno pokrenuo. Isto važi za ničije procese istog
// korisnika (roditelj launchd). Sistem: opterećenje (1 min), dostupna memorija, swap, pritisak.
// Kad je računar preopterećen, novi podčetovi čekaju u redu (chat.resourceWaiting).
import {execFile} from 'node:child_process';
import os from 'node:os';

const run=(file,args)=>new Promise(resolve=>execFile(file,args,{maxBuffer:8<<20,timeout:4000},(error,stdout)=>resolve(error?'':String(stdout))));

// Pragovi preopterećenja. Swap sam ne blokira: na macOS-u ostaje pun i posle rasterećenja.
export const LIMITS={loadPerCore:2,releaseLoadPerCore:1.5,swapRatio:.9,pressure:4,releaseGapMs:45000};

// Komande dugotrajnih servera i pregledača koje koriste svi četovi.
const SHARED=/\b(nuxt|nuxi|vite|next|astro|webpack|http-server|serve)\b[^\n]*\b(dev|preview|serve|start)\b|--headless|--remote-debugging-port|\bnpm(?:\s+run)?\s+(?:dev|preview)\b/i;
const TOOLING=/(^|\/)(node|python\d?(\.\d+)?|bun|deno|php|ruby)(\s|$)/i;

export function parsePs(text){
 const rows=new Map();
 for(const line of String(text).split('\n')){
  const m=line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/);if(!m)continue;
  rows.set(+m[1],{pid:+m[1],ppid:+m[2],uid:+m[3],cpu:+m[4],rss:+m[5]*1024,args:m[6].trim()});
 }
 return rows;
}
export function parseSwap(text){
 const n=k=>{const m=String(text).match(new RegExp(k+'\\s*=\\s*([\\d.]+)([MG])'));return m?+m[1]*(m[2]==='G'?1024:1)*1048576:0;};
 return {total:n('total'),used:n('used')};
}
export function parseVmStat(text){
 const page=+(String(text).match(/page size of (\d+)/)?.[1]||16384);
 const n=k=>+(String(text).match(new RegExp('Pages '+k+':\\s+(\\d+)'))?.[1]||0);
 return (n('free')+n('inactive')+n('speculative')+n('purgeable'))*page;
}
const short=args=>{
 const parts=String(args).split(/\s+/);const bin=(parts[0]||'').split('/').pop();
 if(/Chrome|Chromium/i.test(args))return /--headless/.test(args)?'Chrome (headless)':'Chrome';
 const script=parts.slice(1).find(p=>!p.startsWith('-'))||'';
 return (bin+(script?' '+script.split('/').slice(-2).join('/'):'')).slice(0,60);
};

// roots: [{chatId,title,pid}]; selfPid: server Agent Deska. Vraća grupe sa zbirom CPU i RSS.
export function attribute(rows,roots,{selfPid=0,uid=null}={}){
 const children=new Map();
 for(const r of rows.values()){if(!children.has(r.ppid))children.set(r.ppid,[]);children.get(r.ppid).push(r);}
 const seen=new Set(),chats=new Map(),shared=[];
 const rootPids=new Set(roots.map(r=>r.pid));
 const sum=(pid,acc,{stopAtRoots=false,splitShared=null}={})=>{
  const r=rows.get(pid);if(!r || seen.has(pid))return acc;seen.add(pid);
  acc.cpu+=r.cpu;acc.rss+=r.rss;acc.processes++;
  for(const c of children.get(pid)||[]){
   if(stopAtRoots && rootPids.has(c.pid))continue;
   if(splitShared && SHARED.test(c.args)){shared.push({...sum(c.pid,{cpu:0,rss:0,processes:0}),label:short(c.args),pid:c.pid,startedBy:splitShared});continue;}
   sum(c.pid,acc,{stopAtRoots,splitShared});
  }
  return acc;
 };
 for(const root of roots){
  if(!rows.has(root.pid))continue;
  chats.set(root.chatId,{chatId:root.chatId,title:root.title,...sum(root.pid,{cpu:0,rss:0,processes:0},{splitShared:root.title||root.chatId})});
 }
 const desk=selfPid && rows.has(selfPid)?sum(selfPid,{cpu:0,rss:0,processes:0},{stopAtRoots:true,splitShared:'Agent Desk'}):null;
 // Ničiji procesi korisnika (roditelj launchd): dev serveri i headless Chrome koji su ostali posle četa.
 for(const r of rows.values()){
  if(seen.has(r.pid) || r.ppid!==1 || (uid!==null && r.uid!==uid))continue;
  if(!SHARED.test(r.args) && !(TOOLING.test(r.args) && !/^\/(System|usr\/(libexec|sbin))\//.test(r.args) && !/\.app\/Contents\/MacOS\/[^/]+$/.test(r.args.split(/\s+/)[0]) ))continue;
  const acc=sum(r.pid,{cpu:0,rss:0,processes:0});
  if(acc.cpu>=1 || acc.rss>=100*1048576)shared.push({...acc,label:short(r.args),pid:r.pid,startedBy:null});
 }
 const round=g=>({...g,cpu:Math.round(g.cpu*10)/10,rss:Math.round(g.rss)});
 return {chats:[...chats.values()].map(round),desk:desk?round(desk):null,shared:shared.map(round).sort((a,b)=>b.rss-a.rss).slice(0,8)};
}

export function overloaded(system,limits=LIMITS){
 const reasons=[];
 if(system.load1>=system.cores*limits.loadPerCore)reasons.push(`opterećenje ${system.load1.toFixed(1)} (prag ${system.cores*limits.loadPerCore})`);
 if(system.pressure>=limits.pressure)reasons.push('memorija kritična');
 if(system.swapTotal && system.swapUsed/system.swapTotal>=limits.swapRatio && system.pressure>=2)reasons.push('swap pun i memorija pod pritiskom');
 return reasons;
}

export function createResourceMonitor({roots,selfPid=process.pid,uid=process.getuid?.()??null,onSample=()=>{},exec=run,now=()=>Date.now(),limits=LIMITS}={}){
 let last=null,lastRelease=0;
 async function sample(){
  const [ps,swap,pressure,vm]=await Promise.all([
   exec('/bin/ps',['-axo','pid=,ppid=,uid=,pcpu=,rss=,args=']),
   exec('/usr/sbin/sysctl',['-n','vm.swapusage']),
   exec('/usr/sbin/sysctl',['-n','kern.memorystatus_vm_pressure_level']),
   exec('/usr/bin/vm_stat',[])
  ]);
  const s=parseSwap(swap),list=roots();
  const system={load1:Math.round(os.loadavg()[0]*100)/100,cores:os.cpus().length,memTotal:os.totalmem(),memAvailable:parseVmStat(vm)||os.freemem(),swapTotal:s.total,swapUsed:s.used,pressure:+pressure.trim()||1};
  const groups=attribute(parsePs(ps),list,{selfPid,uid});
  const top=groups.chats.slice().sort((a,b)=>(b.cpu/100+b.rss/1e9)-(a.cpu/100+a.rss/1e9))[0]||null;
  last={at:now(),system,overload:overloaded(system,limits),...groups,top:top?{chatId:top.chatId,title:top.title}:null};
  onSample(last);return last;
 }
 // Da li nov podčet treba da čeka. Bez ijednog aktivnog agenta nema šta da se čeka.
 function shouldWait({activeCount,queued=0}){
  if(!activeCount)return false;
  return queued>0 || !!last?.overload.length;
 }
 // Da li sme da krene sledeći iz reda: računar ispod nižeg praga i prošlo dovoljno od prethodnog.
 function canRelease({activeCount}){
  if(!activeCount)return true;
  if(!last || now()-lastRelease<limits.releaseGapMs)return false;
  const {system}=last;
  return system.load1<system.cores*limits.releaseLoadPerCore && system.pressure<limits.pressure && !(system.swapTotal && system.swapUsed/system.swapTotal>=limits.swapRatio && system.pressure>=2);
 }
 return {sample,shouldWait,canRelease,released(){lastRelease=now();},get last(){return last;}};
}

// Sledeći podčet koji čeka resurse, najstariji prvi.
export function nextResourceWaiting(chats){
 return chats.filter(c=>c.resourceWaiting).sort((a,b)=>a.resourceWaiting.at-b.resourceWaiting.at)[0]||null;
}
