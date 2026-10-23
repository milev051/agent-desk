export function createCliUpdatesPanel({api,root=document}){
 const button=root.querySelector('#cli-update-run'),auto=root.querySelector('#cli-update-auto'),status=root.querySelector('#cli-update-status');let timer;
 function render(view){auto.checked=view.auto;button.disabled=view.running;status.textContent=view.running?'Ažuriranje je u toku…':'';for(const item of view.results){const line=document.createElement('div');line.textContent=`${item.name}: ${item.status==='working'?'ažuriram…':item.message}${item.after?' ('+item.after+')':''}`;status.append(line);}}
 async function refresh(){clearTimeout(timer);try{const view=await api('/api/cli-updates');render(view);if(view.running)timer=setTimeout(refresh,2000);}catch(error){status.textContent=error.message;button.disabled=false;}}
 button.onclick=async()=>{button.disabled=true;try{render(await api('/api/cli-updates/run','POST',{}));timer=setTimeout(refresh,1000);}catch(error){status.textContent=error.message;button.disabled=false;}};
 auto.onchange=async()=>{const checked=auto.checked;auto.disabled=true;try{render(await api('/api/cli-updates','PUT',{auto:checked}));}catch(error){auto.checked=!checked;status.textContent=error.message;}finally{auto.disabled=false;}};
 root.querySelector('#defaults-open').addEventListener('click',()=>{void refresh();});
 return {refresh};
}
