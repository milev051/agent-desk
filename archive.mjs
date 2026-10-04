import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export function createArchive(dataDir,{now=Date.now,retention=30*86400000}={}){
 const dir=path.join(dataDir,'archive'),legacy=path.join(dataDir,'trash');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const write=(id,value)=>{const target=path.join(dir,id+'.json');fs.writeFileSync(target+'.tmp',JSON.stringify(value,null,2),{mode:0o600});fs.renameSync(target+'.tmp',target);};
 if(fs.existsSync(legacy))for(const name of fs.readdirSync(legacy).filter(n=>/^[\w-]+\.json$/.test(n))){const file=path.join(legacy,name),id=name.slice(0,-5);if(fs.existsSync(path.join(dir,name)))continue;const archivedAt=fs.statSync(file).mtimeMs;write(id,{id,archivedAt,expiresAt:archivedAt+retention,chats:JSON.parse(fs.readFileSync(file,'utf8'))});fs.unlinkSync(file);}
 const read=id=>{if(!/^[\w-]+$/.test(id))return null;const file=path.join(dir,id+'.json');if(!fs.existsSync(file))return null;const record=JSON.parse(fs.readFileSync(file,'utf8'));if(record.expiresAt<=now()){fs.unlinkSync(file);return null;}return record;};
 const list=()=>fs.readdirSync(dir).filter(n=>/^[\w-]+\.json$/.test(n)).map(n=>read(n.slice(0,-5))).filter(Boolean).sort((a,b)=>b.archivedAt-a.archivedAt);
 return {list,read,add(chats){const id=randomUUID(),archivedAt=now();write(id,{id,archivedAt,expiresAt:archivedAt+retention,chats});return id;},remove(id){if(read(id))fs.unlinkSync(path.join(dir,id+'.json'));},prune(){list();}};
}
