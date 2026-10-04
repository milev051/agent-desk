import {chatFilename} from './chat-files.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export function createArchive(dataDir,{now=Date.now,retention=30*86400000}={}){
 const dir=path.join(dataDir,'archive'),legacy=path.join(dataDir,'trash');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const find=id=>fs.readdirSync(dir).find(n=>n===id+'.json' || n.endsWith(' -- '+id+'.json'));
 const write=(id,value)=>{const target=path.join(dir,chatFilename(value.chats[0]?.title,id,'json'));fs.writeFileSync(target+'.tmp',JSON.stringify(value,null,2),{mode:0o600});fs.renameSync(target+'.tmp',target);};
 if(fs.existsSync(legacy))for(const name of fs.readdirSync(legacy).filter(n=>/^[\w-]+\.json$/.test(n))){const file=path.join(legacy,name),id=name.slice(0,-5);if(find(id))continue;const archivedAt=fs.statSync(file).mtimeMs;write(id,{id,archivedAt,expiresAt:archivedAt+retention,chats:JSON.parse(fs.readFileSync(file,'utf8'))});fs.unlinkSync(file);}
 const read=id=>{if(!/^[\w-]+$/.test(id))return null;const name=find(id);if(!name)return null;const file=path.join(dir,name);const record=JSON.parse(fs.readFileSync(file,'utf8'));if(record.expiresAt<=now()){fs.unlinkSync(file);return null;}const readable=chatFilename(record.chats[0]?.title,id,'json');if(name!==readable)fs.renameSync(file,path.join(dir,readable));return record;};
 const list=()=>fs.readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>{const suffix=n.match(/ -- ([\w-]+)\.json$/);const id=suffix?.[1] || (/^[\w-]+\.json$/.test(n)?n.slice(0,-5):null);return id?read(id):null;}).filter(Boolean).sort((a,b)=>b.archivedAt-a.archivedAt);
 return {list,read,add(chats){const id=randomUUID(),archivedAt=now();write(id,{id,archivedAt,expiresAt:archivedAt+retention,chats});return id;},remove(id){if(read(id)){const name=find(id);if(name)fs.unlinkSync(path.join(dir,name));}},prune(){list();}};
}
