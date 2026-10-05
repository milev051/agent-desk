// Učitava se tek pri prvom otvaranju PDF-a, bez dodatnog rada pri otvaranju četa.
let library, activeTask=null, version=0;
const copies=new Map();
const $=selector=>document.querySelector(selector);
export function closePdf(){version++;const task=activeTask;activeTask=null;if(task)void task.destroy().catch(()=>{});$('#attachment-pdf').replaceChildren();}
async function pdfBytes(url){
  if(copies.has(url))return copies.get(url).slice();
  const response=await fetch(url);
  if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error || 'PDF nije učitan.');}
  const bytes=new Uint8Array(await response.arrayBuffer());
  copies.set(url,bytes);while(copies.size>3)copies.delete(copies.keys().next().value);
  return bytes.slice();
}
export async function showPdf(url){
  closePdf();const request=version,host=$('#attachment-pdf');host.textContent='Učitavanje PDF-a…';
  try{
    library ||= import('/pdfjs.mjs');
    const [pdfjs,bytes]=await Promise.all([library,pdfBytes(url)]);
    if(request!==version)return;
    pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs-worker.mjs';
    const task=pdfjs.getDocument({data:bytes,isEvalSupported:false});activeTask=task;
    const pdf=await task.promise;if(request!==version)return;
    host.innerHTML='<div class="pdf-controls"><button type="button" data-pdf-prev aria-label="Prethodna strana">‹</button><span data-pdf-page></span><button type="button" data-pdf-next aria-label="Sledeća strana">›</button><button type="button" data-pdf-zoom aria-label="Uvećaj PDF">+</button></div><div class="pdf-page"><canvas aria-label="Strana PDF dokumenta"></canvas></div>';
    const prev=host.querySelector('[data-pdf-prev]'),next=host.querySelector('[data-pdf-next]'),zoom=host.querySelector('[data-pdf-zoom]'),label=host.querySelector('[data-pdf-page]'),canvas=host.querySelector('canvas'),scroll=host.querySelector('.pdf-page');
    let pageNumber=1,enlarged=false,busy=false;
    async function paint(){
      if(busy || request!==version)return;busy=true;prev.disabled=next.disabled=zoom.disabled=true;
      try{
        const page=await pdf.getPage(pageNumber);if(request!==version)return;
        const original=page.getViewport({scale:1}),width=Math.max(200,scroll.clientWidth-16)*(enlarged?2:1),viewport=page.getViewport({scale:width/original.width}),ratio=Math.min(devicePixelRatio||1,2);
        canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
        await page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[ratio,0,0,ratio,0,0]}).promise;
        label.textContent=`${pageNumber} / ${pdf.numPages}`;scroll.scrollTop=scroll.scrollLeft=0;page.cleanup();
      }catch(error){if(request===version)host.textContent='PDF nije prikazan. Zatvori prikaz i pokušaj ponovo.';}
      finally{busy=false;if(request===version){prev.disabled=pageNumber===1;next.disabled=pageNumber===pdf.numPages;zoom.disabled=false;zoom.textContent=enlarged?'−':'+';zoom.setAttribute('aria-label',enlarged?'Umanji PDF':'Uvećaj PDF');}}
    }
    prev.onclick=()=>{if(pageNumber>1 && !busy){pageNumber--;void paint();}};next.onclick=()=>{if(pageNumber<pdf.numPages && !busy){pageNumber++;void paint();}};zoom.onclick=()=>{if(!busy){enlarged=!enlarged;void paint();}};
    await paint();
  }catch(error){if(request===version)host.textContent=error.message || 'PDF nije učitan.';}
}
