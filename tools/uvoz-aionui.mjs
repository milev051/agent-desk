// Copies one AionUi chat into data/chats.json as a new Agent Desk chat.
// Only reads the AionUi database. Without --potvrdi it prints a preview and writes nothing.
// Agent Desk must be stopped first, otherwise the running server overwrites chats.json.
//   node tools/uvoz-aionui.mjs --cet 97851519 [--agent claude] [--naslov "..."] [--folder PUTANJA] [--sve] [--potvrdi]
// --folder sets the chat's working folder (default: Agent Desk). --sve keeps the newest user message too.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { historyText } from '../context.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = path.join(os.homedir(), 'Desktop/ai-centar/podaci/aionui/aionui-backend.db');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const id = arg('--cet'), confirm = process.argv.includes('--potvrdi');
if (!id || !/^[\w-]+$/.test(id)) { console.error('Upotreba: node tools/uvoz-aionui.mjs --cet ID [--agent claude] [--naslov "..."] [--folder PUTANJA] [--sve] [--potvrdi]'); process.exit(1); }
const cwd = path.resolve(arg('--folder') || root);
if (!existsSync(cwd)) { console.error(`Folder ${cwd} ne postoji.`); process.exit(1); }

const query = sql => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', db, sql], { encoding: 'utf8', maxBuffer: 1 << 28 }) || '[]');
const [conv] = query(`select name, model, extra from conversations where id='${id}'`);
if (!conv) { console.error(`Čet ${id} ne postoji u AionUi bazi.`); process.exit(1); }
const extra = JSON.parse(conv.extra || '{}');
const backends = { claude: 'claude', codex: 'codex', gemini: 'antigravity', grok: 'grok' };
const source = backends[extra.backend] || 'claude';
const agent = arg('--agent') || source;
const rows = query(`select type, position, content, created_at from messages where conversation_id='${id}' and hidden=0 and type in ('text','tool_call') order by created_at`);

// Without --sve the newest user message is the request to import; it and everything after it stay out.
const lastUser = process.argv.includes('--sve') ? -1 : rows.findLastIndex(r => r.type === 'text' && r.position === 'right');
const kept = lastUser > 0 ? rows.slice(0, lastUser) : rows;

const messages = [];
for (const r of kept) {
  const c = JSON.parse(r.content);
  if (r.type === 'text' && r.position === 'right') { messages.push({ id: randomUUID(), role: 'user', text: c.content || '', createdAt: r.created_at, sentAt: r.created_at, origin: 'import' }); continue; }
  let reply = messages.at(-1);
  if (reply?.role !== 'assistant') {
    reply = { id: randomUUID(), role: 'assistant', agent: source, model: extra.current_model_id || conv.model || '', text: '', status: 'done', activity: '', createdAt: r.created_at, usageInherited: true, importedFrom: `aionui:${id}` };
    messages.push(reply);
  }
  if (r.type === 'text') { reply.text += (reply.text ? '\n\n' : '') + (c.content || ''); continue; }
  const input = c.input || c.args || {}, file = input.file_path || input.notebook_path || input.path;
  const action = typeof input.command === 'string' ? { kind: 'command', text: input.command }
    : typeof file === 'string' && /edit|write|create|replace|patch|delete|move/i.test(c.name || '') ? { kind: 'file', text: file }
    : { kind: 'tool', text: c.name || 'Alat' };
  (reply.actions ||= []).push({ ...action, text: action.text.slice(0, 300), key: c.call_id });
}
const visible = messages.filter(m => m.text || m.actions?.length);

const defaults = JSON.parse(readFileSync(path.join(root, 'data/defaults.json'), 'utf8'))[agent] || {};
const now = Date.now();
const chat = {
  id: randomUUID(), title: arg('--naslov') || conv.name, titleManual: true, createdAt: now, updatedAt: now,
  settings: { agent, model: defaults.model || '', access: 'full', cwd, instructions: '', effort: defaults.effort || '' },
  sessions: {}, sessionOffsets: {}, messages: visible, transferPending: true, importedFrom: `aionui:${id}`,
};

const transfer = historyText(visible.filter(m => m.text));
console.log(`AionUi čet ${id} (${source}, ${extra.current_model_id || conv.model || 'model nepoznat'}): ${visible.filter(m => m.role === 'user').length} tvojih poruka, ${visible.filter(m => m.role === 'assistant').length} odgovora, ${visible.reduce((n, m) => n + (m.actions?.length || 0), 0)} aktivnosti`);
console.log(`Novi Agent Desk čet: "${chat.title}", agent ${agent}, model ${chat.settings.model || 'podrazumevani'}, folder ${cwd}`);
console.log(`Tekst prenosa: ${[...transfer].length} znakova`);
console.log(`Poslednja preneta poruka (${visible.at(-1)?.role}): ${(visible.at(-1)?.text || '').slice(0, 120).replace(/\s+/g, ' ')}…`);
if (!confirm) { console.log('\nPregled, ništa nije upisano. Za upis dodaj --potvrdi (Agent Desk mora biti ugašen).'); process.exit(0); }

const file = path.join(root, 'data/chats.json');
const backup = `${file}.pre-uvoza-${now}`;
copyFileSync(file, backup);
const chats = JSON.parse(readFileSync(file, 'utf8'));
chats.unshift(chat);
writeFileSync(file, JSON.stringify(chats, null, 2), { mode: 0o600 });
console.log(`\nUpisano. ID četa: ${chat.id}\nRezerva: ${backup}`);
