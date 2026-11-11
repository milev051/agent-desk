// Proteklo vreme odgovora: živo dok agent radi, trajno kad odgovor završi.
// Računa se od createdAt odgovora (trenutak kada je server pokrenuo agenta) do completedAt ili sada.
export function formatElapsed(ms) {
  const seconds=Math.max(0,Math.floor(ms/1000));
  if(seconds<60)return `${seconds} s`;
  const minutes=Math.floor(seconds/60);
  if(minutes<60)return `${minutes} min`;
  return `${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')} min`;
}
// Odgovor koji je u toku za red u bočnoj traci; summary nosi latestReply, pun čet poruke.
export function runningSince(chat) {
  if(!chat?.running)return null;
  const reply=chat.latestReply || chat.messages?.findLast?.(m=>m.role==='assistant');
  return reply?.status==='running' && Number.isFinite(reply.createdAt)?reply.createdAt:null;
}
export function elapsedHtml(since,now=Date.now(),className='elapsed-live') {
  if(!Number.isFinite(since))return '';
  const text=formatElapsed(now-since);
  return `<span class="${className}" data-since="${since}" title="Odgovor traje ${text}">${text}</span>`;
}
// Ukupno trajanje završenog odgovora; stare poruke bez vremena ne prikazuju ništa.
export function replyDuration(message,now=Date.now()) {
  if(message?.role!=='assistant' || !Number.isFinite(message.createdAt))return '';
  if(message.status==='running')return elapsedHtml(message.createdAt,now,'work-duration elapsed-live');
  if(!Number.isFinite(message.completedAt))return '';
  const text=formatElapsed(message.completedAt-message.createdAt);
  return `<span class="work-duration" title="Ukupno trajanje odgovora, uključujući alate i pauze">${text}</span>`;
}
export function tickElapsed(root=document,now=Date.now()) {
  for(const el of root.querySelectorAll('[data-since]')){const text=formatElapsed(now-Number(el.dataset.since));if(el.textContent!==text){el.textContent=text;el.title=`Odgovor traje ${text}`;}}
}
export function startElapsedClock(root=document) {
  return setInterval(()=>{if(!document.hidden)tickElapsed(root);},1000);
}
