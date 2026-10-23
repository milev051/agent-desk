import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

// Snimak cele stranice preko Chrome-a bez prozora (DevTools protokol), za pregled računarskog i telefonskog izgleda sa telefona.
// Pre snimka stranica se polako skroluje do dna i nazad, da se pokrenu uvodne animacije i lenjo učitane slike.
export const devices={
  desktop:{width:1920,height:1080,scale:1,mobile:false,label:'racunar'},
  mobile:{width:390,height:844,scale:2,mobile:true,label:'telefon',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'},
};
// WebP ne prima više od 16383 px po strani.
const maxPixels=16000;
const chromePaths=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
export const findChrome=(candidates=[process.env.AGENT_DESK_CHROME,...chromePaths])=>candidates.find(file=>file && fs.existsSync(file)) || '';

export function snapshotUrl(value){
  let url;try{url=new URL(String(value || '').trim());}catch{throw Error('Adresa stranice nije ispravna. Primer: http://localhost:3000/');}
  if(!/^https?:$/.test(url.protocol))throw Error('Pregled radi samo za http i https adrese.');
  return url.href;
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function launch(chrome,profile){
  const child=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--hide-scrollbars','--mute-audio','--disable-extensions','about:blank'],{stdio:['ignore','ignore','pipe']});
  const port=new Promise((resolve,reject)=>{
    let text='';const timer=setTimeout(()=>reject(Error('Chrome se nije pokrenuo na vreme.')),20000);
    child.stderr.on('data',chunk=>{text+=chunk;const found=text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);if(found){clearTimeout(timer);resolve(Number(found[1]));}});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('exit',()=>{clearTimeout(timer);reject(Error('Chrome je zatvoren pre snimka.'));});
  });
  return {child,port};
}

function connect(wsUrl){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(wsUrl),pending=new Map(),listeners=new Set();let next=1;
    ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id && pending.has(msg.id)){const {resolve:ok,reject:fail}=pending.get(msg.id);pending.delete(msg.id);msg.error?fail(Error(msg.error.message)):ok(msg.result);}else for(const fn of listeners)fn(msg);};
    ws.onerror=()=>reject(Error('Veza sa Chrome-om nije uspela.'));
    ws.onclose=()=>{for(const {reject:fail} of pending.values())fail(Error('Veza sa Chrome-om je prekinuta.'));pending.clear();};
    ws.onopen=()=>resolve({
      send:(method,params={})=>new Promise((ok,fail)=>{const id=next++;pending.set(id,{resolve:ok,reject:fail});ws.send(JSON.stringify({id,method,params}));}),
      once:(method,timeout)=>new Promise(ok=>{const timer=setTimeout(()=>{listeners.delete(fn);ok(false);},timeout);const fn=msg=>{if(msg.method===method){clearTimeout(timer);listeners.delete(fn);ok(true);}};listeners.add(fn);}),
      close:()=>ws.close(),
    });
  });
}

// Skroluje do dna u koracima od 70% ekrana (i kad stranica tokom skrolovanja raste), pa se vraća na vrh.
const scrollScript=`(async()=>{const pause=ms=>new Promise(r=>setTimeout(r,ms));const doc=()=>Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0);let y=0;for(let i=0;i<120 && y<doc();i++){y+=Math.round(innerHeight*0.7);scrollTo(0,y);await pause(250);}await pause(600);scrollTo(0,0);await pause(400);try{await document.fonts.ready;}catch{}await Promise.all([...document.images].filter(img=>!img.complete).map(img=>new Promise(r=>{img.onload=img.onerror=r;setTimeout(r,3000);})));return doc();})()`;

export async function capturePage({url,device='desktop',target,chrome=findChrome(),settle=1200,timeout=90000,inspect}={}){
  const spec=devices[device];if(!spec)throw Error('Uređaj mora biti desktop ili mobile.');
  const address=snapshotUrl(url);
  if(!chrome)throw Error('Google Chrome nije pronađen. Instaliraj ga ili postavi AGENT_DESK_CHROME.');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'agent-desk-snimak-'));
  const {child,port}=launch(chrome,profile);let cdp;
  const deadline=setTimeout(()=>child.kill('SIGKILL'),timeout);
  try{
    const list=await (await fetch(`http://127.0.0.1:${await port}/json/list`)).json();
    const page=list.find(item=>item.type==='page');if(!page)throw Error('Chrome nije otvorio stranicu.');
    cdp=await connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:spec.width,height:spec.height,deviceScaleFactor:spec.scale,mobile:spec.mobile});
    if(spec.userAgent)await cdp.send('Emulation.setUserAgentOverride',{userAgent:spec.userAgent});
    if(spec.mobile)await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const loaded=cdp.once('Page.loadEventFired',30000);
    const nav=await cdp.send('Page.navigate',{url:address});
    if(nav.errorText)throw Error(`Stranica nije učitana (${nav.errorText}).`);
    await loaded;await wait(settle);
    const scrolled=await cdp.send('Runtime.evaluate',{expression:scrollScript,awaitPromise:true,returnByValue:true});
    await wait(settle);
    const metrics=await cdp.send('Page.getLayoutMetrics');
    const full=Math.ceil(metrics.cssContentSize?.height || scrolled.result?.value || spec.height);
    const limit=Math.floor(maxPixels/spec.scale),height=Math.max(spec.height,Math.min(full,limit));
    const shot=await cdp.send('Page.captureScreenshot',{format:'webp',quality:80,captureBeyondViewport:true,clip:{x:0,y:0,width:spec.width,height,scale:1}});
    const inspected=inspect?(await cdp.send('Runtime.evaluate',{expression:inspect,returnByValue:true})).result?.value:undefined;
    fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
    fs.writeFileSync(target,Buffer.from(shot.data,'base64'),{mode:0o600});
    return {path:target,url:address,device,width:spec.width*spec.scale,height:height*spec.scale,pageHeight:full,truncated:full>limit,...(inspect?{inspected}:{})};
  }finally{
    clearTimeout(deadline);cdp?.close();child.kill();
    setTimeout(()=>fs.rmSync(profile,{recursive:true,force:true}),1500).unref();
  }
}

// Jedan Chrome u isto vreme, da više zahteva ne optereti Mac.
export function createSnapshotter(options={}){
  let queue=Promise.resolve();
  return {
    available:()=>!!(options.chrome ?? findChrome()),
    capture:args=>{const run=queue.then(()=>capturePage({...options,...args}));queue=run.catch(()=>{});return run;},
  };
}

export function snapshotName(url,device,now=new Date()){
  const host=(()=>{try{const u=new URL(url);return (u.hostname+(u.port?'-'+u.port:'')+u.pathname).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,50);}catch{return 'stranica';}})();
  return `${now.toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15)}-pregled-${devices[device]?.label || device}-${host || 'stranica'}.webp`;
}
