import fs from 'node:fs';
import path from 'node:path';

function directories(dir){
  try{return fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isDirectory() && !entry.name.startsWith('.')).map(entry=>path.join(dir,entry.name));}
  catch(error){if(error.code==='ENOENT')return [];throw error;}
}
function exists(dir){try{return fs.statSync(dir).isDirectory();}catch{return false;}}
function writeChanged(file,text){
  try{if(fs.readFileSync(file,'utf8')===text)return;}catch(error){if(error.code!=='ENOENT')throw error;}
  fs.writeFileSync(file,text,{mode:0o600});
}

// Čita samo kategorije i projektne foldere, nikad sadržaj projekta ili tajne.
export function refreshDesktopProjects(index,{desktop,projectRoot}){
  const discovered=[projectRoot,...directories(path.join(desktop,'ROOM211'))];
  for(const category of directories(path.join(desktop,'Projects'))){
    const children=directories(category);
    // Već evidentiran projekat (npr. CV) ostaje jedna celina.
    if(index.list().some(row=>row.path===category))discovered.push(category);
    else discovered.push(...children);
  }
  const rows=index.list();
  const moves=new Map();
  for(const row of rows){
    if(exists(row.path))continue;
    const matches=discovered.filter(dir=>path.basename(dir)===path.basename(row.path));
    if(matches.length===1 && !rows.some(other=>other.path===matches[0]))moves.set(row.path,matches[0]);
  }
  index.relocate(moves);
  index.add(discovered);
  const current=index.list().filter(row=>exists(row.path)).sort((a,b)=>a.name.localeCompare(b.name,'sr-Latn'));
  const lines=current.map(row=>`- [${row.name.replace(/[\\[\]]/g,'\\$&')}](<${row.path.replace(/%/g,'%25').replace(/ /g,'%20').replace(/</g,'%3C').replace(/>/g,'%3E')}>)`);
  const file=path.join(desktop,'PROJEKTI.md');
  writeChanged(file,'# Projekti\n\n'+lines.join('\n')+'\n');
  return {file,count:current.length};
}
