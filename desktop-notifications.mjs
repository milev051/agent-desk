import fs from 'node:fs';import path from 'node:path';import {spawn,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {extractNotificationLine} from './notification-presence.mjs';
export const notificationSounds=['default','none','Glass','Ping','Pop','Tink','Submarine','Hero'];
export function createNotificationSettings(file){
 let sound='default',autoOpen=true,autoArchive=true;try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(notificationSounds.includes(saved.sound))sound=saved.sound;if(typeof saved.autoOpen==='boolean')autoOpen=saved.autoOpen;if(typeof saved.autoArchive==='boolean')autoArchive=saved.autoArchive;}catch{}
 return {get:()=>({sound,sounds:notificationSounds,autoOpen,autoArchive}),set(value){
  if(value.sound!==undefined && !notificationSounds.includes(value.sound))throw Error('Zvuk nije dostupan.');
  if(value.autoOpen!==undefined && typeof value.autoOpen!=='boolean')throw Error('Neispravno podešavanje otvaranja.');
  if(value.autoArchive!==undefined && typeof value.autoArchive!=='boolean')throw Error('Neispravno podešavanje arhiviranja.');
  if(value.sound!==undefined)sound=value.sound;if(value.autoOpen!==undefined)autoOpen=value.autoOpen;if(value.autoArchive!==undefined)autoArchive=value.autoArchive;
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({sound,autoOpen,autoArchive}),{mode:0o600});fs.renameSync(file+'.tmp',file);return this.get();}};
}
// Ono na čemu je agent radio: lokalni linkovi i linkovi iz reda „Proveri:“, pa postojeći fajlovi za pregled iz odgovora.
const previewFile=/\.(html?|pdf|png|jpe?g|gif|webp|svg|mp4|mov)$/i;
export function workTargets(text,{exists=fs.existsSync,home=process.env.HOME||'',skip=[]}={}){
 const urls=[],files=[],clean=v=>v.replace(/[.,;:!?)\]>'"`*]+$/,'');
 for(const line of String(text||'').split('\n')){
  const check=/^\s*(\*\*)?Proveri:/i.test(line);
  for(const m of line.matchAll(/https?:\/\/[^\s<>()\[\]`"']+/g)){const url=clean(m[0]);let host;try{host=new URL(url).hostname;}catch{continue;}
   const local=['localhost','127.0.0.1','0.0.0.0'].includes(host)||host.endsWith('.local')||/^192\.168\./.test(host);
   if((local||check) && !skip.some(prefix=>url.startsWith(prefix)) && !urls.includes(url))urls.push(url);}
  for(const m of line.matchAll(/(?:^|[\s(`"'])(\/[^\s`"'<>()]+)/g)){const file=clean(m[1]);if(home && file.startsWith(home+'/') && previewFile.test(file) && !files.includes(file) && exists(file))files.push(file);}
 }
 return [...urls.slice(0,2),...files.slice(0,2)].slice(0,3);
}
export const desktopSender='local.agent-desk.launcher';
const notifyAgents=['codex','claude','grok','antigravity'];
const prepared = new Map();
export function agentNotifier(notifier, agent, dataDir) {
 const id=notifyAgents.includes(agent)?agent:'codex';
 let source=fs.realpathSync(notifier);
 if(!source.includes('.app/'))source=fs.realpathSync(path.join(path.dirname(source),'..','terminal-notifier.app','Contents','MacOS','terminal-notifier'));
 const sourceApp=source.slice(0,source.lastIndexOf('.app/')+4);
 if(!sourceApp.endsWith('.app'))throw Error('terminal-notifier app nije pronađena.');
 const app=path.join(dataDir,'notification-apps',id+'.app');
 const binary=path.join(app,'Contents','MacOS',path.basename(source));
 const icon=fileURLToPath(new URL(`./notify-icons/${id}.app/Contents/Resources/AppIcon.icns`,import.meta.url));
 const fingerprint=[source,fs.statSync(source).mtimeMs,fs.statSync(icon).mtimeMs].join(':');
 if(prepared.get(app)===fingerprint && fs.existsSync(binary))return binary;
 const stamp=path.join(path.dirname(app),id+'.version');
 if(!fs.existsSync(binary) || !fs.existsSync(stamp) || fs.readFileSync(stamp,'utf8')!==fingerprint){
  fs.mkdirSync(path.dirname(app),{recursive:true});
  fs.rmSync(app,{recursive:true,force:true});
  fs.cpSync(sourceApp,app,{recursive:true});
  fs.copyFileSync(icon,path.join(app,'Contents','Resources','Agent.icns'));
  const plist=path.join(app,'Contents','Info.plist');
  for(const [key,value] of [['CFBundleIdentifier',`local.agent-desk.banner.${id}`],['CFBundleName',`Agent Desk ${id}`],['CFBundleIconFile','Agent'],['NSUserNotificationAlertStyle','alert']]){
   const result=spawnSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,plist]);
   if(result.status!==0){const added=spawnSync('/usr/libexec/PlistBuddy',['-c',`Add :${key} string ${value}`,plist]);if(added.status!==0)throw Error('Podešavanje ikonice nije uspelo.');}
  }
  const signed=spawnSync('/usr/bin/codesign',['--force','--deep','--sign','-',app]);
  if(signed.status!==0)throw Error('Potpis obaveštenja nije uspeo.');
  fs.writeFileSync(stamp,fingerprint);
 }
 const registration=spawnSync('/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',['-f',app]);
 if(registration.status!==0)throw Error('Registracija obaveštenja nije uspela.');
 prepared.set(app,fingerprint);
 return binary;
}
export function desktopNotificationRemoveArgs(chatId){
 if(!/^[\w-]+$/.test(chatId))throw Error('Čet nije ispravan.');
 return ['-remove','agent-desk-'+chatId];
}
export function desktopNotificationArgs({title,body,chatId,sound='default',agent}={}){
 if(!/^[\w-]+$/.test(chatId))throw Error('Čet nije ispravan.');
 const message=extractNotificationLine(body) || body;
 return ['-title',String(title||'').slice(0,120),'-message',String(message||'').slice(0,120),'-group','agent-desk-'+chatId,'-activate',desktopSender,'-open','agentdesk://chat/'+chatId,...(sound==='none'?[]:['-sound',notificationSounds.includes(sound)?sound:'default'])];
}

// Chrome: postojeći tab sa istom adresom se prebacuje u prvi plan i osvežava, umesto novog taba.
export const chromeReuseScript=`on run argv
 if application "Google Chrome" is not running then return "missing"
 tell application "Google Chrome"
  repeat with w in windows
   set i to 0
   repeat with t in tabs of w
    set i to i + 1
    if (URL of t) is in argv then
     set active tab index of w to i
     set index of w to 1
     tell t to reload
     activate
     return "reused"
    end if
   end repeat
  end repeat
 end tell
 return "missing"
end run`;
export function tabAddresses(target){
 const url=target.startsWith('/')?'file://'+encodeURI(target):target;
 return [...new Set([url,url.endsWith('/')?url.slice(0,-1):url+'/'])];
}
