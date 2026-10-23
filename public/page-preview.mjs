// Adresa za dugme Pregled: adresa upisana u polje za poruku, inače poslednji link iz četa (npr. iz reda Proveri:).
const urlPattern=/https?:\/\/[^\s<>"'`)\]]+/g;
const clean=url=>url.replace(/[.,;:!?»”]+$/,'');
// Linkovi ka samom Agent Desku (API, prilozi) nisu stranica za pregled.
const ownApi=url=>{try{const u=new URL(url);return /^\/api\//.test(u.pathname) || /\/data\/prilozi\//.test(u.pathname);}catch{return true;}};

export function previewTarget(prompt='',messages=[]){
  const typed=String(prompt).trim();
  if(/^https?:\/\/\S+$/.test(typed))return {url:clean(typed),typed:true};
  for(const message of [...messages].reverse()){
    const links=(String(message?.text || '').match(urlPattern) || []).map(clean).filter(url=>!ownApi(url));
    if(links.length)return {url:links.at(-1),typed:false};
  }
  return null;
}
