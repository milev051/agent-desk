// Deli koje koristi i interfejs: koliki je kontekst i kada ponuditi nov čet.
// Claude Code upisuje keš na 1 sat: pogoci posle 17 i 37 minuta pauze, promašaj tek posle 4,5 h.
export const contextLimit=100000, cacheMs=60*60*1000, idleMinContext=50000, summaryLines=30;
// Veličina konteksta poslednjeg odgovora iz prijavljene potrošnje (codex ulaz već sadrži keš).
export function lastContext(chat){
 for(let i=(chat.messages||[]).length-1;i>=0;i--){
  const m=chat.messages[i],u=m.role==='assistant' && m.status==='done' && !m.usageInherited ? (m.usageTotal&&m.usage?.scope==='session'?m.usageTotal:m.usage) : null;
  if(Number.isFinite(m.context) && m.context>0)return {tokens:m.context,at:m.completedAt||m.createdAt||0};
 if(!u)continue;
 // CLI zbir odgovora sabira svaki poziv modela (svaki alat čita ceo kontekst), pa nije veličina konteksta.
 if(['main-loop','run','session'].includes(u.scope))return null;
  const n=k=>Number.isFinite(u[k])?u[k]:0,tokens=m.agent==='codex'?n('input'):n('input')+n('cacheRead')+n('cacheWrite');
  if(tokens>0)return {tokens,at:m.completedAt||m.createdAt||0};
 }
 return null;
}
// Nova sesija šalje samo tekst poruka; isplati se kad je on mali u odnosu na kontekst sa alatima.
export const sessionMaxHistory=30000;
export function handoffAdvice(context,now=Date.now(),historyTokens=0){
 if(!context)return null;
 const k=n=>Math.round(n/1000),reason=context.tokens>contextLimit?'size':context.tokens>=idleMinContext && now-context.at>cacheMs?'idle':null;
 if(!reason)return null;
 const pick=historyTokens>0 && historyTokens<=sessionMaxHistory && historyTokens*3<=context.tokens?'session':'handoff';
 const start=reason==='size'?`Kontekst je oko ${k(context.tokens)}k tokena.`:`Keš je istekao, prvi odgovor plaća ceo kontekst (oko ${k(context.tokens)}k tokena).`;
 return {reason,pick,text:`${start} ${pick==='session'?`Nova sesija u ovom četu šalje samo poruke (oko ${Math.max(1,k(historyTokens))}k).`:'Nov čet sa sažetkom je jeftiniji.'}`};
}
import {compactCount,money} from './number-format.mjs';
// Tekst oznake u četu: gde je počela nova CLI sesija ili gde se čet nastavlja.
const sessionReasons={pause:'sama, posle pauze (keš je istekao)',limit:'sama, zbog niskog limita',manual:'ručno'};
export function sessionMarkText(m){
 if(m.handoffFrom)return 'Nastavak prethodnog četa, sa sažetkom';
 if(m.role==='user' && m.sessionMark)return `Nova sesija${sessionReasons[m.sessionMark]?`, ${sessionReasons[m.sessionMark]}`:''}. Agent dobija samo tekst razgovora${sessionChange(m)}`;
 return '';
}
// Koliki je kontekst bio pre nove sesije, koliki posle, i procena uštede prvog poziva.
export function sessionChange(m){
 if(!m.contextBefore)return '';
 const after=m.contextAfter?` → ${compactCount(m.contextAfter)}`:'';
 return ` · kontekst ${compactCount(m.contextBefore)}${after}${m.sessionSaving>0?`, ušteda ≈ ${money(m.sessionSaving)}`:''}`;
}
// Red iznad polja za poruku: trenutna veličina konteksta i koliko još važi keš (posle toga se kontekst plaća ponovo).
export function cacheStatus(context,now=Date.now(),running=false){
 if(!context?.tokens)return '';
 const size=`kontekst ${compactCount(context.tokens)}`;if(running)return size;
 const left=context.at+cacheMs-now;if(left<=0)return `${size} · keš istekao`;
 const s=Math.ceil(left/1000);return `${size} · keš još ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

// Sam prelazak gleda samo kontekst i keš: dok keš važi nastavak je jeftin, pa se prelazi tek kod velikog konteksta.
// Broj poruka i dužina teksta ostaju samo ponuda. Pragove podešava zakazani pregled (adaptive.mjs).
export function autoHandoff(chat,now=Date.now(),rules={coldMinContext:idleMinContext,warmMinContext:150000}){
 if(!chat || chat.parentChatId || chat.continuedTo)return null;
 const c=chat.lastContext;if(!c?.tokens)return null;
 const warm=now-c.at<cacheMs;
 if(warm?c.tokens>=rules.warmMinContext:c.tokens>=rules.coldMinContext)return {reason:warm?'size':'idle',tokens:c.tokens};
 return null;
}
// Ponuda novog četa je odvojena od automatskog izbora CLI sesije.
export function handoffOffer(chat,now=Date.now()){
 if(!chat || chat.parentChatId || chat.continuedTo)return null;
 const counted=Number.isFinite(chat.historyTokenCount?.tokens),historyTokens=counted?chat.historyTokenCount.tokens:Math.ceil((chat.context?.history?.characters || chat.historyChars || (chat.messages || []).reduce((n,m)=>n+(m.text?.length || 0),0))/4);
 const count=chat.messageCount ?? chat._historyPage?.total ?? chat.historyPage?.total ?? chat.messages?.length ?? 0;
 const number=n=>Math.round(n).toLocaleString('sr-Latn-RS');
 const length=`Tekst razgovora: ${counted?'':'≈ '}${number(historyTokens)} tokena · ${number(count)} poruka.`;
 const context=chat.lastContext?.tokens?`Kontekst poslednjeg odgovora: ${number(chat.lastContext.tokens)} tokena. `:'';
 const advice=handoffAdvice(chat.lastContext,now,historyTokens);
 if(advice || historyTokens>=sessionMaxHistory || count>=40)return {text:`${context}${length} Možeš da nastaviš u novom četu sa sažetkom.`};
 return null;
}
