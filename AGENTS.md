# Pravila za agente koji menjaju Agent Desk

Ovu aplikaciju koristiš dok je menjaš. Ako `public/app.js` ne može da se pokrene, korisnik ostaje na ekranu „Preuzimam interfejs aplikacije…" i ne može da ti piše da je nešto pokvareno. Zato:

1. **Posle svake izmene pokreni `npm test`** i ne završavaj odgovor dok svi testovi ne prođu. Ako test padne, popravi uzrok, ne test.
2. **Nov browser modul** stavi u `public/` kao `ime-modula.mjs` (mala slova, cifre, crtica). Server takve fajlove isporučuje sam. Fajl drugog tipa ili iz `node_modules` mora da se upiše u spisak `files` u `server.mjs`.
3. **Izmena u `server.mjs` ili drugom serverskom `.mjs` fajlu** važi tek posle restarta servera. Pre restarta proveri da nijedan agent ne radi, pa pokreni:
   `launchctl kickstart -k gui/$(id -u)/local.agent-desk.server`
   Restartom prekidaš i svoj sopstveni odgovor, zato ga radi poslednji i reci korisniku da je restart urađen.
   **Nikad ne pravi restart skriptu koja radi u pozadini** (`launchctl submit`, `nohup`, `/tmp/*restart*.py`). `launchctl submit` pokreće skriptu iznova posle svakog izlaska, pa server ulazi u petlju restarta, telefon gubi vezu, a Google prijava otvara nove tabove. Ako agenti rade, ne restartuj, nego reci korisniku da restartuje kad završe. Čuvar `watchdog.mjs` uklanja takve poslove.
4. **Provera da se interfejs učitava:** `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4317/ime-modula.mjs` mora da vrati 200 za svaki modul koji uvoziš.
5. Commit prolazi kroz `.githooks/pre-commit`, koji pokreće `npm test` i odbija commit ako test padne. Ne zaobilazi ga sa `--no-verify`.
6. **Sve izmene drži unutar ovog foldera**, da se aplikacija prenese na novi računar samo kloniranjem sa GitHub-a. Kod, skripte, podešavanja i dokumentacija idu u repo, a ne u `/tmp`, `~/.config` ili `~/Library`. Ako nešto mora da postoji van foldera (launchd posao, fajl u `~/.config/agent-desk`), napravi ga kodom iz repoa koji se izvršava sam pri pokretanju aplikacije, kao što server instalira `watchdog.mjs`. Lozinke, tokeni i lični podaci ostaju van repoa, u `~/.config/agent-desk` ili `data/`, i ne commituju se.
