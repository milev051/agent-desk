import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('server restart API: GET /api/restart, POST /api/restart, 409 i whenIdle', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'restart-api-test-'));
  const bin = path.join(temp, 'bin'); mkdirSync(bin);
  writeFileSync(path.join(bin, 'codex'), `#!${process.execPath}\nlet input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{if(input.includes('STAY_RUNNING'))setTimeout(()=>{},30000);else console.log(JSON.stringify({type:'turn.completed'}));});\n`, { mode: 0o755 });
  mkdirSync(path.join(temp, 'data'));
  mkdirSync(path.join(temp, 'codex'));
  writeFileSync(path.join(temp, 'codex', 'models_cache.json'), JSON.stringify({ models: [{ slug: 'gpt-6.1-sol', visibility: 'list', supported_reasoning_levels: [{ effort: 'medium' }] }] }));

  const port = 4500 + Math.floor(Math.random() * 1000), base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      AGENT_DESK_DISABLE_LIMITS: '1',
      AGENT_DESK_TEST_RESTART: '1',
      CODEX_HOME: path.join(temp, 'codex'),
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      AGENT_DESK_CONFIG: path.join(temp, 'config'),
      AGENT_DESK_DATA: path.join(temp, 'data')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await once(server.stdout, 'data');
    async function call(url, method = 'GET', data, origin = base) {
      const r = await fetch(base + url, {
        method,
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      return { status: r.status, data: await r.json() };
    }

    // 1. Provera bootId u /api/environment i /api/restart
    const env = (await call('/api/environment')).data;
    assert.ok(env.bootId, 'bootId mora postojati u environment');
    assert.ok(env.bootTime, 'bootTime mora postojati u environment');
    assert.equal(env.api.restart, `${base}/api/restart`);

    const restartStatus = (await call('/api/restart')).data;
    assert.equal(restartStatus.bootId, env.bootId);
    assert.equal(restartStatus.scheduled, false);

    // 2. Provera zaštite porekla (Origin)
    assert.equal((await call('/api/restart', 'POST', {}, 'https://evil.test')).status, 403);

    // 3. Provera SSE boot događaja
    const stream = (await fetch(base + '/api/events')).body.getReader(), decoder = new TextDecoder();
    let sseBuffer = '';
    while (!sseBuffer.includes('event: boot')) {
      sseBuffer += decoder.decode((await stream.read()).value, { stream: true });
    }
    assert.match(sseBuffer, /event: boot\ndata: \{"bootId":/);
    await stream.cancel();

    // 4. Kreiranje dva četa
    const chat1 = (await call('/api/chats', 'POST', { settings: { agent: 'codex' } })).data;
    const chat2 = (await call('/api/chats', 'POST', { settings: { agent: 'codex' } })).data;

    // 5. Normalan restart kada nijedan agent ne radi
    const okRestart = await call('/api/restart', 'POST', { chatId: chat1.id });
    assert.equal(okRestart.status, 200);
    assert.equal(okRestart.data.restarting, true);
    assert.match(okRestart.data.message, /Restart prekida i tvoj odgovor/);

    // Sačekaj da test handler upiše fajl
    await new Promise(r => setTimeout(r, 150));
    assert.ok(existsSync(path.join(temp, 'data', 'test-restarted.json')));
  } finally {
    server.kill('SIGKILL');
    rmSync(temp, { recursive: true, force: true });
  }
});
