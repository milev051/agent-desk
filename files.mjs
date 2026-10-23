import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const inside=(p,root)=>p===root || p.startsWith(root+path.sep);
export function filePath(value,cwd,home=os.homedir()){
 if(typeof value!=='string' || value.length>4096)throw Error('Neispravna putanja.');
 const target=path.resolve(value.startsWith('~/')?path.join(home,value.slice(2)):value || cwd);
 const roots=[path.resolve(home),path.resolve(cwd),fs.realpathSync(home),fs.realpathSync(cwd)];
 const allowed=p=>roots.some(root=>inside(p,root)) && !p.split(path.sep).some(part=>part.startsWith('.') || ['Library','node_modules'].includes(part)) && !/\.(pem|key|p12|pfx)$/i.test(p);
 if(!allowed(target))throw Error('Izaberi običan fajl ili folder projekta, izvan skrivenih i sistemskih foldera.');
 const real=fs.realpathSync(target);if(!allowed(real))throw Error('Putanja nije dostupna.');
 const stat=fs.statSync(real);if(!stat.isFile() && !stat.isDirectory())throw Error('Putanja nije fajl ili folder.');return real;
}
export function browseFiles(value,cwd,home=os.homedir()){
 const dir=filePath(value || cwd,cwd,home);if(!fs.statSync(dir).isDirectory())throw Error('Izaberi folder.');
 const entries=fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{try{const p=filePath(path.join(dir,e.name),cwd,home);return [{name:e.name,path:p,directory:fs.statSync(p).isDirectory()}];}catch{return [];}}).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
 let parent=null;try{parent=filePath(path.dirname(dir),cwd,home);if(parent===dir)parent=null;}catch{}
 const shortcuts=[['home','Home',home],['desktop','Desktop',path.join(home,'Desktop')],['documents','Documents',path.join(home,'Documents')],['downloads','Downloads',path.join(home,'Downloads')]].flatMap(([id,name,p])=>{try{const real=filePath(p,cwd,home);return fs.statSync(real).isDirectory()?[{id,name,path:real}]:[];}catch{return [];}});
 const crumbs=[];let current=dir;while(true){try{filePath(current,cwd,home);crumbs.unshift({name:current===fs.realpathSync(home)?'Home':path.basename(current),path:current});}catch{}const next=path.dirname(current);if(next===current)break;current=next;}
 return {path:dir,parent,home:fs.realpathSync(home),shortcuts,crumbs,entries:entries.slice(0,500),truncated:entries.length>500};
}
function projectRoots(cwd,home){
 return [path.resolve(home),path.resolve(cwd),fs.realpathSync(home),fs.realpathSync(cwd)];
}
const blockedNames=new Set(['node_modules','Library','.ssh','.gnupg','.aws','.kube']);
function allowedProject(real,roots){
 return roots.some(root=>inside(real,root)) && !real.split(path.sep).some(part=>blockedNames.has(part));
}
export function browseProject(value,cwd,home=os.homedir(),options={}){
 const hidden=options.hidden===true;
 const roots=projectRoots(cwd,home);
 const resolveDir=input=>{
  if(typeof input!=='string' || input.length>4096)throw Error('Neispravna putanja.');
  const target=path.resolve(input.startsWith('~/')?path.join(home,input.slice(2)):input || cwd);
  if(!hidden && target.split(path.sep).some(part=>part.startsWith('.')))throw Error('Skriveni folder je isključen.');
  const real=fs.realpathSync(target);
  if(!allowedProject(real,roots) || !fs.statSync(real).isDirectory())throw Error('Izaberi folder projekta.');
  return real;
 };
 const dir=resolveDir(value || cwd);
 const entries=fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(!hidden && entry.name.startsWith('.'))return [];
  if(blockedNames.has(entry.name) || /\.(pem|key|p12|pfx)$/i.test(entry.name))return [];
  try{
   const real=fs.realpathSync(path.join(dir,entry.name));
   if(!allowedProject(real,roots))return [];
   const stat=fs.statSync(real);
   if(!stat.isFile() && !stat.isDirectory())return [];
   const row={name:entry.name,path:real,directory:stat.isDirectory(),mtime:stat.mtimeMs};
   if(stat.isFile())row.size=stat.size;
   return [row];
  }catch{return [];}
 }).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
 let parent=null;
 try{parent=resolveDir(path.dirname(dir));if(parent===dir)parent=null;}catch{}
 return {path:dir,parent,entries:entries.slice(0,500),truncated:entries.length>500};
}
function gitRun(cwd,args){
 const result=spawnSync('git',['-C',cwd,...args],{encoding:'utf8',timeout:2000,maxBuffer:1024*1024,windowsHide:true});
 if(result.error || result.status!==0)return null;
 return result.stdout || '';
}
function porcelainFiles(text){
 const files=[];
 const chunks=String(text||'').split('\0');
 for(let i=0;i<chunks.length;i++){
  const chunk=chunks[i];
  if(!chunk || chunk.length<4)continue;
  const mark=chunk.slice(0,2);
  const file=chunk.slice(3);
  if(file)files.push(file);
  if(/[RC]/.test(mark))i++;
 }
 return files;
}
export function gitSnapshot(cwd){
 try{
  const branch=gitRun(cwd,['rev-parse','--abbrev-ref','HEAD']);
  if(branch==null)return {repo:false};
  const status=gitRun(cwd,['status','--porcelain','-z']) ?? '';
  const numstat=gitRun(cwd,['diff','--numstat','HEAD']) ?? gitRun(cwd,['diff','--numstat']) ?? '';
  let added=0,removed=0;
  for(const line of numstat.split('\n')){
   const match=line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
   if(!match)continue;
   if(match[1]!=='-')added+=Number(match[1]);
   if(match[2]!=='-')removed+=Number(match[2]);
  }
  const files=porcelainFiles(status).map(file=>{
   const abs=path.resolve(cwd,file);
   try{return fs.realpathSync(abs);}catch{return abs;}
  });
  return {repo:true,branch:branch.trim() || 'HEAD',added,removed,changed:files.length,files};
 }catch{return {repo:false};}
}
export function fileChange(cwd,value,home=os.homedir()){
 const requested=path.resolve(cwd,value.startsWith('~/')?path.join(home,value.slice(2)):value);
 let target;
 try { target=filePath(requested,cwd,home); }
 catch(error) {
  if(error.code!=='ENOENT')throw error;
  const relative=path.relative(path.resolve(cwd),requested);
  if(!relative || relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || relative.split(path.sep).some(part=>part.startsWith('.') || ['Library','node_modules'].includes(part)) || /\.(pem|key|p12|pfx)$/i.test(requested))throw error;
  let parent=path.dirname(requested);
  while(!fs.existsSync(parent) && parent!==path.dirname(parent))parent=path.dirname(parent);
  filePath(parent,cwd,home);
  if(gitRun(cwd,['ls-files','--error-unmatch','--',requested])===null)throw error;
  target=requested;
 }
 const stat=fs.existsSync(target)?fs.statSync(target):null;
 if(stat && !stat.isFile())throw Error('Izaberi fajl.');
 if(stat && stat.size>2000000)return {path:target,diff:'',tooBig:true};
 const diff=gitRun(cwd,['diff','--no-ext-diff','--unified=3','HEAD','--',target]) ?? gitRun(cwd,['diff','--no-ext-diff','--unified=3','--',target]) ?? '';
 let text=diff.trim();
 if(!text){
  const status=gitRun(cwd,['status','--porcelain','-z','--',target]) || '';
  if(stat && status.includes('??')){
   const raw=fs.readFileSync(target);
   if(!raw.subarray(0,1000).includes(0))text=raw.toString('utf8').slice(0,8000).split('\n').map(line=>`+${line}`).join('\n');
  }
 }
 return {path:target,diff:text.slice(0,8000),truncated:text.length>8000};
}
export function withFiles(text,files,cwd){
 if(files===undefined)return text;
 if(!Array.isArray(files) || files.length>20)throw Error('Izaberi najviše 20 putanja.');
 const paths=[...new Set(files.map(p=>filePath(p,cwd)))];
 return text+(paths.length?'\n\nPovezane putanje na računaru (pročitaj po potrebi):\n'+paths.map(p=>'- '+JSON.stringify(p)).join('\n'):'');
}
