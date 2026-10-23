export function formatRestartToast({ bootTime, requesterTitle } = {}) {
  const time = new Date(bootTime || Date.now()).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
  return requesterTitle ? `Agent Desk je restartovan u ${time} (${requesterTitle})` : `Agent Desk je restartovan u ${time}`;
}

export function createBootTracker({
  onRestart,
  storage = (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
} = {}) {
  let lastBootId = storage?.getItem?.('agent-desk-boot-id') || null;

  function handleBoot({ bootId, bootTime, requesterTitle } = {}) {
    if (!bootId) return;
    if (lastBootId && lastBootId !== bootId) {
      onRestart?.({
        bootId,
        bootTime,
        requesterTitle,
        message: formatRestartToast({ bootTime, requesterTitle })
      });
    }
    lastBootId = bootId;
    try {
      storage?.setItem?.('agent-desk-boot-id', bootId);
    } catch {}
  }

  return {
    handleBoot,
    getLastBootId: () => lastBootId
  };
}

// Oznaka ostaje vidljiva dok server ne potvrdi da više nema zakazanog restarta.
export function createRestartStatus({element,api}) {
  let loading=false;
  async function refresh(){
    if(loading)return;
    loading=true;
    try{
      const state=await api('/api/restart');
      element.hidden=!state.scheduled;
      element.textContent=state.scheduled?'Čeka se restart servera · čim agenti završe':'';
    }catch{}finally{loading=false;}
  }
  return {refresh};
}
