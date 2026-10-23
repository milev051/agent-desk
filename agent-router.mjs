// Pravila bez dodatnog modela: vrsta zadatka → redosled agenata i modela, uz proveru limita.
export const kinds={
 small:{label:'tekst, CSS ili mala izmena',picks:[['antigravity','gemini-3.8-flash-medium'],['claude','sonnet'],['codex','gpt-6-luna'],['grok','grok-4.7-build-fast']]},
 research:{label:'istraživanje',picks:[['grok','grok-4.7'],['claude','sonnet'],['antigravity','gemini-3.1-pro-high'],['codex','gpt-6-sol']]},
 code:{label:'kod ili arhitektura',picks:[['claude','opus'],['codex','gpt-6.1-sol'],['antigravity','gemini-3.1-pro-high'],['grok','grok-4.7']]},
 media:{label:'slike ili animacija',picks:[['antigravity','gemini-3.8-flash-high'],['claude','sonnet'],['codex','gpt-6-sol'],['grok','grok-4.7']]}
};
const hints=[
 ['media',/\b(slik[aeiu]|animacij\w*|ilustracij\w*|logo|video|render\w*|svg|png|poster)/i],
 ['research',/\b(istraž\w*|istraz\w*|pretraž\w*|pretraz\w*|uporedi|poredi\w*|analiz\w*|izvor\w*|research|pronađi informacij\w*)/i],
 ['code',/\b(kod\w*|funkcij\w*|modul\w*|server\w*|api|bug|greš\w*|test\w*|refaktor\w*|arhitektur\w*|implementir\w*|endpoint\w*)/i],
 ['small',/\b(css|tekst\w*|naslov\w*|boj[aeiu]|font\w*|razmak\w*|prepravi|ispravi|prevod\w*|slovn\w*)/i]
];
export function inferKind(task=''){
 const text=String(task);
 for(const [kind,re] of hints)if(re.test(text))return kind;
 return text.length>600?'code':'small';
}
// Kratak red za kontekst agenta: ko je za koju vrstu zadatka najbolji, redom.
export function capabilityLine(connected=()=>true){
 return `Sposobnosti agenata po vrsti zadatka, od najboljeg: ${Object.values(kinds).map(k=>`${k.label}: ${k.picks.map(p=>p[0]).filter(connected).join(', ')}`).join('; ')}.`;
}
const rank={ok:0,nepoznato:1,nisko:2};
export function chooseAgent({kind,task='',summary={},connected=()=>true,models={}}={}){
 if(kind!==undefined && !kinds[kind])throw Error(`Nepoznata vrsta zadatka. Dozvoljeno: ${Object.keys(kinds).join(', ')}.`);
 const chosenKind=kind||inferKind(task);
 const options=kinds[chosenKind].picks.map(([agent,model],order)=>({agent,model,order,availability:summary[agent]?.availability||'nepoznato'}))
  .filter(o=>connected(o.agent) && o.availability!=='iscrpljeno')
  .sort((a,b)=>rank[a.availability]-rank[b.availability]||a.order-b.order);
 if(!options.length)return null;
 const best=options[0],ids=models[best.agent];
 const model=!ids || ids.includes(best.model)?best.model:'';
 const limit=summary[best.agent]?.lowestRemaining;
 const reason=`${kinds[chosenKind].label}${kind?'':' (procenjeno iz zadatka)'}: ${best.agent}${model?` / ${model}`:''}${best.order?` kao ${best.order+1}. izbor`:''}, limit ${best.availability==='nepoznato'?'nepoznat':`${limit}%`}.`;
 return {agent:best.agent,model,kind:chosenKind,reason};
}
