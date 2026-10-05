import fs from 'node:fs';
import path from 'node:path';
import {exportMessages} from './public/sidebar-groups.mjs';

export function chatFilename(title,id,extension){
 if(!/^[\w-]+$/.test(id))throw new Error('Neispravan ID zapisa.');
 const label=String(title || 'Novi čet').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,' ').replace(/\s+/g,' ').replace(/^[. ]+|[. ]+$/g,'').slice(0,70).trim() || 'Novi čet';
 return `${label} -- ${id}.${extension}`;
}

// Čitljivi zapisi su izvedene kopije; chats.json ostaje izvor podataka.
// Glavni čet sa podagentima i njegovi podagenti dele folder nazvan po glavnom četu.
export function createChatFiles(dataDir){
 const dir=path.join(dataDir,'cetovi'),paths=new Map(),own=/ -- [\w-]+(\.md)?$/;fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const place=(chats,chat)=>{const parent=chats.find(c=>c.id===chat.parentChatId) || (chats.some(c=>c.parentChatId===chat.id)?chat:null);
  return parent?path.join(chatFilename(parent.title,parent.id,'md').slice(0,-3),chatFilename(chat.title,chat.id,'md')):chatFilename(chat.title,chat.id,'md');};
 return {sync(chats){
  const expected=new Set();paths.clear();
  for(const chat of chats){
   if(!chat.messages?.some(m=>m.text))continue;
   const name=place(chats,chat),target=path.join(dir,name);expected.add(name);paths.set(chat.id,target);
   const text=exportMessages(chats,chat.id,chat.messages.map(m=>m.id));
   if(fs.existsSync(target) && fs.readFileSync(target,'utf8')===text)continue;
   fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target+'.tmp',text,{mode:0o600});fs.renameSync(target+'.tmp',target);
  }
  for(const name of fs.readdirSync(dir)){
   if(!own.test(name))continue;const full=path.join(dir,name);
   if(!fs.statSync(full).isDirectory()){if(name.endsWith('.md') && !expected.has(name))fs.unlinkSync(full);continue;}
   for(const inner of fs.readdirSync(full))if(/ -- [\w-]+\.md$/.test(inner) && !expected.has(path.join(name,inner)))fs.unlinkSync(path.join(full,inner));
   if(!fs.readdirSync(full).length)fs.rmdirSync(full);
  }
 },file(chat){return paths.get(chat.id) || path.join(dir,chatFilename(chat.title,chat.id,'md'));}};
}
