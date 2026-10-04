import fs from 'node:fs';
import path from 'node:path';
import {exportMessages} from './public/sidebar-groups.mjs';

export function chatFilename(title,id,extension){
 if(!/^[\w-]+$/.test(id))throw new Error('Neispravan ID zapisa.');
 const label=String(title || 'Novi čet').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,' ').replace(/\s+/g,' ').replace(/^[. ]+|[. ]+$/g,'').slice(0,70).trim() || 'Novi čet';
 return `${label} -- ${id}.${extension}`;
}

// Čitljivi zapisi su izvedene kopije; chats.json ostaje izvor podataka.
export function createChatFiles(dataDir){
 const dir=path.join(dataDir,'cetovi');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 return {sync(chats){
  const expected=new Set();
  for(const chat of chats){
   if(!chat.messages?.some(m=>m.text))continue;
   const name=chatFilename(chat.title,chat.id,'md'),target=path.join(dir,name);expected.add(name);
   const text=exportMessages(chats,chat.id,chat.messages.map(m=>m.id));
   if(fs.existsSync(target) && fs.readFileSync(target,'utf8')===text)continue;
   fs.writeFileSync(target+'.tmp',text,{mode:0o600});fs.renameSync(target+'.tmp',target);
  }
  for(const name of fs.readdirSync(dir))if(/ -- [\w-]+\.md$/.test(name) && !expected.has(name))fs.unlinkSync(path.join(dir,name));
 },file(chat){return path.join(dir,chatFilename(chat.title,chat.id,'md'));}};
}
