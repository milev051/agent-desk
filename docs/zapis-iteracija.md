# Zapis iteracija

Agent Desk sam vodi zapis o tome šta je u projektu rađeno i zašto. Korisnik ne mora ništa da pokreće, a stalno pokrenutog agenta nema.

## Šta postoji i gde

| Šta | Gde | Ide u commit |
| --- | --- | --- |
| Unosi agenata | `<projekat>/iteracije/ITERACIJE.md` | po izboru projekta |
| Doslovne poruke korisnika | `<projekat>/iteracije/izvor/auto-poruke.jsonl` | ne |
| Snimci pre i posle | `<projekat>/iteracije/snimci/` | ne |
| Podešavanja i datum otvaranja | `data/zapis-iteracija.json` u Agent Desku | ne |

Foldere `izvor/` i `snimci/` server upisuje u `.git/info/exclude` projekta. `.gitignore` projekta se ne menja i git hookovi se ne instaliraju. Sve ostaje lokalno.

## Kako radi

1. **Poruke.** Svaka korisnikova poruka u četu koji ima projekat dopisuje se u `auto-poruke.jsonl` (vreme, ID četa, tekst, nazivi priloga). Automatski izveštaji i zadaci glavnog agenta podagentu se ne beleže. Vrednosti koje liče na tokene, ključeve i lozinke zamenjuju se sa `[uklonjeno]`. Greška upisa ne prekida slanje poruke.
2. **Pravilo za agente.** Uz svaku poruku agent dobija kratko pravilo: posle bitne izmene dopisuje unos sa datumom, oblašću, doslovnim citatom, razlogom, urađenim, dokazom i statusom (zadržano, zamenjeno, uklonjeno ili otvoreno).
3. **Provera na kraju rada.** Ako je agent u tom krugu promenio fajlove projekta, a nema novog unosa, Agent Desk ga jednom automatski podseća. Podsetnik se ne ponavlja i ne šalje se posle zaustavljanja ili greške. Beleške `STANJE.md`, `ODLUKE.md` i `HRONOLOGIJA.md` ne računaju se kao izmena.
4. **Podsetnik korisniku.** Kad projekat ima nove unose, a zapis nije otvoren 7 dana, pojavi se kartica (na računaru gore desno, na telefonu iznad polja za poruku) sa imenom projekta, brojem novih unosa i dugmadima „Otvori“ i „Kasnije“. „Kasnije“ odlaže za 3 dana.

Čet ima projekat kad mu je projekat izabran ili prepoznat, kad je radni folder poznat projekat, git repozitorijum ili sadrži `STANJE.md`, ili kad je podčet glavnog četa koji ima projekat. Podrazumevani folder same aplikacije bez izabranog projekta se ne računa.

## Gde se vidi

- U otvorenom četu, iznad poruka: dugme „Zapis iteracija · broj unosa · poslednji datum“. Klik otvara `ITERACIJE.md`.
- U podešavanjima, odeljak „Zapis iteracija“: spisak projekata sa unosima i dugme „Otvori“.

## Kako se isključuje

U podešavanjima, odeljak „Zapis iteracija“:

- „Automatski beleži iteracije projekata“ isključuje beleženje poruka, pravilo za agente i proveru na kraju rada.
- „Podseti me da prelistam nove unose“ isključuje podsetnik za sve projekte.
- „Podsetnik posle“ bira učestalost: 3, 7, 14 ili 30 dana.
- „Podsetnik“ u redu projekta isključuje podsetnik samo za taj projekat.

Isključivanje ne briše postojeće fajlove.

## API

`GET /api/iterations` vraća podešavanja, projekte i aktivne podsetnike. `GET /api/iterations/chat/ID` vraća projekat četa. `POST /api/iterations/ID/open` čita zapis i beleži otvaranje, `POST /api/iterations/ID/later` odlaže podsetnik, `PUT /api/iterations/ID` prima `{"muted":true}`, a `PUT /api/iterations/settings` prima `enabled`, `reminders` i `intervalDays`.
