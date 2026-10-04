export function preferredEffort(catalog, agent, model) {
  const c=catalog[agent], selected=model || (agent==='claude'?'default':c?.defaultModel);
  const preferred=selected==='gpt-6-luna'?'high':'medium';
  return c?.models.find(m=>m.id===selected)?.efforts?.some(e=>e.id===preferred)?preferred:'';
}
