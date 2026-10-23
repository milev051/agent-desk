// Dugmad za jačinu zvuka na telefonu uvećavaju i umanjuju prikaz, kao Cmd/Ctrl +/- na računaru.
// Radi samo kad pregledač prosledi taster stranici; iOS Safari i Chrome na Androidu to obično ne rade.
const KEY='agent-desk-volume-zoom',STEP=0.1,MIN=0.5,MAX=2;

export function volumeDirection(event){
  const key=event?.key,code=event?.keyCode;
  if(key==='AudioVolumeUp'||key==='VolumeUp'||code===175||code===24)return 1;
  if(key==='AudioVolumeDown'||key==='VolumeDown'||code===174||code===25)return -1;
  return 0;
}

export function nextZoom(current,direction){
  return Math.min(MAX,Math.max(MIN,Math.round((current+direction*STEP)*10)/10));
}

export function installVolumeZoom({win=window,doc=document,storage=localStorage,isPhone=()=>win.matchMedia('(max-width:650px)').matches}={}){
  let zoom=Number(storage.getItem(KEY))||1;
  const apply=()=>{doc.documentElement.style.zoom=isPhone()&&zoom!==1?String(zoom):'';};
  apply();
  win.addEventListener('resize',apply);
  win.addEventListener('keydown',event=>{
    const direction=volumeDirection(event);
    if(!direction || !isPhone())return;
    event.preventDefault();
    zoom=nextZoom(zoom,direction);
    if(zoom===1)storage.removeItem(KEY);else storage.setItem(KEY,String(zoom));
    apply();
  },{capture:true});
  return {get zoom(){return zoom;}};
}
