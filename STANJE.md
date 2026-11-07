# Stanje
_2026-11-07 19:35, čet b7edfcb8_
- Više Google naloga (google-accounts.mjs): „+ Dodaj Google nalog“, token po nalogu, rute biraju nalog preko `?account=ADRESA`, ime i slika profila (dozvola userinfo.profile). Commit 359d03d, a01051b; server restartovan.
- Nalozi (Google i GitHub): samo „+ Dodaj nalog“ kao poslednji red spiska, u redu naloga ikonice (koristi, proveri, ukloni). GitHub kanta radi gh auth logout (41e8643, c071cf0). Predlog: potvrda pre GitHub odjave.
- Google: milev051 povezan (glavni); ROOM211 (office@room211.studio) i baubu543 još nisu dodati, poslednji pokušaj dao Google 500.
- GitHub trenutno nije povezan: gh nema prijavljen nalog (kanta kliknuta 2026-11-07); korisnik treba da završi gh auth login.
- Google OAuth aplikacija (projekat Default, default-510913) objavljena 2026-11-07 (In production, neverifikovana). Stare prijave iz Testing režima ističu za 7 dana: ponovo povezati svaki nalog. Popup za prekinute veze radi (integration-watch.mjs).
- Red za GPT slike za sve četove (image-queue.mjs, bb35b93). Grok i Gemini nisu u redu dok se ne izmeri preklapanje.
- Glavni čet ćuti posle izveštaja podčeta dok drugi podčetovi rade (d644eec); plave tačke kad glavni miruje a podčetovi rade (0684067).
- Agenti sami commituju posle npm test (AGENTS.md pravilo 7). Push samo na zahtev.
- Arhiva četova 3 dana; istek briše i Claude sesiju (claude-sessions.mjs).
- Claude četovi sa punim pristupom: isključen plugin cc-plugin-privacy (Allow zbog mejla); most potvrđuje „1. Yes“ i šalje rezervni Enter, dnevnik data/claude-terminal-log/.
- Tabla projekata (/#tabla): merenje prelaza; sledeće je poređenje posle nedelju dana (od 2026-11-06).
- Poznato: test „browser: stvarni klik…“ (live-preview) povremeno padne pod opterećenjem, sam prolazi.
- Iz drugih četova (milev.rs/projektor): otvoreno da li plave linkove uvesti na ceo milev.rs.
