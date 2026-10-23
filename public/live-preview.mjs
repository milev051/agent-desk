export function previewScale(panelWidth,panelHeight,width=1920){const scale=Math.max(1,panelWidth)/width;return {scale,width,height:Math.max(1,panelHeight)/scale};}
export function livePreviewLink(event){
 if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return null;
 const link=event.target.closest('a[href]');if(!link||!link.closest('.message-body')||link.closest('.attachment-thumbs')||link.matches('[data-local-file],[data-file-path],[download]'))return null;
 const href=link.getAttribute('href');return /^https?:\/\//i.test(href||'')?href:null;
}
// Links to Agent Desk itself (its own origin or loopback ports 4317-4321) open the app, not the proxy that rejects them.
export function ownAppLink(href,here=location){
 let url;try{url=new URL(href,here.href);}catch{return null;}
 const port=Number(url.port||(url.protocol==='https:'?443:80));
 if(url.origin!==here.origin&&!(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&port>=4317&&port<=4321))return null;
 return here.origin+url.pathname+url.search+url.hash;
}
export function createLivePreview({root,conversation,api,phoneRemote=false,report=()=>{}}){
 const frame=root.querySelector('iframe'),viewport=root.querySelector('[data-preview-viewport]'),address=root.querySelector('[data-preview-address]'),width=root.querySelector('select'),status=root.querySelector('[role="status"]'),handle=root.querySelector('[data-preview-resize]');
 let current='',remote='',generation=0,controller=null,historyOpen=false,historyGuard=0;
 let ratio=.5;try{const saved=Number(localStorage.getItem('agent-desk-preview-height'));if(saved>=.2&&saved<=.7)ratio=saved;}catch{}
 const resize=()=>{if(root.hidden)return;const main=root.parentElement.getBoundingClientRect();root.style.left=main.left+'px';root.style.width=main.width+'px';const available=window.visualViewport?.height||window.innerHeight;const height=Math.round(available*ratio);root.style.height=height+'px';document.body.style.setProperty('--live-preview-height',height+'px');const size=previewScale(viewport.clientWidth,viewport.clientHeight,Number(width.value));frame.style.width=size.width+'px';frame.style.height=size.height+'px';frame.style.transform=`scale(${size.scale})`;};
 const navigate=url=>{frame.dataset.previewUrl=url;try{frame.contentWindow.location.replace(url);}catch{frame.src=url;}};
 // Keep the parent history entry above iframe navigation, so Back closes the panel first.
 frame.addEventListener('load',()=>{if(root.hidden||frame.hidden)return;history.pushState({...history.state,livePreview:true,livePreviewGuard:++historyGuard},'',location.href);historyOpen=true;});
 const showStatus=text=>{status.textContent=text;status.hidden=!text;frame.hidden=!!text;};
 async function load(){
  const ticket=++generation;controller?.abort();controller=new AbortController();const abort=controller;
  navigate('about:blank');showStatus('Povezujem pregled…');
  try{const value=await api('/api/preview','POST',{url:current});if(ticket!==generation)return;remote=phoneRemote?value.phoneOrigin:value.localOrigin;
   if(!remote)throw Error('Telefonska adresa pregleda nije podešena.');
   const timer=setTimeout(()=>abort.abort(),7000);let response;try{response=await fetch(remote+'/.agent-desk-preview/health',{credentials:'include',signal:abort.signal,cache:'no-store'});}finally{clearTimeout(timer);}
   if(!response.ok)throw Error(response.status===401?'Prijavi telefon ponovo preko QR koda.':'Pregled nije dostupan.');
   if(ticket!==generation)return;showStatus('');navigate(remote+value.path);resize();
  }catch(error){if(ticket!==generation)return;showStatus(phoneRemote?'Pregled nije povezan. Na Macu pokreni: tailscale serve --bg --https=8443 http://127.0.0.1:4321. Zatim pritisni Osveži. '+(error.message||''):'Pregled nije dostupan. '+(error.message||''));}
 }
 function open(url){current=url;address.textContent=url;address.title=url;root.querySelector('[data-preview-external]').href=url;root.hidden=false;document.body.classList.add('live-preview-open');if(!historyOpen){history.pushState({...history.state,livePreview:true},'',location.href);historyOpen=true;}resize();void load();}
 function close({fromHistory=false}={}){if(root.hidden)return false;++generation;controller?.abort();root.hidden=true;navigate('about:blank');document.body.classList.remove('live-preview-open');document.body.style.removeProperty('--live-preview-height');if(historyOpen&&!fromHistory&&history.state?.livePreview){const state={...history.state};delete state.livePreview;delete state.livePreviewGuard;history.replaceState(state,'',location.href);}historyOpen=false;void api('/api/preview','DELETE').catch(report);return true;}
 conversation.addEventListener('click',event=>{const url=livePreviewLink(event);if(!url)return;event.preventDefault();event.stopImmediatePropagation();const app=ownAppLink(url);if(app)location.assign(app);else open(url);},{capture:true});
 root.querySelector('[data-preview-close]').onclick=()=>close();root.querySelector('[data-preview-refresh]').onclick=()=>void load();width.onchange=resize;
 handle.onpointerdown=event=>{event.preventDefault();handle.setPointerCapture(event.pointerId);root.classList.add('resizing');};
 handle.onpointermove=event=>{if(!handle.hasPointerCapture(event.pointerId))return;ratio=Math.min(.7,Math.max(.2,event.clientY/(window.visualViewport?.height||window.innerHeight)));resize();};
 handle.onpointerup=event=>{if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);root.classList.remove('resizing');try{localStorage.setItem('agent-desk-preview-height',String(ratio));}catch{}};
 handle.onpointercancel=()=>root.classList.remove('resizing');
 handle.onkeydown=event=>{if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();ratio=Math.min(.7,Math.max(.2,ratio+(event.key==='ArrowDown'?.05:-.05)));resize();try{localStorage.setItem('agent-desk-preview-height',String(ratio));}catch{}};
 new ResizeObserver(resize).observe(root.parentElement);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 return {open,close,handleHistory(){return close({fromHistory:true});},get isOpen(){return !root.hidden;}};
}
