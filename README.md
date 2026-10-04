# Agent Desk: lokalni prototip

Osnovni interfejs za četove sa Codex CLI, Claude Code, Grok Build i Antigravity CLI. Pokreće lokalne CLI alate i koristi njihove postojeće prijave; ne traži API ključ. Model i dostupnost zavise od naloga i CLI podešavanja.

## Pokretanje

Potrebni su Node.js 20+ i odgovarajući CLI u PATH-u ili u standardnim korisničkim folderima.

```sh
npm install
npm start
```

Otvori http://127.0.0.1:4317. Za drugi port: `PORT=4318 npm start`.

Na macOS-u možeš dvokliknuti `Pokreni Agent Desk.command`. Terminal ostaje otvoren dok aplikacija radi. Ctrl+C zaustavlja server i aktivne CLI procese.

## Uključeno

- Kreiranje, preimenovanje i brisanje četova.
- Izbor agenta, modela i nivoa razmišljanja u popup-u četa; globalna podešavanja određuju podrazumevane vrednosti. API zadržava radni folder, pristup i dodatna uputstva po četu.
- Full access je podrazumevan: agent može da pokreće komande i menja lokalne fajlove bez potvrde.
- Codex i Claude nude samo čitanje. Grok adapter trenutno podržava samo Full access.
- Codex koristi sopstveni sandbox za samo čitanje. Claude ograničava ugrađene alate na Read/Glob/Grep i isključuje MCP za taj režim; to nije OS sandbox. Izvorne CLI konfiguracije i hook-ovi ostaju pod kontrolom CLI-ja.
- Prikaz odgovora i aktivnosti, dugme Zaustavi i nastavak CLI sesije.
- Četovi i podešavanja ostaju u `data/chats.json`, uključujući ID-jeve CLI sesija. CLI-jevi mogu zasebno čuvati svoje sesije.
- Klik na drugog agenta menja agent u istom četu. Zasebno dugme za grananje pravi kopiju sa oznakom ⧉ i novom CLI sesijom. Novi agent dobija svoje podrazumevane modele i reasoning.
- Tvoje poruke su desno u blagoj plavoj boji, odgovori agenta su levo. Enter šalje poruku, Shift+Enter dodaje novi red. Klik na logo otvara opcije četa. Promena foldera ne premešta postojeće fajlove.
- Lokalni server sluša samo na 127.0.0.1 i proverava Host i Origin za izmene.

## Ograničenja prve verzije

Antigravity koristi instalirani `agy` CLI i njegovu postojeću prijavu u sistemskom keychain-u. Adapter podržava Full access, NDJSON odgovore i nastavak izabrane sesije. Za promenu naloga pokreni `agy` u terminalu i koristi `/logout`, pa nastavi zvaničnu Google prijavu. Prijava se obavlja u zvaničnom CLI/browser toku, bez unosa lozinke ili API ključa u Agent Desk.

Ovo su osnovna podešavanja po četu, a ne editor svih izvornih podešavanja svakog CLI-ja. CLI učitava sopstvenu konfiguraciju, pravila i integracije prema svom načinu rada; prijave i konfiguracioni fajlovi se ne kopiraju u aplikaciju. Dodatna uputstva se šalju uz svaku poruku. Model se unosi kao ID koji tvoj CLI podržava; prazno polje koristi njegov podrazumevani model. Nivo razmišljanja takođe mora biti podržan izabranim modelom.

Codex prikazuje tekst po završenim porukama; Claude i Grok podržavaju inkrementalne tekstualne događaje. CLI greške i problemi prijave prikazuju se u četu. Instalacija CLI-ja se prikazuje kao „CLI pronađen“; to nije potvrda aktivne pretplate ili prijave.

Nema još priloga, uređivanja MCP/skills konfiguracije, grafičkih zahteva za odobrenje alata. U režimu samo čitanja radnje koje traže potvrdu se odbijaju. Brisanje četa briše zapis u ovoj aplikaciji; ne briše izvornu CLI sesiju.

## Provera

```sh
npm test
```

Integracioni test koristi izolovan lažni CLI da proveri nastavak sesije, nezavisnost četova, čuvanje na disku, blokiranje paralelnih poruka, zaustavljanje procesa i proveru porekla zahteva.

