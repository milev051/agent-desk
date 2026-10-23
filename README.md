# Agent Desk: lokalni prototip

> **English:** Agent Desk is a local web app for macOS that runs and coordinates several AI coding agents (Claude Code, Codex, Grok, Antigravity) from one interface, on desktop or phone. It uses the CLIs' own logins, keeps chats, token usage and subscription limits, and lets one agent delegate subtasks to others. Built with Node.js and plain browser modules; the rest of this README is in Serbian.

Osnovni interfejs za četove sa Codex CLI, Claude Code, Grok Build i Antigravity CLI. Pokreće lokalne CLI alate i koristi njihove postojeće prijave; ne traži API ključ. Model i dostupnost zavise od naloga i CLI podešavanja.

## Pokretanje

Potrebni su Node.js 20+ i odgovarajući CLI u PATH-u ili u standardnim korisničkim folderima.

```sh
npm install
npm start
```

Otvori http://127.0.0.1:4317. Za drugi port: `PORT=4318 npm start`.

Na macOS-u dvoklikni `Agent Desk.app` u folderu aplikacije. Pokretač pokreće server u pozadini bez Terminal prozora i otvara zaseban Mac prozor sa ugrađenim WebView-om, sopstvenom ikonicom i nazivom u Docku. Pri pokretanju prozor popunjava dostupni ekran, uz prostor za Dock i gornju traku. Cmd+Q zatvara aplikaciju; server ostaje uključen za telefon i agente koji rade. Osvežavanje je Cmd+R, a kopiranje i lepljenje koriste standardne Mac prečice. Pokretač se pravi komandom `./launcher/build.sh`, bez dodatnih modula; `./launcher/build.sh --install` ga postavlja u `/Applications/Agent Desk.app`, uz vezu ka postojećem projektu i podacima; `Pokreni Agent Desk.command` otvara isti pokretač. Ako već radi jedna kopija (npr. ona iz `/Applications`), druga joj predaje čet iz obaveštenja i odmah se gasi, pa se otvara samo jedan prozor.

Pri prvom pokretanju server sam instalira čuvara (`watchdog.mjs`) u `~/Library/LaunchAgents/local.agent-desk.watchdog.plist`. macOS ga pokreće pri prijavi i svakog minuta. Čuvar posle prijave na Mac pokreće server, da telefon radi bez otvaranja aplikacije, restartuje server ako ne odgovara dva minuta, briše zaostale `launchctl submit` poslove `local.agent-desk.*` i gasi `/tmp/agent-desk-*restart*` skripte kad se server restartuje u krug. Kad nešto uradi, šalje Mac obaveštenje i piše u `~/.config/agent-desk/watchdog.log`. Na novom računaru dovoljno je klonirati repo, pokrenuti `npm install` i jednom otvoriti aplikaciju.

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
- Kratki odgovori agenata (do 5 redova sa Urađeno:, Proveri:, Pitanje:), tri Web Audio zvuka obaveštenja (gotovo, pitanje, greška) i sažeta obaveštenja u jednom redu za telefon i desktop.
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

Na vrhu su četiri grupe modela. Klik na model uvek pravi novi čet pod nazivom `Empty`; nov prazan čet se uklanja nakon izlaska iz njega. Prva poruka daje naslov prema svom tekstu. Ručno izabran naslov ostaje.

Duži pritisak na karticu otvara popup centriran uz karticu, sa ostala tri agenta, kantom, modelom i podržanim reasoning nivoima. Uz ivice ekrana položaj se prilagođava dostupnom prostoru. Klik na drugog agenta menja isti čet, bez kopiranja. Dugme za grananje pored kante pravi zasebnu kopiju sa vidljivim porukama i novom CLI sesijom. Red čekanja se ne kopira. Promena podmodela unutar istog agenta čuva native sesiju i važi za sledeću poruku. Promene modela su blokirane dok agent radi.

Običan klik bilo gde na kartici, uključujući logo i padding, otvara čet. Duži pritisak od 600 ms otvara meni i na telefonu i na računaru. Preimenovanje je ikonica u meniju; Enter čuva naziv. Dvoklik više ne otvara preimenovanje.

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


Nacrt poruke se odmah čuva na uređaju, a posle 500 ms bez kucanja sinhronizuje sa serverom i drugim otvorenim uređajima. Četovi sa nacrtom imaju sivu karticu, a aktivni agent zadržava žutu pozadinu i sivu oznaku. Nesinhronizovane izmene preživljavaju osvežavanje kroz lokalnu rezervnu kopiju; verzije na serveru sprečavaju tiho prepisivanje, a istovremene izmene se spajaju. Nacrti nisu poruke agentu i ne troše AI tokene.

## Vreme, red čekanja i okruženje

Svaka nova poruka prosleđuje ISO UTC vreme i autora. Preneta istorija uključuje model odgovora kada je poznat. Poruke iz reda imaju vreme kreiranja i vreme stvarnog slanja agentu. U interfejsu je diskretno lokalno vreme uz poruku.

Command+Enter (Ctrl+Enter na drugim sistemima) stavlja tekst u serverski red četa, do 10 poruka. Poruke idu redom posle završetka prethodnog odgovora. Stop, CLI greška i restart pauziraju preostali red; „Nastavi red čekanja“ ga nastavlja. Pending tekst može da se ukloni. Običan Enter šalje samo kada čet ne radi. Agent/model se određuju pri slanju poruke iz reda.

Agent dobija kratak opis Agent Desk okruženja, ID četa, radni folder i lokalni protokol za podzadatak. POST `/api/chats/ID/delegate` sa `agent` i `task` pravi zaseban podčet u istom folderu; GET `/api/chats/ID` vraća stanje i odgovor. Zahtevi za upis zahtevaju lokalni Origin header. Podčet se vidi u sidebaru; najviše dva rade istovremeno, bez daljeg delegiranja. Ukupan broj podčetova po odgovoru nije ograničen. Roditelj treba da pročita odgovor preko API-ja i objedini ga. Native agent može imati sopstvene subagente nezavisno od ovog mehanizma. Ne kreiraju se podfolderi i ne prenosi se automatski cela istorija roditelja: roditelj navodi potreban kontekst u zadatku.

## Procena prenosa i telefon

Popup prikazuje grubu veličinu vidljive istorije. Hover na drugom agentu prikazuje procenu dopune njegove sesije i dodatnih chat uputstava. Koristi se raspon 2–6 znakova po tokenu, bez ciljnih tokenizera; raspon nije garantovana granica. Native pročitani fajlovi, alati, sistemska uputstva i novi odgovor nisu izmereni ovim brojem. Nije prikaz veličine native context window-a. Keš se ne može unapred garantovati. Pretplate nemaju jedinstvenu cenu u dolarima po tokenu, pa UI ne prikazuje izmišljenu novčanu cenu prenosa.

