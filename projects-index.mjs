import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sep=' · ';
const noState='nema zabeleženog stanja';

export function projectsLine(file){
  return `Pregled naziva i lokacija projekata je ${path.join(os.homedir(),'Desktop','PROJEKTI.md')} (automatski se osvežava dok Agent Desk radi). Detaljan spisak projekata je ${file} (jedan red po projektu: ime · putanja · stanje · datum). Ne učitavaj ga uz svaku poruku: otvori ga samo kad korisnik pomene projekat po imenu ili kad ti radni folder nije jasan. Kad završiš rad u projektu, ažuriraj njegov red u tom spisku i STANJE.md u folderu projekta (najviše 15-20 redova: gde smo stali, sledeći korak, otvorena pitanja; starije stavke skrati).`;
}

export function parseProjects(text){
  const rows=[];
  for(const line of String(text).split('\n')){
    const parts=line.split(sep).map(part=>part.trim());
    if(parts.length<2 || !parts[0] || !path.isAbsolute(parts[1]))continue;
    rows.push({name:parts[0],path:parts[1],state:parts[2]||'',date:parts[3]||''});
  }
  return rows;
}

function day(ms){return new Date(ms).toISOString().slice(0,10);}

export function createProjectsIndex(file,{skip=[os.homedir(),'/']}={}){
  const skipped=new Set(skip.map(item=>path.resolve(item)));
  const read=()=>{try{return fs.readFileSync(file,'utf8');}catch{return '';}};
  const list=()=>parseProjects(read());
  function load(){return new Set(list().map(row=>row.path));}
  function usable(dir){
    if(typeof dir!=='string' || !path.isAbsolute(dir))return false;
    const resolved=path.resolve(dir);
    if(skipped.has(resolved))return false;
    try{return fs.statSync(resolved).isDirectory();}catch{return false;}
  }
  // Dopisuje samo nove putanje na kraj; postojeći redovi ostaju netaknuti.
  function add(dirs){
    const seen=load(),text=read(),rows=parseProjects(text),names=new Set(rows.map(row=>row.name.toLowerCase()));
    const lines=[];
    for(const dir of dirs){
      if(!usable(dir))continue;
      const resolved=path.resolve(dir);
      if(seen.has(resolved))continue;
      let name=path.basename(resolved),full=name;
      if(names.has(name.toLowerCase()))full=`${name} (${path.basename(path.dirname(resolved))})`;
      if(names.has(full.toLowerCase()))continue;
      seen.add(resolved);names.add(full.toLowerCase());
      lines.push([full,resolved,noState,day(fs.statSync(resolved).mtimeMs)].join(sep));
    }
    if(!lines.length)return [];
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    const head=text?'':'# Spisak projekata: Ime · putanja · jedna rečenica stanja · datum poslednje izmene\n';
    fs.writeFileSync(file,head+text+(text && !text.endsWith('\n')?'\n':'')+lines.join('\n')+'\n',{mode:0o600});
    return lines;
  }
  function relocate(moves){
    if(!moves.size)return;
    const text=read().split('\n').map(line=>{
      const parts=line.split(sep);
      const target=moves.get(parts[1]?.trim());
      if(target)parts[1]=target;
      return parts.join(sep);
    }).join('\n');
    fs.writeFileSync(file,text,{mode:0o600});
  }
  function updateState(dir,text,at=Date.now()){
    const lines=String(text).split('\n').map(line=>line.trim());
    const summary=(lines.find(line=>/^(?:[-*]\s*)?(?:Urađeno|Rezultat|Stanje):/i.test(line)) || lines.find(line=>line && !/^[#_]/.test(line)) || '').replace(/^[-*]\s*/, '').replace(/\s+/g,' ').replaceAll(sep,' ').slice(0,240);
    if(!summary)return false;
    let changed=false;
    const content=read().split('\n').map(line=>{
      const parts=line.split(sep);let stored=parts[1]?.trim();try{stored=fs.realpathSync(stored);}catch{}
      if(stored!==dir)return line;
      changed=true;return [parts[0],parts[1],summary,day(at)].join(sep);
    }).join('\n');
    if(changed)fs.writeFileSync(file,content,{mode:0o600});return changed;
  }
  return {list,add,relocate,updateState};
}

// Početni spisak: radni folderi četova, bez duplikata.
export function chatDirs(chats){return [...new Set(chats.map(chat=>chat.settings?.cwd).filter(Boolean))];}