Codex povezivanje se zasniva na lokalnom `codex exec --help` i [zvaničnoj dokumentaciji za non-interactive režim](https://developers.openai.com/codex/noninteractive/).

## Interfejs

Na vrhu leve strane su četiri ikonice za novi čet. Ako je aktivni čet prazan i nema CLI sesiju, izbor drugog agenta menja taj čet i zadržava nacrt poruke. Svaki čet zauzima jedan red sa naslovom i logom aktivnog agenta. Hover prikazuje agenta i izabrani podmodel; ako CLI model još nije poznat, prikazuje „Podrazumevani CLI model“.

Klik na logo otvara popup centriran uz karticu, sa ostala tri agenta, kantom, modelom i podržanim reasoning nivoima. Uz ivice ekrana položaj se prilagođava dostupnom prostoru. Klik na drugog agenta menja isti čet, bez kopiranja. Dugme za grananje pored kante pravi zasebnu kopiju sa vidljivim porukama i novom CLI sesijom. Red čekanja se ne kopira. Promena podmodela unutar istog agenta čuva native sesiju i važi za sledeću poruku. Promene modela su blokirane dok agent radi.

Dvoklik ili dug pritisak na naslov otvara preimenovanje. Kada je popup otvoren, dovoljan je jedan klik na naslov. Enter ili izlazak iz polja čuva naziv; Escape odustaje.

Kartica je žuta dok agent radi i plava kada postoji nepročitan terminalni odgovor. Otvaranje četa uklanja obaveštenje. Nema rotirajućih oznaka. Novo stanje odgovora u aktivnom vidljivom četu smatra se pročitanim.

Unos počinje u jednom redu, raste do pola visine ekrana i potom dobija unutrašnji skrol. Fokus ostaje nakon slanja; tokom odgovora može da se priprema sledeći tekst. Enter šalje, Shift+Enter dodaje novi red. Slanje sledeće poruke čeka završetak tekućeg odgovora.

Globalna podešavanja dole levo čuvaju model i reasoning po agentu u `data/defaults.json`. Važe za nove četove i kopije. Postojeći četovi zadržavaju svoja podešavanja. Detalji kataloga su u [docs/model-selection.md](docs/model-selection.md).

Markdown tabele, liste, naslovi i kod prikazuju se automatski. Ikonica za kopiranje čuva originalni tekst. Logotipi su iz [Lobe Icons](https://github.com/lobehub/lobe-icons), verzija 1.95.1; licenca i izvori su u `public/icons`.

Svaki odgovor beleži model podešen pri slanju, ili stvarni model ako ga CLI prijavi. Stare poruke bez model metadata prikazuju da model nije prijavljen; ne pripisuje im se sadašnji model četa. Podrazumevano boju agenta koristi samo mala oznaka modela; opcija „Boja odgovora“ bira oznaku ili ceo tekst. Čuva se u browser localStorage-u. Globalna podešavanja su centrirana u glavnom prostoru, uz vidljiv sidebar.

Završni CLI događaj čuva ulazne, izlazne, keširane i reasoning tokene kada su dostupni. Codex `turn.completed.usage` je zbir native sesije: `usageTotal` čuva sirovi zbir, a `usage` čuva razliku u odnosu na prethodni zbir iste sesije. Stari zapisi bez pouzdane osnove označeni su kao „Zbir sesije“; negativne razlike ili nedostajuća polja takođe ostaju označeni kao zbir umesto da se izmisli potrošnja odgovora. Podaci se ne procenjuju prema broju znakova i nisu prikaz pretplatničkog limita ili računa. Codex ulaz već uključuje keš; Claude i Grok keš izdvajaju od nekeširanog ulaza. Za Antigravity se prikazuju prijavljena polja bez pretpostavke o preklapanju. Claude usage pokriva glavni agent loop, bez subagenata. Rezultat se prikazuje uz odgovarajući odgovor, nakon završnog događaja; prekid može ostaviti usage nedostupnim. Tokeni same istorije nisu odvojeno prijavljeni. Hover nad brojevima prikazuje objašnjenje.

## Prenos istorije i tokeni

Kreiranje zapisa četa ili kopije ne šalje prompt modelu. Pri prvoj poslatoj poruci novom agentu prototip prenosi istoriju uz skraćivanje velikih starih blokova, dodatna uputstva i novu poruku. Ne prenosi skriveno razmišljanje ili native stanje alata. Agent pokreće novu native sesiju. Nastavak koristi native ID. Svaki agent čuva i pokazivač poslednje vidljive poruke: povratak u raniju sesiju prenosi samo poruke nastale od njegovog prethodnog odgovora. Nova grana bez native sesije prenosi vidljivu istoriju uz skraćivanje.

Radni folder ostaje isti, pa novi agent ima pristup istim projektnim fajlovima i učitava pravila prema svom CLI-ju. Sadržaj svih fajlova nije automatski dodat promptu. Prethodni rezultati komandi i sadržaj pročitanih fajlova nisu preneti. Uz svaki odgovor se ipak čuva spisak aktivnosti (`actions`): izmenjeni fajlovi, pokrenute komande sa kodom greške i nazivi ostalih alata. Taj spisak ide uz odgovor u tekstu prenosa, samo kao nazivi, bez izlaza: najviše 20 poslednjih komandi po odgovoru, a ostali alati sabrani kao `Read ×5`. Codex daje komande i fajlove iz `item.completed`, Claude i Grok iz `tool_use` blokova, Antigravity samo nazive alata. Stari odgovori nemaju ovaj spisak. Automatski rezime projekta još nije implementiran; za pouzdan prenos korisno je zajedničko uputstvo sa ciljem, trenutnim stanjem, odlukama, bitnim putanjama, proverama i sledećim korakom.

Zbog toga dug razgovor pri prelasku na drugi agent troši ulazne tokene za istoriju, uz native sistemska uputstva, alate i generisani odgovor. Tačan broj zavisi od tokenizacije ciljnog modela, context obrade, alata i keširanja. CLI pretplatnički limiti i eventualni usage credits ostaju pod kontrolom prijavljenog naloga.


## Vreme, red čekanja i okruženje

Svaka nova poruka prosleđuje ISO UTC vreme i autora. Preneta istorija uključuje model odgovora kada je poznat. Poruke iz reda imaju vreme kreiranja i vreme stvarnog slanja agentu. U interfejsu je diskretno lokalno vreme uz poruku.

Command+Enter (Ctrl+Enter na drugim sistemima) stavlja tekst u serverski red četa, do 10 poruka. Poruke idu redom posle završetka prethodnog odgovora. Stop, CLI greška i restart pauziraju preostali red; „Nastavi red čekanja“ ga nastavlja. Pending tekst može da se ukloni. Običan Enter šalje samo kada čet ne radi. Agent/model se određuju pri slanju poruke iz reda.

Agent dobija kratak opis Agent Desk okruženja, ID četa, radni folder i lokalni protokol za podzadatak. POST `/api/chats/ID/delegate` sa `agent` i `task` pravi zaseban podčet u istom folderu; GET `/api/chats/ID` vraća stanje i odgovor. Zahtevi za upis zahtevaju lokalni Origin header. Podčet ima oznaku ↳, najviše dva po roditeljskom odgovoru, bez daljeg delegiranja. Roditelj treba da pročita odgovor preko API-ja i objedini ga. Native agent može imati sopstvene subagente nezavisno od ovog mehanizma. Ne kreiraju se podfolderi i ne prenosi se automatski cela istorija roditelja: roditelj navodi potreban kontekst u zadatku.

## Procena prenosa i telefon

Popup prikazuje grubu veličinu vidljive istorije. Hover na drugom agentu prikazuje procenu dopune njegove sesije i dodatnih chat uputstava. Koristi se raspon 2–6 znakova po tokenu, bez ciljnih tokenizera; raspon nije garantovana granica. Native pročitani fajlovi, alati, sistemska uputstva i novi odgovor nisu izmereni ovim brojem. Nije prikaz veličine native context window-a. Keš se ne može unapred garantovati. Pretplate nemaju jedinstvenu cenu u dolarima po tokenu, pa UI ne prikazuje izmišljenu novčanu cenu prenosa.

Mobilni pristup radi preko Tailscale prijave opisane ispod. Google Drive sinhronizacija nije uključena. Telefon je browser klijent istog servera preko autentifikovane privatne veze; CLI-jevi, projekti i native sesije ostaju na računaru. Drive bi čuvao arhivu vidljivih poruka i metadata, bez credentials. Za nastavak na drugom računaru potrebni su i projektni fajlovi i kompatibilne native sesije; sama JSON arhiva ih ne zamenjuje. Provider prompt cache je serverski podatak i ne prenosi se kroz Drive.

## Prenos konteksta

Pri prelasku drugom agentu prenose se vidljive poruke sa autorom, modelom i vremenom, uz spisak aktivnosti svakog odgovora. Povratak postojećoj native sesiji prenosi samo poruke koje taj agent još nije primio.

Ručna predaja (dugme **Predaja**, polja `handoff` i `handoffDraft`) uklonjena je 04.10.2026. Glavni razlog prelaska je potrošen limit prvog agenta, a tada on ne može da napiše predaju. Pun prenos dugog četa od 72 poruke bio je oko 20.000 tokena (Gemini `countTokens`), što je dovoljno malo. Stari četovi mogu još da imaju ta polja; aplikacija ih zanemaruje, a ranije potrošnje predaje ostaju u obračunu.

Samo u tekstu za prenos, pre poslednjih šest poruka, zatvoreni fenced blokovi sa najmanje 40 redova ili 2.000 znakova i Markdown tabele sa najmanje 12 redova podataka ili 2.000 znakova zamenjuju se jednim redom sa vrstom i brojem redova. Originalne poruke u `data/chats.json` se ne menjaju. Iznad unosa i u meniju prikazane su procene prenosa sa skraćivanjem i bez njega (raspon 2–6 znakova po tokenu, uz instrukcije četa). Nova poruka, opis aplikacije, native CLI kontekst i alati nisu deo ove procene; keš nije garantovan.

## Linkovi, zapis i kopiranje

- Ikonica za kopiranje u meniju kartice kopira adresu `/#chat=<id>`. Otvaranje linka ili promena hash-a bira konkretan čet.
- **Prikaži u Finderu** poziva `/usr/bin/open -R` za `data/chats.json` na macOS-u.
- **Otvori zapis četa** prikazuje JSON samo tog četa u tekstualnom polju koje je samo za čitanje.
- Obe serverske radnje zahtevaju POST, lokalnu adresu klijenta `127.0.0.1`, dozvoljen Host i odgovarajući Origin. Klijent ne prosleđuje putanju do fajla.
- Svaki Markdown blok koda ima kopiranje u gornjem desnom uglu: kopira samo sadržaj, bez ograde i jezika, uz kratku potvrdu. Kopiranje cele poruke ostaje dostupno.

Polje `transferPending` je opciono. Postojeći četovi ne zahtevaju konverziju. Testovi pokrivaju skraćivanje, poslednjih šest poruka, neizmenjenu istoriju, spisak aktivnosti i pristup zapisu.

## Prikaz podagenata

Leva kolona je podeljena na listu četova gore i lista direktnih podagenata ispod, bez dodatnog naslova, samo kada izabrani čet ima direktne podagente. Glavni četovi i podagenti drugih četova se ne prikazuju. Kada se otvori podagent, panel prikazuje njegove podagente; ako ih nema, ceo odeljak se sakriva. Strelica u zaglavlju podčeta vraća na roditelja, a njegov logo otvara opcije. Ikonice podagenata se ne prikazuju ispod kartica u glavnoj listi. Kartica prikazuje logo levo i naslov desno, bez broja podagenata. Klik na podagenta u panelu otvara njegov čet; ponovni klik otvara opcije. Podčet čiji je roditelj obrisan ostaje samostalno dostupan. Ručno napravljene grane se ne grupišu kao podagenti.

## Kopiranje glavnog četa i organizacija podagenata

Kopiranje linka samo kopira adresu istog četa. Pravljenje grane kopira poruke i podešavanja u zaseban čet; ne pravi kopije podčetova i ne prenosi njihovo roditeljstvo na novu granu. ID-jevi i linkovi napisani u porukama ostaju doslovno i upućuju na originalne podčetove. Za API pristup postojećem podčetu koristi njegov originalni ID.

Svi zapisi su u `data/chats.json`, povezani preko `parentChatId`. Podagenti imaju zasebne native sesije, ali dele roditeljski radni folder; nema automatskih podfoldera ni izolovanih radnih kopija. Trenutno je dozvoljen jedan nivo delegiranja, do dva aktivna podagenta i do dva podčeta po odgovoru roditelja. Podagenti Agent Deska ne mogu da otvaraju svoje podagente kroz ovaj API. Native CLI subagenti su zaseban mehanizam i nisu automatski kartice Agent Deska.

Zasebna koordinacija je uklonjena iz interfejsa i servera. Ranije poruke i postojeći `data/coordinations.json`, ako postoji, ostaju arhiva; ne pokreću se i ne menjaju.


## Lokacija aplikacije i podataka

Cela aplikacija je u `/Users/milev051/Desktop/Agent Desk/`. Dvoklik na `Pokreni Agent Desk.command` u ovom folderu pokreće lokalni server. Četovi, native ID-jevi i veze podagenata čuvaju se u `data/chats.json`, a globalni modeli i reasoning u `data/defaults.json`. Preneta je i arhiva prethodne koordinacije ako je postojala. Novi četovi podrazumevano koriste novi folder aplikacije; ranije podešene putanje u njenom starom folderu su ažurirane.

Na prethodnoj lokaciji ostao je samo simbolički link ka novom folderu, da putanje koje su agenti ranije napisali u porukama ostanu dostupne. Tekst poruka, ID-jevi, predaje i native sesije nisu prepisivani. CLI prijave i interni zapisi sesija ostaju u standardnim folderima odgovarajućih CLI alata. Premeštanje Agent Deska ne menja podatke same aplikacije AionUi.


## Panel agenata i automatski naslovi

Dugme **Agenti** dole levo otvara dodatni panel uz listu četova. Prikazuje samo direktne podagente trenutno izabranog četa, sa nazivom zadatka. Žuta tačka označava rad, plava nepročitan odgovor, siva završetak. Klik otvara čet, ponovni klik izabranog otvara njegove opcije. Panel se može sakriti; izbor ostaje u browseru. Na manjim ekranima otvara se preko glavnog prostora. Pozadina aplikacije i četa je potpuno crna.

Agenti znaju kako da pokrenu podagenta jer uz poruku dobijaju opis okruženja i lokalnog API-ja. Protokol nije zaseban alat modela: CLI agent izvršava HTTP zahtev preko svog terminala. POST `/api/chats/ID/delegate` sada prihvata opciono `name`, npr. `{"agent":"codex","name":"Provera testova","task":"Proveri ..."}`. Takav naziv se čuva i ne menja automatski. Bez naziva koristi se zadatak, a zatim Gemini naslov ako je uključen.

Automatski naslovi su uvek uključeni kada postoji ključ. Koristi se samo [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). Dugme **Proveri** čuva ključ i proverava dostupnost modela. Sačuvani ključ se u polju predstavlja tačkicama, bez slanja ključa pregledaču. Klik selektuje tačkice za zamenu; prazan unos zadržava sačuvani ključ. [Google kvote i cene](https://ai.google.dev/gemini-api/docs/pricing) zavise od projekta i njegovog Free/Paid Tier statusa; aplikacija ne uključuje naplatu.

Naslov nastaje u pozadini nakon prve poruke, kada postoji tema. Jedan API poziv šalje najviše 2.000 znakova zadatka i, za podagenta, najviše 160 znakova roditeljskog naslova. Ne šalje celu istoriju ili fajlove. Prepoznatljivi API ključevi iz ovog kratkog teksta se izostavljaju. Ručno preimenovanje i ime zadato podagentu uvek imaju prednost. Greška, timeout ili kvota ostavljaju postojeći naslov i ne prekidaju CLI odgovor. Stari četovi se ne preimenuju automatski. `titleGeneration` čuva status, model i prijavljenu potrošnju samo ovog poziva, odvojeno od potrošnje CLI odgovora.

`data/title-settings.json` čuva samo uključivanje i model. Ključ se čuva van aplikacije, u `~/.config/agent-desk/google-api-key`, sa pravima 600, u folderu sa pravima 700. API vraća samo da li je ključ podešen, nikada njegovu vrednost. Prazno polje zadržava sačuvani ključ; novi unos ga zamenjuje. POST/PUT imaju postojeće Host/Origin provere. `AGENT_DESK_CONFIG` može da izdvoji lokaciju ključa za testove. Testovi koriste lokalne lažne CLI-jeve i mock Google odgovore, bez korisničkog ključa ili potrošnje pretplate.


## Potrošnja po modelu, četu i projektu

Iznad poruka stoji diskretan sklopivi pregled potrošnje. Otvaranje prikazuje modele za ovaj čet, zbir sa njegovim podagentima i zbir projekta. Podagenti u panelu **Agenti** prikazuju samo ukupan broj tokena i API procenu. Keš, ulaz, izlaz i pregled modela dostupni su kada se otvore detalji potrošnje njihovog četa. Detalji su podrazumevano sklopljeni i ponovo se sklapaju pri promeni četa. Globalna podešavanja uvek prikazuju **Potrošnja projekata**, za poređenje svih radnih foldera.

Projekat se određuje po `settings.cwd`, ne po naslovu ili putanjama koje se pominju u porukama. Novi odgovori čuvaju `usageCwd` pri pokretanju: kasnija promena foldera ne premešta staru potrošnju. Za starije zapise bez tog polja koristi se sadašnji folder četa, uz napomenu. Zbir obuhvata sačuvane četove; brisanje četa uklanja njegovu potrošnju iz pregleda. Nije evidencija potrošnje drugih CLI sesija van Agent Deska.

Ulaz je prikazan uključujući keš i upis keša. Codex keš se ne dodaje ponovo; kod Claude/Grok zbir uključuje njihov odvojeni keš. Ukupno je ulaz + izlaz, bez ponovnog dodavanja reasoning tokena koji su deo izlaza. Ako preklapanje keša nije poznato, prikazuje se raspon. Odgovori bez usage i stari kumulativni podaci bez pouzdane razlike prikazuju se kao nepotpuni, bez proizvoljnog sabiranja. Native CLI podagenti bez sopstvenog prijavljenog usage nisu zasebno izmereni.

Nova grana označava kopirane poruke i skrivene događaje sa `usageInherited`; kopija istorije ne predstavlja novu potrošnju. Za ranije grane koriste se originalna vremena poruka u odnosu na vreme kreiranja grane. Poruke ostaju netaknute. Skriveni pozivi za predaju iz ranijih verzija čuvaju se u opcionom `accountingEvents` i ostaju u zbiru. Gemini naslov ima sopstven model i usage i uključen je u pregled. Stariji podaci nemaju potpun zapis svih ranijih skrivenih poziva.

API vrednost je procena u USD prema **standardnim globalnim tarifama proverenim 04.10.2026**. Nije račun pretplate, preostali limit ili iznos za naplatu. Cene i linkovi su u `pricing.mjs`: [OpenAI](https://developers.openai.com/api/docs/pricing), [Claude](https://platform.claude.com/docs/en/about-claude/pricing), [Grok](https://docs.x.ai/developers/pricing), [Gemini](https://ai.google.dev/gemini-api/docs/pricing). Kratki/dugi kontekst daju raspon jer CLI zbir više poziva ne otkriva veličinu svakog prompta. Claude upis keša koristi raspon 5 minuta/1 sat kada trajanje nije prijavljeno. Gemini 3.6/3.7/3.8 Flash uzima zvaničnu promotivnu cenu do 31.12.2026 i objavljenu višu cenu od 01.01.2027 prema vremenu odgovora. Nema dodatnih naknada za alate, cache skladištenje, fast mode ili regionalni endpoint.

Nepotvrđeni modeli i promenljivi aliasi poput `opus` nemaju izmišljenu cenu. Prikazuje se poznati deo zbira uz oznaku **delimično** kada nedostaju podaci. Uključene su potvrđene tarife aktuelnih GPT-6 modela i GPT-5.6 Sol, Claude modela iz cenovnika, Grok 4.5/4.6/4.7 i Gemini Flash modela. Ostale tarife mogu se dodati posle provere tačnog API modela. `GET /api/usage` vraća zbir četova/projekata i izvore cena, uz postojeću Host proveru. Sažeci se računaju iz originalnih podataka i ne upisuju se kao nova kopija istorije u `chats.json`.

Testovi proveravaju keš, cost raspon, različite modele i foldere, kopije istorije, skrivene predaje, Gemini naslove i nepotpune podatke.


## Telefon preko Tailscale-a

Podešavanja se otvaraju ikonicom klizača pored četiri ikonice za novi čet. Odeljak **Telefon · Tailscale** na računaru prikazuje lokalno generisan QR i privremeni link. Link ima 256 nasumičnih bitova, važi 60 sekundi i može se iskoristiti samo jednom. Osvežava se dok su podešavanja otvorena. Uspela prijava daje sesiju do 24 sata, uz Secure/HttpOnly/SameSite=Strict cookie. **Odjavi telefone** odmah opoziva sesije i otvorene tokove događaja. Restart takođe opoziva sve prijave. Tokeni ostaju u memoriji, bez upisa u četove ili Git.

Računar i telefon moraju imati aktivan Tailscale. Agent Desk mora raditi na računaru, jer CLI agenti i fajlovi ostaju na njemu. Server 4317 ostaje samo na loopback adresi. Zaseban gateway 4319 štiti sve podatke i statičke fajlove sesijom; Tailscale Serve prenosi HTTPS zahteve do njega, unutar tailnet mreže. Nije korišćen Funnel. Host mora odgovarati Tailscale DNS nazivu računara; svaki POST/PATCH/PUT/DELETE mora imati tačan HTTPS Origin. Finder, tekstualni zapis četa, konfiguracija Google ključa i izdavanje novih QR prijava ostaju dostupni samo sa računara.

```sh
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=443 http://127.0.0.1:4319
```

Ako Tailscale zatraži uključivanje HTTPS Serve-a, završi njegov zvanični postupak. Za drugi Agent Desk port gateway podrazumevano koristi `PORT + 2`; može se zadati `AGENT_DESK_PHONE_PORT`. QR koristi macOS CoreImage kroz postojeći Swift alat, bez dodatnih npm modula. Kada taj alat nije dostupan, može se koristiti privremeni link. U pregledaču telefona prvo se prikazuje lista četova; klik otvara čet, a strelica vraća na listu. URL sa `#chat=<id>` otvara određeni čet odmah.

## Brojanje istorije

Raspon **Istorija ≈** je lokalna procena 2-6 znakova po tokenu. Dugme **Prebroj · Gemini** u meniju četa, nakon potvrde, šalje Google [countTokens](https://ai.google.dev/api/tokens) servisu vidljive poruke, vremena, modele i nazive aktivnosti. Sadržaji fajlova, izlazi alata i skrivena CLI sesija se ne šalju zasebno. Rezultat se čuva u novom opcionom polju `historyTokenCount` i prikazuje kao broj tokena **(Gemini)**. SHA-256 otisak teksta sprečava prikaz zastarelog broja nakon izmene istorije. Brojanje ne generiše odgovor i ne meri puni native kontekst; Claude/OpenAI mogu isti tekst tokenizovati drugačije. Nema automatskog slanja istorije Google-u.

## Verzije

Izvorni kod i README čuvaju se u privatnom repozitorijumu `milev051/agent-desk`. `data/`, četovi, rezervne kopije, lokalni ključevi i `node_modules/` nisu u Git-u. Git omogućava vraćanje koda; za vraćanje razgovora potrebna je zasebna lokalna rezervna kopija `data/`. Pre vraćanja koda zaustavi agente i server.


## Kartice na telefonu i pretplatnički limiti

Kartice imaju diskretnu sivu pozadinu, bez desnih ivica panela i bez pretrage. Logo otvara meni kartice, gde se sada kopira adresa četa. Kopiranje adrese ne kopira poruke i ne pravi novi čet. Na telefonu dugme u zaglavlju prikazuje ili skriva podagente; lista zauzima visinu svog sadržaja, najviše 28% ekrana, a duža lista se pomera. Bez podagenata nema tog dugmeta ili panela.

Dugme Nazad u mobilnom pregledaču vraća na početnu listu. Aplikacija održava lokalni unos istorije da ponovni običan povratak ostane na listi. Pregledač i dalje može preskočiti istoriju, zatvoriti tab ili napustiti stranicu; potpuno sprečavanje izlaska nije moguće.

Ispod ikonica za novi čet prikazan je **preostali procenat**, prvo za 5 sati pa za 7 dana. Grok ima samo nedeljni broj. Redosled je Codex, Claude, Antigravity, Grok. Tooltip navodi prozore i vreme očitavanja. Nedostupan podatak je `?`, bez izmišljene procene. Ovi brojevi su odvojeni od broja tokena i API procene troška.

`limits-reader.swift` koristi logiku očitavanja iz projekta Limiti i postojeće CLI prijave na macOS-u. Poziva odgovarajuće servise pretplate, ne šalje razgovore. Ključevi se ne vraćaju kroz `/api/limits` i ne upisuju u četove. Swift proces očitava sva četiri izvora paralelno na približno minut; `limits.mjs` čuva samo poslednji rezultat u memoriji. Na drugim sistemima podaci nisu dostupni. `AGENT_DESK_DISABLE_LIMITS=1` isključuje očitavanje; integracioni testovi koriste tu opciju.
