const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// Actions are launch records, not a process monitor. Never label old actions as still running.
export function liveActivityHtml(message) {
  if (message?.role !== 'assistant' || message.status !== 'running') return '';
  const commands=(message.actions || []).filter(action=>action.kind==='command').slice(-3);
  const actions=commands.length ? commands : (message.actions || []).slice(-3);
  return `<section class="live-activity" aria-label="Aktivnosti agenta uživo"><div class="activity" role="status">Agent još radi${message.activity ? ': '+escape(message.activity) : '…'}</div>${actions.length ? `<div class="live-activity-label">Poslednje pokrenuto${commands.length ? ' · komande' : ' · alati'}</div><ol>${actions.map(action=>`<li><code>${escape(String(action.text || '').slice(0,300))}${String(action.text || '').length>=300 ? '…' : ''}</code></li>`).join('')}</ol>` : ''}</section>`;
}
