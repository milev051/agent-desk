# Stanje
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
- Claude četovi sa punim pristupom: isključen plugin cc-plugin-privacy (Allow zbog mejla); most potvrđuje „1. Yes“ i šalje rezervni Enter, dnevnik data/claude-terminal-log/.
- Tabla projekata (/#tabla): merenje prelaza; sledeće je poređenje posle nedelju dana (od 2026-11-06).
- Drive backup (2026-11-10, čet 8b4eb015): `scripts/drive-backup.mjs` + ruta `/drive/files/ID/download`; prvi backup ROOM 211 ceo + dokumenti (~14 GB) u `~/Drive backup/milev051`, dnevnik `backup.log`, greške `_greske.json`. Ponovno pokretanje preskače postojeće. ROOM211 Workspace Drive nije obuhvaćen (nalog nije povezan).
- Poznato: test „browser: stvarni klik…“ (live-preview) povremeno padne pod opterećenjem, sam prolazi.
- Iz drugih četova (milev.rs/projektor): otvoreno da li plave linkove uvesti na ceo milev.rs.
