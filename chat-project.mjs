import fs from 'node:fs';
import path from 'node:path';

// Težina radnje: izmena fajla jasno pokazuje projekat, komanda samo nagoveštava.
const weight=action=>action.kind==='file'?(action.change?3:2):action.kind==='command'?1:0;
const boundary=/^(?:$|[\/"'\s)\]`;:,|&])/;

function mentions(text,dir,ignore){
 for(let at=text.indexOf(dir);at!==-1;at=text.indexOf(dir,at+1)){
  const rest=text.slice(at);
  if(boundary.test(rest.slice(dir.length)) && !ignore.some(prefix=>rest.startsWith(prefix)))return true;
 }
 return false;
}

// Projekat iz radnji jednog odgovora: najdublji poznat folder koji radnja pominje.
export function detectProject(actions,rows,{cwd='',ignore=[]}={}){
 const scores=new Map();
 for(const action of actions || []){
  const value=weight(action),text=String(action.text || '');
  if(!value || !text.includes('/'))continue;
  const hits=rows.filter(row=>mentions(text,row.path,ignore));
  // Unutar jedne radnje broji se samo najuži projekat (podfolder pre roditelja).
  const narrow=hits.filter(row=>!hits.some(other=>other!==row && other.path.startsWith(row.path+path.sep)));
  for(const row of narrow)scores.set(row,(scores.get(row) || 0)+value);
 }
 const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
 const [best,second]=ranked;
 if(!best || best[1]<2 || second && second[1]===best[1])return null;
 const own=ranked.find(([row])=>row.path===cwd);
 if(own && own[0]!==best[0] && own[1]>=best[1])return null;
 return {dir:best[0].path,name:best[0].name,score:best[1]};
}

export function projectDir(chat){
 const dir=chat?.project?.dir;
 try{return dir && path.isAbsolute(dir) && fs.statSync(dir).isDirectory()?dir:null;}catch{return null;}
}

// Ručno izabran projekat ostaje dok ga korisnik ili agent ne promeni.
// Vraća true samo kad se projekat razlikuje od dosadašnjeg (ili od radnog foldera).
export function applyDetected(chat,detected,now=Date.now()){
 if(!detected || chat.project?.source==='manual')return false;
 const previous=chat.project?.dir || chat.settings?.cwd;
 if(chat.project?.dir===detected.dir){chat.project.at=now;return false;}
 chat.project={dir:detected.dir,name:detected.name,source:'auto',at:now};
 return previous!==detected.dir;
}

export function setProject(chat,value,rows,now=Date.now()){
 if(value===null){delete chat.project;return null;}
 if(typeof value!=='string' || !path.isAbsolute(value))throw Error('dir mora biti apsolutna putanja projekta ili null.');
 const dir=path.resolve(value);
 try{if(!fs.statSync(dir).isDirectory())throw 0;}catch{throw Error('Folder projekta ne postoji.');}
 const row=rows.find(r=>r.path===dir);
 chat.project={dir,name:row?.name || path.basename(dir),source:'manual',at:now};
 return chat.project;
}
