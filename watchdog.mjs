// Čuvar Agent Deska. Server ga sam instalira u ~/Library/LaunchAgents, a macOS ga pokreće pri prijavi i svakog minuta.
// 1. Briše zaostale launchd poslove local.agent-desk.* (osim servera i čuvara). Agent ih pravi sa `launchctl submit`,
//    a takav posao macOS pokreće iznova posle svakog izlaska, pa restart skripta restartuje server u krug.
// 2. Ako se server restartovao 5+ puta za 15 minuta, gasi /tmp/agent-desk-*restart* skripte.
// 3. Posle prijave na Mac pokreće server, da telefon radi bez otvaranja aplikacije.
// 4. Ako server ne odgovara dve provere zaredom, restartuje ga.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const watchdogLabel='local.agent-desk.watchdog', serverLabel='local.agent-desk.server';
const loopStarts=5, loopWindow=15*60000;

export function decide(state,{now,pid,loaded,responds,labels}){
  const rogue=labels.filter(label=>label.startsWith('local.agent-desk.') && label!==serverLabel && label!==watchdogLabel);
  let starts=(state.starts || []).filter(time=>now-time<loopWindow);
  if(pid && pid!==state.pid)starts.push(now);
  const loop=starts.length>=loopStarts;if(loop)starts=[];
  const failures=!loaded || responds?0:(state.failures || 0)+1;
  return {rogue,loop,startServer:!loaded,restartServer:failures>=2,state:{pid,starts,failures:failures>=2?0:failures}};
}

export function watchdogPlist({node,script,log}){
  const string=value=>`<string>${value.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>${string(watchdogLabel)}
	<key>ProgramArguments</key><array>${string(node)}${string(script)}</array>
	<key>StartInterval</key><integer>60</integer>
	<key>RunAtLoad</key><true/>
	<key>StandardErrorPath</key>${string(log)}
</dict>
</plist>
`;
}

// Poziva ga server pri pokretanju. Upisuje čuvara samo kad se plist promenio ili čuvar nije učitan.
export function installWatchdog({configDir,home=os.homedir(),node=['/opt/homebrew/bin/node','/usr/local/bin/node'].find(file=>fs.existsSync(file)) || process.execPath}){
  const domain=`gui/${process.getuid()}`,file=path.join(home,'Library','LaunchAgents',watchdogLabel+'.plist');
  const plist=watchdogPlist({node,script:fileURLToPath(import.meta.url),log:path.join(configDir,'watchdog.log')});
  const loaded=spawnSync('launchctl',['print',`${domain}/${watchdogLabel}`],{stdio:'ignore'}).status===0;
  if(loaded && fs.existsSync(file) && fs.readFileSync(file,'utf8')===plist)return false;
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,plist);
  if(loaded)spawnSync('launchctl',['bootout',`${domain}/${watchdogLabel}`],{stdio:'ignore'});
  spawnSync('launchctl',['bootstrap',domain,file],{stdio:'ignore'});
  return true;
}

async function run(){
  const configDir=path.join(os.homedir(),'.config','agent-desk'),stateFile=path.join(configDir,'watchdog-state.json'),logFile=path.join(configDir,'watchdog.log');
  const domain=`gui/${process.getuid()}`,launchctl=(...args)=>spawnSync('launchctl',args,{encoding:'utf8'});
  const log=message=>fs.appendFileSync(logFile,new Date().toLocaleString('sr-RS')+' '+message+'\n');
  const notify=message=>{log(message);spawnSync('osascript',['-e',`display notification ${JSON.stringify(message)} with title "Agent Desk čuvar"`]);};
  const serverInfo=()=>{const result=launchctl('print',`${domain}/${serverLabel}`);return {loaded:result.status===0,pid:Number(result.stdout.match(/^\s*pid = (\d+)/m)?.[1]) || null};};
  const responds=async()=>{try{return (await fetch('http://127.0.0.1:4317/',{signal:AbortSignal.timeout(5000)})).ok;}catch{return false;}};
  let state={};try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{}
  const labels=execFileSync('launchctl',['list'],{encoding:'utf8'}).split('\n').map(line=>line.split('\t').at(-1));
  const {loaded,pid}=serverInfo();
  const result=decide(state,{now:Date.now(),pid,loaded,responds:loaded && await responds(),labels});
  for(const label of result.rogue){launchctl('remove',label);notify(`Uklonjen zaostali posao ${label}, koji je restartovao server u krug.`);}
  if(result.loop){
    const stopped=fs.readdirSync('/tmp').filter(name=>/^agent-desk-.*restart.*\.(py|mjs|sh)$/.test(name));
    for(const name of stopped){spawnSync('pkill',['-f','/tmp/'+name]);fs.renameSync('/tmp/'+name,'/tmp/'+name+'.ugaseno');}
    notify(`Server se restartovao u krug. Ugašene skripte: ${stopped.join(', ') || 'nijedna'}.`);
  }
  const serverPlist=path.join(configDir,'server-launch.plist');
  if(result.startServer && fs.existsSync(serverPlist) && launchctl('bootstrap',domain,serverPlist).status===0)log('Server pokrenut posle prijave na Mac.');
  if(result.restartServer){launchctl('kickstart','-k',`${domain}/${serverLabel}`);notify('Server nije odgovarao, pokrenut je ponovo.');}
  fs.writeFileSync(stateFile,JSON.stringify({...result.state,pid:serverInfo().pid || pid}));
}

if(process.argv[1]===fileURLToPath(import.meta.url))await run();
