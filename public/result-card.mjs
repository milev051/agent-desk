import {answerText} from './final-answer.mjs';

const clean=text=>String(text || '').replace(/\[\/?[rgb]\]/g,'').replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[*`#]/g,'').replace(/\s+/g,' ').trim();
const short=(text,max)=>{const value=clean(text);return value.length>max?value.slice(0,max).trimEnd()+'…':value;};
// Samo prikaz. Ne menja poruku, istoriju, izvoz niti ulaz agenta.
export function resultCardData(message){
 if(message?.role!=='assistant' || message.status!=='done' || !message.text?.trim() || message.handoffFrom)return null;
 const final=answerText(message),fields={};let current=null,fence=null;
 const ordinary=[];
 for(const line of final.split('\n')){
  const marker=line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
  if(marker){if(!fence)fence=marker;else if(marker[0]===fence[0] && marker.length>=fence.length)fence=null;continue;}
  if(fence)continue;
  const text=line.replace(/^\s*(?:[-•]\s*)?(?:\*\*)?/,'').replace(/\*\*/g,'').trim();
  const heading=text.match(/^(Urađeno|Pitanje|Proveri|Preostalo|Sledeće|Sledeći korak|Ponuđeno):\s*(.*)$/);
  if(heading){current=heading[1];fields[current] ||= [];if(heading[2])fields[current].push(heading[2]);}
  else if(text){ordinary.push(text);if(current)fields[current].push(text);}
  else current=null;
 }
 const field=name=>(fields[name] || []).join('\n');
 const first=short(fields['Urađeno']?.[0] || ordinary[0],220),result=first?first[0].toLocaleUpperCase('sr')+first.slice(1):'Odgovor sadrži kod ili prilog. Otvori detalje.';
 const question=short(field('Pitanje'),360),next=short(field('Preostalo') || field('Sledeće') || field('Sledeći korak'),240);
 const check=fields['Proveri']?.[0] || '';
 // Agent nudi odgovore u redu „Ponuđeno: a | b | c“; za pitanje sa da/ne dovoljna su ta dva.
 let replies=[...new Set(field('Ponuđeno').split(/[|\n]/).map(r=>short(r,60)).filter(Boolean))].slice(0,3);
 if(!replies.length && /^da li\b/i.test(question))replies=['Da','Ne'];
 return {result,question,next,check,replies,status:question?'waiting':check?'review':'done',fullText:message.text};
}
export function resultCardHtml(message,{markdown,escape,fullText=message.text,replies=false}={}){
 const card=resultCardData(message);if(!card)return null;
 const buttons=replies && card.replies.length?`<div class="result-replies" role="group" aria-label="Ponuđeni odgovori">${card.replies.map(r=>`<button type="button" data-quick-reply="${escape(r)}">${escape(r)}</button>`).join('')}</div>`:'';
 const ask=card.question || buttons?`<div class="result-question">${card.question?`<strong>Tvoj odgovor</strong><p>${escape(card.question)}</p>`:''}${buttons}</div>`:'';
 return `<section class="result-card result-${card.status}" aria-label="Sažetak odgovora"><div class="result-summary"><p class="result-main">${escape(card.result)}</p>${ask}${card.next?`<p class="result-next"><strong>Sledeće:</strong> ${escape(card.next)}</p>`:''}${card.check?`<div class="result-check"><strong>Proveri</strong>${markdown(card.check)}</div>`:''}</div><div class="result-full-text" hidden>${markdown(fullText)}</div></section>`;
}
