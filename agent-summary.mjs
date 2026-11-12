// Sažetak za nastavak u novom četu radi model aktivan u četu (Claude ili Codex), bez alata i bez sesije.
// Grok i Antigravity nemaju režim bez alata, pa za njih radi Claude Opus. Gemini ostaje poslednja rezerva.
import { spawn } from 'node:child_process';

export const SUMMARY_FALLBACK = { agent: 'claude', model: 'opus' };

// Redosled pokušaja: aktivni agent i model četa, pa Claude Opus.
export function summaryAgents(settings = {}, available = () => true) {
  const list = [];
  if (['claude', 'codex'].includes(settings.agent)) list.push({ agent: settings.agent, model: settings.model || (settings.agent === 'claude' ? 'opus' : ''), effort: settings.effort || '' });
  if (!list.some(c => c.agent === 'claude' && c.model === 'opus')) list.push({ ...SUMMARY_FALLBACK, effort: '' });
  return list.filter(c => available(c.agent));
}

// Gemini zahtev (summaryRequest) pretvoren u jedan tekst za CLI.
export function summaryPrompt(request) {
  const rules = (request.systemInstruction?.parts || []).map(p => p.text).join('\n').replace(/\s*Vrati samo JSON sa poljem summary\.?/, '');
  const data = (request.contents || []).flatMap(c => c.parts || []).map(p => p.text).join('\n');
  return `${rules}\nVrati samo tekst sažetka, bez uvoda, bez JSON-a i bez bloka koda. Ne koristi alate.\n\n${data}`;
}

export function summaryCommand({ agent, model, effort }) {
  if (agent === 'claude') {
    const args = ['-p', '--output-format', 'text', '--tools', '', '--permission-mode', 'dontAsk', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence'];
    if (model) args.push('--model', model);
    if (effort) args.push('--effort', effort);
    return args;
  }
  if (agent === 'codex') {
    const args = ['exec', '--ephemeral', '--skip-git-repo-check', '-c', 'sandbox_mode="read-only"', '-c', 'approval_policy="never"'];
    if (model) args.push('--model', model);
    if (effort) args.push('-c', `model_reasoning_effort="${effort}"`);
    return [...args, '-'];
  }
  throw new Error(`Sažetak ne podržava agenta ${agent}.`);
}

// Codex na stdout piše i zaglavlje; tekst odgovora je posle poslednjeg reda „codex“.
export function summaryOutput(agent, stdout) {
  let text = String(stdout || '');
  if (agent === 'codex') { const i = text.lastIndexOf('\ncodex\n'); if (i >= 0) text = text.slice(i + 7); text = text.replace(/\ntokens used[\s\S]*$/i, ''); }
  return text.replace(/^\s*```[a-z]*\n?|\n?```\s*$/g, '').trim();
}

export function runSummary({ binary, agent, model, effort, prompt, cwd, timeout = 180000, spawnFn = spawn }) {
  return new Promise((resolve, reject) => {
    const child = spawnFn(binary, summaryCommand({ agent, model, effort }), { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } });
    let out = '', err = '', done = false;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(new Error(`${agent} nije završio sažetak za ${Math.round(timeout / 1000)} s.`)); }, timeout);
    timer.unref?.();
    child.stdout.on('data', b => { out += b; });
    child.stderr.on('data', b => { err += b; });
    child.on('error', e => finish(e));
    child.on('close', code => {
      const text = summaryOutput(agent, out);
      if (code === 0 && text) finish(null, text);
      else finish(new Error(`${agent}: ${(err || out).trim().split('\n').slice(-2).join(' ').slice(0, 300) || `izlaz ${code}`}`));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

// Pokušava redom; vraća tekst i ko ga je napravio. Gemini (gemini()) samo ako svi CLI pokušaji padnu.
export async function makeSummary({ request, settings, binaries, cwd, available = a => !!binaries[a], gemini, run = runSummary }) {
  const errors = [];
  for (const c of summaryAgents(settings, available)) {
    try { return { text: await run({ ...c, binary: binaries[c.agent], prompt: summaryPrompt(request), cwd }), by: c }; }
    catch (e) { errors.push(e.message); }
  }
  if (gemini) { try { return { text: await gemini(request), by: { agent: 'gemini', model: '' } }; } catch (e) { errors.push(`Gemini: ${e.message}`); } }
  throw new Error(errors.join('; ') || 'Nijedan model nije dostupan za sažetak.');
}
