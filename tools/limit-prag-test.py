#!/usr/bin/env python3
"""Test praga: koliko API-ekvivalentnih dolara staje u tačno 1% nedeljnog
i 5-satnog Claude limita, za terminal (cli) i za Agent Desk način (claude -p).

Posao se pušta u porcijama od po nekoliko poteza. Posle svake porcije
jeftina proba čita iskorišćenost. Kad procenat skoči, beleži se ukupna cena
do tog trenutka. Razlika cene između dva skoka je cena 1%.

Pokretanje odmah:       python3 -I tools/limit-prag-test.py
Pokretanje u vreme:     python3 -I tools/limit-prag-test.py --at 18:40
Otkazivanje:            kill $(cat data/limit-ab/prag.pid)
"""
import importlib.util, json, os, sys, time, uuid, subprocess, pty, threading, select, datetime, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ab', os.path.join(HERE, 'limit-ab-test.py'))
ab = importlib.util.module_from_spec(spec); spec.loader.exec_module(ab)

OUT = os.path.join(ab.ROOT, 'data', 'limit-ab')
CHUNK = 3                 # potezi po porciji
SESSION_TURNS = 30        # posle ovoliko poteza nova sesija (ponovo čita fajlove)
WEEK_TICKS = 3            # tri skoka = dva puna intervala od 1%
MAX_COST = float(os.environ.get('PRAG_MAX_COST', 9))            # $ po delu testa, sigurnosna granica
MAX_FIVE_HOUR = 0.92      # ne ide preko ovoliko 5h iskorišćenosti
SETTLE = 15               # sekundi pre probe
STAMP = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
LOG = os.path.join(OUT, f'prag-{STAMP}.log')


def log(msg):
    line = datetime.datetime.now().strftime('%H:%M:%S') + ' ' + msg
    with open(LOG, 'a') as f:
        f.write(line + '\n')
    print(line, flush=True)


def other_claude_running():
    """Imena četova Agent Deska koji upravo rade sa Claude-om (kvare merenje)."""
    try:
        d = json.load(urllib.request.urlopen('http://127.0.0.1:4317/api/chats', timeout=10))
        chats = d if isinstance(d, list) else d.get('chats', [])
        skip = os.environ.get('PRAG_IGNORE_CHAT', '')
        return [c.get('title') or c.get('id') for c in chats
                if c.get('running') and c.get('id') != skip and (c.get('settings') or {}).get('agent', c.get('agent')) == 'claude']
    except Exception:
        return []


class Headless:
    def __init__(self):
        self.sid = None; self.turns = 0; self.sessions = []

    def new_session(self):
        self.sid = str(uuid.uuid4()); self.sessions.append(self.sid); self.turns = 0

    def send(self, prompt):
        args = ['claude', '-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
                '--model', ab.MODEL, '--allowedTools', ab.ALLOWED]
        args += ['--session-id', self.sid] if self.turns == 0 else ['--resume', self.sid]
        subprocess.run(args, input=prompt, capture_output=True, text=True, cwd=ab.ROOT, timeout=900, env=ab.ENV)
        self.turns += 1

    def close(self):
        pass


class Interactive:
    def __init__(self):
        self.pid = None; self.fd = None; self.sid = None; self.turns = 0; self.sessions = []; self.stop = False

    def new_session(self):
        self.close()
        self.sid = str(uuid.uuid4()); self.sessions.append(self.sid); self.turns = 0; self.stop = False
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(ab.ROOT)
            os.execvpe('claude', ['claude', '--model', ab.MODEL, '--allowedTools', ab.ALLOWED, '--session-id', self.sid],
                       dict(ab.ENV, TERM='xterm-256color'))
        self.pid, self.fd = pid, fd
        screen = bytearray()

        def drain():
            while not self.stop:
                try:
                    r, _, _ = select.select([fd], [], [], 0.5)
                    if r:
                        screen.extend(os.read(fd, 65536))
                        del screen[:-20000]
                except OSError:
                    return
        threading.Thread(target=drain, daemon=True).start()
        time.sleep(8)
        low = bytes(screen).lower()
        if b'trust' in low and b'no,' in low:
            os.write(fd, b'\x1b[B'); time.sleep(0.5); os.write(fd, b'\r'); time.sleep(6)

    def send(self, prompt):
        path = os.path.join(ab.PROJ, self.sid + '.jsonl')
        os.write(self.fd, prompt.encode()); time.sleep(1); os.write(self.fd, b'\r')
        start = time.time()
        while not ab.last_turn_done(path, self.turns + 1):
            if time.time() - start > 900:
                log('interaktivni potez istekao'); break
            time.sleep(2)
        time.sleep(2)
        self.turns += 1

    def close(self):
        if self.pid:
            try:
                os.write(self.fd, b'/exit\r'); time.sleep(3)
            except OSError:
                pass
            self.stop = True
            try:
                os.kill(self.pid, 15); os.waitpid(self.pid, 0)
            except Exception:
                pass
            self.pid = None


