#!/usr/bin/env python3
"""One interactive Claude turn in a PTY, translated to the existing NDJSON adapter.
Only session transcripts are read. Authentication belongs to the unmodified CLI.
"""
import json, os, pathlib, pty, re, select, signal, sys, time, uuid


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


# Uključuje i izbor skupa znakova (ESC ( B), koji TUI šalje svuda i koji je razbijao „1. Yes“.
ANSI = re.compile(rb'\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)|\x1b[()*+\-./][ -~]|\x1b[ -/]*[0-~]')


def screen_tail(raw):
    # Poslednji vidljivi redovi ekrana, samo za upozorenje o zastoju; ne ide u poruku.
    text = ANSI.sub(b' ', raw).decode('utf-8', 'replace')
    lines = [re.sub(r'\s+', ' ', l).strip(' │╭╮╰╯─') for l in re.split(r'[\r\n]+', text)]
    return ' · '.join([l for l in lines if len(l) > 2][-4:])[-220:]


# Dijalog potvrde u Claude terminalu: „Do you want to proceed?“, „Dangerous rmdir operation…“ i slični,
# uvek sa izborom „❯ 1. Yes · 2. No“. TUI crta delove ekrana pomeranjem kursora, pa se naslov
# ne vidi ceo; zato se traži samo „1. Yes“, bez razmaka, u poslednjih 16 KB izlaza (briše se posle odgovora).
CONFIRM = re.compile(r'1\.Yes')


def confirm_shown(raw):
    text = ANSI.sub(b'', raw).decode('utf-8', 'replace')
    return bool(CONFIRM.search(re.sub(r'\s+', '', text)))


def journal(sid, kind, raw):
    # Dnevnik potvrda i zastoja sa sirovim krajem ekrana, da se sledeći zastoj može dijagnostikovati.
    # Podrazumevano data/claude-terminal-log/ u Agent Desku (van gita); testovi daju svoj folder.
    folder = os.environ.get('AGENT_DESK_TERMINAL_LOG') or str(pathlib.Path(__file__).resolve().parent.parent / 'data' / 'claude-terminal-log')
    try:
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, sid + '.log'), 'a', encoding='utf-8') as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {kind}\n{raw[-4096:]!r}\n\n")
    except OSError:
        pass


