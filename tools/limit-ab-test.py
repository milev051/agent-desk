#!/usr/bin/env python3
"""A/B test: koliko 5h i nedeljnog Claude limita troši isti posao
headless (claude -p, kao Agent Desk) naspram interaktivnog terminala.

Pokretanje: python3 -I tools/limit-ab-test.py [broj_poteza]
Rezultat: data/limit-ab/<vreme>.json
"""
import json, os, sys, time, uuid, subprocess, pty, threading, select, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.expanduser('~/.claude/projects/' + ROOT.replace('/', '-').replace(' ', '-'))
MODEL = 'opus'
TURNS = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 30
FILES = ['limits.mjs', 'projects-index.mjs', 'handoff.mjs', 'thoughts.mjs', 'adapters.mjs', 'files.mjs', 'titles.mjs']
FIRST = ('Pročitaj alatom Read ove fajlove u celosti: ' + ', '.join(FILES) +
         '. Zatim u jednoj rečenici reci šta ih povezuje. Ne menjaj ništa.')
QUESTIONS = [f'Iz fajlova koje si već pročitao, u jednoj kratkoj rečenici: {q} Ne čitaj ponovo fajlove.' for q in [
    'šta radi sanitizeLimit?', 'koje agente poznaje adapters.mjs?', 'šta vraća command() za codex?',
    'kako se zove funkcija koja dodaje uputstva poruci?', 'čemu služi handoff.mjs?', 'šta čuva thoughts.mjs?',
    'kako titles.mjs pravi naslov?', 'šta radi files.mjs?', 'šta je projects-index.mjs?', 'koliko često se čitaju limiti?',
    'šta se dešava kad limits-reader padne?', 'koji argument dobija grok za cwd?', 'šta radi parseEvent?',
    'kako antigravity dobija ulaz?', 'koji fajl ima najviše funkcija?', 'da li neki fajl piše na disk?',
    'koji fajl koristi spawn?', 'šta znači stale u limitima?', 'koje periode limita poznaje sanitizeLimit?',
    'šta radi save() u limits.mjs?', 'koji je najkraći od ovih fajlova?', 'da li adapters.mjs zavisi od public foldera?',
    'koji model se šalje codexu?', 'kako se postavlja effort za claude?', 'šta radi --strict-mcp-config ovde?',
    'koji fajl bi menjao za novi agent?', 'šta bi bio rizik u limits.mjs?', 'šta radi shortDiff import?',
    'koji fajl je najvažniji za naslove?', 'sumiraj sve u pet reči.']][:TURNS - 1]
PROMPTS = [FIRST] + QUESTIONS
ALLOWED = 'Read,Glob,Grep'
# Bez nasleđenih promenljivih roditeljske Claude sesije (inače se transkript ne čuva i entrypoint se nasleđuje).
ENV = {k: v for k, v in os.environ.items() if not (k.startswith('CLAUDE') or k in ('AI_AGENT', 'ENABLE_CLAUDEAI_MCP_SERVERS'))}


def probe():
    """Trenutna iskorišćenost limita (0..1) iz rate_limit_event, jeftinim haiku pozivom."""
    out = subprocess.run(['claude', '-p', '--output-format', 'stream-json', '--verbose', '--model', 'haiku',
                          '--no-session-persistence', '--tools', '', '--system-prompt', 'Odgovori: ok', '--strict-mcp-config',
                          '--mcp-config', '{"mcpServers":{}}'], input='ok', capture_output=True, text=True,
                         cwd='/tmp', timeout=120, env=ENV).stdout
    for line in out.splitlines():
        try:
            o = json.loads(line)
        except Exception:
            continue
        if o.get('type') == 'rate_limit_event':
            w = o['rate_limit_info'].get('unifiedWindows', {})
            return {k: w[k]['utilization'] for k in ('five_hour', 'seven_day') if k in w}
    return None


def settle():
    time.sleep(45)
    return probe()


PRICES = {'opus': (5, 25, 6.25, 10, 0.5), 'sonnet': (3, 15, 3.75, 6, 0.3), 'haiku': (1, 5, 1.25, 2, 0.1)}


