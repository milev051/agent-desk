// Prikaz koliko je odgovor ili čet potrošio od 5h limita (procena iz očitanih padova).
const pct=n=>(n<1?n.toFixed(1):String(Math.round(n))).replace('.',',');
export function shareLabel(value){return Number.isFinite(value) && value>=.1?`−${pct(value)}%`:'';}
export function chatShare(shares){
 const total=Object.values(shares||{}).reduce((s,n)=>s+(Number.isFinite(n)?n:0),0);
 return total>=.1?`≈ ${pct(total)}% od 5h limita`:'';
}
