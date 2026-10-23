import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const updateDateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit'});
function updateDate(now){const parts=Object.fromEntries(updateDateFormat.formatToParts(new Date(now)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
const exec=promisify(execFile);
const names={codex:'Codex',claude:'Claude Code',grok:'Grok Build',antigravity:'Antigravity'};
export function updateCommand(agent,binary,npm){
 if(!binary)return null;
 const real=fs.realpathSync(binary),packages={codex:'@openai/codex',claude:'@anthropic-ai/claude-code',grok:'@xai-official/grok'};
 const pkg=packages[agent],marker=pkg?'/lib/node_modules/'+pkg+'/':null;
 if(marker && real.includes(marker)){if(!npm)throw Error('npm nije dostupan.');return {file:npm,args:['install','--global','--prefix',real.slice(0,real.indexOf(marker)),pkg+'@latest']};}
 if(['claude','grok','antigravity'].includes(agent))return {file:binary,args:['update']};
 throw Error('Ova instalacija Codexa zahteva ažuriranje preko svog upravljača paketima.');
}
export function createCliUpdates(file,{binaries,npm,isBusy,execute=async(file,args)=>exec(file,args,{timeout:300000,maxBuffer:1024*1024,env:{...process.env,NO_COLOR:'1',CI:'1'}}),now=Date.now}={}){
 let saved={auto:false,lastAttemptDate:null,results:[]},running=false,startedAt=null,timer;
 try{saved={...saved,...JSON.parse(fs.readFileSync(file,'utf8'))};}catch{}
 for(const result of saved.results)if(result.status==='working'){result.status='error';result.message='Prethodno ažuriranje je prekinuto. Proveri verziju i ponovi po potrebi.';}
 function save(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(saved,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);}
 function view(){return {auto:saved.auto,lastAttemptDate:saved.lastAttemptDate,results:structuredClone(saved.results),running,startedAt};}
 async function version(id,binary){if(id==='antigravity')return '';try{return (await execute(binary,['--version'])).stdout.trim().slice(0,120);}catch{return '';}}
 async function run(){
  if(running || isBusy()){const error=Error('Sačekaj da svi agenti i provere završe, pa pokreni ažuriranje.');error.status=409;throw error;}
  running=true;startedAt=now();saved.lastAttemptDate=updateDate(now());saved.results=[];
  try{save();for(const [id,name] of Object.entries(names)){
   const result={id,name,status:'working',before:'',after:''};saved.results.push(result);save();
   const binary=binaries[id];if(!binary){result.status='skipped';result.message='CLI nije instaliran.';save();continue;}
   try{const command=updateCommand(id,binary,npm);result.before=await version(id,binary);await execute(command.file,command.args);result.after=await version(id,binary);result.status='done';result.message=result.before && result.before===result.after?'Već je aktuelna verzija.':'Ažuriranje završeno.';}
   catch{result.status='error';result.message='Ažuriranje nije uspelo. Proveri mrežu i dozvole instalacije; možeš ponoviti ručno.';}
   save();
  }}finally{running=false;save();}
  return view();
 }
 return {view,run,configure(value){if(!value || Object.keys(value).some(k=>k!=='auto') || typeof value.auto!=='boolean')throw Error('auto mora biti boolean.');saved.auto=value.auto;save();return view();},async tick(){if(saved.auto && !running && !isBusy() && saved.lastAttemptDate!==updateDate(now()))await run();},start(){timer=setInterval(()=>{void this.tick().catch(()=>{});},60000);timer.unref();},close(){clearInterval(timer);}};
}