def usage(session):
    path = os.path.join(PROJ, session + '.jsonl')
    seen, tot = {}, {'input': 0, 'output': 0, 'cacheWrite': 0, 'cacheRead': 0, 'cost': 0.0, 'entrypoints': {}}
    if not os.path.exists(path):
        return tot
    for line in open(path, errors='ignore'):
        try:
            o = json.loads(line)
        except Exception:
            continue
        m = o.get('message') or {}
        if o.get('type') != 'assistant' or not m.get('usage'):
            continue
        seen[(m.get('id'), o.get('requestId'))] = (m, o.get('entrypoint'))
    for m, ep in seen.values():
        u = m['usage']
        p = next((v for k, v in PRICES.items() if k in (m.get('model') or '')), PRICES['opus'])
        cc = u.get('cache_creation') or {}
        w1 = cc.get('ephemeral_1h_input_tokens', 0)
        w5 = u.get('cache_creation_input_tokens', 0) - w1
        tot['input'] += u.get('input_tokens', 0); tot['output'] += u.get('output_tokens', 0)
        tot['cacheWrite'] += u.get('cache_creation_input_tokens', 0); tot['cacheRead'] += u.get('cache_read_input_tokens', 0)
        tot['cost'] += (u.get('input_tokens', 0) * p[0] + u.get('output_tokens', 0) * p[1] + w5 * p[2] + w1 * p[3]
                        + u.get('cache_read_input_tokens', 0) * p[4]) / 1e6
        tot['entrypoints'][ep] = tot['entrypoints'].get(ep, 0) + 1
    tot['cost'] = round(tot['cost'], 4)
    return tot


def run_headless():
    """Isto kao Agent Desk: svaki potez je nov claude -p proces sa --resume."""
    sid = str(uuid.uuid4())
    for i, prompt in enumerate(PROMPTS):
        args = ['claude', '-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
                '--model', MODEL, '--allowedTools', ALLOWED]
        args += ['--session-id', sid] if i == 0 else ['--resume', sid]
        subprocess.run(args, input=prompt, capture_output=True, text=True, cwd=ROOT, timeout=900, env=ENV)
        log(f'headless potez {i + 1}/{len(PROMPTS)}')
    return sid


def last_turn_done(path, prompts_sent):
    if not os.path.exists(path):
        return False
    users = 0; last = None
    for line in open(path, errors='ignore'):
        try:
            o = json.loads(line)
        except Exception:
            continue
        if o.get('type') == 'user' and isinstance((o.get('message') or {}).get('content'), str):
            users += 1
        if o.get('type') == 'assistant':
            last = (o.get('message') or {}).get('stop_reason')
        elif o.get('type') == 'user':
            last = None
    return users >= prompts_sent and last == 'end_turn'


def run_interactive():
    """Interaktivni TUI u pseudo-terminalu, potez po potez."""
    sid = str(uuid.uuid4())
    path = os.path.join(PROJ, sid + '.jsonl')
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(ROOT)
        env = dict(ENV, TERM='xterm-256color')
        os.execvpe('claude', ['claude', '--model', MODEL, '--allowedTools', ALLOWED, '--session-id', sid], env)
    screen = bytearray(); stop = False

    def drain():
        while not stop:
            r, _, _ = select.select([fd], [], [], 0.5)
            if r:
                try:
                    screen.extend(os.read(fd, 65536))
                except OSError:
                    return
    threading.Thread(target=drain, daemon=True).start()
    time.sleep(8)
    if b'trust' in bytes(screen).lower() and b'no,' in bytes(screen).lower().replace(b' ', b''):
        # Podrazumevano je „No, exit“; strelica dole bira „Yes, I trust this folder“.
        os.write(fd, b'\x1b[B'); time.sleep(0.5); os.write(fd, b'\r'); time.sleep(6)
    for i, prompt in enumerate(PROMPTS):
        os.write(fd, prompt.encode()); time.sleep(1); os.write(fd, b'\r')
        start = time.time()
        while not last_turn_done(path, i + 1):
            if time.time() - start > 900:
                log(f'interaktivni potez {i + 1} istekao'); break
            time.sleep(2)
        time.sleep(3)
        log(f'interaktivni potez {i + 1}/{len(PROMPTS)}')
    os.write(fd, b'/exit\r'); time.sleep(3)
    stop = True
    try:
        os.kill(pid, 15)
    except Exception:
        pass
    return sid


def log(msg):
    print(datetime.datetime.now().strftime('%H:%M:%S'), msg, flush=True)


def arm(name, fn):
    before = settle()
    t0 = time.time(); sid = fn(); t1 = time.time()
    after = settle()
    u = usage(sid)
    drop = {k: round((after[k] - before[k]) * 100, 2) for k in before} if before and after else None
    r = {'arm': name, 'session': sid, 'before': before, 'after': after, 'dropPct': drop, 'usage': u,
         'seconds': round(t1 - t0), 'costPer1pct5h': round(u['cost'] / drop['five_hour'], 3) if drop and drop['five_hour'] > 0 else None,
         'costPer1pctWeek': round(u['cost'] / drop['seven_day'], 3) if drop and drop['seven_day'] > 0 else None}
    log(json.dumps(r))
    return r


if __name__ == '__main__':
    order = os.environ.get('AB_ORDER', 'headless,interactive').split(',')
    fns = {'headless': run_headless, 'interactive': run_interactive}
    results = [arm(n, fns[n]) for n in order]
    out = os.path.join(ROOT, 'data', 'limit-ab')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '.json')
    json.dump({'model': MODEL, 'turns': len(PROMPTS), 'results': results}, open(f, 'w'), indent=1)
    log('rezultat: ' + f)
