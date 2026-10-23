import {execFileSync} from 'node:child_process';
export function processIdentity(pid){
 if(!Number.isInteger(pid) || pid<=1)return '';
 try{return execFileSync('ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:1000}).trim();}catch{return '';}
}
export function stopInterruptedProcess(reply,{identity=processIdentity,kill=(pid)=>process.kill(-pid,'SIGKILL')}={}){
 const previous=reply?.cliProcess;
 if(reply?.status!=='running' || !Number.isInteger(previous?.pid) || previous.pid<=1 || previous.pid===process.pid || !previous.identity)return;
 // Posle naglog pada detached CLI može ostati živ. Proveri identitet, ne samo PID.
 if(identity(previous.pid)===previous.identity){try{kill(previous.pid);}catch{}}
}
export const restartResumePrompt='Server Agent Deska je restartovan i ponovo radi. Automatski nastavi prethodni nedovršeni zadatak u ovom četu. Prvo proveri šta je već završeno; ne ponavljaj uspešne upise, slanja niti restart koji je upravo završen. Sačuvani čet, sesija i podčetovi ostaju isti. Ako je posao već gotov, pošalji samo završni odgovor korisniku.';
const latestReply=chat=>chat.messages?.at(-1)?.role==='assistant'?chat.messages.at(-1):null;
const eligible=(chat,reply)=>reply && reply.autoResume!==false && chat.resumeAfterRestart!==false && (!chat.continuedTo || chat.continuedUnlocked);
function remember(chat,reply,now,reason='running'){chat.restartResume={messageId:reply.id,agent:reply.agent || chat.settings.agent,status:'pending',createdAt:now,reason};}

// Upis pre SIGTERM-a ostaje sačuvan i kada gašenje CLI-ja promeni status poruke.
export function rememberRunningChats(chats,running,now=Date.now()){
 for(const chat of chats){const run=running.get(chat.id),reply=latestReply(chat);if(run && !run.stopped && eligible(chat,reply))remember(chat,reply,now);}
}
export function recoverRestartChats(chats,lastRestart=null,now=Date.now()){
 for(const chat of chats){
  const reply=latestReply(chat),pending=chat.restartResume;
  const waiting=lastRestart?.requesters?.some(r=>r.chatId===chat.id && r.messageId===reply?.id && r.agent===chat.settings.agent);
  // Prelaz sa stare verzije: njen shutdown je zaustavio pozivaoca bez naloga za nastavak.
  const legacyCaller=!lastRestart?.requesters && lastRestart?.requesterChatId===chat.id && reply?.status==='stopped' && reply.autoResume===undefined && reply.completedAt>=lastRestart.requestedAt && reply.completedAt-lastRestart.requestedAt<5000;
  if(eligible(chat,reply) && waiting && ['done','running','interrupted'].includes(reply.status))remember(chat,reply,now,'requester');
  else if(eligible(chat,reply) && (reply.status==='running' || legacyCaller))remember(chat,reply,now);
  else if(pending && (pending.messageId!==reply?.id || pending.agent!==chat.settings.agent || !eligible(chat,reply) || !['interrupted','stopped',...(pending.reason==='requester'?['done']:[])].includes(reply.status)))delete chat.restartResume;
  if(chat.restartResume?.status==='starting')chat.restartResume.status='pending';
  for(const message of chat.messages || [])if(message.status==='running'){stopInterruptedProcess(message);message.status='interrupted';message.activity='';message.error='Odgovor je prekinut restartom aplikacije.';}
 }
}
export async function resumeRestartChats({chats,isRunning,send,changed,drainQueue,isShuttingDown=()=>false}){
 for(const chat of chats){
  if(isShuttingDown())return;
  const pending=chat.restartResume,reply=latestReply(chat);
  if(!pending || pending.status!=='pending' || isRunning(chat.id))continue;
  if(pending.messageId!==reply?.id || pending.agent!==chat.settings.agent || !eligible(chat,reply)){delete chat.restartResume;changed();continue;}
  if(chat.queue?.length && !chat.queuePaused && !chat.queueError){delete chat.restartResume;changed();drainQueue(chat);continue;}
  pending.status='starting';changed();
  try{await send(chat,restartResumePrompt,{origin:'restart',resumeFrom:pending.messageId,requestId:'restart-'+pending.messageId});}
  catch(error){pending.status='error';pending.error=error.message;reply.error='Automatski nastavak nije pokrenut: '+error.message;changed();}
 }
}
