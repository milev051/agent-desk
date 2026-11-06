# Site Desk

Samostalan lokalni panel: poveži GitHub projekat, razgovaraj sa svojim CLI agentom i zasebno pošalji izmene na GitHub ili hosting. Program radi bez Agent Deska. Ovaj folder je ceo prenosivi paket, za jednog korisnika na macOS-u ili Linux-u.

## Pokretanje

Potrebni su Node.js 22+ i Git. U folderu programa pokreni:

```sh
npm start
```

Otvori http://127.0.0.1:4390/ na istom računaru. Nema npm biblioteka za instalaciju. `npm test` pokreće samostalne provere.

Za razgovor instaliraj i prijavi se u izabrani zvanični CLI: Codex, Claude Code, Grok Build ili Antigravity (`agy`). Svaki korisnik koristi svoju prijavu. Pronalaženje izvršnog fajla ne potvrđuje prijavu ili kvotu. Za privatne repozitorijume podesi Git/SSH autentikaciju u terminalu. Program ne prikuplja GitHub tokene.

## Projekti i razgovor

Klikni **Dodaj sajt**, unesi naziv, opcioni domen, lokalni folder i agenta. Za postojeći projekat izaberi koren Git repozitorijuma. Za kloniranje unesi GitHub HTTPS ili `git@github.com:nalog/repo.git` URL i nov, nepostojeći folder unutar postojećeg roditeljskog foldera. URL sa tokenom ili lozinkom se odbija.

Poruka pokreće lokalni CLI u folderu tog projekta. Tekući čet i ID sesije ostaju samo u memoriji lokalnog servera. Novom sesijom upravlja automatska provera teme, bez dugmeta Novi čet. **Promeni agenta** bira drugi instalirani CLI za isti projekat i takođe započinje nov razgovor. Tokom rada agenta ove radnje nisu dostupne. Posle restarta servera čet je prazan. **Zaustavi** prekida agenta. Prijave i podaci drugih korisnika ne dolaze sa programom.

**Pregledaj sajt** otvara uneti domen u novom tabu. To je objavljeni sajt, a ne lokalni pre/posle pregled. Ako domen nije unet, link nije aktivan.

## Dva dugmeta za slanje

Panel ima **Pošalji na GitHub** i **Pošalji na hosting**. Nema spiska izmenjenih fajlova, ručnog pregleda verzije ili ručnog odobrenja. Klik je zahtev za izabrano slanje. Server pri tom klikom sam priprema konkretnu lokalnu verziju i proverava je pre prenosa; hosting koristi zasebnu kopiju fajlova. GitHub i hosting ostaju nezavisni poslovi.

GitHub šalje već napravljeni lokalni commit na `origin` trenutne grane i zahteva čist radni folder. Program ne pravi automatski commit niti force push. Ako još postoje lokalne izmene, zatraži od agenta da ih proveri i napravi commit ili to uradi u terminalu.

Slanje odmah prikazuje animirani indikator, traku bez procenta i proteklo vreme. Uspeh se prikazuje tek po potvrdi servera. Tokom zahteva ne može se pokrenuti drugi posao ili promeniti projekat. Posle ponovnog učitavanja stranice indikator se ne obnavlja. Pri mrežnoj grešci proveri stvarni rezultat pre ponavljanja.

## Pristup hostingu

Podešavanja su u **Podaci sajta → Poveži hosting / Pristup hostingu**. Izaberi SSH, FTP, FTPS sa eksplicitnim TLS-om (obično port 21) ili FTPS implicit (obično 990). Unesi host, korisnika, port i odredišni folder sajta. FTP koren može biti `/`. **Proveri pristup** proverava vezu bez izmene fajlova.

SSH koristi OpenSSH i postojeći ključ u ssh-agent-u ili njegovu putanju. Poznat host i prijava bez interaktivne lozinke moraju već biti podešeni. Za SSH objavu potreban je `rsync`.

FTP/FTPS koristi lokalni `curl` sa FTP podrškom, bez SSH-a. Lozinka ide procesu standardnim ulazom, nikad argumentima. Čuva se u privatnom `data/credentials/<ID>.password` fajlu sa pravima 600 u folderu sa pravima 700, van Gita. Nije šifrovana na disku. API je ne vraća browseru i ne upisuje je u čet ili `projects.json`. Prazno polje zadržava lozinku samo za isti host i korisnika. Promena adrese ili korisnika traži ponovni unos. FTPS proverava sertifikat i ne prelazi sam na običan FTP; običan FTP prenosi lozinku i fajlove nešifrovano.

## Automatski izbor fajlova za hosting

Lokalni build folder više se ne unosi u formular. Program prepoznaje pripremljeni izlaz sa `index.html` u `dist`, `.output/public`, `out` ili `build`, uz prednost prema prepoznatom framework-u. Ako ima više nejasnih izlaza, ne bira nasumično.

Jednostavan HTML sajt sa `index.html` u korenu može se poslati direktno. Tada se kopiraju samo podržani veb fajlovi i resursi; Git, tajne, package konfiguracije, alati, izvorni serverski folderi i zavisnosti se izostavljaju. Kod framework projekta bez pripremljenog izlaza traži se da agent napravi statični build. Program ne pokreće automatski projektne skripte i ne pretpostavlja da stari build odgovara poslednjim izvorima.

Za nestandardni izlaz agent može da doda `site-desk.json` u projekat:

```json
{"output":"izlazni-folder"}
```