Mobilni pristup radi preko Tailscale prijave opisane ispod. Google Drive sinhronizacija nije uključena. Telefon je browser klijent istog servera preko autentifikovane privatne veze; CLI-jevi, projekti i native sesije ostaju na računaru. Drive bi čuvao arhivu vidljivih poruka i metadata, bez credentials. Za nastavak na drugom računaru potrebni su i projektni fajlovi i kompatibilne native sesije; sama JSON arhiva ih ne zamenjuje. Provider prompt cache je serverski podatak i ne prenosi se kroz Drive.

## Prenos konteksta

Pri prelasku drugom agentu prenose se vidljive poruke sa autorom, modelom i vremenom, uz spisak aktivnosti svakog odgovora. Povratak postojećoj native sesiji prenosi samo poruke koje taj agent još nije primio.

Ručna predaja (dugme **Predaja**, polja `handoff` i `handoffDraft`) uklonjena je 04.10.2026. Glavni razlog prelaska je potrošen limit prvog agenta, a tada on ne može da napiše predaju. Pun prenos dugog četa od 72 poruke bio je oko 20.000 tokena (Gemini `countTokens`), što je dovoljno malo. Stari četovi mogu još da imaju ta polja; aplikacija ih zanemaruje, a ranije potrošnje predaje ostaju u obračunu.

Samo u tekstu za prenos, pre poslednjih šest poruka, zatvoreni fenced blokovi sa najmanje 40 redova ili 2.000 znakova i Markdown tabele sa najmanje 12 redova podataka ili 2.000 znakova zamenjuju se jednim redom sa vrstom i brojem redova. Originalne poruke u `data/chats.json` se ne menjaju. Iznad unosa i u meniju prikazane su procene prenosa sa skraćivanjem i bez njega (raspon 2–6 znakova po tokenu, uz instrukcije četa). Nova poruka, opis aplikacije, native CLI kontekst i alati nisu deo ove procene; keš nije garantovan.

## Linkovi, zapis i kopiranje

- Ikonica za kopiranje u meniju kartice kopira adresu `/#chat=<id>`. Otvaranje linka ili promena hash-a bira konkretan čet.
- **Prikaži u Finderu** poziva `/usr/bin/open -R` za čitljiv Markdown zapis tog četa u `data/cetovi` na macOS-u; za prazan čet pokazuje `data/chats.json`. Glavni čet koji ima podagente i svi njegovi podagenti su u zajedničkom podfolderu nazvanom po glavnom četu.
- **Otvori zapis četa** prikazuje JSON samo tog četa u tekstualnom polju koje je samo za čitanje.
- Obe serverske radnje zahtevaju POST, lokalnu adresu klijenta `127.0.0.1`, dozvoljen Host i odgovarajući Origin. Klijent ne prosleđuje putanju do fajla.
- Svaki Markdown blok koda ima kopiranje u gornjem desnom uglu: kopira samo sadržaj, bez ograde i jezika, uz kratku potvrdu. Kopiranje cele poruke ostaje dostupno.

Polje `transferPending` je opciono. Postojeći četovi ne zahtevaju konverziju. Testovi pokrivaju skraćivanje, poslednjih šest poruka, neizmenjenu istoriju, spisak aktivnosti i pristup zapisu.

## Prikaz podagenata

Leva kolona je podeljena na listu četova gore i lista direktnih podagenata ispod, bez dodatnog naslova, samo kada izabrani čet ima direktne podagente. Glavni četovi i podagenti drugih četova se ne prikazuju. Kada se otvori podagent, panel prikazuje njegove podagente; ako ih nema, ceo odeljak se sakriva. Na računaru strelica u zaglavlju podčeta vraća na roditelja, a njegov logo otvara opcije. Na telefonu nema zaglavlja; Nazad iz podčeta vraća na roditelja, a zatim na listu. Ikonice podagenata se ne prikazuju ispod kartica u glavnoj listi. Kartica prikazuje logo levo, naslov desno i model manjim slovima ispod naslova, bez broja podagenata. Klik na podagenta u panelu otvara njegov čet; duži pritisak otvara opcije. Pri brisanju samo roditelja podčet ostaje samostalno dostupan, bez nevažeće roditeljske veze. Ručno napravljene grane se ne grupišu kao podagenti.

## Kopiranje glavnog četa i organizacija podagenata

Kopiranje linka samo kopira adresu istog četa. Pravljenje grane kopira poruke i podešavanja u zaseban čet; ne pravi kopije podčetova i ne prenosi njihovo roditeljstvo na novu granu. ID-jevi i linkovi napisani u porukama ostaju doslovno i upućuju na originalne podčetove. Za API pristup postojećem podčetu koristi njegov originalni ID.

Svi zapisi su u `data/chats.json`, povezani preko `parentChatId`. Podagenti imaju zasebne native sesije, ali dele roditeljski radni folder; nema automatskih podfoldera ni izolovanih radnih kopija. Trenutno je dozvoljen jedan nivo delegiranja, do dva istovremeno aktivna podagenta. Ukupan broj podčetova po odgovoru nije ograničen; za sledeće zadatke roditelj čeka slobodno mesto i ponovo poziva delegate. Podagenti Agent Deska ne mogu da otvaraju svoje podagente kroz ovaj API. Native CLI subagenti su zaseban mehanizam i nisu automatski kartice Agent Deska.

Zasebna koordinacija je uklonjena iz interfejsa i servera. Ranije poruke i postojeći `data/coordinations.json`, ako postoji, ostaju arhiva; ne pokreću se i ne menjaju.


## Lokacija aplikacije i podataka

Cela aplikacija je u `/Users/milev051/Desktop/Agent Desk/`. Dvoklik na `Pokreni Agent Desk.command` u ovom folderu pokreće lokalni server. Četovi, native ID-jevi i veze podagenata čuvaju se u `data/chats.json`, a globalni modeli i reasoning u `data/defaults.json`. Preneta je i arhiva prethodne koordinacije ako je postojala. Novi četovi podrazumevano koriste novi folder aplikacije; ranije podešene putanje u njenom starom folderu su ažurirane.

Na prethodnoj lokaciji ostao je samo simbolički link ka novom folderu, da putanje koje su agenti ranije napisali u porukama ostanu dostupne. Tekst poruka, ID-jevi, predaje i native sesije nisu prepisivani. CLI prijave i interni zapisi sesija ostaju u standardnim folderima odgovarajućih CLI alata. Premeštanje Agent Deska ne menja podatke same aplikacije AionUi.


## Panel agenata i imena četova

Klik na glavni čet otvara njegov razgovor i prikazuje podčetove odmah ispod kartice, bez strelica i dodatnog reda „Agenti“. Podčetovi su vidljivi samo dok je otvoren njihov glavni čet ili jedan od njih; na početnoj listi su sakriveni. Žuta kartica označava rad, zelena nov nepročitan odgovor; čitanje se sinhronizuje između uređaja.

Agenti znaju kako da pokrenu podagenta jer uz poruku dobijaju opis okruženja i lokalnog API-ja. Protokol nije zaseban alat modela: CLI agent izvršava HTTP zahtev preko svog terminala. POST `/api/chats/ID/delegate` sada prihvata opciono `name`, npr. `{"agent":"codex","name":"Provera testova","task":"Proveri ..."}`. Takav naziv se čuva. Bez naziva koristi se početak zadatka. Čet se više ne preimenuje u pozadini.

