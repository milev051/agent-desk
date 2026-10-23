import { names } from './adapters.mjs';

export function transferableMessages(chat, agent=chat.settings.agent) {
  const offset = chat.sessions[agent] ? chat.sessionOffsets?.[agent] ?? chat.messages.length : 0;
  return chat.messages.slice(offset).filter(m=>m.text);
}
export function historyText(messages) {
  return messages.map(m=>`[${m.role==='user'?'Korisnik':`${names[m.agent] || 'Agent'}${m.model?` · model ${m.model}`:' · model nije prijavljen'}`} · ${Number.isFinite(m.createdAt)?new Date(m.createdAt).toISOString():'vreme nije zabeleženo'}${m.sentAt && m.sentAt!==m.createdAt?` · prosleđeno agentu ${new Date(m.sentAt).toISOString()}`:''}]\n${m.text}${actionsText(m.actions)}`).join('\n\n');
}
// Names only: paths, commands and tool counts, never their output.
export function actionsText(actions) {
  if(!actions?.length)return '';
  const files=new Map(), commands=[], tools=new Map();
  for(const a of actions) {
    if(a.kind==='file')files.set(a.text,a.change || files.get(a.text));
    else if(a.kind==='command')commands.push(`\`${a.text.replace(/\s+/g,' ').trim().slice(0,160)}\`${Number.isFinite(a.exit) && a.exit!==0?` (kod ${a.exit})`:''}`);
    else tools.set(a.text,(tools.get(a.text) || 0)+1);
  }
  const lines=[];
  if(files.size)lines.push(`- fajlovi: ${[...files].map(([f,c])=>c?`${f} (${c})`:f).join(', ')}`);
  if(commands.length)lines.push(`- komande (${commands.length}): ${commands.length>20?`${commands.length-20} ranijih izostavljeno; `:''}${commands.slice(-20).join('; ')}`);
  if(tools.size)lines.push(`- ostali alati: ${[...tools].map(([t,n])=>n>1?`${t} ×${n}`:t).join(', ')}`);
  return `\n\nAktivnosti agenta u ovom odgovoru:\n${lines.join('\n')}`;
}
export function contextEstimate(chat, agent=chat.settings.agent) {
  const text=historyText(chat.messages.filter(m=>m.text));
  const plan=transferPlan(chat,agent);
  const transfer=plan.text;
  const estimate=s=>({characters:[...s].length,minTokens:Math.ceil([...s].length/6),maxTokens:Math.ceil([...s].length/2)});
  // Šta bi dobila nova sesija: ceo čet (skraćen), a ne samo poruke posle poslednjeg odgovora.
  const fresh=transferPlan({...chat,sessions:{...chat.sessions,[agent]:undefined}},agent).text;
  return {fresh:estimate([fresh,chat.settings.instructions].filter(Boolean).join('\n\n')),withoutShortening:estimate([plan.fullText,chat.settings.instructions].filter(Boolean).join('\n\n')),history:estimate(text),transfer:estimate([transfer,chat.settings.instructions].filter(Boolean).join('\n\n')),instructions:estimate(chat.settings.instructions || ''),nativeContextUnknown:true,cacheGuaranteed:false,method:'Gruba procena: 2–6 znakova po tokenu; nije tokenizer ciljnog modela.'};
}


// Transform only a copy of outgoing text; the persisted messages remain untouched.
export function shortenText(text) {
  const lines=text.split('\n'), out=[];
  for(let i=0;i<lines.length;i++) {
    const fence=lines[i].match(/^ {0,3}(`{3,}|~{3,})([^ ]*)/);
    if(fence) {
      let end=i+1; const close=new RegExp('^ {0,3}'+fence[1][0]+'{'+fence[1].length+',}\\s*$');
      while(end<lines.length && !close.test(lines[end]))end++;
      if(end===lines.length){out.push(...lines.slice(i));break;}
      const content=lines.slice(i+1,end);
      out.push(content.length>=40 || content.join('\n').length>=2000 ? `[blok koda, jezik ${fence[2] || 'nije naveden'}, ${content.length} redova, izostavljen]` : lines.slice(i,end+1).join('\n'));
      i=end;continue;
    }
    if(i+1<lines.length && lines[i].includes('|') && /^\s*\|?\s*:?-{3,}:?\s*\|(?:\s*:?-{3,}:?\s*\|?)+\s*$/.test(lines[i+1])) {
      let end=i+2;while(end<lines.length && lines[end].includes('|') && lines[end].trim())end++;
      const table=lines.slice(i,end);
      out.push(table.length>=14 || table.join('\n').length>=2000 ? `[tabela, ${table.length-2} redova podataka, izostavljena]` : table.join('\n'));i=end-1;continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}
export function transferPlan(chat,agent=chat.settings.agent) {
  const messages=transferableMessages(chat,agent);
  const recent=new Set(chat.messages.filter(m=>m.text).slice(-6));
  return {text:historyText(messages.map(m=>recent.has(m)?m:{...m,text:shortenText(m.text)})),fullText:historyText(messages)};
}