Putanja mora biti relativna i ostati u projektu. Agent dobija uputstvo da pripremi izlaz ili ovu konfiguraciju kada korisnik traži pripremu za hosting. Postojeća eksplicitna podešavanja izlaza i dalje rade; čuvanje podešavanja kroz novi formular uključuje automatski izbor.

## Rezervne kopije i granice

SSH pre slanja pravi kopiju odredišnog foldera na serveru. FTP/FTPS pre prvog upisa lokalno preuzima sve postojeće fajlove koji će biti prepisani; ako rezervna kopija ne uspe, objava se prekida pre slanja. Nove podfoldere pravi pri prenosu. Manifest čuva postojeće, nove i poslate fajlove. FTP rezerva nije kopija celog udaljenog sajta. Udaljeni višak se ne briše.

Objava je za statične fajlove. SSR/Node procesi, WordPress/PHP, baze, migracije, atomski deployment, automatsko vraćanje i pre/posle snimci nisu implementirani. Tokom prenosa mogu se videti delimično poslati fajlovi. Rezerva može ostati i posle neuspeha; proveri rezultat pre ponavljanja.

CLI ima prava lokalnog korisnika. Radni folder i uputstva nisu tehnička izolacija procesa. Privatni podaci, četovi, hosting veze, kopije i lozinke ostaju u `data/` i ne ulaze u izvorni ZIP.

Program sluša samo na 127.0.0.1:4390 (web) i 4392 (API). API zahteva tačan Origin lokalnog panela. Nema javne prijave ili telefonskog pristupa; ne izlaže se direktno internetu. Portove menjaju `SITE_DESK_PORT` i `SITE_DESK_API_PORT`.

## Provere

Testovi koriste pravi lokalni Git, lažni CLI proces sa JSON protokolom, lažni SSH/rsync i pravi curl prenos ka lokalnom FTP serveru. Pokrivaju sesije, trajne podatke, zaustavljanje, zaštitu Origin-a, lozinke, automatski izlaz, filtriranje jednostavnog sajta, pripremu verzije pri direktnom slanju, rezervne kopije i odvojene objave. Testovi ne menjaju korisnikov GitHub ili pravi hosting.

## Sažet prikaz

Interfejs nema logo, breadcrumbs, naziv aktivnog sajta ponovljen iznad četa, trajni status servera ili pomoćne opise uz razgovor. Izabrani sajt vidi se u bočnom spisku. U podacima su samo lokalni folder i hosting, a podešavanja pristupa ostaju dostupna. Prazni redovi u tekstu agenta svode se na običan prelazak u novi red; sadržaj fenced code blokova i izvorna istorija ostaju sačuvani.

Podešavanje hostinga otvara se jednim velikim dugmetom ispod podataka sajta. Provera sačuvane veze nalazi se u prozoru podešavanja i tamo prikazuje rezultat.

## Memorija projekta

Pre svakog zadatka server učitava koreni `README.md` i prosleđuje ga agentu kao projektnu dokumentaciju. Agent dobija obavezu da ga pročita pre rada i posle stvarnih izmena dopiše datum, opis i rezultat provere u odeljak „Istorija izmena”, uz očuvanje ostatka dokumenta. Ako README ne postoji, agent ga pravi pri prvoj izmeni. Pitanja bez izmena ne prave stavke istorije. README ne sme biti simbolički link i može imati do 1 MB.

Panel ne čuva transkripte ni ID-jeve CLI sesija u `projects.json`; ranije sačuvani razgovori uklanjaju se iz tog fajla pri pokretanju nove verzije. Sam CLI ili njegov pružalac može imati sopstvenu istoriju, kojom panel ne upravlja. Učitavanje README-a je sprovedeno u serveru; tačnost opisa koje agent dopisuje zavisi od agenta i provere korisnika.

## Automatsko upravljanje kontekstom

Pre svake poruke izabrani CLI posebno procenjuje nastavak teme na osnovu nove poruke i poslednjih osam poruka (do 2000 znakova po poruci). Procena ne treba da koristi alate. Codex i Claude procenu rade sa ograničenim pravima; za Grok i Antigravity trenutni adapter nema odvojen režim ograničenih prava, pa je zabrana alata uputstvo. Prva poruka, promena teme ili najmanje 30 minuta neaktivnosti između zadataka otvaraju novu sesiju. Nema pozadinskog tajmera koji prekida aktivni zadatak. Neispravna odluka prekida rad uz grešku, bez izvršavanja korisničkog zadatka.

Pre promene postojeće sesije program šalje dodatan prompt za beleženje u README. Nova sesija dobija aktuelni README i samo kratak relevantan kontekst procene (do 1500 znakova). Posle svakog uspešnog radnog odgovora program dodatnim CLI promptom proverava da li su izmene zabeležene. Unutar dužeg zadatka agent dobija pravilo da beleži svaki završeni korak; program ne proverava svaki pojedinačni alat. Zaustavljanje može ostaviti nedovršenu belešku, a greška beleženja prikazuje se kao greška zadatka uz postojeći odgovor.

Svaka poruka zato koristi najmanje tri CLI poziva: procenu, rad i proveru beleške. Nova tema uz postojeću sesiju dodaje još jedan poziv pre prelaska. To troši više vremena i limita. Pružalac upravlja svojim kešom; program bira nastavak ili novu CLI sesiju, ne briše niti garantuje sadržaj keša. Procena teme i sažetak mogu pogrešiti; README ostaje trajna referenca.
