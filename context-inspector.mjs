import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {transferPlan,historyText} from './context.mjs';

export function composeAgentContext(chat,prompt,{application='',shared='',children='',sentAt=Date.now(),createdAt=sentAt,minimal=false}={}){
 const plan=transferPlan(chat,chat.settings.agent),historyTransferred=!!plan.text;
 const message=historyText([{role:'user',text:prompt,createdAt,sentAt}]);
 const history=historyTransferred?`Prethodne poruke iz ovog četa (istorija razgovora${chat.sessions[chat.settings.agent]?', dopuna od prethodnog odgovora ovog agenta':''}):\n${plan.text}\n\nNova poruka korisnika:\n${message}`:message;
 return {text:minimal?prompt:[application,shared,children,history].join('\n\n'),historyTransferred};
}
export function agentVisibleInput(spec,agent){return agent==='antigravity'?JSON.parse(spec.input).message.content:spec.input || spec.args.at(-1) || '';}
export function contextTextStats(text){return {characters:text.length,minTokens:Math.ceil(text.length/6),maxTokens:Math.ceil(text.length/2)};}
export function createContextSnapshots(dataDir){
 const dir=path.join(dataDir,'context-snapshots');
 const filename=id=>{if(!/^[\w-]{1,100}$/.test(id))throw Error('Neispravan ID četa.');return path.join(dir,id+'.json.gz');};
 return {
  write(id,snapshot){const file=filename(id);fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.writeFileSync(file+'.tmp',gzipSync(JSON.stringify(snapshot)),{mode:0o600});fs.renameSync(file+'.tmp',file);},
  read(id){const file=filename(id);return fs.existsSync(file)?JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8')):null;}
 };
}
