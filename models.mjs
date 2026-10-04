import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';

export function codexModels(data) {
  return (Array.isArray(data.models) ? data.models : []).filter(m => m.visibility !== 'hide' && typeof m.slug === 'string').map(m => ({ id: m.slug, name: m.display_name || m.slug, efforts: (m.supported_reasoning_levels || []).map(e => ({id:e.effort,name:e.effort === 'xhigh' ? 'Extra high' : e.effort.charAt(0).toUpperCase()+e.effort.slice(1)})) }));
}
export function grokModels(output) {
  const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
  return [...new Set([...plain.matchAll(/^\s*[*-]\s+([a-zA-Z0-9][a-zA-Z0-9._:/-]*)/gm)].map(m => m[1]))].map(id => ({ id, name: id }));
}
export function normalizeAionCatalog(agents) {
  const decode = value => { if(typeof value !== 'string') return value || {}; try {return JSON.parse(value);} catch {return {};} };
  const options = arr => (arr || []).map(e => typeof e === 'string' ? {id:e,name:e.charAt(0).toUpperCase()+e.slice(1)} : {id:String(e.value ?? e.effort ?? e.id),name:e.name || e.label || e.value || e.effort});
  const result = {};
  for(const a of agents) {
    const agent = a.backend || a.agent_type;
    if(!['claude','codex','grok','antigravity'].includes(agent)) continue;
    const raw = decode(a.config_options), config = Array.isArray(raw) ? raw : raw.config_options || [];
    const available = decode(a.available_models), list = Array.isArray(available) ? available : available.available_models || [];
    const modelConfig = config.find(c => c.category === 'model');
    const thought = config.find(c => c.category === 'thought_level' || c.id === 'reasoning_effort');
    const models = list.map(m => ({id:m.id,name:m.label || m.id,efforts:options(m.reasoning_efforts || (agent === 'grok' ? thought?.options : []))}));
    if (!models.length) for(const m of modelConfig?.options || []) models.push({id:m.value,name:m.name || m.value,efforts:[]});
    result[agent] = {models, defaultModel:available.current_model_id || '', source:'AionUi runtime catalog',capturedAt:new Date().toISOString(), effortScope:agent === 'grok' ? 'provider' : 'model'};
  }
  return result;
}
export function claudeModels(models) {
  return (models || []).map(m => ({id:m.value,name:m.displayName || m.value,efforts:(m.supportsEffort ? m.supportedEffortLevels || [] : []).map(id => ({id,name:id === 'xhigh' ? 'Extra high' : id.charAt(0).toUpperCase()+id.slice(1)}))}));
}
function discoverClaude(binary) {
  return new Promise(resolve => {
    const child = spawn(binary, ['-p','--verbose','--input-format','stream-json','--output-format','stream-json','--permission-mode','dontAsk','--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}'], {stdio:['pipe','pipe','pipe'],env:{...process.env,NO_COLOR:'1'}});
    let buffer = '', settled = false;
    const finish = models => {if(settled)return;settled=true;clearTimeout(timer);child.kill('SIGTERM');resolve(models);};
    const timer = setTimeout(() => finish([]), 8000);
    child.stdin.on('error',()=>{}); child.stderr.resume();
    child.on('error',()=>finish([])); child.on('close',()=>finish([]));
    child.stdout.on('data',chunk => {buffer += chunk; let i; while((i=buffer.indexOf('\n'))>=0) {const line=buffer.slice(0,i); buffer=buffer.slice(i+1); try {const e=JSON.parse(line);const m=e.response?.response?.models;if(e.type==='control_response' && Array.isArray(m))finish(claudeModels(m));} catch {}}});
    child.stdin.write(JSON.stringify({type:'control_request',request_id:'model-catalog',request:{subtype:'initialize'}})+'\n');
  });
}
export function antigravityModels(output) {
  return output.split('\n').map(line => line.trim().split('\t')).filter(([id,name]) => name && /^[a-z0-9][a-z0-9._-]*$/.test(id)).map(([id,name]) => ({id,name,efforts:[]}));
}
let cached, pending, fetched = 0;
export function quickCatalog(binaries) {
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(new URL('./model-catalog.snapshot.json', import.meta.url), 'utf8'));
    try { cached.codex.models = codexModels(JSON.parse(fs.readFileSync(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'models_cache.json'),'utf8'))); } catch {}
  }
  catalog(binaries).catch(()=>{});
  return cached;
}
export async function catalog(binaries) {
  if (cached && Date.now() - fetched < 5 * 60 * 1000) return cached;
  if (pending) return pending;
  pending = (async () => {
    const result = JSON.parse(fs.readFileSync(new URL('./model-catalog.snapshot.json', import.meta.url), 'utf8'));
    try {
      const data = JSON.parse(fs.readFileSync(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'models_cache.json'), 'utf8'));
      result.codex.models = codexModels(data); result.codex.source = 'Codex CLI cache'; result.codex.fetchedAt = data.fetched_at;
    } catch { result.codex.error = 'CLI spisak modela nije dostupan. Model možeš uneti ručno.'; }
    if (binaries.claude) { const native = await discoverClaude(binaries.claude); if(native.length) result.claude = {...result.claude, models:native,source:'Claude Code initialize', fetchedAt:new Date().toISOString()}; }
    if (binaries.grok) {
      const native = await new Promise(resolve => {
        execFile(binaries.grok, ['models'], { timeout: 8000, maxBuffer: 128 * 1024, env: { ...process.env, NO_COLOR: '1' } }, (error, stdout) => resolve(grokModels(stdout || error?.stdout || '')));
      });
      if (native.length) result.grok.models = native.map(m => ({...m, name: result.grok.models.find(x => x.id === m.id)?.name || m.name, efforts: result.grok.models.find(x => x.id === m.id)?.efforts || []}));
      if (!result.grok.models.length) result.grok.error = 'CLI spisak modela nije dostupan. Model možeš uneti ručno.';
    }
    if (binaries.antigravity) {
      const native = await new Promise(resolve => execFile(binaries.antigravity,['models'],{timeout:12000,maxBuffer:128*1024,env:{...process.env,NO_COLOR:'1'}},(error,stdout)=>resolve(antigravityModels(stdout || ''))));
      if(native.length) result.antigravity = {...result.antigravity,models:native,source:'agy models',fetchedAt:new Date().toISOString()};
    }
    cached = result; fetched = Date.now(); return result;
  })();
  try { return await pending; } finally { pending = null; }
}

export function effortsFor(catalog, agent, model) {
  const c = catalog[agent];
  const selected = model || (agent === 'claude' ? 'default' : agent === 'grok' ? c?.defaultModel : '');
  return c?.models.find(m => m.id === selected)?.efforts || [];
}
export function validateEffort(catalog, settings) {
  if (settings.effort && !effortsFor(catalog, settings.agent, settings.model).some(e => e.id === settings.effort)) throw new Error('Izabrani model ne podržava ovaj nivo razmišljanja.');
  return settings;
}
