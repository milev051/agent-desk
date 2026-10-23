import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {command, parseEvent} from './adapters.mjs';

export const riskChoices = {
  off: {label: 'Isključeno'},
  'gemini-3.8-flash-low': {agent: 'antigravity', model: 'gemini-3.8-flash-low', effort: '', access: 'full', label: 'Gemini 3.8 Flash (Low)'},
  'gpt-6-luna': {agent: 'codex', model: 'gpt-6-luna', effort: 'low', access: 'read', label: 'GPT-6-Luna na Low'},
  haiku: {agent: 'claude', model: 'haiku', effort: '', access: 'read', label: 'Haiku 4.5'}
};

const riskInstruction = 'Ne koristi alate. Ne čitaj i ne menjaj fajlove. Vrati samo jednu kratku opasnu napomenu, ili prazan odgovor.';

export function riskPrompt(reply) {
  const text = String(reply?.text || '').slice(0, 4000);
  const files = (reply?.actions || []).filter(action => action.kind === 'file' && action.text).map(action => action.change ? `${action.text} (${action.change})` : action.text).slice(0, 40);
  const commands = (reply?.actions || []).filter(action => action.kind === 'command' && action.text).map(action => String(action.text).replace(/\s+/g, ' ').slice(0, 160)).slice(-10);
  return `Odgovor agenta:\n${text}\n\nFajlovi: ${files.join(', ') || 'nema'}\nKomande: ${commands.join('; ') || 'nema'}\n\nAko postoji konkretna opasnost po fajlove, podatke, slanje ili trošak, vrati tačno jednu kratku rečenicu na srpskom. Ako opasnosti nema, ne piši ništa.`;
}

export function cleanRiskNote(text) {
  const value = String(text || '').split('\n').map(line => line.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!value || /^(nema|nema opasnosti|prazno|none|empty|n\/a)\.?$/i.test(value)) return '';
  return value.slice(0, 280);
}

export function collectAgentText(agent, lines) {
  let text = '', streamed = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    let data;
    try { data = JSON.parse(line); } catch { continue; }
    const event = parseEvent(agent, data);
    if (event.textStart && text && !text.endsWith('\n\n')) text += '\n\n';
    if (event.delta) { text += event.delta; streamed = true; }
    if (event.text) { if (!streamed) text += (text ? '\n\n' : '') + event.text; streamed = false; }
    if (typeof event.replace === 'string') text = event.replace;
    if (event.final && !text) text = event.final;
  }
  return text;
}

export function createRiskNotes(file, {execute = async () => '', changed = () => {}} = {}) {
  let state = {model: 'off'};
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved && typeof saved.model === 'string') state.model = saved.model;
  } catch {}
  if (!riskChoices[state.model]) state.model = 'off';
  let active = 0, revision = 0;
  const tickets = new WeakMap();
  const save = () => {
    fs.mkdirSync(path.dirname(file), {recursive: true, mode: 0o700});
    fs.writeFileSync(file + '.tmp', JSON.stringify({model: state.model}), {mode: 0o600});
    fs.renameSync(file + '.tmp', file);
  };
  return {
    view() { return {model: state.model, choices: Object.entries(riskChoices).map(([id, item]) => ({id, label: item.label}))}; },
    configure(value) {
      if (!value || !riskChoices[value.model]) throw Error('Nepoznat izbor napomene.');
      state.model = value.model;
      revision++;
      save();
      return this.view();
    },
    busy() { return active > 0; },
    async review(chat, reply) {
      if (state.model === 'off' || reply?.status !== 'done' || !chat) return;
      const mine = (tickets.get(chat) || 0) + 1, version = revision, choice = riskChoices[state.model], replyId = reply.id;
      tickets.set(chat, mine);
      active++;
      try {
        let text = '';
        try { text = cleanRiskNote(await execute(choice, reply)); } catch { return; }
        if (mine !== tickets.get(chat) || version !== revision) return;
        const last = [...(chat.messages || [])].reverse().find(message => message.role === 'assistant');
        if (!last || last.id !== replyId) return;
        const next = text ? {replyId, text} : null;
        if (JSON.stringify(chat.riskNote ?? null) === JSON.stringify(next)) return;
        chat.riskNote = next;
        changed();
      } finally { active--; }
    }
  };
}

export async function runRiskCli({choice, reply, executable, spawnFn = spawn, timeoutMs = 45000} = {}) {
  if (!choice?.agent || !executable) return '';
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-desk-risk-'));
  try {
    const scratch = {settings: {agent: choice.agent, model: choice.model, effort: choice.effort || '', access: choice.access, cwd, instructions: riskInstruction}, sessions: {}};
    const spec = command(scratch, riskPrompt(reply), executable);
    // Pregled nema automatsko odobravanje alata, čak ni u Gemini adapteru.
    if (choice.agent === 'antigravity') {
      spec.args = spec.args.filter(arg => arg !== '--dangerously-skip-permissions');
      spec.args.push('--sandbox');
    }
    if (choice.agent === 'claude') spec.args[spec.args.indexOf('--tools') + 1] = '';
    const output = await new Promise((resolve, reject) => {
      const child = spawnFn(spec.executable, spec.args, {cwd, env: {...process.env, NO_COLOR: '1'}, detached: true, stdio: ['pipe', 'pipe', 'pipe']});
      riskProcesses.add(child);
      let out = '', expired = false, killTimer;
      const timer = setTimeout(() => {
        expired = true;
        if (child.pid) {
          try { process.kill(-child.pid, 'SIGTERM'); } catch {}
          killTimer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 2000);
          killTimer.unref?.();
        }
      }, timeoutMs);
      if (timer.unref) timer.unref();
      child.stdout?.on('data', chunk => { out = (out + chunk.toString()).slice(-200000); });
      child.stderr?.on('data', () => {});
      const cleanup = () => { clearTimeout(timer); clearTimeout(killTimer); riskProcesses.delete(child); };
      child.on('error', error => { cleanup(); reject(error); });
      child.on('close', code => { cleanup(); resolve(!expired && code === 0 ? out : ''); });
      child.stdin?.on?.('error', () => {});
      child.stdin?.end?.(spec.input || undefined);
    });
    return collectAgentText(choice.agent, output.split('\n'));
  } finally {
    fs.rmSync(cwd, {recursive: true, force: true});
  }
}

const riskProcesses = new Set();
export function stopRiskCli() { for (const child of riskProcesses) { if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} } } }
