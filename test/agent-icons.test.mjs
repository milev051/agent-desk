import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LUCIDE_ICONS,
  AGENT_PALETTES,
  getAgentConfig,
  getAgentColor,
  getAgentIconName,
  renderAgentIconSvg,
  renderChatBadge,
  iconAssignments,
  FALLBACK_ICON,
  CHAT_ICON_POOL,
  assignChatIcons
} from '../public/agent-icons.mjs';

test('agent-icons: definisane su sve dodeljene ikone iz jednog Lucide seta', () => {
  const required = [...iconAssignments().map(item => item.icon), FALLBACK_ICON];
  for (const name of required) {
    assert.ok(LUCIDE_ICONS[name], `Nedostaje ikona ${name}`);
    assert.match(LUCIDE_ICONS[name], /<path|<circle|<rect/);
  }
});

test('agent-icons: svaki agent ima namensku ikonu i paletu boja', () => {
  const agents = ['claude', 'antigravity', 'codex', 'grok'];
  for (const agent of agents) {
    const cfg = AGENT_PALETTES[agent];
    assert.ok(cfg, `Nema konfiguracije za ${agent}`);
    assert.ok(LUCIDE_ICONS[cfg.icon], `Nevažeća ikona za ${agent}: ${cfg.icon}`);
    assert.match(cfg.color, /^#[0-9a-fA-F]{6}$/);
    assert.match(cfg.accent, /^#[0-9a-fA-F]{6}$/);
  }
  // Claude je narandžast sa sparkles
  assert.equal(AGENT_PALETTES.claude.icon, 'sparkles');
  assert.equal(AGENT_PALETTES.claude.color, '#e8a46f');

  // Antigravity je plav sa orbit
  assert.equal(AGENT_PALETTES.antigravity.icon, 'orbit');
  assert.equal(AGENT_PALETTES.antigravity.color, '#8dbcf0');

  // Codex je ljubičast sa terminal
  assert.equal(AGENT_PALETTES.codex.icon, 'terminal');
  assert.equal(AGENT_PALETTES.codex.color, '#c7b1ec');

  // Grok je svetlo srebrn sa zap
  assert.equal(AGENT_PALETTES.grok.icon, 'zap');
  assert.equal(AGENT_PALETTES.grok.color, '#b9c3d1');
});

test('agent-icons: boje po modelu nijansiraju boju agenta', () => {
  // Claude: Opus ima topliju amber nijansu
  assert.equal(getAgentColor('claude', 'opus'), '#f3823f');
  assert.equal(getAgentColor('claude', 'sonnet'), '#e8a46f');

  // Antigravity: Pro model je tamnije plav, Flash svetliji
  assert.equal(getAgentColor('antigravity', 'gemini-3.1-pro-high'), '#60a5fa');
  assert.equal(getAgentColor('antigravity', 'gemini-3.8-flash-high'), '#8dbcf0');

  // Codex: Sol je dublji, Luna svetliji
  assert.equal(getAgentColor('codex', 'gpt-6.1-sol'), '#a855f7');
  assert.equal(getAgentColor('codex', 'gpt-6-luna'), '#d8b4fe');

  // Nepoznat model vraća osnovnu boju agenta
  assert.equal(getAgentColor('antigravity', 'nepoznat-model'), '#8dbcf0');
  assert.equal(getAgentColor('nepoznat-agent'), '#aaa');
});

test('agent-icons: renderovanje SVG i bedža kartice', () => {
  const svg = renderAgentIconSvg('sparkles', { size: 14, strokeWidth: 1.8 });
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /width="14"/);
  assert.match(svg, /height="14"/);
  assert.match(svg, /stroke-width="1.8"/);
  assert.match(svg, /stroke="currentColor"/);

  const chat = {
    settings: {
      agent: 'antigravity',
      model: 'gemini-3.8-flash-high'
    }
  };
  const badge = renderChatBadge(chat);
  assert.match(badge, /class="chat-agent-badge"/);
  assert.match(badge, /data-agent="antigravity"/);
  assert.match(badge, /data-model="gemini-3.8-flash-high"/);
  assert.match(badge, /style="--badge-color:#8dbcf0;"/);
  assert.match(badge, /<svg/);
});

test('agent-icons: svaka ikonica je dodeljena samo jednom agentu ili modelu', () => {
  const list = iconAssignments();
  const seen = new Map();
  for (const item of list) {
    const owner = `${item.agent}/${item.family || '*'}`;
    assert.ok(!seen.has(item.icon), `Ikonica ${item.icon} je dodeljena i za ${seen.get(item.icon)} i za ${owner}`);
    seen.set(item.icon, owner);
  }
  assert.ok(!seen.has(FALLBACK_ICON), 'Rezervna ikonica ne sme biti dodeljena agentu ni modelu');
  assert.equal(seen.size, list.length);
});

test('agent-icons: modeli iz aplikacije dobijaju različite ikonice', () => {
  const models = [
    ['claude', 'opus'], ['claude', 'sonnet'], ['claude', 'claude-haiku-4-5'], ['claude', 'claude-fable-5-1'],
    ['codex', 'gpt-6.1-sol'], ['codex', 'gpt-6-luna'], ['codex', 'gpt-6-astra'], ['codex', 'gpt-5-codex'],
    ['antigravity', 'gemini-3.8-flash-medium'], ['antigravity', 'gemini-3.5-flash-lite'], ['antigravity', 'gemini-3.1-pro-high'],
    ['grok', 'grok-4.7'], ['grok', 'grok-build-0.1'], ['grok', 'grok-4.5']
  ];
  const icons = models.map(([agent, model]) => getAgentIconName(agent, model));
  assert.equal(new Set(icons).size, icons.length, icons.join(', '));
  assert.equal(getAgentIconName('claude', 'opus'), 'crown');
  assert.equal(getAgentIconName('claude', 'claude-opus-5-5'), 'crown');
  assert.equal(getAgentIconName('claude', ''), 'sparkles');
  assert.equal(getAgentIconName('nepoznat'), FALLBACK_ICON);
});

test('agent-icons: nijedna dva četa nemaju istu ikonicu', () => {
  assert.equal(new Set(CHAT_ICON_POOL).size, CHAT_ICON_POOL.length);
  assert.ok(!CHAT_ICON_POOL.includes(FALLBACK_ICON));
  for (const name of CHAT_ICON_POOL) assert.ok(LUCIDE_ICONS[name], `Nedostaje ikona ${name}`);
  assert.equal(new Set(CHAT_ICON_POOL.map(name => LUCIDE_ICONS[name])).size, CHAT_ICON_POOL.length, 'Dve ikonice u skupu imaju isti crtež');

  const chats = Array.from({ length: CHAT_ICON_POOL.length }, (_, i) => ({ id: `chat-${i}`, createdAt: 1000 + i }));
  const icons = assignChatIcons(chats);
  assert.equal(icons.size, chats.length);
  assert.equal(new Set(icons.values()).size, chats.length);
});

test('agent-icons: ikonica četa ostaje ista kad nastanu novi četovi', () => {
  const old = [{ id: 'a', createdAt: 1 }, { id: 'b', createdAt: 2 }, { id: 'c', createdAt: 3 }];
  const before = assignChatIcons(old);
  const after = assignChatIcons([{ id: 'd', createdAt: 4 }, ...old.reverse(), { id: 'e', createdAt: 5 }]);
  for (const id of ['a', 'b', 'c']) assert.equal(after.get(id), before.get(id));
  const badge = renderChatBadge({ id: 'a', settings: { agent: 'claude', model: 'opus' } }, { icon: before.get('a') });
  assert.match(badge, new RegExp(`data-icon="${before.get('a')}"`));
  assert.match(badge, /--badge-color:#f3823f/);
});
