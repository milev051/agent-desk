// Zajednički red za generisanje slika, za sve četove: za agente iz LIMITED u jednom trenutku
// radi najviše jedan podčet koji generiše slike. Ostali podčetovi su napravljeni, ali čekaju
// (chat.imageWaiting) i kreću redom, čim prethodni završi.
// Za sada samo GPT (codex): ~20 min po slici i veliki upload kad ih radi više odjednom.
// Grok i Gemini nisu mereni na preklapanje, pa njih red ne zadržava.
export const LIMITED=new Set(['codex']);
const media=/\b(slik\w*|image\w*|ilustracij\w*|render\w*|fotografij\w*|vizualizacij\w*)/i;
const generate=/\b(generi\w*|izgeneri\w*|imagegen|nacrta\w*|napravi\w*|kreira\w*|varijant\w*|varijacij\w*)/i;

export function isImageTask({kind,task=''}={}){
 if(kind==='media')return true;
 const text=String(task);
 return media.test(text) && generate.test(text);
}
export function needsImageSlot(agent,{kind,task}={}){return LIMITED.has(agent) && isImageTask({kind,task});}
// Podčet koji drži mesto: generator slika ovog agenta koji upravo radi.
export function busyImageJob(chats,agent,isRunning){
 return chats.find(c=>c.imageJob && c.settings?.agent===agent && !c.imageWaiting && isRunning(c.id))||null;
}
// Sledeći podčet na redu za agenta, najstariji prvi.
export function nextWaiting(chats,agent){
 return chats.filter(c=>c.imageWaiting && c.settings?.agent===agent).sort((a,b)=>a.imageWaiting.at-b.imageWaiting.at)[0]||null;
}
// Pokreće sledeće podčetove za svakog ograničenog agenta čije je mesto slobodno.
export function startWaitingImageJobs({chats,isRunning,start}){
 const started=[];
 for(const agent of LIMITED){
  if(busyImageJob(chats,agent,isRunning))continue;
  const next=nextWaiting(chats,agent);if(!next)continue;
  const {prompt}=next.imageWaiting;delete next.imageWaiting;
  started.push(next.id);start(next,prompt);
 }
 return started;
}
