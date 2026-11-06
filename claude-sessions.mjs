// Brisanje Claude Code sesija (transkripata) kad arhivirani čet istekne, da nestanu i iz Claude aplikacije.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function claudeConfigDir(env=process.env){return env.CLAUDE_CONFIG_DIR || path.join(os.homedir(),'.claude');}

// Briše projects/*/ID.jsonl i projects/*/ID/ (podagenti, prilozi) za svaki ispravan ID. Vraća broj obrisanih transkripata.
export function removeClaudeSessions(ids,{configDir=claudeConfigDir(),keep=new Set()}={}){
  const wanted=[...new Set(ids)].filter(id=>typeof id==='string' && UUID.test(id) && !keep.has(id));
  if(!wanted.length)return 0;
  const projects=path.join(configDir,'projects');let removed=0,dirs=[];
  try{dirs=fs.readdirSync(projects,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(projects,d.name));}catch{return 0;}
  for(const dir of dirs)for(const id of wanted){
    const file=path.join(dir,id+'.jsonl');
    try{fs.unlinkSync(file);removed++;}catch{}
    try{fs.rmSync(path.join(dir,id),{recursive:true,force:true});}catch{}
  }
  return removed;
}

export function claudeSessionIds(chats){return (chats||[]).map(c=>c?.sessions?.claude).filter(Boolean);}
