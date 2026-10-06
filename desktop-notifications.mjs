import fs from 'node:fs';import path from 'node:path';
export const notificationSounds=['default','none','Glass','Ping','Pop','Tink','Submarine','Hero'];
export function createNotificationSettings(file){
 let sound='default';try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(notificationSounds.includes(saved.sound))sound=saved.sound;}catch{}
 return {get:()=>({sound,sounds:notificationSounds}),set(value){if(!notificationSounds.includes(value.sound))throw Error('Zvuk nije dostupan.');sound=value.sound;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({sound}),{mode:0o600});fs.renameSync(file+'.tmp',file);return this.get();}};
}
export function desktopNotificationArgs({title,body,chatId,sound='default'}){
 if(!/^[\w-]+$/.test(chatId))throw Error('Čet nije ispravan.');
 return ['-title',String(title).slice(0,120),'-message',String(body).slice(0,300),'-group','agent-desk-'+chatId,'-open','agentdesk://chat/'+chatId,...(sound==='none'?[]:['-sound',notificationSounds.includes(sound)?sound:'default'])];
}
