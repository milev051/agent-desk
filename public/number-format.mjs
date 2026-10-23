// Kratki brojevi bez tačke za hiljade: 950, 12,3k, 3,2M; cena sa decimalnim zarezom: 1,80 $.
const comma=(n,digits)=>n.toFixed(digits).replace(/\.?0+$/,'').replace('.',',');

export function compactCount(value) {
  const n=Math.max(0,Number(value)||0);
  if(n<1000)return String(Math.round(n));
  if(n<1e6)return `${comma(n/1e3,n<1e4?1:0)}k`;
  return `${comma(n/1e6,n<1e7?1:0)}M`;
}

export function money(value) {
  const n=Math.max(0,Number(value)||0);
  if(n>0 && n<.01)return '<0,01 $';
  return `${n.toFixed(2).replace('.',',')} $`;
}
