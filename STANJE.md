# Stanje
_2026-11-18, čet 57b0ca1d_
- Automatski zapis iteracija (`iteration-log.mjs`, uputstvo `docs/zapis-iteracija.md`): poruke, pravilo agentima, jedan podsetnik agentu, dugme u četu, podsetnik korisniku posle 7 dana. Važi posle restarta servera. Sledeće: posle restarta proveriti na pravom projektu da li agenti dopisuju unose.
_2026-11-18, čet 6bd3230e_
- Prekid podčeta novom informacijom: delegate sa `childId` i `interrupt:true` prekida tekući odgovor i nastavlja istu sesiju; bez lažnog izveštaja roditelju. Važi posle restarta servera. Sledeće: posmatrati na živom četu da li glavni agent prekida samo kad treba.
_2026-11-18, čet cf58755d_
- Glavni čet uvek slobodan: za Claude glavni čet važi tehnička zabrana (`manager-guard.mjs`, `--disallowedTools`, Bash do 30 s), a delegate zauzetom podčetu stavlja zadatak u njegov red (202, `queued:true`). Važi posle restarta servera i za nove odgovore. Antigravity: samo pravilo, jer CLI nema spisak zabranjenih alata. Sledeće: posmatrati da li hook odbija neku korisnu kratku proveru.
_2026-11-18, čet 913c3b38_
- Proba computer use u terminalnom režimu: blokirano. Alata nema dok se computer-use ne uključi kroz `/mcp`, a taj meni ne radi kroz Agent Desk. Sledeće: korisnik ručno uključuje u Terminalu, pa se ponavlja proba sa Notes. Kod nije menjan.
_2026-11-17, čet d801cdc0_
- Delegate sa `childId` i `name` preimenuje postojeći podčet; uputstvo glavnom četu traži `name` (2 do 5 reči) uz svaki delegate. Važi posle restarta servera.
_2026-11-17, čet 8a4e27dd_
- Glavni čet samo upravlja: pravilo `managerRule` u server.mjs šalje se svakom glavnom četu (svi agenti); izvršni posao ide podagentima. Važi posle restarta servera. Sledeće: posmatrati da li agenti delegiraju i sitne izmene previše.
_2026-11-17, čet 926912ef_
- 143 zaostala stub procesa (~540 MB) ugašena; curio ih je test/restart-resume-api.test.mjs pri svakom npm testu. Stub se sad sam gasi bez roditelja ili posle 2 min, test na kraju radi pkill (3255255). Posle npm testa 0 zaostalih.
_2026-11-16, čet 8a4e27dd_
- Codex i Grok isključeni preko `data/agents.json` (agent-switch.mjs, eaaebd5): nema ih u izboru agenta, ruteru, limitima ni delegate. Vraćanje: obrisati iz spiska + restart. Codex je zapravo radio sa gpt-5.6-terra, padao je zbog modela gpt-6.1-sol u ~/.codex/config.toml.
- Sa dva agenta gornjeg reda nema: limiti i baterija skriveni, gore desno samo logotipi Claude/Antigravity (nov čet) i zupčanik; Pošalji svima, Restart i Osveži na vrhu podešavanja (#settings-actions). Telefon bez promene.
- Aplikacija Limiti (zaseban projekat): bez Codexa, Groka i OpenAI API kartice, prozor na sredini ekrana i pri pokretanju. Otvoreno: da li prozor da iskače pri svakom pokretanju računara.
- Napomena: radni STANJE.md je bio prepisan stanjem projekta titlova (drugi čet); sačuvano u data/STANJE-titlovi-zalutalo-2026-11-16.md.
- 2026-11-12 (čet 56cc8727): sažetak za „Nov čet“ radi aktivni model (Claude/Codex CLI), rezerva Opus pa Gemini (agent-summary.mjs, a5d2efe); server restartovan. Sledeće: proveriti na četu sa 564k konteksta.
_2026-11-09 17:40, čet b7edfcb8_
- Praćenje opterećenja po četu (resources.mjs): traka na dnu bočne trake, GET /api/resources, podčetovi čekaju (⏸) kad je load ≥ 16 ili memorija kritična. Pragovi u LIMITS; proveriti posle dana rada da li su dobri.
- Više Google naloga (google-accounts.mjs): „+ Dodaj Google nalog“, token po nalogu, rute biraju nalog preko `?account=ADRESA`, ime i slika profila (dozvola userinfo.profile). Commit 359d03d, a01051b; server restartovan.
- Nalozi (Google, GitHub, WebPros): samo „+ Dodaj nalog“ kao poslednji red spiska, u redu naloga ikonice (koristi, proveri, ukloni). GitHub kanta radi gh auth logout; WebPros je jedan red sa proveri/ponovo poveži/ukloni (aef09f0). Uklanjanje naloga traži potvrdu Da/Ne.
- Google: milev051 povezan (glavni); ROOM211 (office@room211.studio) i baubu543 još nisu dodati, poslednji pokušaj dao Google 500.
- GitHub ponovo povezan (milev051) posle odjave iz gh.
- Google OAuth aplikacija (projekat Default, default-510913) objavljena 2026-11-07 (In production, neverifikovana). Stare prijave iz Testing režima ističu za 7 dana: ponovo povezati svaki nalog. Popup za prekinute veze radi (integration-watch.mjs).
- Red za GPT slike za sve četove (image-queue.mjs, bb35b93). Grok i Gemini nisu u redu dok se ne izmeri preklapanje.
- Glavni čet ćuti posle izveštaja podčeta dok drugi podčetovi rade (d644eec); plave tačke kad glavni miruje a podčetovi rade (0684067).
- Agenti sami commituju posle npm test (AGENTS.md pravilo 7). Push samo na zahtev.
- Arhiva četova 3 dana; istek briše i Claude sesiju (claude-sessions.mjs).
