// Pad limita iz jednog očitanog intervala deli se na odgovore koji su tada radili,
// srazmerno ceni odgovora i delu njegovog trajanja koji pada u taj interval.
export function quotaShares(events,weightOf,period='fiveHour'){
 const shares=new Map();
 for(const e of events){
  const w=e.windows?.find(x=>x.period===period);if(!w?.drop || !e.turns?.length)continue;
  const raw=e.turns.map(t=>{const end=t.completedAt || e.to,span=Math.max(1,end-t.createdAt),overlap=Math.max(0,Math.min(end,e.to)-Math.max(t.createdAt,e.from));return {id:t.messageId,cost:weightOf(t.messageId),part:Math.max(overlap/span,.05)};});
  const known=raw.filter(r=>Number.isFinite(r.cost) && r.cost>0),fill=known.length?known.reduce((s,r)=>s+r.cost,0)/known.length:1;
  const parts=raw.map(r=>[r.id,(Number.isFinite(r.cost) && r.cost>0?r.cost:fill)*r.part]),sum=parts.reduce((s,[,v])=>s+v,0);
  for(const [id,v] of parts)shares.set(id,(shares.get(id)||0)+w.drop*v/sum);
 }
 return shares;
}
