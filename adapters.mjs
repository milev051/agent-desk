export const names = { codex: 'Codex', claude: 'Claude Code', grok: 'Grok Build', antigravity: 'Antigravity' };
export function command(chat, prompt, executable) {
  const { agent, model, access, instructions, effort } = chat.settings;
  const session = chat.sessions[agent];
  let args;
  if (agent === 'codex') {
    args = ['exec', ...(session ? ['resume', session] : []), '--json', '--skip-git-repo-check'];
    args.push('-c', `sandbox_mode="${access === 'full' ? 'danger-full-access' : 'read-only'}"`, '-c', 'approval_policy="never"');
    if (effort) args.push('-c', `model_reasoning_effort="${effort}"`);
    args.push('-');
  } else if (agent === 'claude') {
    args = ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--permission-prompts', 'none'];
    if (session) args.push('--resume', session);
    if (access === 'full') args.push('--dangerously-skip-permissions');
    else args.push('--tools', 'Read,Glob,Grep', '--permission-mode', 'dontAsk', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}');
    if (effort) args.push('--effort', effort);
  } else if (agent === 'grok') {
    if (access !== 'full') throw new Error('Grok adapter za sada podržava samo Full access. Za samo čitanje izaberi Codex ili Claude Code.');
    args = ['--output-format', 'streaming-messages-json', '--include-partial-messages', '--cwd', chat.settings.cwd];
    if (session) args.push('--resume', session);
    if (access === 'full') args.push('--always-approve');
    if (effort) args.push('--reasoning-effort', effort);
    args.push('-p');
  } else if (agent === 'antigravity') {
    if (access !== 'full') throw new Error('Antigravity adapter trenutno podržava samo Full access.');
    args = ['--input-format','stream-json','--output-format','stream-json','--disable-slash-commands','--dangerously-skip-permissions'];
    if (session) args.push('--conversation', session);
    if (effort) args.push('--effort', effort);
  } else throw new Error('Nepoznat agent.');
  // Keep the Grok prompt immediately after -p; other flags may precede it.
  if (agent === 'grok') { args.pop(); if (model) args.push('--model', model); args.push('-p', withInstructions(prompt, instructions)); }
  else if (model) args.splice(args.length - (agent === 'codex' ? 1 : 0), 0, '--model', model);
  return { executable, args, input: agent === 'grok' ? null : agent === 'antigravity' ? JSON.stringify({event:'user',message:{content:withInstructions(prompt,instructions)}})+'\n' : withInstructions(prompt, instructions) };
}
function withInstructions(prompt, instructions) {
  return instructions ? `Uputstva za ovaj čet (važe i za ovu poruku):\n${instructions}\n\nPoruka korisnika:\n${prompt}` : prompt;
}
export function parseEvent(agent, event) {
  const result = {};
  const model = event.model || event.init?.model || event.message?.model;
  if (typeof model === 'string') result.model = model;
  const terminal = agent === 'codex' ? event.type === 'turn.completed' : agent === 'antigravity' ? event.event === 'result' : event.type === 'result';
  if (terminal) {
    const usage = agent === 'antigravity' ? event.result?.usage : event.usage;
    if (usage) result.usage = normalizeUsage(agent, usage);
  }
  if (agent === 'antigravity') {
    if (event.conversation_id) result.session = event.conversation_id;
    const step = event.step_update;
    if (step?.conversation_id) result.session = step.conversation_id;
    if (step?.step_type === 'agent_response' && step.text_delta) result.delta = step.text_delta;
    if (step?.step_type === 'tool') { result.activity = step.tool_name || 'Alat'; result.actions = [{ kind: 'tool', text: step.tool_name || 'Alat', key: step.step_id || step.id }]; }
    if (step?.state === 'ERROR' || step?.state === 'FAILED' || step?.tool_info?.error) result.error = step.tool_info?.error?.message || 'Antigravity korak nije uspeo.';
    if (event.event === 'result') {
      const r = event.result || {};
      if (r.conversation_id) result.session = r.conversation_id;
      if (typeof r.response === 'string') result.replace = r.response;
      if (r.status !== 'SUCCESS') result.error = r.error || `Antigravity: ${r.status || 'nepoznat rezultat'}`;
    }
  } else if (agent === 'codex') {
    if (event.thread_id) result.session = event.thread_id;
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') result.text = event.item.text;
    if (event.item?.type === 'command_execution') result.activity = event.item.command;
    if (event.item?.type === 'file_change') result.activity = 'Izmena fajlova';
    if (event.type === 'item.completed' && event.item?.type === 'command_execution') result.actions = [{ kind: 'command', text: event.item.command, exit: event.item.exit_code }];
    if (event.type === 'item.completed' && event.item?.type === 'file_change') result.actions = (event.item.changes || []).map(c => ({ kind: 'file', text: c.path, change: c.kind }));
    if (event.type === 'error' || event.type === 'turn.failed') result.error = event.message || event.error?.message || 'Agent je prijavio grešku.';
  } else {
    if (event.session_id) result.session = event.session_id;
    const inner = event.type === 'stream_event' ? event.event : event;
    if (inner?.type === 'content_block_delta' && inner.delta?.type === 'text_delta') result.delta = inner.delta.text;
    if (inner?.type === 'content_block_start' && inner.content_block?.type === 'tool_use') result.activity = inner.content_block.name;
    if (inner?.type === 'content_block_start' && inner.content_block?.type === 'text') result.textStart = true;
    if (event.type === 'assistant') {
      result.text = (event.message?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      const tools = (event.message?.content || []).filter(b => b.type === 'tool_use');
      if (tools.length) { result.activity = tools.map(b => b.name).join(', '); result.actions = tools.map(toolAction); }
    }
    if (event.type === 'result') {
      if (event.is_error) result.error = event.result || event.errors?.join('\n') || 'Agent je prijavio grešku.';
      else if (event.result) result.final = event.result;
    }
    if (event.type === 'error') result.error = event.error?.message || event.message || 'Greška agenta.';
  }
  return result;
}

// Claude and Grok tool calls: commands and file edits by input shape, everything else by name.
function toolAction(b) {
  const input = b.input || {}, file = input.file_path || input.notebook_path || input.path;
  if (typeof input.command === 'string') return { kind: 'command', text: input.command, key: b.id };
  if (typeof file === 'string' && /edit|write|create|replace|patch|delete|move/i.test(b.name)) return { kind: 'file', text: file, key: b.id };
  return { kind: 'tool', text: b.name || 'Alat', key: b.id };
}

export function normalizeUsage(agent, raw) {
  const usage = {source:'cli', scope:agent === 'codex' ? 'session' : agent === 'claude' ? 'main-loop' : 'run', inputIncludesCache:agent === 'codex' ? true : ['claude','grok'].includes(agent) ? false : null};
  const fields = {input:['input_tokens'],output:['output_tokens'],cacheRead:['cached_input_tokens','cache_read_input_tokens','cache_read_tokens'],cacheWrite:['cache_creation_input_tokens'],reasoning:['reasoning_output_tokens','reasoning_tokens','thinking_tokens'],total:['total_tokens']};
  for (const [key, aliases] of Object.entries(fields)) for (const alias of aliases) {
    if (Number.isSafeInteger(raw[alias]) && raw[alias] >= 0) { usage[key] = raw[alias]; break; }
  }
  return Object.keys(usage).length > 3 ? usage : undefined;
}
