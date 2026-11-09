// Traka opterećenja računara u bočnoj traci: sažetak u jednom redu, klik otvara spisak
// po četu, Agent Desk i deljene procese (dev server, headless Chrome).
const gb=bytes=>(bytes/1073741824).toLocaleString('sr-Latn',{maximumFractionDigits:1,minimumFractionDigits:1})+' GB';
const pct=cpu=>Math.round(cpu)+' %';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function level(system,overload=[]){
 if(overload.length)return 'high';
 if(system.load1>=system.cores || system.pressure>=2)return 'mid';
 return 'ok';
}

export function summaryText(data){
 const s=data.system;
 return `Opterećenje ${s.load1.toLocaleString('sr-Latn',{maximumFractionDigits:1})} · RAM ${gb(s.memAvailable)} slobodno · swap ${gb(s.swapUsed)}/${gb(s.swapTotal)}`;
}

export function detailRows(data){
 const rows=[];
 for(const c of data.chats.slice().sort((a,b)=>b.rss-a.rss))rows.push({kind:'chat',chatId:c.chatId,label:c.title||'Čet',cpu:c.cpu,rss:c.rss,top:data.top?.chatId===c.chatId});
 if(data.desk)rows.push({kind:'desk',label:'Agent Desk (server, snimci)',cpu:data.desk.cpu,rss:data.desk.rss});
 for(const p of data.shared)rows.push({kind:'shared',label:p.label+(p.startedBy?` · pokrenuo „${p.startedBy}“`:' · ničiji'),cpu:p.cpu,rss:p.rss});
 return rows;
}

export function renderResources(root,data){
 if(!root || !data?.system)return;
 const lvl=level(data.system,data.overload);
 const open=root.open;
 const waiting=data.waiting?.length?` · ${data.waiting.length} čeka`:'';
 const reason=data.overload?.length?`<p class="resource-alert">Preopterećeno: ${esc(data.overload.join(', '))}. Novi podčetovi čekaju.</p>`:'';
 const rows=detailRows(data).map(r=>`<li class="resource-row ${r.kind}${r.top?' top':''}"${r.chatId?` data-chat-id="${esc(r.chatId)}"`:''}><span>${esc(r.label)}</span><b>${pct(r.cpu)}</b><b>${gb(r.rss)}</b></li>`).join('');
 const queue=(data.waiting||[]).map(w=>`<li class="resource-row waiting"><span>⏸ ${esc(w.title)}</span><b></b><b>čeka</b></li>`).join('');
 root.hidden=false;
 root.className=`resource-monitor ${lvl}`;
 root.innerHTML=`<summary title="Opterećenje računara (1 min), slobodna memorija i swap. Klikni za potrošnju po četu."><i class="resource-dot" aria-hidden="true"></i><span>${esc(summaryText(data))}${esc(waiting)}</span></summary>${reason}<ul>${rows||'<li class="resource-row empty"><span>Nijedan čet ne radi.</span></li>'}${queue}</ul>`;
 root.open=open;
}

export function createResourceMonitor({root,onOpenChat=()=>{}}={}){
 let data=null;
 root?.addEventListener('click',e=>{const row=e.target.closest('[data-chat-id]');if(row)onOpenChat(row.dataset.chatId);});
 return {update(next){data=next;renderResources(root,data);},get data(){return data;}};
}