def arm(name, runner):
    log(f'== {name}: početak')
    cost = lambda: sum(ab.usage(s)['cost'] for s in runner.sessions)
    last = ab.probe(); start = dict(last)
    ticks = {'five_hour': [], 'seven_day': []}
    contaminated = []
    q = 0
    while True:
        if not runner.sessions or runner.turns >= SESSION_TURNS:
            runner.new_session(); runner.send(ab.FIRST); q = 0
        for _ in range(CHUNK):
            runner.send(ab.QUESTIONS[q % len(ab.QUESTIONS)]); q += 1
        time.sleep(SETTLE)
        now = ab.probe()
        if not now:
            log('proba nije uspela'); continue
        c = round(cost(), 4)
        others = other_claude_running()
        if others:
            contaminated.append({'at': time.time(), 'chats': others}); log(f'UPOZORENJE: radi i {others}')
        for k in ticks:
            if now[k] > last[k]:
                ticks[k].append({'cost': c, 'util': now[k], 'at': time.time(), 'dirty': bool(others)})
                log(f'{name} skok {k} {last[k]:.2f}->{now[k]:.2f} pri {c:.3f} $')
        last = now
        if len(ticks['seven_day']) >= WEEK_TICKS:
            break
        if c > MAX_COST:
            log('dostignuta granica cene'); break
        if now['five_hour'] >= MAX_FIVE_HOUR:
            log('5h limit skoro potrošen, prekidam'); break
    runner.close()

    def per1(t):
        if len(t) < 2:
            return None
        return round((t[-1]['cost'] - t[0]['cost']) / round((t[-1]['util'] - t[0]['util']) * 100), 3)
    r = {'arm': name, 'start': start, 'end': last, 'cost': round(cost(), 4), 'ticks': ticks,
         'costPer1pctWeek': per1(ticks['seven_day']), 'costPer1pct5h': per1(ticks['five_hour']),
         'contaminated': contaminated, 'sessions': runner.sessions}
    log(json.dumps({k: r[k] for k in ('arm', 'cost', 'costPer1pctWeek', 'costPer1pct5h')}))
    return r


def wait_until(hhmm):
    h, m = map(int, hhmm.split(':'))
    now = datetime.datetime.now()
    t = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if t < now:
        t += datetime.timedelta(days=1)
    log(f'čekam do {t:%Y-%m-%d %H:%M}')
    time.sleep((t - now).total_seconds())


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'prag.pid'), 'w') as f:
        f.write(str(os.getpid()))
    if '--at' in sys.argv:
        wait_until(sys.argv[sys.argv.index('--at') + 1])
    # Sačekaj da drugi Claude četovi završe (najviše 30 min), pa počni.
    for _ in range(60):
        busy = other_claude_running()
        if not busy:
            break
        log(f'čekam da završe: {busy}'); time.sleep(30)
    order = os.environ.get('AB_ORDER', 'interactive,headless').split(',')
    runners = {'headless': Headless, 'interactive': Interactive}
    results = [arm(n, runners[n]()) for n in order]
    out = os.path.join(OUT, f'prag-{STAMP}.json')
    json.dump({'model': ab.MODEL, 'chunk': CHUNK, 'results': results}, open(out, 'w'), indent=1)
    log('rezultat: ' + out)
    os.remove(os.path.join(OUT, 'prag.pid'))
