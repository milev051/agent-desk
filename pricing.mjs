// Standard global API token rates in USD per million, verified 2026-10-04.
export const pricingDate='2026-10-04';
export const pricingSources={openai:'https://developers.openai.com/api/docs/pricing',claude:'https://platform.claude.com/docs/en/about-claude/pricing',grok:'https://docs.x.ai/developers/pricing',gemini:'https://ai.google.dev/gemini-api/docs/pricing'};
const rates=(input,cacheRead,output,cacheWrite=0)=>({input,cacheRead,output,cacheWrite});
const openai=(i,c,o,w)=>[rates(i,c,o,w),rates(i*2,c*2,o*1.5,w*2)];
const claude=(i,c,o)=>[rates(i,c,o,i*1.25),rates(i,c,o,i*2)];
const grok=(i,c,o)=>[rates(i,c,o),rates(i*2,c*2,o*2)];
const prices={
 'gpt-6.1-sol':openai(2,.1,10,2.5),'gpt-6-sol':openai(2,.2,10,2.5),'gpt-6-luna':openai(.1,.01,.5,.125),'gpt-6-astra':openai(10,1,50,12.5),'gpt-5.6-sol':openai(4,.4,20,5),
 'claude-opus-5-5':claude(4,.2,20),'claude-sonnet-5-5':claude(2,.2,10),'claude-haiku-4-5':claude(1,.1,5),'claude-fable-5-1':claude(10,.25,50),'claude-fable-5':claude(10,1,50),'claude-opus-5':claude(5,.5,25),'claude-sonnet-5':claude(2,.2,10),'claude-sonnet-4-6':claude(3,.3,15),
 'grok-4.7':grok(2,.5,6),'grok-4.6':grok(2,.5,6),'grok-4.5':grok(2,.3,6),'grok-build-0.1':grok(1,.2,2),
 'gemini-3.5-flash-lite':[rates(.3,.03,2.5)],'gemini-3.5-flash':[rates(1.5,.15,9)]
};
for(const v of ['4-5','4-6','4-7','4-8'])prices['claude-opus-'+v]=claude(5,.5,25);
export function modelPrice(model,createdAt=Date.now()){
 const id=String(model||'').replace(/-20\d{6}$/,'').replace(/^(gemini-\d+\.\d+-flash)-(?:low|medium|high)$/,'$1');
 if(/^gemini-3\.[678]-flash$/.test(id)){const after=new Date(createdAt).getUTCFullYear()>=2027;return {id,rates:[rates(after?1.5:.75,after?.15:.075,after?7.5:3.75)],source:pricingSources.gemini};}
 const found=prices[id];return found?{id,rates:found,source:pricingSources[id.startsWith('gpt-')?'openai':id.startsWith('claude-')?'claude':id.startsWith('grok-')?'grok':'gemini']}:null;
}
export function tokenCost(usage,model,createdAt){
 const price=modelPrice(model,createdAt);if(!price || usage.input===undefined || usage.output===undefined || usage.cacheRead===undefined || usage.scope==='session')return null;
 const i=usage.input,c=usage.cacheRead,w=usage.cacheWrite||0;
 if(![i,c,w,usage.output].every(n=>Number.isSafeInteger(n)&&n>=0))return null;
 const inclusive=usage.inputIncludesCache===true,exclusive=usage.inputIncludesCache===false;
 if(inclusive && i<c+w)return null;
 const baseMin=exclusive?i:Math.max(0,i-c-w),baseMax=inclusive?i-c-w:i;
 const outMax=usage.output+(usage.outputIncludesReasoning===false?usage.reasoning||0:usage.outputIncludesReasoning===null?usage.reasoning||0:0);
 const cost=(r,base,out)=>(base*r.input+c*r.cacheRead+w*r.cacheWrite+out*r.output)/1e6;
 if(w && price.rates.some(r=>!r.cacheWrite))return null;
 return {min:Math.min(...price.rates.map(r=>cost(r,baseMin,usage.output))),max:Math.max(...price.rates.map(r=>cost(r,baseMax,outMax))),source:price.source};
}
// Ušteda prvog poziva posle nove sesije: kontekst koji se nije ponovo upisao u keš (Claude Code upisuje na 1 sat, najviša stopa).
export function sessionSaving(before,after,model){
 const rates=modelPrice(model)?.rates,tokens=before-after;if(!rates || !(tokens>0))return null;
 return Math.round(tokens*Math.max(...rates.map(r=>r.cacheWrite||r.input))/1e6*1e4)/1e4;
}
