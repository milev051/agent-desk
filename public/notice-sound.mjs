const tones={
 default:[[587,.08],[880,.12]],
 done:[[587,.08],[880,.12]],
 gotov:[[587,.08],[880,.12]],
 gotovo:[[587,.08],[880,.12]],
 question:[[494,.09],[659,.16]],
 pitanje:[[494,.09],[659,.16]],
 error:[[180,.22]],
 greska:[[180,.22]],
 greška:[[180,.22]],
 Glass:[[1568,.05],[1175,.1]],
 Ping:[[988,.07],[1319,.13]],
 Pop:[[520,.04],[220,.09]],
 Tink:[[1760,.045]],
 Submarine:[[392,.12],[294,.18]],
 Hero:[[523,.1],[784,.16]]
};
export function noticeTone(name){return tones[name] || (name==='none'?[]:tones.default);}
export function chooseNoticeSound(reply){
 const text=String(reply?.text || '');
 const status=reply?.status;
 const lines=text.split('\n');
 const hasQuestion=lines.some(l=>{
  const clean=l.replace(/```[\s\S]*?```/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^[\s#>*-]+/,'').replace(/[`*_]/g,'').trim();
  return /^Pitanje:\s*/i.test(clean);
 });
 if(hasQuestion)return 'question';
 if(status==='error')return 'error';
 return 'done';
}