Početno ime novog četa je početak prve poruke. Ručno ime ostaje. Google ključ i dalje služi samo za brojanje tokena u istoriji. Dugme **Proveri** čuva ključ i proverava dostupnost modela. Sačuvani ključ se u polju predstavlja tačkicama, bez slanja ključa pregledaču. Klik selektuje tačkice za zamenu; prazan unos zadržava sačuvani ključ. [Google kvote i cene](https://ai.google.dev/gemini-api/docs/pricing) zavise od projekta i njegovog Free/Paid Tier statusa; aplikacija ne uključuje naplatu.

Na telefonu, povlačenje nadole na vrhu liste četova ponovo učitava četove, foldere i vezu. Stranica se ne osvežava, pa ostaju otvoren unos i nacrti.

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

Podešavanja se otvaraju ikonicom klizača pored četiri ikonice za novi čet. Odeljak **Telefon · Tailscale** na računaru prikazuje lokalno generisan QR i privremeni link. Link ima 256 nasumičnih bitova, važi 60 sekundi i može se iskoristiti samo jednom. Osvežava se dok su podešavanja otvorena. Uspela prijava daje sesiju do 30 dana, uz Secure/HttpOnly/SameSite=Strict cookie. Za povratak koristi stalnu HTTPS adresu računara bez `/login#pair=...`, sačuvanu kao obeleživač. **Odjavi telefone** odmah opoziva sesije i otvorene tokove događaja. Restart zadržava važeće prijave. U `~/.config/agent-desk/phone-sessions.json` čuvaju se samo SHA-256 heševi sesija i rokovi, sa pravima 600, izvan četova i Git-a. Jednokratni QR token ostaje samo u memoriji. Otvaranje stare prijavne adrese sa važećim cookie-jem vraća u aplikaciju; istekao link ne prekida postojeću prijavu. Brisanje cookie-ja ili privatno pregledanje zahteva novu prijavu. Kad se odgovor završi, Mac nije aktivan, a prijavljenom telefonu je Tailscale isključen, Mac prikazuje obaveštenje „Telefon nije povezan“ (najviše na 30 minuta). Podčet koji uspešno završi ne šalje obaveštenje ni na Mac ni na telefon; greška i zaustavljanje se javljaju. Greška podčeta se dodaje u red roditeljskog četa i agent nastavlja čim je slobodan.

Računar i telefon moraju imati aktivan Tailscale. Agent Desk mora raditi na računaru, jer CLI agenti i fajlovi ostaju na njemu. Server 4317 ostaje samo na loopback adresi. Zaseban gateway 4319 štiti sve podatke i statičke fajlove sesijom; Tailscale Serve prenosi HTTPS zahteve do njega, unutar tailnet mreže. Nije korišćen Funnel. Host mora odgovarati Tailscale DNS nazivu računara; svaki POST/PATCH/PUT/DELETE mora imati tačan HTTPS Origin. Finder, tekstualni zapis četa, konfiguracija Google ključa i izdavanje novih QR prijava ostaju dostupni samo sa računara.

```sh
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=443 http://127.0.0.1:4319
```

Ako Tailscale zatraži uključivanje HTTPS Serve-a, završi njegov zvanični postupak. Za drugi Agent Desk port gateway podrazumevano koristi `PORT + 2`; može se zadati `AGENT_DESK_PHONE_PORT`. QR koristi macOS CoreImage kroz postojeći Swift alat, bez dodatnih npm modula. Kada taj alat nije dostupan, može se koristiti privremeni link. U pregledaču telefona prvo se prikazuje lista četova; klik otvara čet, a gest ili dugme Nazad pregledača vraća na listu. URL sa `#chat=<id>` otvara određeni čet odmah.

Stalna HTTPS adresa može da se instalira kao aplikacija, bez promene adrese: Safari → Podeli → Dodaj na početni ekran, ili Chrome na Androidu → ⋮ → Instaliraj aplikaciju. `manifest.webmanifest` i ikonice gateway daje i bez sesije, jer ih telefon pri instalaciji ponekad traži bez cookie-ja; ostali fajlovi i podaci ostaju zaštićeni. Ikonice se crtaju komandom `python3 launcher/icon.py`, koja pravi i `launcher/AppIcon.icns` za `Agent Desk.app`.

JSON odgovori, statički fajlovi i tok događaja šalju se gzip-om kad ga pregledač prihvata. Lista četova je tako oko tri puta manja. Pri otvaranju se uzima iz prve poruke toka događaja, pa se ne preuzima dvaput.

Posle prve pune liste tok događaja šalje samo izmenjene četove, a u njima samo nove ili promenjene poruke. Procene prenosa se računaju ponovo samo kad se čet promeni. Povratak u aplikaciju na telefonu otvara novu vezu i dobija punu listu, jer telefon u pozadini često prekine vezu bez greške.

Dugme **+** nudi fajl sa računara ili sliku ili fajl sa uređaja (galerija, fotoaparat, fajlovi). Slika zalepljena u polje za unos šalje se isto. Prilog se čuva u `data/prilozi/<čet>/`, do 25 MB, i povezuje kao obična putanja. Dugme sa strelicom šalje poruku, a dok agent radi stavlja je u red čekanja. Sakriven panel podagenata ostaje sakriven pri otvaranju drugih četova.

## Brojanje istorije

Raspon **Istorija ≈** je lokalna procena 2-6 znakova po tokenu. Otvaranje menija četa automatski šalje Google [countTokens](https://ai.google.dev/api/tokens) servisu vidljive poruke, vremena, modele i nazive aktivnosti. Sadržaji fajlova, izlazi alata i skrivena CLI sesija se ne šalju zasebno. Rezultat se čuva u novom opcionom polju `historyTokenCount` i prikazuje kao broj tokena **(Gemini)**. SHA-256 otisak teksta sprečava prikaz zastarelog broja nakon izmene istorije. Brojanje ne generiše odgovor i ne meri puni native kontekst; Claude/OpenAI mogu isti tekst tokenizovati drugačije. Automatsko brojanje je uključeno na zahtev korisnika. Bez Google ključa ostaje lokalna procena. Brojanje čeka završetak odgovora, koristi sačuvani rezultat dok se istorija ne promeni i spaja istovremene zahteve za isti otisak. Posle greške ne ponavlja isti poziv najmanje dva minuta.

## Verzije

Izvorni kod i README čuvaju se u privatnom repozitorijumu `milev051/agent-desk`. `data/`, četovi, rezervne kopije, lokalni ključevi i `node_modules/` nisu u Git-u. Git omogućava vraćanje koda; za vraćanje razgovora potrebna je zasebna lokalna rezervna kopija `data/`. Pre vraćanja koda zaustavi agente i server.


## Kartice na telefonu i pretplatnički limiti

Kartice imaju diskretnu sivu pozadinu, bez desnih ivica panela i bez pretrage. Cela kartica menja nijansu na hover, dodir i izbor. Logo otvara meni kartice, gde se sada kopira adresa četa. Kopiranje adrese ne kopira poruke i ne pravi novi čet. Na telefonu dugme pored unosa prikazuje ili skriva podagente; lista zauzima visinu svog sadržaja, do približno tri reda i najviše 28% ekrana, a duža lista se pomera. Noviji podagenti su pri dnu. Bez podagenata nema tog dugmeta ili panela.

Dugme Nazad u mobilnom pregledaču vraća na početnu listu. Aplikacija održava lokalni unos istorije da ponovni običan povratak ostane na listi. Pregledač i dalje može preskočiti istoriju, zatvoriti tab ili napustiti stranicu; potpuno sprečavanje izlaska nije moguće.

Ispod ikonica za novi čet prikazan je **preostali procenat**, prvo za 5 sati pa za 7 dana. Grok ima samo nedeljni broj. Redosled je Codex, Claude, Antigravity, Grok. Tooltip navodi prozore i vreme očitavanja. Nedostupan podatak je `?`, bez izmišljene procene. Ovi brojevi su odvojeni od broja tokena i API procene troška.

`limits-reader.swift` koristi logiku očitavanja iz projekta Limiti i postojeće CLI prijave na macOS-u. Poziva odgovarajuće servise pretplate, ne šalje razgovore. Ključevi se ne vraćaju kroz `/api/limits` i ne upisuju u četove. Swift proces očitava sva četiri izvora paralelno na približno dva minuta; odgovor 429 odlaže naredni poziv tom izvoru prema Retry-After ili najmanje deset minuta kada rok nije naveden; `limits.mjs` čuva samo poslednji rezultat u memoriji. Na drugim sistemima podaci nisu dostupni. Antigravity limit se čita samo iz pristupnog tokena koji `agy` već drži u Keychain-u; Agent Desk taj token ne obnavlja, jer bi za to morao da izvuče Google-ov ključ klijenta iz `agy` programa. Zato je Antigravity limit dostupan dok je `agy` radio u poslednjih sat vremena, a posle toga kartica prikazuje poslednje sačuvano očitavanje i poruku da treba pokrenuti `agy`. Antigravity prikazuje Gemini kvotu kada je dostupna; ako API vrati samo Claude/GPT grupu, prikazuje njene limite uz oznaku „Claude/GPT“. Kvota druge grupe se ne pripisuje modelu u četu; za nedostajuću kvotu stoji `?`. `AGENT_DESK_DISABLE_LIMITS=1` isključuje očitavanje; integracioni testovi koriste tu opciju.


## Izbor fajlova i brisanje

Dugme **+** desno u polju za poruku otvara pregled fajlova na računaru, uključujući pristup preko prijavljenog Tailscale telefona. Pregled se otvara preko celog browsera, počevši od Home foldera. Fajlovi i folderi su kartice, bez strelica i tačkica; folderi imaju svetliju pozadinu i izraženiji okvir. Putanja pri dnu ima klikabilne delove. Jedina ikonica pri dnu potvrđuje povezivanje trenutnog foldera. Nazad u browseru vraća jedan folder naviše, a iz Home foldera zatvara pregled i vraća prethodni prikaz aplikacije. Escape takođe zatvara pregled. Putanja se ne unosi ručno. Klik na fajl ili **Poveži folder** dodaje uklonjivu oznaku uz sledeću poruku. Izabrane putanje su odvojene za svaki čet. I obična poruka i red čekanja šalju samo proverene putanje, bez sadržaja fajlova. Agent ih čita kada zadatak to zahteva. Ovo nije upload sa telefona.

GET `/api/chats/ID/files?path=...` vraća imena običnih fajlova i foldera, najviše 500 stavki. Pregled je ograničen na korisnički i radni folder; skrivene putanje, Library, node_modules, privatni ključevi i symlink izlazi nisu dostupni. Server ponovo proverava sve putanje pri slanju, najviše 20. Ostaju postojeće Host/Origin provere i telefonska prijava.

Arhiviranje prikazuje **Arhiviraj ovaj čet** i, kada postoje podagenti, **Arhiviraj čet i podagente**. Cela grupa ne može da se arhivira dok neki njen agent radi. Pri arhiviranju samo roditelja sačuvani podčet dobija `formerParentChatId`, a aktivna roditeljska veza se uklanja. Zapisi se čuvaju u `data/archive/`, izvan Git-a, sa rokom od 30 dana od arhiviranja. Podešavanja sadrže **Arhivirani četovi**, preostale dane i vraćanje u listu. GET `/api/archive` daje pregled, a POST `/api/archive/ID/restore` vraća grupu i dostupne roditeljske veze. Istekli zapisi se trajno uklanjaju pri pokretanju, najkasnije na narednoj satnoj proveri tokom rada, ili pri otvaranju arhive. Stari `data/trash/` zapisi prelaze u arhivu sa rokom računatim od vremena prethodnog upisa. Nema dugmeta za poništavanje ispod četa. Na telefonu arhiviranje otvorenog četa vraća na listu.

Automatska tastatura na telefonu podrazumevano je isključena. Može se uključiti u globalnim podešavanjima; izbor se pamti samo u tom pregledaču. Fokus nakon slanja ostaje u unosu. Korisničke poruke su zelene. Podešavanja su peto dugme iste grupe za pokretanje agenata.

Sažetak potrošnje prikazuje nove i keširane tokene odvojeno i cenu u dolarima bez prefiksa API. Novi tokeni u sažetku uključuju novi ulaz, upis keša i izlaz; čitanje keša je izdvojeno. Kada CLI ne razdvaja preklapanje, prikazuje se raspon ili oznaka da novi ulaz nije razdvojen. Stari kumulativni zapisi i dalje imaju oznaku zbira sesije. Očitavanje pretplatničkih limita je na dva minuta; završeni odgovori ažuriraju lokalnu potrošnju kroz postojeći tok događaja, bez dodatnih poziva dobavljačima.


## Trenutna potvrda slanja, prazni četovi i nastavak rada

Enter odmah prazni unos i prikazuje poruku uz oznaku **Šalje se…**. Server čuva opcioni `requestId`; isti zahtev se ne izvršava dvaput. Kada stigne potvrda kroz tok događaja, privremena poruka se zameni sačuvanom bez dupliranja. Ako slanje nije prihvaćeno, tekst i povezane putanje se vraćaju u nacrt. Polje je niže, a ikonice su vertikalno centrirane. Potrošnja četa stoji neposredno iznad unosa.

Novi običan čet bez sadržaja automatski se uklanja pri prelasku u drugi čet, povratku na listu ili zatvaranju stranice, bez arhiviranja. Poruka, nacrt, prilog, ručni naslov ili podagenti čuvaju čet. Ranije sačuvani četovi, Dispečer i Procesi se ne uklanjaju. Server proverava trenutno stanje kroz POST `/api/chats/ID/discard-empty`, pa sadržaj dodat u međuvremenu sprečava brisanje. Bez mreže čet ostaje sačuvan.

Agent uz zadatak dobija ID-jeve, nazive i stanje postojećih direktnih podčetova. Završetak ili restart CLI procesa ne briše njihovu sesiju. POST `/api/chats/RODITELJ/delegate` sa `{"childId":"POSTOJEĆI_ID","task":"Nastavi..."}` šalje novu poruku istom podagentu, sa njegovom istorijom i native sesijom. Proverava se roditeljstvo i da podagent već ne radi. Za isti zadatak agent dobija instrukciju da nastavi postojeći podčet; novi podčet ostaje moguć za nov zadatak. Native CLI podagenti nisu isto što i podčetovi Agent Deska.

## Lokalni linkovi i pozadinsko pokretanje

Linkovi do `/Users/...`, `/Volumes/...` i `file://...` u porukama postaju veze do lokalnih fajlova. Na računaru klik poziva lokalni POST `/api/open-file`, pa macOS otvara originalni fajl. Na telefonu se fajl prikazuje u izolovanom iframe-u. `/files/Users/...` služi fajl sa postojećim Host proverama i telefonskom prijavom; stari pogrešni HTTP link `/Users/...` sada takođe radi. HTML ima sandbox CSP i ne može pristupiti četu ili Google ključu; neki programi koji zahtevaju localStorage ili mrežne pozive neće imati sve funkcije u telefonskom pregledu. Izbor putanje ima ista ograničenja kao pregled foldera, a fajl je ograničen na 20 MB. Otvaranje preko macOS-a ostaje blokirano telefonskom gateway-u.

`Agent Desk.app` koristi korisnički launchd servis `local.agent-desk.server`. Konfiguracija je u `~/.config/agent-desk/server-launch.plist`, dnevnik u `data/server.log`; nema automatskog gašenja pri zatvaranju taba. Servis se ne registruje u folder za automatski start pri prijavi. Zaustavljanje: `launchctl kill SIGTERM gui/$(id -u)/local.agent-desk.server`; ponovno pokretanje kroz launcher.

Na ovom macOS-u Tailscale CLI iz pozadinskog servisa može vratiti poruku da GUI ne može da se pokrene. Potvrđeni privatni HTTPS origin zato je u `~/.config/agent-desk/phone-origin`, izvan Git-a. `AGENT_DESK_PHONE_ORIGIN` ima prednost. Računar i telefon i dalje moraju imati aktivan Tailscale i podešen Serve; link ne otvara javni pristup i ne menja proveru sesije, Host-a ili Origin-a. Posle promene Tailscale DNS naziva treba ažurirati sačuvanu adresu i restartovati servis.

Ikonica potvrde foldera koristi jednostavan simbol Enter. Prečice za posebne foldere nisu prikazane.


## Kartice, obaveštenja i kolone foldera

Podagenti su uz donju ivicu, sa kompaktnim karticama i skrolom za dužu listu. Model ostaje vidljiv na karticama, uključujući hover i izabranu karticu na telefonu. Potrošnja četa dostupna je u meniju kartice. Koriste se sačuvani CLI podaci, bez novih upita pretplati.

Kada aktivni agent završi, zaustavi se ili prijavi grešku, pojavljuje se obaveštenje u gornjem desnom uglu. Klik otvara njegov čet. U podešavanjima dugme **Obaveštenja u pregledaču** traži browser dozvolu za sistemska obaveštenja, korisna kada je tab u pozadini. Dostupnost zavisi od pregledača i OS-a; obaveštenja zahtevaju otvorenu stranicu, nema push servisa za zatvoren tab.

Na računaru pregled fajlova koristi kolone nalik Finderu: Home levo, ulazak u folder otvara njegov sadržaj u sledećoj koloni, horizontalni skrol za dugu putanju i zaseban vertikalni skrol u svakoj koloni. Izbor ranijeg foldera uklanja kolone desno. Telefon zadržava jednu listu kartica. Putanja pri dnu, Enter potvrda foldera i Nazad rade u oba prikaza.


Kartice četova i podagenata nemaju ikonice. Naslov ostaje beo, a naziv modela koristi boju agenta: Claude narandžastu, Codex ljubičastu, Grok belu i Antigravity plavu. Izbor i duži pritisak ostaju na celoj kartici. Kolone foldera pri prelasku u susedni folder zadržavaju zajedničke pretke i zamenjuju samo granu desno.

Kartice četova i podagenata imaju istu visinu od 46 px, sa jednim redom naslova i jednim redom za model. Potrošnja u meniju kartice piše kratko: `20.723n 37.970k`, gde n označava nove tokene, a k keširane. Hover menja samo pozadinu kartice, bez zamene modela ili pomeranja kartica.


Limiti pretplate se osvežavaju na dva minuta; otvaranje ili osvežavanje browsera samo čita serverski snimak i ne pravi novi upit provajderu. Claude 429 poštuje dužu pauzu koju server traži. Poslednji uspešni procenti ostaju sačuvani u `data/limits-cache.json`, zatamnjeni tokom greške; hover prikazuje vreme očitavanja, razlog i sledeću proveru. Raspored u `data/limits-cache.json.schedule` preživljava restart i sprečava prerano novo očitavanje. Oba zapisa sadrže samo javne metrike i rokove, bez kredencijala. Ako uspešno očitavanje još ne postoji, ostaje `?`, bez izmišljenih procenata.


## Izbor modela i očitane promene limita

Hover na gornjoj ikonici otvara meni modela za novi čet; klik radi i na telefonu. Klik na stavku pravi čet u izabranom agentu i modelu. Stavka Podrazumevani koristi globalno podešavanje. Prazan trenutni čet može da se prenameni bez gomilanja novih četova. Arhiviranje bez aktivnih podagenata odmah sklanja čet; samo četovi sa podagentima prikazuju izbor roditelj ili cela grupa.

`data/limit-history.json` čuva uzastopna uspešna očitavanja limita i njihove promene. Globalna podešavanja prikazuju poslednjih 100 promena; meni kartice poslednjih pet koje se vremenski poklapaju sa odgovorima tog četa ili njegovih podagenata. Beleže se vreme, 5h/7d procenti i ID-jevi odgovora, naslovi i modeli koji su radili u tom intervalu. Novi odgovori imaju `completedAt`, uz postojeći `createdAt`, da bi mogli da se povežu sa intervalom. Ne koristi se Gemini i nema dodatnih upita provajderima.

Ovo je korelacija očitanih promena, nije obračun koliko je konkretan odgovor potrošio pretplate. Očitavanja su na dva minuta ili ređe tokom pauze, a druge CLI sesije koriste isti limit. Reset prozora, rast preostalog procenta i zastareli podaci ne računaju se kao nova potrošnja. Pad može da bude registrovan i bez prepoznatog četa. Stari odgovori bez vremena završetka ne dobijaju izmišljenu atribuciju. Precizni tokeni koje CLI prijavi i dalje se čuvaju po odgovoru i modelu.


## Kopiranje poruka u Markdown

Kvadratić pored kopiranja poruke bira tu poruku. Može se odabrati više poruka, zatim **Kopiraj MD**, ili **Sve** za ceo čet. Poruke se kopiraju redosledom iz razgovora, sa autorom, modelom i ISO UTC vremenom; njihov originalni Markdown, tabele i blokovi koda ostaju netaknuti. **Struktura** uključuje izvorni čet, radni folder, povezane agente i podagente, stanja, ID-jeve i do 20 povezanih putanja. Sadržaji fajlova i native ID-jevi sesija se ne kopiraju. Meni kartice ima **MD** za kopiranje celog četa sa ovim pregledom. Kopiranje jednog odgovora i bloka koda i dalje radi kao ranije.

Agent pri svakoj novoj poruci dobija snimak strukture povezane grupe, modela i stanja podagenata, informaciju da li je sesija sačuvana, radni folder i povezane putanje. Snimak nije živo stanje tokom dugog rada, pa za promene nakon početka odgovora koristi postojeći GET API. Kopirani ID-jevi su reference na postojeće četove; eksport sam ne kreira nove podagente i ne daje kopiranom četu novu roditeljsku vezu.

Pri izboru modela automatski se bira Medium reasoning, a za GPT-6-Luna High. Modeli bez podrške za taj nivo koriste svoj CLI nivo. Ručni izbor u četu i globalna podešavanja ostaju dostupni.

Izbor podagenta zadržava njegove susedne kartice u sidebaru. Izabrana kartica je označena, a njeni podagenti se prikazuju uvučeno ispod nje. Lista se ne zatvara pri izboru podagenta bez potomaka.

Izbor prve poruke uključuje režim selekcije: klik bilo gde na poruku bira ili uklanja poruku; Shift+klik bira raspon. Command/Ctrl+A bira sve poruke, Command/Ctrl+C kopira izabrane kao Markdown, a Escape ili × zatvara izbor. Prečice ne preuzimaju unos teksta u poljima.

## Čitljivi fajlovi četova

`data/chats.json` ostaje glavni zapis aplikacije. U `data/cetovi` se automatski čuvaju Markdown kopije pojedinačnih četova, sa autorima, modelima, vremenom, strukturom podagenata i povezanim putanjama. Naziv je `Naslov -- ID.md`; postojeći Gemini ili ručni naslov se koristi bez dodatnog poziva. Preimenovanje četa menja naziv kopije, a ID ostaje isti. Zapis se osvežava najviše jednom u sekundi tokom odgovora. Prazni četovi nemaju Markdown kopiju. Ručne izmene kopija se ne uvoze u aplikaciju.

Arhivski JSON fajlovi imaju naziv `Naslov -- ID arhive.json`. Raniji nazivi koji sadrže samo ID preimenuju se pri čitanju; format i sadržaj zapisa, veze podagenata, vraćanje i rok od 30 dana ostaju isti. Pri arhiviranju grupe koristi se naslov prvog četa.

Ime korisnika (`Korisnik`) ili model odgovora prikazuje se uz vreme u podnožju poruke. Na telefonu selekcija se kopira dugmetom `Kopiraj MD` iznad razgovora; unutrašnji razmak u prikazu ne dodaje razmake u Markdown tekst.

Delegiranje ne treba zaobilaziti pokretanjem `grok -p`, `claude -p` ili drugog agentskog CLI-ja van Agent Deska: takvi procesi nemaju karticu, zapis ni potrošnju u aplikaciji. Za više od dva zadatka koristi se više uzastopnih grupa kroz `/delegate`; popunjen kapacitet vraća HTTP 409.

Ulazak u čet uklanja sva postojeća telefonska obaveštenja za taj čet, uključujući starija obaveštenja i izveštaje tokom rada. Klik na telefonsko obaveštenje takođe čisti ostala obaveštenja tog četa. Vreme ulaska čuva se na serveru i šalje povezanim uređajima; druga obaveštenja i kasniji odgovori ostaju. Ako je telefonska aplikacija zatvorena, čišćenje sa računara se primenjuje kada se aplikacija ponovo poveže. Ne šaljemo nevidljiv push za čišćenje jer Web Push zahteva prikaz obaveštenja, a Safari može opozvati dozvolu za silent push.

Telefon dobija i kratke tekstualne izveštaje tokom rada: tek kada posle novog teksta agent nastavi alatom. Uzastopni izveštaji se grupišu, najviše jedan u minutu i šest tokom jednog odgovora; završetak otkazuje odloženi izveštaj. Pozivi alata bez teksta ne šalju obaveštenja.

Iznad unosa je baterija drugog uređaja: telefon vidi Mac (pmset), računar poslednje stanje koje prijavi mobilni pregledač preko Battery Status API-ja. Provera je na 30 sekundi dok je stranica vidljiva; posle tri minuta bez prijave telefona stanje se označava kao ranije. Nema očitavanja telefona dok je aplikacija zatvorena i nema izmišljanja podatka ako pregledač ne podržava API.

Na telefonu traka za novi čet ostaje iznad liste i otvorenog razgovora. Uz ikonice je baterija Maca, sa oznakom ⚡ kada je na napajanju. Na računaru ista traka ostaje u sidebaru i pokazuje bateriju telefona.

Baterija je odmah posle Grok ikonice: Apple logo na telefonu, Android logo na Macu, sa procentom ispod. Procenat je zelen iznad 50%, žut od 21% do 50%, crven do 20%. Napajanje i vreme očitavanja su u opisu.

Klik na logo baterije otvara podešavanja. Novi folder se pravi prevlačenjem četa na polje koje se pojavi tokom prevlačenja, pa unosom naziva. Prazan naziv i Escape odustaju, bez premeštanja četa.

Kružić desno od unosa je džojstik: nagore šalje poruku ili je dodaje u red čekanja, nadole zaustavlja aktivnog agenta, ulevo otvara priloge. Radnja se izvršava pri puštanju, tek posle pomeranja od najmanje 22 px. Dodir bez pomeranja ne šalje poruku. Tekst unosa se normalno selektuje. Kada je kružić fokusiran, iste radnje rade strelicama tastature.

`data/statistika.json` je objedinjeni izvedeni zapis tokena, procene API cene po četu/modelu/projektu i promena limita. Ažurira se uz čitljive zapise četova i očitane promene limita. Agenti dobijaju putanju, sadržaj se ne šalje automatski u kontekst. Izvori ostaju `data/chats.json` i `data/limit-history.json`. U podešavanjima dugme „Otvori folder statistike“ otvara Finder i označava ovaj fajl; na telefonu je dostupno preuzimanje istog JSON fajla. Statističke tabele se više ne učitavaju u podešavanjima.

`data/prelasci.md` (i polje `handoffs` u `statistika.json`) za svaki prelazak u nov čet poredi prosečnu procenjenu cenu poslednja 3 odgovora starog četa sa prva 3 novog, uz razlog prelaska i da li je keš bio živ. Na dnu je zbir za poslednjih 7 dana po razlogu; po njemu se podešava pravilo automatskog prelaska (`handoff-report.mjs`).

Sam prelazak u nov čet gleda samo kontekst i keš: dok keš važi, prelazi se tek od `warmMinContext` (podrazumevano 150k), a kad je keš istekao od `coldMinContext` (50k). Broj poruka i dužina teksta ostaju samo ponuda. Pragovi su u `data/prilagodjavanje/prelazak.json`, uz granice koje server poštuje.

Oba menija u zaglavlju imaju dugme „Prilagođavanje“ za panel agenata i odobrenja. Kontekst agenta ostaje dostupan ispod polja za poruku i u podešavanjima.

**Prilagođavanje** (`adaptive.mjs`, panel `public/adaptive-panel.mjs`, folder „Prilagođavanje“ u listi četova odmah ispod „Poslednjih četova“): prilagodljivi agenti po projektu. Folder prikazuje sve četove agenata i predloga, dugme „Agenti i odobrenja“ otvara panel, a „+ Predlog za projekat“ ili desni klik na čet („Predloži prilagodljive agente za ovaj projekat“) otvara čet u kome agent proceni koje merenje projektu stvarno koristi i šalje 0 do 3 predloga (`POST /api/adaptive/agents`). Automatsko odobravanje je početno uključeno za sve projekte: novi predlozi i oni koji već čekaju postaju aktivni. U panelu „Agenti i odobrenja“ može se isključiti prekidačem „Automatski odobravaj predloge za sve projekte“; tada novi predlozi čekaju dugme „Odobri“. Pauzirani i odbijeni agenti se ne uključuju automatski. Posle svakog pokretanja agent sam bira sledeći termin (`PATCH /api/adaptive/agents/ID` sa `nextRun`, od 1 h do 30 dana); propušten termin kreće čim nijedan agent ne radi, ukupno najviše 6 pokretanja nedeljno. Svaki agent ima jedan čet i beleške u `data/prilagodjavanje/ID/istorija.md`; menja samo ono što piše u njegovom polju „adapt“, a kod i objavu upisuje kao predlog. Spisak je u `data/prilagodjavanje/agenti.json`; ugrađen agent „Prelazak u nov čet“ podešava `prelazak.json`.

### Jednokratna poruka agentima

U podešavanjima, „Kratka poruka agentima“ omogućava ručno slanje ili dnevni raspored po vremenu u Beogradu. Svi dani su podrazumevano uključeni. Dugmad Po, Ut, Sr, Če, Pe, Su i Ne biraju dane slanja i automatski čuvaju izmene. Isključivanjem svih dana raspored se zaustavlja, a ručno slanje ostaje dostupno. Svaki izabrani agent dobija zasebnu privremenu sesiju bez istorije radnih četova, sa zahtevom da odgovori samo OK. Sesija ne ulazi u listu četova, a završetak ne šalje obaveštenje. CLI može zadržati sopstveni zapis sesije.

Automatski izbor koristi poznate lakše modele iz dostupnog kataloga; ako takav model nije dostupan, agent se preskače uz grešku umesto pokretanja jačeg modela. Model se može izabrati i ručno. Slanje ide redom, sa najviše dva minuta po agentu i bez automatskih ponavljanja. Dnevni termin se izvršava jednom, uz najviše 15 minuta kašnjenja; Mac i server moraju raditi. Poziv troši limit, a njegov reset i deljenje kvote između modela određuje provajder.

Podešavanja i poslednjih 100 rezultata sa prijavljenom potrošnjom čuvaju se u `data/provera-agenata.json`.

### Povezivanje postojećih četova

Zadrži desnu polovinu kartice i prevuci čet na drugi čet. Prevlačeni čet postaje podagent ciljnog četa, sa svojim porukama, radnim folderom i CLI sesijama. Oba agenta moraju da miruju. Čet koji već ima podagente ne može postati podagent, a podagent ne može primati nove podagente.

Pri sledećem slanju podagent dobija opis nove uloge. Glavni agent prvo dobija poslednju završenu razmenu podagenta, a zatim samo nove poruke koje njegova konkretna sesija još nije dobila. Granica pročitanog se čuva tek posle uspešnog odgovora; nova sesija je poništava. Za celu istoriju agent može koristiti GET `/api/chats/ID`. Povezivanje se ne koristi za automatsko pokretanje agenata.

### Folder sa zajedničkim kontekstom

U meniju foldera uključi ikonicu „Zajednički kontekst agenata“. Zelena ikonica znači da članovi dobijaju razgovore jedni drugih pri sledećem slanju. Prvo se prenosi dosadašnja istorija; kasnije samo nove ili izmenjene završene poruke, uključujući zabeležene aktivnosti. Podagenti nasleđuju grupu glavnog četa. Obični folderi ne dele kontekst.

Evidencija heševa poruka i članstva čuva se u `data/chats.json`, u `sharedFolderReads`, odvojeno po primaocu i CLI sesiji. Sačuvana je tek kada odgovor uspe. Izlazak, isključivanje deljenja i brisanje foldera javljaju se pri sledećoj poruci; raniji kontekst ostaje u CLI sesiji. Povratak u isti folder sa istom sesijom ne prenosi staru istoriju ponovo. Nova sesija dobija istoriju ponovo. Grupe ne pokreću automatski članove i ne prave kopije četova.

### Izdvajanje podagenta

Kartica podagenta ima iste dve zone kao običan čet: zadrži levu polovinu za radnje, desnu za prevlačenje. U meniju je „Izdvoji podagenta u samostalan čet“. Tokom prevlačenja pojavljuje se i polje „Izdvoji podagenta“. Izdvojen čet ostaje u folderu glavnog četa; spuštanje na drugi folder bira taj folder, a na prazan deo liste ili „Van foldera“ izdvaja ga van foldera. Može se prevući i na drugog glavnog agenta. Poruke, sesije i evidencija deljenog konteksta ostaju sačuvane. Promena veze dozvoljena je kad uključeni agenti miruju.

Ikonice agenata otvaraju grupe modela klikom. Klik na karticu modela odmah pravi novi čet u Neraspoređenim, bez pitanja za folder. Čet se zatim može premestiti u folder ili povezati kao podagent. Kad agent završi, Agent Desk sam ne otvara njegov čet; javlja obaveštenje, a po podešavanju otvara samo ono na čemu je radio.

Svaki čet čuva vreme kreiranja i evidenciju otvaranja od uključivanja ove funkcije. Čitljivi zapisi u `data/cetovi` sadrže broj pristupa, datume pristupa i broj poslatih korisničkih poruka. Poruke se kopiraju kao `[datum, vreme] autor (model): tekst`, u zoni Europe/Belgrade, sa sačuvanim putanjama priloga. Raniji pristupi nisu rekonstruisani.

## Gmail

Gmail povezivanje, status i prekid veze su u opštim podešavanjima. Agenti mogu da čitaju i šalju mejlove, rade sa nacrtima, oznakama i prilozima kroz lokalni API uz odobrene Google dozvole. Drive, Tasks i Calendar podržavaju čitanje i upis. Za prvo povezivanje potreban je korisnikov Google OAuth Desktop app klijent. Postupak i ograničenja su u [docs/gmail.md](docs/gmail.md).

Google Drive, Tasks i Calendar: [podešavanje i API za agente](docs/google.md).

## Pregled aktivnosti

Planer može pregledati metapodatke preko `/api/planner/activity` i nove poruke preko `/api/chats/ID/changes`, sa ograničenjem veličine i granicom after. Detalji su u docs/agent-environment.md.

## Ažuriranje CLI agenata

Podešavanja imaju dugme „Ažuriraj agente“ i opciju automatskog ažuriranja jednom dnevno dok svi agenti miruju. Početno je automatsko ažuriranje isključeno. Instalacije preko npm ažuriraju isti paket u istom prefiksu, a native Claude/Grok/Antigravity koriste svoju update komandu. Neprepoznata instalacija Codexa zahteva ručno ažuriranje svojim upravljačem paketima. Tokom ažuriranja blokirani su novi CLI zadaci; rezultati i verzije su prikazani u podešavanjima. GET/PUT `/api/cli-updates` daje status i podešava `{auto:true/false}`; POST `/api/cli-updates/run` pokreće ažuriranje ili vraća 409 dok ima aktivnih agenata. Ovo nije restart servera.

## Za kasnije

- **Codex (ChatGPT pretplata) se vraća 13.10.2026.** Tada:
  - promeni podrazumevani Codex model u `data/defaults.json`, jer `gpt-6.1-sol` više nije u Codex katalogu (sada su `gpt-5.6-terra`, `gpt-6-luna`, `gpt-5.6-luna`);
  - ubaci srpski glas umesto OpenAI čitanja u `speech.mjs`, jer `gpt-4o-mini-tts` nema srpski glas i gasi se 6.1.2027. Kandidati i probni snimci su u `prototip-glasovni/`.

## Misli

Polje „Procesi“ u listi četova služi za brze lične beleške; upis se čuva na Enter ili izlaskom iz polja i ne prikazuje se ponovo: kucaš ili diktiraš sve što ti padne na pamet, a svaki upis dobija vreme, kao poruka. Beleške su u `data/procesi/GGGG-MM-DD.md` (van Git-a), po jedan fajl za svaki dan. Ako je tog dana nešto zapisano, posle 21 h agent u četu „Misli“ postavi 2 do 3 kratka pitanja, a nedeljom napravi i nedeljni pregled obrazaca. Obaveštenje glasi samo „Imaš novu poruku.“ Ovaj čet ne ulazi u Dispečer, beleške projekta ni automatske naslove. Server vodi i `data/procesi/koriscenje.md`, dnevnik korišćenja bez teksta misli (broj i vreme upisa, odgovori, pregledi). Kad postoje zapisi iz bar dva dana, agent posle 22 h, najviše jednom u dva dana, sam pregleda kako se sistem koristi: menja `pravila.md` (svoja pravila za pitanja, najviše jedna „Proba:“), ideje za kod upisuje u `predlozi.md` i pita te za ocenu, koju čuva u `ocene.md`. Kod Agent Deska ne menja sam. API: GET/POST `/api/thoughts` (`?date=GGGG-MM-DD`, telo `{"text":"..."}`) i POST `/api/thoughts/chat`.

## Dispečer projekata

Iz menija logotipa ili Podešavanja otvori „Dispečer projekata“ za kratku belešku po četu, pitanja koja čekaju tebe i poslednje rezultate. „Razgovaraj sa dispečerom“ otvara jedan čet sa malim modelom: napiši, na primer, „Šta je ostalo na projektu X?“ Pregled se osvežava bez trošenja tokena; razgovor koristi limit modela. Beleške u `data/dispecer.json` čuvaju se lokalno, a model se po završetku drugih agenata pokreće samo za čet kome je dispečer, na tvoj zahtev, prosledio zadatak: tada dobija jedan izveštaj i javlja ti rezultat. Detalji i API su u [docs/agent-environment.md](docs/agent-environment.md#dispečer-projekata).

### Stanje projekta i Dispečer

Agent dobija STANJE.md, ODLUKE.md i kratku evidenciju prethodnog rada. Posle izmena server proverava ažuriranje stanja i, ako izostane, traži jednu dopunu beležaka (troši limit agenta). Otvorena pitanja i izričite odluke čuvaju izvor i opstaju između četova. Dispečer prikazuje upozorenja i filter stavki koje traže pažnju. Provera prati promenu sadržaja, a ne tačnost svih tvrdnji. Detalji: [okruženje agenta](docs/agent-environment.md#provera-stanja-i-odluka-projekta).

### Probne kartice odgovora

Dugme „Kartice“ u alatima poruke uključuje sažet prikaz završenih odgovora. „Detalji · ceo odgovor“ otkriva originalni tekst i tok rada. Poruke, izvoz i obnova konteksta ostaju nepromenjeni, a pretraga obuhvata i skriveni tekst. Prikaz ne koristi dodatne pozive modela.

## Redovan pregled dispečera

Dispečer jednom u 5 sati, kad nijedan agent ne radi, sam pregleda projekte i u svom četu predlaže izmene i četove (najviše 5 stavki). Samo predlaže: ne šalje poruke, ne pokreće agente i ne menja projekte. Vreme poslednjeg pregleda je u `data/dispecer-pregled.json`.

Unutar aplikacije nema iskačućih potvrda radnji ni kartica obaveštenja o završenim odgovorima. Greške se prikazuju kao tekst uz polje za poruku. Zvuk i sistemska obaveštenja ostaju prema postojećim podešavanjima.

Ponuđeni odgovori su uslovni: red „Ponuđeno:“ postoji samo kao konkretan odgovor na stvarno otvoreno pitanje koje traži korisnikov izbor ili podatak. Bez takvog pitanja red se izostavlja. Agenti ne izmišljaju nove zadatke radi nastavka razgovora i ne obećavaju fizičke radnje koje ne mogu da izvrše. Isto važi za čet Procesi.

Klik na fajl ispod odgovora otvara unified diff sa kontekstom i starim/novim brojevima redova. Desno od putanje su dodati i uklonjeni redovi i njihov zbir. Bez sačuvanog patcha broj je nepoznat do provere; trenutni Git diff je posebno označen. Slike se otvaraju kao slike.

Ispod odgovora stoji samo skupljena stavka „Izmene (N)“ sa stvarno menjanim fajlovima; samo otvoreni fajlovi i pregledani screenshotovi ostaju u toku rada. Nedostupna slika daje kratku poruku umesto pokvarene ikonice.

Otvorene i izmenjene slike/video prikazuju se kao thumbnailovi sa oznakom stanja. Audio i ostali binarni fajlovi imaju kompaktnu karticu bez brojača redova. Tekstualni fajlovi zadržavaju diff i brojače; samo pročitani tekstualni fajlovi ostaju u toku rada. Video/audio se puštaju klikom, bez automatskog reprodukovanja.
