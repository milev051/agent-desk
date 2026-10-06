// Ako app.js ne može da se pokrene, ekran za učitavanje kaže zašto umesto da čeka zauvek.
(()=>{
  const fail=text=>{const stage=document.getElementById('boot-stage');if(stage && !document.body.classList.contains('ready'))stage.textContent=text;};
  window.addEventListener('error',e=>{const t=e.target;if(t && t.tagName==='SCRIPT')fail('Interfejs nije pokrenut: fajl '+new URL(t.src).pathname+' ili neki njegov modul nije učitan. Pokreni npm test u folderu Agent Desk.');else if(e.message)fail('Interfejs nije pokrenut: '+e.message);},true);
  setTimeout(()=>{const stage=document.getElementById('boot-stage');if(stage && stage.textContent.startsWith('Preuzimam interfejs'))fail('Interfejs se ne pokreće posle 15 s. Verovatno nedostaje modul ili je greška u app.js. Pokreni npm test u folderu Agent Desk.');},15000);
})();
