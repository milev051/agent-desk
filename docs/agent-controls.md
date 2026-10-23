# Radnje agenta u Agent Desku

Agent ima lokalni API i pristup radnom folderu prema režimu četa. To nije automatski pristup svim dugmadima otvorenog pregledača. Operacije radi po korisnikovom zadatku; ne menjaj nepovezana podešavanja.

- Okruženje i mogućnosti: `GET /api/environment?chatId=ID`; uputstvo i tačne rute su u `docs/agent-environment.md`.
- Četovi i podešavanja četa: `GET /api/chats/ID`, `PATCH /api/chats/ID` sa `title` ili `settings`. Agent/model se menjaju kada odgovor ne radi. Za ista podešavanja sledećih četova služe `GET/PUT /api/defaults`.
- Podagenti: `POST /api/chats/ID/delegate` sa `agent`, `name`, `task`; `childId` nastavlja postojeći podčet. Poštuj kapacitet i pravila iz konteksta.
- Ostala podešavanja imaju posebne API-je: `/api/notifications/settings`, `/api/warmup`, `/api/title-settings`, `/api/cli-updates`. Tačna polja proveri u dokumentaciji ili odgovarajućem handleru servera; ne izmišljaj tela zahteva. OAuth i ključeve ne čitaj.
- Fajlovi sa Maca: alatima čitaj dozvoljene putanje ili `GET /api/chats/ID/files?path=...`. Korisniku isporuči fajl u folderu za priloge njegovog četa, uz punu putanju u odgovoru. Za pregled koristi `Proveri:` i konkretan lokalni link ili fajl, po korisnikovom zadatku.
- Pregled stranice: `POST /api/chats/ID/snapshot` sa `{"url":"http://...","device":"desktop"}` (1920 px širine) ili `"mobile"` (390 px, 2x) pravi snimak cele stranice preko Chrome-a bez prozora (`page-snapshot.mjs`). Pre snimka stranica se skroluje do dna i nazad, da se pokrenu uvodne animacije i lenjo učitane slike. Snimak ide u `data/prilozi/ID/` i odgovor vraća `path`; navedi ga u odgovoru. Visina je ograničena na 16000 px (`truncated`). Animacije koje se vraćaju kad element izađe iz ekrana, hover i video nisu verno prikazani.
- Fajlovi sa telefona postaju dostupni tek pošto ih korisnik odabere i otpremi. Agent nema direktan pristup galeriji ili proizvoljnim fajlovima telefona. `POST /api/chats/ID/upload` prima bajtove izabranog fajla, do 25 MB, uz naziv u zaglavlju `X-File-Name`.
- Boje u tekstu: `[r]problem[/r]`, `[b]važno[/b]`, `[g]uspeh[/g]`, najviše dva kratka dela van koda. Prefiksi Urađeno:/Proveri:/Pitanje: ostaju običan tekst.
- Govor: `POST /api/chats/ID/speak` sa `messageId` priprema zvučni snimak. Interfejs ima dugme Pročitaj. API za pripremu zvuka sam po sebi ne pritiska Play u otvorenom pregledaču; za puštanje može biti potreban korisnikov klik.
- Pretraga unutar prikaza četa je funkcija interfejsa. Agent može čitati i pretražiti tekst istorije kroz API i svoje alate; trenutno nema API komande koja otvara polje pretrage na korisnikovom telefonu/računaru.
- Restart: `POST /api/restart` sa `chatId` (opciono `whenIdle:true`); poštuj pravila o drugim agentima. Aktivni odgovori nastavljaju se automatski. `POST /api/chats/ID/restart-resume` sa `enabled` podešava nastavak.

Kada postoji odgovarajući API, koristi njega. Za upravljanje vidljivim interfejsom potreban je zaseban podržan kanal ili alat za kontrolu pregledača. Ne tvrdi da je klik, reprodukcija ili izbor fajla izvršen ako je samo pripremljen sadržaj.

## Projektne beleške

GET `/api/projects/state?chatId=ID` daje STANJE.md, ODLUKE.md, sačuvane izvore i otvorena pitanja. POST `/api/projects/state` sa `{"chatId":"ID","resolveQuestionId":"ID","resolution":"odgovor korisnika i izvor"}` zatvara pitanje tek kada postoji odgovor ili izričit dogovor. Detalji provere i automatske dopune su u `docs/agent-environment.md`.

Projekat četa: Agent Desk ga posle svakog odgovora određuje iz radnji agenta (izmene fajlova i komande sa putanjama iz `data/projekti.md`, bez `data/` i `docs/` Agent Deska). Od tada se STANJE.md, ODLUKE.md i naslov vode po tom projektu, ne po radnom folderu. `POST /api/chats/ID/project` sa `{"dir":"apsolutna putanja"}` ručno postavlja projekat (automatika ga onda ne menja), a `{"dir":null}` briše izbor.
