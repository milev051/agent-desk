# Tabla projekata

Ekran koji pokazuje sve aktivne projekte odjednom, umesto liste četova. Otvara se dugmetom
„Tabla projekata“ u bočnoj traci ili adresom `/#tabla`.

## Šta prikazuje
- **Čeka tebe:** projekti čiji poslednji odgovor agenta ima red `Pitanje:`, a korisnik posle toga
  nije pisao. Uz pitanje: „Prihvati preporuku“, „Odgovori“ (polje), „Otvori čet“.
- **Ostali projekti:** koji rade (plavo) i koji stoje, po poslednjoj aktivnosti. Projekat bez
  aktivnosti 14 dana, bez pitanja i bez rada se ne prikazuje.
- Po kartici: poslednji rezultat, `Sledeće:` (dugme „Nastavi“), polje za uputstvo agentu,
  do 5 četova projekta.
- **Kolo odluka:** skače na prvo pitanje koje čeka.
- Gore: merenje načina rada i predlozi.

Projekat se određuje kao najuži folder iz `data/projekti.md` koji sadrži radni folder četa
(ili projekat određen iz radnji). Pomoćni četovi (dispečer, prilagođavanje, misli) se ne broje.

## Kako šalje
`POST /api/board/send` `{chatId, kind: accept|answer|continue|instruct, text, questionId}`.
Ako agent radi, poruka ide u red čekanja tog četa; inače odmah. Odgovor na pitanje zatvara
pitanje u beleškama projekta (`project-memory`). Poruka nosi `origin: "board"`.

## Merenje ponašanja
`GET /api/board?days=7` vraća `behavior` (board.mjs, `analyzeBehavior`):
- poruke korisnika (origin user, queue, board), bez delegate, restart i automatskih;
- **prelaz:** sledeća poruka istog dana u drugom projektu, u roku od sat vremena;
- **vreme do odgovora:** od završetka odgovora agenta do sledeće poruke u tom četu, pauze duže
  od 8 h se ne računaju;
- radnje na tabli u `data/board-events.jsonl` (vrsta, projekat, čet, čekanje; bez teksta poruka).

### Početno stanje, pre table (7 dana do 2026-11-06)
- 633 poruke, 3,3 projekta dnevno, 16,1 prelaza dnevno; 2026-11-05: 9 projekata i 75 prelaza.
- Medijana odgovora na pitanje agenta: 2 min. 198 pitanja, 192 dobilo odgovor.
- Zaključak: korisnik ne kasni sa odgovorima, nego često prelazi između projekata. Tabla zato
  cilja manje prelaza i kraće vraćanje u kontekst, ne brže odgovore.

## Unapređivanje
Predlozi su pravila u `suggest()` sa početnim pragovima (15 prelaza dnevno, 4 projekta dnevno,
3 pitanja koja čekaju, 60 min do odgovora). Posle nedelju dana uporedi `behavior` sa početnim
stanjem: broj prelaza, udeo poruka poslatih sa table (`viaBoard`), korišćenje „Prihvati
preporuku“. Prag ili predlog koji ne menja ponašanje izmeni ili ukloni i zapiši u HRONOLOGIJA.md.

Ograničenje: merenje vidi samo poruke u Agent Desku, ne rad van njega, i ne razlikuje kratku
potvrdu od pravog prelaska pažnje.