def run(executable, args, prompt, timeout=None):
    stall = float(os.environ.get('AGENT_DESK_STALL_SECONDS') or 600)
    # Koliko dugo dijalog potvrde mora da stoji pre odgovora, da se ekran iscrta do kraja.
    confirm_wait = float(os.environ.get('AGENT_DESK_CONFIRM_SECONDS') or 3)
    # Koliko se čeka reakcija na „1“ pre ponovnog pokušaja Enterom.
    confirm_retry = float(os.environ.get('AGENT_DESK_CONFIRM_RETRY_SECONDS') or 15)
    # Pun pristup (--dangerously-skip-permissions) znači da je korisnik već odobrio komande,
    # pa Agent Desk sam bira „Yes“ kad CLI ipak zastane na potvrdi.
    auto_confirm = '--dangerously-skip-permissions' in args
    # Bez vremenskog ograničenja po korisnikovom zahtevu; odgovor se prekida samo ručno.
    cwd = os.getcwd()
    sid = args[args.index('--resume') + 1] if '--resume' in args else str(uuid.uuid4())
    # Do not guess aliases: server stores Claude's UUID session IDs.
    uuid.UUID(sid)
    config = pathlib.Path(os.environ.get('CLAUDE_CONFIG_DIR', str(pathlib.Path.home() / '.claude')))
    transcript = config / 'projects' / re.sub(r'[^a-zA-Z0-9]', '-', cwd) / (sid + '.jsonl')
    offset = transcript.stat().st_size if transcript.exists() else 0
    args = list(args)
    if '--resume' not in args:
        args += ['--session-id', sid]
    # Native interactive initial prompt avoids keyboard/paste limits and multiline submission.
    args += ['--', prompt]
    env = {k: v for k, v in os.environ.items() if k not in (
        'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION')}
    env['TERM'] = 'xterm-256color'
    pid, fd = pty.fork()
    if pid == 0:
        os.execvpe(executable, [executable] + args, env)
    def cleanup():
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        until = time.monotonic() + 0.6
        while time.monotonic() < until:
            if os.waitpid(pid, os.WNOHANG)[0]:
                break
            time.sleep(0.05)
        else:
            try:
                os.killpg(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            os.waitpid(pid, os.WNOHANG)
        os.close(fd)
    def interrupted(signum, frame):
        raise InterruptedError('Terminalski odgovor je prekinut.')
    old = {s: signal.signal(s, interrupted) for s in (signal.SIGTERM, signal.SIGINT)}
    emit({'type': 'system', 'session_id': sid})
    pending = b''
    usage = {}
    seen = {}
    final = False
    complete = False
    accepted = False
    started = time.monotonic()
    progress = started
    warned = 0
    tail = b''
    confirmed = 0
    asked = False
    # Posle potvrde: kad je poslata i da li je CLI nešto iscrtao posle nje.
    confirm_at = None
    retried = False
    try:
        while timeout is None or time.monotonic() - started < timeout:
            ready, _, _ = select.select([fd], [], [], 0.15)
            if ready:
                try:
                    screen = os.read(fd, 65536)
                except OSError:
                    screen = b''
                if not screen:
                    raise RuntimeError('Claude terminal se zatvorio pre završetka. Proveri Claude prijavu u terminalu.')
                tail = (tail + screen)[-16384:]
                if confirm_at is not None and len(ANSI.sub(b'', screen).strip()) > 3:
                    confirm_at = None
                # Terminal rendering is deliberately never parsed into user messages.
            if transcript.exists():
                with transcript.open('rb') as f:
                    f.seek(offset)
                    chunk = f.read()
                    offset = f.tell()
                if chunk:
                    progress = time.monotonic()
                    confirm_at = None
                    warned = 0
                pending += chunk
                while b'\n' in pending:
                    line, pending = pending.split(b'\n', 1)
                    try:
                        row = json.loads(line)
                    except (ValueError, UnicodeDecodeError):
                        continue
                    msg = row.get('message') or {}
                    if accepted and row.get('type') == 'system' and row.get('subtype') == 'turn_duration':
                        complete = True
                    if row.get('type') == 'user' and isinstance(msg.get('content'), str):
                        accepted = True
                    if not accepted or row.get('isSidechain') or row.get('type') != 'assistant':
                        continue
                    if row.get('isApiErrorMessage'):
                        raise RuntimeError('Claude je prijavio API grešku: ' + str(msg.get('content', []))[:800])
                    key = msg.get('id') or row.get('uuid')
                    # Transcript can contain updated copies of a message.
                    previous = seen.get(key)
                    if previous == msg:
                        continue
                    seen[key] = msg
                    fresh = [b for b in msg.get('content', []) if b not in (previous or {}).get('content', [])]
                    emit({'type': 'assistant', 'session_id': sid, 'message': dict(msg, content=fresh)})
                    final = msg.get('stop_reason') == 'end_turn'
                    usage[key] = msg.get('usage') or {}
            if not accepted and time.monotonic() - started > 60:
                raise RuntimeError('Claude nije prihvatio poruku. Proveri prijavu i poverenje u folder kroz zvanični terminal.')
            idle = time.monotonic() - progress
            if accepted and idle >= confirm_wait and confirm_shown(tail):
                seen_screen = screen_tail(tail)
                if auto_confirm and confirmed < 30:
                    # „1“ bira prvu opciju (Yes) bez obzira na to gde je kursor u izboru.
                    journal(sid, 'potvrda 1', tail)
                    os.write(fd, b'1')
                    confirmed += 1
                    tail = b''
                    progress = time.monotonic()
                    confirm_at = progress
                    retried = False
                    emit({'type': 'confirmed', 'session_id': sid, 'activity': f'Claude je tražio potvrdu; Agent Desk je odgovorio Yes (pun pristup). Ekran: {seen_screen}'})
                    continue
                if not asked:
                    asked = True
                    emit({'type': 'stall', 'session_id': sid, 'activity': f'Claude čeka potvrdu na ekranu, a ovaj čet nema pun pristup. Šta možeš: Zaustavi, uključi pun pristup i pošalji „nastavi“. Ekran: {seen_screen}'})
            # Ako CLI 15 s posle „1“ ništa ne iscrta, pokušaj još jednom Enterom.
            if confirm_at is not None and not retried and time.monotonic() - confirm_at > confirm_retry:
                retried = True
                journal(sid, 'potvrda Enter (posle „1“ bez reakcije)', tail)
                os.write(fd, b'\r')
                emit({'type': 'confirmed', 'session_id': sid, 'activity': 'Claude nije reagovao na „1“; Agent Desk je potvrdio i Enterom.'})
            if accepted and idle >= stall * (warned + 1):
                warned += 1
                journal(sid, f'zastoj {round(idle / 60)} min', tail)
                seen_screen = screen_tail(tail)
                emit({'type': 'stall', 'session_id': sid, 'activity': f'Nema pomaka {round(idle / 60)} min; Claude možda čeka potvrdu. Šta možeš: Zaustavi pa pošalji „nastavi“. Ekran: {seen_screen}'})
            if complete and final:
                totals = {}
                for u in usage.values():
                    for k in ('input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'):
                        totals[k] = totals.get(k, 0) + u.get(k, 0)
                emit({'type': 'result', 'session_id': sid, 'usage': totals})
                return
        raise RuntimeError(f'Claude terminal nije završio odgovor za {round(timeout / 60)} minuta. Nema automatskog ponovnog slanja poruke.')
    finally:
        for s, handler in old.items():
            signal.signal(s, handler)
        cleanup()


if __name__ == '__main__':
    try:
        run(sys.argv[1], json.loads(sys.argv[2]), sys.stdin.read())
    except Exception as error:
        emit({'type': 'error', 'message': str(error)})
        sys.exit(1)
