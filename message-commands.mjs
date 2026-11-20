import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {marked} from 'marked';
import {isShellCommand,codeLanguage} from './public/command-buttons.mjs';
const quote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
export function allowedMessageCommand(message,command){
 if(message?.role!=='assistant' || typeof command!=='string' || !command.trim() || command.length>20000 || /\0/.test(command))return false;
 let allowed=false;
 marked.walkTokens(marked.lexer(message.text || ''),token=>{
  if((token.type==='code' || token.type==='codespan') && token.text.trim()===command.trim() && isShellCommand(token.text,codeLanguage(token.lang)))allowed=true;
 });
 return allowed;
}
export function createMessageCommandRunner({dataDir,open}){
 return async ({chat,messageId,command,confirmed})=>{
  if(confirmed!==true)throw Error('Komanda se pokreće tek klikom na dugme Pokreni.');
  const message=chat.messages.find(m=>m.id===messageId);
  if(!allowedMessageCommand(message,command))throw Error('Komanda nije pronađena u poruci agenta.');
  const dir=path.join(dataDir,'command-runs');fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const file=path.join(dir,randomUUID()+'.command');
  const script=`#!/bin/zsh\n# Pokrenuto iz Agent Deska isključivo korisnikovim klikom.\ntrap 'rm -f -- "$0"' EXIT\ncd -- ${quote(chat.settings.cwd)} || exit 1\n${command.replace(/^\$[ \t]+/gm,'')}\nagent_desk_exit=$?\nprintf '\\nKomanda je završena. Izlazni kod: %s\\n' "$agent_desk_exit"\nexit "$agent_desk_exit"\n`;
  fs.writeFileSync(file,script,{mode:0o700});
  try{await open(file);}catch(error){fs.rmSync(file,{force:true});throw error;}
  return {ok:true,launched:true};
 };
}
