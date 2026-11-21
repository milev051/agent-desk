// Provera i primena novih izmena aplikacije sa GitHub-a (git fetch, pull --ff-only).
// Bez git-a, bez .git foldera ili bez mreže provera tiho ne prikazuje ništa.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec=promisify(execFile);
const HOURS=3600000;

export function createAppUpdates({
 dir,
 git='git',
 npm='npm',
 execute=(file,args,options={})=>exec(file,args,{cwd:dir,timeout:120000,maxBuffer:4*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_ASKPASS:'echo',NO_COLOR:'1'},...options}),
 restart=()=>({status:200,body:{}}),
 now=Date.now,
 interval=4*HOURS,
 firstDelay=20000
}={}){
 let state={available:false,behind:0,ahead:0,commits:[],branch:null,checkedAt:null},updating=false,message='',checking=null,timer,firstTimer;
 const run=async(...args)=>(await execute(git,args)).stdout.trim();
 function view(){return {...state,commits:state.commits.map(c=>({...c})),updating,message};}
 async function defaultBranch(){
  try{const ref=await run('symbolic-ref','--quiet','refs/remotes/origin/HEAD');if(ref.startsWith('refs/remotes/origin/'))return ref.slice('refs/remotes/origin/'.length);}catch{}
  try{const up=await run('rev-parse','--abbrev-ref','@{upstream}');if(up.startsWith('origin/'))return up.slice(7);}catch{}
  return 'main';
 }
 async function inspect(){
  if(!fs.existsSync(path.join(dir,'.git')))return null;
  const branch=await defaultBranch();
  await execute(git,['fetch','--quiet','origin',branch]);
  const remote='origin/'+branch,current=await run('rev-parse','--abbrev-ref','HEAD');
  const behind=Number(await run('rev-list','--count','HEAD..'+remote))||0;
  const ahead=Number(await run('rev-list','--count',remote+'..HEAD'))||0;
  const log=behind?await run('log','--no-merges','-n','30','--format=%h%x09%ct%x09%s','HEAD..'+remote):'';
  const commits=log?log.split('\n').map(line=>{const [hash,time,...subject]=line.split('\t');return {hash,at:Number(time)*1000,subject:subject.join('\t')};}):[];
  return {branch,current,behind,ahead,commits};
 }
 async function check(){
  if(checking)return checking;
  checking=(async()=>{
   try{
    const found=await inspect();
    if(!found){state={...state,available:false,behind:0,commits:[]};return view();}
    state={available:found.behind>0,behind:found.behind,ahead:found.ahead,commits:found.commits,branch:found.branch,current:found.current,checkedAt:now()};
    if(!found.behind && !updating)message='';
   }catch{/* bez mreže ili git-a: ostaje poslednje stanje, bez poruke */}
   finally{checking=null;}
   return view();
  })();
  return checking;
 }
 async function update(){
  if(updating){const error=Error('Ažuriranje je već u toku.');error.status=409;throw error;}
  updating=true;message='Proveravam izmene…';
  try{
   let found;
   try{found=await inspect();}catch{return refuse('Nema veze sa GitHub-om ili git nije dostupan. Pokušaj kasnije.');}
   if(!found)return refuse('Ovaj folder nije git kopija repozitorijuma, pa ne može da se ažurira odavde.');
   state={...state,available:found.behind>0,behind:found.behind,ahead:found.ahead,commits:found.commits,branch:found.branch,checkedAt:now()};
   if(!found.behind)return refuse('Aplikacija je već ažurna.');
   if(found.current!==found.branch)return refuse(`Trenutna grana je ${found.current}, a ažuriranje ide na ${found.branch}. Prebaci se na ${found.branch} ručno.`);
   const dirty=await run('status','--porcelain','--untracked-files=no');
   if(dirty)return refuse('Ima necommitovanih izmena u fajlovima aplikacije. Ništa nije menjano. Commituj ili skloni izmene, pa ponovi ažuriranje.');
   if(found.ahead)return refuse(`Lokalna grana ima ${found.ahead} commit(a) kojih nema na GitHub-u, pa ne može samo da se pomeri napred. Ništa nije menjano.`);
   const lockBefore=await run('rev-parse','HEAD:package-lock.json').catch(()=>'');
   try{await run('pull','--ff-only','--quiet','origin',found.branch);}
   catch{return refuse('git pull --ff-only nije uspeo (verovatno nepraćen fajl istog imena ili promena na GitHub-u u međuvremenu). Ništa nije menjano.');}
   const lockAfter=await run('rev-parse','HEAD:package-lock.json').catch(()=>'');
   if(lockBefore!==lockAfter){
    message='Instaliram pakete…';
    try{await execute(npm,['install','--no-audit','--no-fund'],{timeout:600000});}
    catch{updating=false;message='Izmene su preuzete, ali npm install nije uspeo. Pokreni npm install ručno, pa restartuj server.';state={...state,available:false,behind:0,commits:[]};return view();}
   }
   state={...state,available:false,behind:0,commits:[],checkedAt:now()};
   const result=restart();
   message=result?.body?.restarting?'Ažurirano. Server se restartuje.':(result?.body?.scheduled || result?.body?.scheduledRestart)?'Ažurirano. Restart čeka da agenti završe.':'Ažurirano. Restartuj server da izmene počnu da važe.';
   updating=false;
   return view();
  }finally{updating=false;}
  function refuse(text){message=text;updating=false;return view();}
 }
 return {
  view,check,update,
  start(){firstTimer=setTimeout(()=>void check(),firstDelay);firstTimer.unref?.();timer=setInterval(()=>void check(),interval);timer.unref?.();},
  close(){clearTimeout(firstTimer);clearInterval(timer);}
 };
}
