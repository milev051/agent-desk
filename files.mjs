import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
 return {path:dir,parent,home:fs.realpathSync(home),entries:entries.slice(0,500),truncated:entries.length>500};
}
export function withFiles(text,files,cwd){
 if(files===undefined)return text;
 if(!Array.isArray(files) || files.length>20)throw Error('Izaberi najviše 20 putanja.');
 const paths=[...new Set(files.map(p=>filePath(p,cwd)))];
 return text+(paths.length?'\n\nPovezane putanje na računaru (pročitaj po potrebi):\n'+paths.map(p=>'- '+JSON.stringify(p)).join('\n'):'');
}
