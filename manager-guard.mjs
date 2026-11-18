#!/usr/bin/env node
// PreToolUse hook za glavni čet (Claude CLI): glavni čet upravlja, a posao rade podagenti.
// Odluka je čista funkcija, da može da se testira bez pokretanja CLI-ja.
import {readFileSync, realpathSync} from 'node:fs';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const MANAGER_BASH_TIMEOUT_MS = 30000;
const assign = 'Glavni čet ostaje slobodan za razgovor: ovaj posao daj podagentu preko POST /api/chats/ID/delegate i odmah završi odgovor.';
const notes = new Set(['STANJE.md', 'ODLUKE.md', 'HRONOLOGIJA.md', 'ITERACIJE.md', 'projekti.md']);
const noteFile = file => notes.has(basename(file)) || /\/\.claude\/projects\/[^/]+\/memory\//.test(file) || /^(\/private)?\/tmp\/claude-\d+\//.test(file);

// Tekst zadatka u heredoc-u ili navodnicima nije komanda: „pokreni npm test“ u telu delegate poziva sme da prođe.
export function shellCode(command) {
  return String(command || '')
    .replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n[\s\S]*?(?:\n\s*\2\b|$)/g, ' ')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

const waiting = /\bsleep\s+\d|\b(?:while|until)\b[\s\S]*\bdo\b|\bwatch\s|\btail\s+-[a-zA-Z]*[fF]/;
const longWork = /\b(?:npm|pnpm|yarn|bun)\s+(?:test|t|ci|install|i|add|run|exec)\b|\bnpx\s|\bnode\s+\S*deploy\S*|\b(?:ffmpeg|whisper|playwright|rsync|scp)\b|\bgit\s+(?:push|clone)\b|\b(?:brew|pip3?)\s+install\b/;

export function managerDecision({tool_name: tool, tool_input: input = {}} = {}) {
  if (['Edit', 'Write', 'MultiEdit'].includes(tool)) {
    const file = String(input.file_path || '');
    return noteFile(file) ? null : `Glavni čet ne menja fajlove, osim beležaka projekta. ${assign}`;
  }
  if (tool !== 'Bash') return null;
  if (input.run_in_background) return `Glavni čet ne pokreće pozadinske komande. ${assign}`;
  if (Number(input.timeout) > MANAGER_BASH_TIMEOUT_MS) return `Glavni čet radi samo kratke provere, do ${MANAGER_BASH_TIMEOUT_MS / 1000} s. ${assign}`;
  const code = shellCode(input.command);
  if (waiting.test(code)) return 'Glavni čet ne čeka u petlji. Delegate zauzetom podčetu sam stavlja zadatak u red, a izveštaj podčeta stiže automatski. Završi odgovor kratkim stanjem.';
  if (longWork.test(code)) return `Glavni čet ne pokreće testove, build, instalaciju ni objavu. ${assign}`;
  return null;
}

function main() {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return; }
  const reason = managerDecision(input);
  if (reason) process.stdout.write(JSON.stringify({hookSpecificOutput: {hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason}}));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
