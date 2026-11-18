# Odluke projekta

## 2026-10-18, ažuriranje projektnih beležaka
- Odluka: proveravati promenu STANJE.md posle izmena i tražiti najviše jednu dopunu.
- Razlog: beleške ostaju dostupne narednom četu bez beskonačnih poziva modela.
- Odluka: otvoreno pitanje se ne zatvara zato što je izostalo iz sledećeg odgovora.
- Razlog: nerešen dogovor mora ostati vidljiv sa izvorom dok ne dobije odgovor.
- Odluka: podagenti prijavljuju informacije roditelju; paralelan rad preskače automatsku dopunu.
- Razlog: smanjiti mogućnost prepisivanja zajedničkih beležaka.
- Odluka: upozorenje ostaje kada dopuna izostane; provera ne potvrđuje tačnost svih tvrdnji.
- Izvor: korisnik je odobrio sva četiri predloga u četu b3a32fd6-0536-4b18-b591-37853a80e514, 18.10.2026.

## 2026-10-18, probni prikaz kartica
- Odluka: kartice menjaju samo prikaz odgovora; originalni tekst i tok rada ostaju sačuvani.
- Razlog: korisniku treba brži pregled, a agentima pun kontekst po dosadašnjim pravilima prenosa.
- Odluka: ceo odgovor je iza „Detalji“, a dugme „Kartice“ vraća dosadašnji prikaz.
- Izvor: korisnikov zahtev za probu i očuvanje konteksta u četu b3a32fd6-0536-4b18-b591-37853a80e514, 18.10.2026.

## 2026-10-18, izgled kartica
- Odluka: kartice su kompaktne, bez okvira i oznake statusa, tekst u boji obične poruke agenta.
- Razlog: korisnik je rekao da okvir i oznaka zauzimaju prostor i nisu potrebni, a beo tekst odudara od četa.
- Izvor: korisnikove poruke u četu b3a32fd6-0536-4b18-b591-37853a80e514, 18.10.2026.
- Odluka (menja raniju o „Detalji“): kartica nema „Detalji“; ceo odgovor se vidi isključivanjem dugmeta „Kartice“.
- Razlog: korisnik ima dugme za uključivanje i isključivanje, pa su detalji suvišni.
- Izvor: čet b3a32fd6-0536-4b18-b591-37853a80e514, 18.10.2026.

## 2026-10-18, automatsko pokretanje limita
- Odluka: dok Agent Desk radi, izabranim agentima se sama šalje kratka poruka kad 5h ili nedeljni prozor nema vreme obnove ili je ono prošlo.
- Razlog: korisnik želi da prozor limita teče i kad ne radi, da se ranije obnovi.
- Isti agent ne dobija novu poruku pre isteka trajanja prozora; posle greške ponovo za 30 minuta. Iscrpljen agent se preskače.
- Izvor: čet a2d917b5-1df9-4118-9168-a13c420a3a56, 18.10.2026.

## 2026-10-18, usklađivanje limita (menja automatsko pokretanje limita)
- Odluka: kratka poruka ide samo kad korisnik pošalje poruku nekom agentu, i to ostalim agentima čiji 5h ili nedeljni limit nije pokrenut. Nema slanja na svakih pet sati.
- Razlog: korisnik želi da svi limiti počnu zajedno; slanje vezano za stvaran rad je manje sporno po pravilima servisa od stalnog automatskog slanja. Poruka se ne prikriva.
- Izvor: čet a2d917b5-1df9-4118-9168-a13c420a3a56, 18.10.2026.

## 2026-10-18, ponuđeni odgovori na karticama
- Odluka: agent na kraju dodaje red „Ponuđeno: a | b | c“; kartica poslednjeg odgovora prikazuje ih kao dugmad koja šalju odgovor. Pitanje ima svoj blok sa pozadinom.
- Razlog: korisnik želi brži nastavak razgovora i lepši prikaz pitanja.
- Izvor: čet a2d917b5-1df9-4118-9168-a13c420a3a56, 18.10.2026.

## 2026-10-18, folderi posle povratka iz četa na telefonu
- Odluka (menja raniji izgled Nazad na telefonu): povratak iz četa vraća listu sa istim otvorenim folderima i položajem, umesto da zatvara sve foldere.
- Razlog: korisnik ne želi da ponovo otvara folder posle svakog ulaska u čet.
- Izvor: čet d1607bc5-8c69-4354-aab8-928e08eaa8e7, 18.10.2026.

## 2026-10-18, ime i potpis pri slanju mejla
- Odluka: From nosi ime iz Gmail „Šalji poštu kao“; opciono from bira potvrđen alias; potpis te adrese dodaje se sam, signature:false ga izostavlja.
- Razlog: primalac je zbog adrese bez imena pogrešio rod; potpis treba da bude isti kao u Gmailu, a ne da ga agent sastavlja.
- Izvor: čet f707f882-6d7b-4697-a54a-e6806f35d774, 18.10.2026.

## 2026-10-18, automatski prelazak u nov čet
- Odluka (menja dugme „Nastavi u novom četu“): kad bi nov čet bio ponuđen, korisnikova sledeća poruka sama pravi nastavak sa sažetkom i ide u njega. Nastavak nosi i poslednjih 8 poruka (4 korisnikove, 4 agentove) doslovno.
- Ne važi za podčetove, čet koji radi ili ima red čekanja, niti bez Google ključa; tada poruka ide u isti čet.
- Razlog: korisnik ne želi da klikće, a poslednje poruke daju novom četu tok razgovora.
- Izvor: čet d1607bc5-8c69-4354-aab8-928e08eaa8e7, 18.10.2026.
- Dopuna: poslednjih 8 poruka prelazi kao obične poruke ispod sažetka, a ne unutar njega (korisnikov zahtev, isti čet, 18.10.2026).

## 2026-10-19, lične misli
- Odluka: misli se kucaju ili diktiraju u prozor „Misli“ i čuvaju u data/misli/GGGG-MM-DD.md sa vremenom upisa, van GitHub-a. Posle 21 h, ako postoji zapis, agent postavi 2 do 3 pitanja; nedeljom i nedeljni pregled.
- Razlog: korisniku je neprijatno da misli izgovori, a sat koji snima ceo dan hvata razgovore i šum, ne misli.
- Odluka: obaveštenje za misli ne nosi sadržaj; čet se ne prikazuje u Dispečeru i ne ulazi u beleške projekta ni naslove.
- Izvor: čet fcb79549-2061-42c7-a003-0b95cee41fa4, 19.10.2026.

## 2026-10-19, samostalno unapređivanje „Misli“
- Odluka: dnevnik korišćenja (koriscenje.md, bez teksta misli); posle bar dva dana zapisa agent sam, najviše jednom u dva dana posle 22 h, menja pravila.md, uvodi najviše jednu probu i traži ocenu (ocene.md). Ideje za kod idu u predlozi.md.
- Razlog: korisnik želi da se sistem sam unapređuje bez njegovog prompta; automatska izmena koda bi mogla da obori aplikaciju koju korisnik koristi, pa agent menja samo svoja pravila.
- Izvor: čet fcb79549-2061-42c7-a003-0b95cee41fa4, 19.10.2026.

## 2026-10-19, naziv „Procesi“ umesto „Misli“
- Odluka: dugme, prozor i čet se zovu „Procesi“; prozor nema uvodno objašnjenje, polje kaže samo „Zapiši…“, a „Razgovor“ je dugme u zaglavlju.
- Razlog: korisnik ne želi da neko ko vidi ekran zaključi da su to lične misli.
- Izvor: čet 66385b2e-80ac-4cd8-bab9-4a9d561601cc, 19.10.2026.
- Dopuna (isti čet, 19.10.2026): prozor nema dugme „Sačuvaj“ ni prikaz ranijih zapisa; tekst se čuva sam pri zatvaranju, Enteru na računaru ili izlasku iz aplikacije.
- Dopuna 2 (isti čet, 19.10.2026, menja prozor): „Procesi“ su samo polje za upis u listi četova, bez prozora i dugmeta „Razgovor“. Enter ili izlazak iz polja čuva tekst, polje se isprazni i kratko kaže „Zapisano“.
- Dopuna 3 (isti čet, 19.10.2026): folder sa zapisima je data/procesi/ umesto data/misli/; server pri pokretanju jednom preimenuje stari folder.

## 2026-10-19, prilozi kao WebP
- Odluka: poslate PNG i JPG slike server odmah pretvara u WebP kvaliteta 75% i u četu ostaje samo WebP. Postojeće slike u data/prilozi/ pretvaraju se jednom, uz zamenu putanja u četovima, arhivi i HTML pregledima istog foldera. Original ostaje samo kad WebP ne bi bio manji.
- Razlog: prilozi su zauzimali oko 1,2 GB, većinom PNG snimci ekrana.
- Izvor: čet 1868525c-fdbb-41cc-8554-eaefce4b95e0, 19.10.2026.

## 2026-10-19, prelazak po kontekstu i prilagodljiva pravila
- Odluka (menja okidače automatskog prelaska): čet sam prelazi samo kad je keš istekao i kontekst je bar 50k, ili kad je kontekst bar 150k dok keš važi. Kod 40 poruka ili 30k tokena teksta prelazak se samo nudi.
- Odluka: pragovi su u data/prilagodjavanje/prelazak.json. Zakazani pregled u novom četu (najviše jednom u 3 dana, uz bar 3 nova merenja) menja najviše jednu vrednost unutar granica iz koda i upisuje razlog u istorija.md. Kod ne menja.
- Razlog: prvi izveštaj (data/prelasci.md) pokazuje da je prelazak zbog konteksta preko 100k, dok keš važi, uglavnom bio skuplji. Korisnik želi da se pravila podešavaju po stvarnom korišćenju, preko agenata koji se sami prilagođavaju.
- Izvor: čet 4a3ac257-12a5-4f58-98a7-5c55175e7ee8, 19.10.2026 (korisnik je izbor prepustio agentu).

## 2026-10-19, deo „Prilagođavanje“
- Odluka (proširuje prilagodljiva pravila): prilagodljivi agenti po projektu. Agent sam predloži šta da meri i šta da podešava, korisnik svaki predlog jednom odobri, a posle svakog pokretanja agent sam bira sledeći termin (1 h do 30 dana). Propušten termin kreće čim je aplikacija slobodna; ukupno najviše 6 pokretanja nedeljno.
- Agent menja samo ono što je navedeno u njegovom opisu („adapt“); kod, objava i restart idu kao predlog u predlozi.md.
- Razlog: korisnik želi agente koji se sami prilagođavaju i sami biraju razmak; odobrenje i nedeljna granica čuvaju limit, a zabrana izmene koda čuva aplikaciju i sajtove.
- Izvor: čet 4a3ac257-12a5-4f58-98a7-5c55175e7ee8, 19.10.2026. Prvi predlog: milev.rs.


## 2026-10-19, četovi prilagođavanja samo u svom prozoru
- Odluka (menja deo „Prilagođavanje“): prozor nema izbor projekta ni dugme „Predloži agente“; prikazuje agente i ispod svakog njegove četove. Četovi agenata i predloga ne stoje u listi četova, „Poslednjim četovima“ ni u folderima. (Zamenjeno 19.10.2026 odlukom „Prilagođavanje“ kao folder.) Predloge i dalje pravi agent preko /api/adaptive/propose.
- Razlog: korisniku je dovoljan pregled agenata, a njihovi četovi zatrpavaju listu.
- Izvor: čet 02715261-535b-44e1-8a04-bff338306695, 19.10.2026.

## 2026-10-19, „Prilagođavanje“ kao folder u listi četova
- Odluka (menja odluku „četovi prilagođavanja samo u svom prozoru“): četovi agenata i predloga stoje u folderu „Prilagođavanje“ u listi četova, ne u ostalim folderima ni u „Poslednjim četovima“. Predlog se pokreće iz foldera („+ Predlog za projekat“) ili desnim klikom na čet, za projekat tog četa. Panel ostaje za odobrenja, otvara se iz foldera; dugme ispod Dispečera je uklonjeno.
- Razlog: korisnik želi da vidi sve četove prilagođavanja kao folder i da predlog pokrene sam, bez traženja od agenta.
- Izvor: čet 26d646b0-ff09-4163-a417-9537d5e1f7a1, 19.10.2026.

## 2026-10-21, AGY kvota po dostupnoj grupi
- Odluka: kada API ne vrati Gemini, prikazuje se dostupna Claude/GPT kvota sa oznakom grupe. U četu model druge grupe dobija ?, bez tuđih procenata.
- Razlog: uspešna prijava je vraćala samo Claude/GPT grupu, pa je dosadašnji čitač zadržavao stare Gemini procente.
- Izvor: čet ad0433c0-58fb-4c3f-8dff-3d60939cf255, korisnik „Popravi prikaz limita“.

## 2026-10-21, raspored foldera na Desktopu
- Odluka: nema velike selidbe. Rezervne i stare kopije idu u ~/Desktop/_Arhiva/<kategorija>/, van Projects/, da ih pregled projekata ne uvrsti i da agenti ne biraju kopiju umesto projekta. Projekti zadržavaju oblik „YYYYMMDD Naziv“ u Projects/<kategorija>/.
- Razlog: testovi sa 4 slabija modela (milev.rs, „animacija za Petra“) pokazali su da se projekti nalaze i bez spiska; zabunu prave istoimene kopije, a Codex Luna je jednom pogodio pogrešan folder iz beležaka.
- Izvor: čet 1a93c9be-92ae-4311-8241-fb93cd61f7b2, korisnik „Sredi foldere“.

## 2026-10-21, projekat četa iz radnji agenta
- Odluka: projekat četa više nije samo radni folder. Posle svakog odgovora Agent Desk boduje putanje iz radnji (izmena 3, fajl 2, komanda 1) prema data/projekti.md i bira najuži folder; ručni izbor preko /api/chats/ID/project ima prednost. STANJE.md, ODLUKE.md i naslov idu u taj projekat.
- Razlog: četovi pokrenuti iz foldera Agent Desk radili su na FON knjižari, pa su prepisali Agent Desk/STANJE.md i dobijali naslov „Agent desk“ (putanje priloga i primer u uputstvu za naslov).
- Izvor: čet 20af97da-061c-484e-a38c-0e7646f1ba14, korisnik „Popravi i napravi automatsko određivanje projekta“.

## 2026-10-21, dispečer prati prosleđene zadatke
- Odluka (menja pravilo „Sam završetak drugog agenta ne pokreće tebe“): kad dispečer na korisnikov zahtev prosledi zadatak postojećem četu (send sa dispatcherId) ili pokrene radnika (delegate), Agent Desk prati taj čet i po završetku šalje dispečeru jedan izveštaj. Prateći čet tada ne šalje svoje obaveštenje. Tokom izveštaja i redovnog pregleda server odbija slanje i pokretanje agenata.
- Razlog: korisnik želi da mu dispečer javi kad prosleđeni posao završi, bez duplog pokretanja i bez poruka koje nije tražio.
- Izvor: čet 7bf4a490-5ac3-48ef-a270-8b5b2b7f1ae5, 21.10.2026.

## 2026-10-22, automatsko odobravanje prilagodljivih agenata
- Odluka (menja ručno odobravanje iz 19.10): automatsko odobravanje za sve projekte je početno uključeno, uz prekidač u panelu. Aktivira nove i postojeće predloge koji čekaju, a čuva pauzirane i odbijene agente.
- Razlog: korisnik traži „neka se odobrava automatski“, bez dodatnog klika za svaki predlog. Granice rada agenata i najviše 6 pokretanja nedeljno ostaju.
- Izvor: čet 7b6dd8df-b357-4d13-b923-e2c2141a2251, 22.10.2026.

## 2026-10-22, dispečer daje predloge kao numerisanu listu
- Odluka: dispečer predloge i opcije za korisnika piše kao numerisanu listu (1., 2., 3.), u dispatcherContext u dispatcher.mjs.
- Razlog: korisnik želi da odgovara brojem.
- Izvor: čet 87a3773e-8acc-4a86-baec-4d66e3a7c03d, 22.10.2026.

## 2026-10-22, Prilagođavanje u zaglavlju
- Odluka: u oba menija zaglavlja Prilagođavanje zamenjuje Kontekst agenta i otvara panel agenata i odobrenja.
- Razlog: kontekst je već dostupan ispod polja za poruku.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, korisnikov zahtev 22.10.2026.

## 2026-10-22, bez popupa unutar aplikacije
- Odluka: nema iskačućih potvrda ni plutajućih kartica završenih odgovora; greške su tekst uz unos. Zvuk i sistemska obaveštenja ostaju po podešavanjima.
- Razlog: korisniku popup obaveštenja unutar aplikacije nisu potrebna.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, korisnikov zahtev 22.10.2026.

## 2026-10-22, uslovni ponuđeni odgovori
- Odluka (menja raniju obavezu reda Ponuđeno): red postoji samo kao konkretan odgovor na stvarno otvoreno pitanje; bez izmišljanja novih zadataka ili obećavanja fizičkih radnji. Važi i za Procesi.
- Razlog: obavezni nastavci podsticali su agente da nude nepotrebne i neizvodljive zadatke.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, korisnik „izmeni“, 22.10.2026.

## 2026-10-23, uklanjanje novog praznog četa pri izlasku
- Odluka: novi običan nekorišćen čet uklanja se pri izlasku, bez arhive; čuvaju se poruke, nacrt, prilog, ručni naslov, podagenti i ranije trajno sačuvani četovi.
- Razlog: korisnik želi da izlazak iz novog praznog četa ukloni čet kao da nije kreiran.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, zahtev 22.10.2026. UTC.

## 2026-10-23, vidljivije boje platformi u zaglavlju
- Odluka: zasićenija pozadina i obojena gornja linija dugmadi agenata, na telefonu i računaru.
- Razlog: korisnik navodi da se dosadašnje boje ne vide.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, ispravka boja zaglavlja
- Odluka (zamenjuje prethodnu gornju liniju): bez gornje linije na dugmadima agenata; ChatGPT/Codex ljubičast, procenat baterije zelen.
- Razlog: korisnik traži ove boje i uklanjanje linije.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, pune pozadine zaglavlja
- Odluka: pune zasićene pozadine agenata, bez blede mešavine sa crnom; baterija telefona i Maca ima zelenu pozadinu sa svetlim procentom.
- Razlog: korisnik traži jače boje i zelenu pozadinu, umesto samo zelenog teksta baterije.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, tamnije zasićene pozadine
- Odluka: tamniji tonovi pune boje agenata i tamnozelena baterija, uz čitljive brojeve; bez gornje linije.
- Razlog: korisnik traži tamne boje, bez bledih i presvetlih pozadina.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, jedinstven beli tekst zaglavlja
- Odluka: procenti i vremena agenata i procenat baterije su beli, bez bojenja prema nivou; tamne pozadine ostaju.
- Razlog: korisnik želi ozbiljniji izgled i belo umesto boja koje zavise od nivoa.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, crne pozadine sa obojenim tekstom
- Odluka (menja obojene pozadine i beli tekst): pozadine zaglavlja su crne, fontovi u stalnoj boji agenta; procenat baterije zelen, bez promene po nivou.
- Razlog: korisnik želi da proba ovaj izgled umesto prethodnog.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, pregled izmena uz odgovor
- Odluka: klik na fajl otvara unified diff sa kontekstom i brojevima redova, a desno stoje dodati/uklonjeni redovi i zbir; slike imaju pregled. Sačuvani patch i trenutno Git stanje jasno su razdvojeni.
- Razlog: korisnik traži prikaz kao na GitHub-u i broj izmena desno.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, sažet spisak stvarnih izmena
- Odluka: samo menjani fajlovi ispod odgovora, u skupljenoj stavci Izmene (N); pročitani fajlovi ostaju u toku rada. Bez opisne rečenice za svaki fajl. Nedostupne slike daju kratku poruku umesto pokvarenog prikaza.
- Razlog: korisnik prikaz otvorenih privremenih slika smatra čudnim i suvišnim.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, thumbnailovi medija bez brojača redova
- Odluka (menja skrivanje otvorenih medija): slike i video su thumbnailovi sa oznakom stanja, audio i drugi binarni fajlovi su kompaktne kartice bez brojača redova. Brojači i diff ostaju samo za tekstualne izmene.
- Razlog: korisnik to izričito traži za otvorene fajlove i medije.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, uvećanje slike na mestu
- Odluka: klik uvećava isti učitani thumbnail, ponovni klik ga smanjuje; nema dodatne slike ispod ni ponovnog čitanja putanje. Greška thumbnaila se pamti tokom sesije i ne ostavlja pokvarenu ikonicu.
- Razlog: korisnik želi uvećanje na istom mestu i navodi nedostupne putanje.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, slike uvek raširene
- Odluka (menja uvećavanje na klik): priložene slike i slike prikazane u radu agenta odmah su raširene na širinu poruke, sa očuvanim proporcijama i bez odsecanja.
- Razlog: korisnik traži da se slike uvek lepo vide, bez dodatnog klika.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, kompaktne slike sa popupom
- Odluka (menja stalno raširene slike): slike u prilozima i radu agenta su manje; klik otvara postojeći dijalog sa velikom slikom na svim uređajima.
- Razlog: korisnikov zahtev za popup pregled.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, pregled stranice snimkom cele stranice
- Odluka: dugme Pregled i API snimak u širini 1920 px i punoj visini stranice, uz prethodno skrolovanje da se učitaju uvodne animacije; pregled uživo se ne pravi dok se snimci ne isprobaju.
- Razlog: korisnik želi da sa telefona vidi računarski izgled; snimak je jednostavniji i jeftiniji od prenosa uživo.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, pregled uživo u aplikaciji
- Odluka: pored snimaka postoji i pregled uživo: klik na link otvara stranicu u panelu zaključanom na vrhu ekrana, u računarskoj širini, preko proxyja na zasebnom originu (port 4320/4321, telefon preko Tailscale 8443); unos poruka ostaje ispod.
- Razlog: korisnik želi da sa telefona vidi računarski izgled uživo bez rotiranja i desktop režima pretraživača; običan iframe ne radi zbog X-Frame-Options i lokalnih adresa.
- Izvor: čet d7c8a433-cdd2-4b69-a670-89325c1593cc, 23.10.2026.

## 2026-10-23, zaseban prototip Site Desk
- Odluka: traženi panel napravljen je zasebno u prototip-site-desk/, bez izmene aktivnog interfejsa ili API-ja Agent Deska. Prijave, agent i objave su izričito označene simulacije.
- Razlog: korisnik traži samo prototip da vidi tok za više lokalnih sajtova, agenta, pregled pre/posle i nezavisno slanje na GitHub i hosting.
- Prototip vezuje odobrenje za konkretnu reviziju; nova izmena ga poništava. Tajne se ne traže niti čuvaju u browseru.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, 23.10.2026.

## 2026-10-23, link na sam Agent Desk otvara aplikaciju
- Odluka: link iz poruke koji vodi na Agent Desk (isti origin ili loopback portovi 4317-4321) otvara aplikaciju u istom tabu, na telefonu preko trenutnog origina; pregled uživo i dalje odbija sopstvene portove.
- Razlog: korisnik je klikom na link 127.0.0.1:4317 dobio „Pregled nije dostupan“; proxy namerno ne prikazuje aplikaciju da prijava ne bi prošla kroz njega.
- Izvor: čet b8db3837-8055-493b-b332-8fa94a8e8fab, 23.10.2026.
- Zamenjeno 26.10.2026: početak prve poruke je samo privremen naslov. Posle prvog završenog odgovora Gemini jednom imenuje čet, pa se naslov zaključava. Promena modela i kasniji odgovori ga ne menjaju, a ručni naslov ima prednost. Izvor: čet 8b0aea27-b50a-45ee-9a21-e9e8db01af59, korisnik 26.10.2026. u 11:41 UTC.

## 2026-10-23, privremeni posrednik za telefonski pregled
- Odluka: Tailscale ruta 8443 vodi na lokalni servis prototip-site-desk/phone-bridge.mjs na 4391, koji proverava sesiju preko postojećeg gateway-a i prosleđuje lokalnom pregledu 4320.
- Razlog: 4321 zauzima Astro preview drugog projekta; izbegnuto je njegovo gašenje i restart Agent Deska. Posrednik ne čita fajlove sa tajnama niti prosleđuje autentikacioni kolačić sajtu. WebSocket nije podržan na ovoj privremenoj putanji.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, korisnik ne može da otvori prototip na telefonu, 23.10.2026.

## 2026-10-23, tehnički izgled Site Desk prototipa
- Odluka: crno-bela tema, sitan monospace tekst, Markdown oznake naslova, jasni razmaci, oštre ivice; bez ikonica, ilustracija, senki i dekorativnih detalja.
- Razlog: izričit korisnikov zahtev za malim, funkcionalnim tehničkim dizajnom. Demo dugme koristi crnu/sivu, sa prevođenjem ranijih demo boja radi očuvanja sačuvanih verzija.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, poruka 23.10.2026. u 19:32 UTC.

## 2026-10-23, čitljiviji Site Desk bez okvira
- Odluka (menja prethodni tehnički stil): običan sistemski font, čitljiviji tekst, bez Markdown prefiksa i bordera. Sadržaj se odvaja malim razmacima i diskretnim Tailwind zinc podlogama, uz cyan i emerald akcente. Oštre ivice i odsustvo ikonica ostaju.
- Razlog: korisnik prethodni izgled smatra nečitljivim i izričito traži ove izmene. Nijanse su lokalne CSS vrednosti, bez nove biblioteke.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, poruka 23.10.2026. u 19:37 UTC.

## 2026-10-23, WordPress izgled Site Desk prototipa
- Odluka (menja ranije stilove): svetli izgled WordPress administracije, tamni bočni meni i gornja traka, bele kartice sa tankim sivim okvirima, plave akcije i sistemski font.
- Razlog: korisnik izričito traži WordPress dizajn i da se trenutni zanemari. Tok i demo logika ostaju isti.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, 23.10.2026. u 19:41 UTC.

## 2026-10-23, početak stvarnog Site Deska
- Odluka: uklonjeni demo sajtovi i deterministički agent; novi panel čuva projekte na serveru i koristi stvarne trajne četove preko postojećeg Agent Desk API-ja.
- Pristup: zasebni lokalni API 4392 i autentifikovana telefonska ruta 8444; zajednički proxy pregleda nema agentski pristup.
- Razlog: korisnik traži da se krene sa pravim sajtom i postojećim SSH pristupom. Domen iz poruke nije jasan i traženo je pojašnjenje. Hosting ostaje nepovezan; nije odobrena konkretna objava.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, 23.10.2026. u 19:46 UTC.

## 2026-10-23, samostalan lokalni Site Desk paket
- Odluka (zamenjuje zavisnost od Agent Desk API-ja): Site Desk ima sopstveni Node server, CLI adaptere, čuvanje četova i projekata, GitHub kloniranje i odvojene veze sa SSH hostingom. Ceo podfolder je prenosiv bez roditeljskog projekta.
- Razlog: korisnik pojašnjava da drugi korisnik preuzme program sa GitHub-a i lokalno poveže svoje repozitorijume i servere. Prijave i fajlovi pripadaju tom korisniku.
- Objava: trenutni adapter šalje statični odobreni build preko rsync-a uz rezervu; GitHub šalje postojeći commit. SSR/PHP, baze i vizuelni pre/posle nisu implementirani. Pravi korisnički pristupi nisu isprobani.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, korisnik 23.10.2026. u 19:58 UTC.

## 2026-10-23, FTP i FTPS objava
- Odluka: pored SSH-a dodati FTP, eksplicitni FTPS i implicitni FTPS; transport koristi curl sa tajnom na standardnom ulazu. Lozinka se čuva samo u privatnom data/credentials fajlu i ne vraća kroz API ili čet.
- Rezerva: pre FTP objave lokalno sačuvati sve postojeće fajlove koji će biti prepisani; ako rezerva ne uspe, prekinuti pre slanja. Ne briše se udaljeni višak.
- Razlog: korisnik pita za hosting bez SSH-a i zatim izričito traži „dodaj ftp“. Konkretnom hostingu nije pristupano.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, 23.10.2026. u 20:23 UTC.

## 2026-10-23, naslov se ne menja pri novom četu i promeni modela
- Odluka: početak prve poruke ostaje naslov. Promena agenta ili modela, i novi čet iz nastavka, ne pokreću automatsko preimenovanje. Gemini i dalje menja naslov samo na dugme u meniju.
- Razlog: korisnik traži da pokretanje novog četa, odnosno promena modela, ne preimenuje čet.
- Izvor: čet b8db3837-8055-493b-b332-8fa94a8e8fab, 23.10.2026.

## 2026-10-23, vidljiv tok GitHub i hosting objave
- Odluka: za oba prenosa prikazati indikator rada, animiranu traku bez procenta, proteklo vreme i rezultat posle API odgovora. Tokom zahteva sprečiti novu operaciju i promenu projekta; poštovati smanjeno kretanje.
- Razlog: korisnik potvrđuje da objava radi, ali ne vidi animaciju tokom slanja. Backend ne daje procenat prenosa, pa se on ne izmišlja.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, 23.10.2026. u 21:24 UTC.

## 2026-10-23, dva glavna dugmeta i automatski izlaz
- Odluka (menja ručni pregled i odobrenje): uklonjeni spisak fajlova i dugmad Pregledaj verziju/Odobri. Klik na GitHub ili hosting sam priprema konkretnu verziju i šalje izabrani cilj. GitHub i dalje šalje postojeći lokalni commit.
- Pristup je u Podaci sajta; dodat je direktan link Pregledaj sajt. Build polje je uklonjeno: program prepoznaje uobičajene izlaze ili filtrirani jednostavan HTML sajt; agent može podesiti site-desk.json. Ne izvršava se build komanda naslepo.
- Razlog: korisnik izričito traži dva glavna dugmeta, bez ručnog pregleda/odobrenja, i automatsko ili agentsko podešavanje build foldera.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, korisnik 23.10.2026. u 21:30 UTC.

## 2026-10-23, uklanjanje ponovljenih oznaka i veliki razmaci u četu
- Odluka: uklonjeni logo, breadcrumbs, naslov izabranog sajta iznad četa, trajni status servera, naslov/podnaslov razgovora, domen iz podataka i pomoćni opis uz unos. Aktivni sajt ostaje u bočnoj listi, a podaci prikazuju lokalni folder i hosting. Pregledaj sajt je uz glavna dugmad.
- Razmaci: tekst agenta prikazuje najviše jedan prazan red između paragrafa, uz običan prored; fenced code blokovi i izvorna istorija nisu menjani.
- Razlog: korisnik traži da ostanu samo glavne stvari i da se informacije ne dupliraju.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, poruka 23.10.2026. u 21:31 UTC, dostavljena agentu u 21:37 UTC.

## 2026-10-23, kompaktniji čet i jednostavniji hosting
- Odluka: prazni redovi između pasusa agenta prikazuju se kao jedan novi red, uz prored 1.4. Kod i sačuvana istorija ostaju sačuvani.
- Hosting: glavni prikaz ima jedno veliko dugme za podešavanje; provera sačuvane veze i njen rezultat nalaze se u prozoru podešavanja. Pregledaj sajt ostaje.
- Razlog: korisnik traži još manje razmake i samo najbitnije kontrole bez sitnih dugmadi.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, poruka 23.10.2026. u 21:44 UTC.

## 2026-10-24, privremeni četovi i README kao memorija projekta
- Odluka: dodati Promeni agenta i Novi čet; oba pokreću novu sesiju bez izmene lokalnih fajlova projekta. Razgovori i ID-jevi sesija ostaju samo u memoriji servera. Izbor agenta ostaje sačuvan po projektu.
- Memorija: server pred svaki zadatak čita README.md i uključuje sadržaj; agent mora pre rada da ga pročita i posle stvarnih izmena dopiše datum, kratak opis i proveru u Istorija izmena. Prethodni sadržaj se čuva. Opis piše agent, a panel ne garantuje njegovu tačnost niti briše istoriju kod CLI pružaoca.
- Razlog: korisnik ne želi čuvanje razgovora, već pregled sitnih izmena u README-u konkretnog projekta.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, korisnička poruka 23.10.2026. u 22:13 UTC (24.10. lokalno).

## 2026-10-24, automatska procena teme i podsetnici za README
- Odluka (menja dugme Novi čet): pre svake poruke poseban poziv izabranom CLI-ju procenjuje temu. Nova tema ili 30 minuta neaktivnosti otvaraju novu sesiju; relevantan sažetak i README se prenose. Ne prekida se aktivni zadatak tajmerom. Prag 30 minuta je implementacioni izbor.
- Dodatni prompt traži proveru beleške posle uspešnog radnog odgovora i pre promene postojeće sesije. Uputstvo uz rad traži zapis posle svakog završenog koraka. Ne garantuje se zapis posle svakog alata niti tačnost modelskog sažetka.
- Razlog: korisnik želi automatsko upravljanje temom i memorijom bez ručnog novog četa. Dodatni pozivi troše limit; program ne upravlja kešom pružaoca.
- Izvor: čet 53e3e87d-ff8d-4c78-85ee-54ba50599650, poruka 23.10.2026. u 22:19 UTC.

## 2026-10-24, uvlačenje kartica u folderu i podagenata
- Odluka: kartica u otvorenom folderu i kartica podagenta ne idu preko cele širine. Levi rub okvira je na mestu dosadašnjeg uvlačenja teksta (18 px u folderu, 30 px za podagenta i prethodni deo), a desni rub ostaje uz ivicu liste. Tekst unutra ima isti razmak kao ostale kartice, 10 px.
- Razlog: korisnik vidi uvučen tekst, a obojen okvir i dalje preko cele širine, i traži da se uvuče cela kartica. Isto važi za podagente.
- Izvor: čet 75cd48bd-60f7-4c2e-b3c2-c8278886b599, 23.10.2026. u 22:17 UTC.
- Zamenjeno 24.10.2026: korisnik je na snimku pokazao da 18 px i dalje izgleda kao puna širina. Nova mera je 40 px za čet u otvorenom folderu i 64 px za podagenta i prethodni deo (22 px i 36 px ispod 650 px širine). Desna ivica i unutrašnjih 10 px ostaju. Izvor: čet afda3401-bd73-40c3-8328-4be57dffa6ae, poruka 24.10.2026. u 08:43 UTC.

## 2026-10-24, bez reda Ponuđeno u odgovorima
- Odluka: uputstvo agentima (server.mjs, čet Procesi u thoughts.mjs) više ne traži red „Ponuđeno:“, nego ga izričito zabranjuje. Pitanje u redu „Pitanje:“ ostaje.
- Razlog: dugmad za brze odgovore su uklonjena, a agenti su i dalje pisali red koji se prikazivao kao običan tekst.
- Izvor: čet 2d1af121-35ba-4cbc-8a6d-bb6817ce03cb, korisnik 24.10.2026. u 08:38 UTC.

## 2026-10-24, skriven red tokena ispod odgovora
- Odluka: ne prikazivati Novi ulaz, Izlaz, Keš i Upis keša ispod poruka; usage ostaje u sačuvanoj prepisci i postojećem pregledu potrošnje.
- Razlog: korisnik traži uklanjanje tog prikaza uz zadržavanje informacije u prepisci.
- Izvor: čet cf47efea-f277-46f1-a998-3c96b3ae1be7, poruka 24.10.2026. u 10:33 UTC.

## 2026-10-24, slike bez automatskog okretanja
- Odluka: ukloniti CSS rotaciju računarskih snimaka na telefonu, pregled do ivica i zatvaranje preko slike. Proporcije ostaju očuvane, duge slike se skroluju.
- Razlog: korisnik prijavljuje okretanje i nedovoljno velik prikaz.
- Izvor: čet cf47efea-f277-46f1-a998-3c96b3ae1be7, 24.10.2026. u 11:36 UTC.

## 2026-10-24, crne pozadine interfejsa
- Odluka: površine interfejsa i unos poruke su crni, uz postojeće boje teksta i oznake stanja.
- Razlog: korisnik traži da font zadrži boju, a pozadine budu crne kao pozadina inputa.
- Izvor: čet 87915027-0bc9-4069-9e0c-3a81bd872c5c, poruka 24.10.2026. u 20:03 UTC.

## 2026-10-24, razmaci koji razdvajaju delove teksta
- Odluka: povećati prored i razlikovati razmake između poruka, pasusa, naslova, lista, rezultata i metapodataka.
- Razlog: korisnik traži drugačije razmake jer tekst deluje monotono; crne pozadine i boje teksta ostaju.
- Izvor: čet 87915027-0bc9-4069-9e0c-3a81bd872c5c, poruka 24.10.2026. u 20:06 UTC.

## 2026-10-25, WebPros MCP umesto zasebne cPanel API integracije
- Odluka: integracija koristi korisnikov WebPros HTTP MCP i OAuth klijent, kroz lokalni API Agent Deska dostupan svim agentima. Povezivanje je u podešavanjima; izvorne CLI konfiguracije se ne menjaju.
- Razlog: korisnik je dostavio MCP konfiguraciju i zatražio integraciju da sam završi povezivanje. Konzervativan lokalni spisak alata za čitanje je implementacioni izbor; ostali alati traže uključene izmene i konkretan potvrđen zahtev.
- Izvor: čet 9c89acdf-02f5-49ef-a2a2-9ad0372dd7aa, korisnik 25.10.2026. u 20:18 i 20:19 UTC.
- Stvarna OAuth prijava i dozvoljeni hosting resursi nisu potvrđeni pre korisnikove prijave.

## 2026-10-25, ceo okvir polja poruke
- Odluka: fokus polja poruke koristi pravi žuti border od 2 px sa sve četiri strane. Transparentan border bez fokusa zadržava stabilne dimenzije.
- Razlog: crna pozadina unosa je prekrivala gornju i donju unutrašnju senku.
- Izvor: čet b9736e34-7595-4da8-877c-088371d667d8, korisnik traži ceo border.

## 2026-10-25, podagenti bez obaveštenja
- Odluka: podčetovi nemaju oznake novih odgovora u listi i ne povećavaju broj obaveštenja foldera. Postojeća zabrana zvuka, desktop i push obaveštenja ostaje.
- Razlog: korisnik traži da podagenti ne mogu imati notifikacije. Aktivnost i sadržaj odgovora ostaju dostupni.
- Izvor: čet 8df8873a-9e2e-429f-a553-9af6ecd3646b, korisnik 25.10.2026. u 21:29 UTC.

## 2026-10-28, automatski red i oporavak Codex veze
- Odluka: red se nastavlja i nakon CLI greške, dok ručni Stop ostaje pauza. Privremeni Codex Reconnecting prikazuje se kao aktivnost, a ne kao trajna greška.
- Postojeći model, provajder i CLI konfiguracija ostaju isti. Codex 0.164.0 provereno odbija izmenu ugrađenog openai provajdera, pa se oporavak rešava u Agent Desku, bez zamene provajdera.
- Posle terminalnog prekida veze do tri pokušaja nastavljaju isti odgovor i sačuvanu sesiju, sa pauzama 1, 3 i 8 sekundi. Red čeka oporavak; nakon iscrpljenih pokušaja greška ostaje vidljiva i red nastavlja. Stop otkazuje čekanje.
- Razlog i izvor: korisnik traži automatski nastavak reda i popravku greške websocket closed before response.completed; čet d3f8bef5-4820-4c4e-94a5-d6afba094838, 28.10.2026.

## 2026-10-29, GitHub u podešavanjima i uklanjanje lokalne kopije sajta
- Korisnik traži uklanjanje lokalnog sajta jer je na GitHub-u, i povezivanje Agent Deska tako da agenti znaju za repozitorijume.
- Astro folder je premešten u Smeće nakon potvrde čistog statusa i identičnog main commit-a na GitHub-u; izvor je milev051/milev.rs. Agent Desk i Nikon aplikacija nisu uklonjeni.
- Integracija koristi postojeći gh nalog bez kopiranja tokena; povezivanje iz podešavanja po potrebi otvara gh auth login u Terminalu/browseru. Početno je isključena, kako bi je korisnik sam povezao.
- Agenti dobijaju status i lokalni API za metapodatke repozitorijuma, uz proveru aktuelne grane i README-a pre rada. Prekid veze isključuje Agent Desk integraciju i zadržava CLI prijavu.
- Izvor: čet e1b0429f-4b30-4d54-b221-3208a5ca9b16, korisnik 29.10.2026. u 03:12:53 UTC.

## 2026-10-29, pretraživač pri običnom kliku
- Običan klik na http(s) link u poruci otvara pretraživač; Command+klik ili Option+klik otvara postojeći ugrađeni pregled. Lokalni fajlovi i prilozi zadržavaju svoje ponašanje.
- Razlog i izvor: izričit zahtev korisnika, čet d3f8bef5-4820-4c4e-94a5-d6afba094838, 29.10.2026. u 13:31 UTC.

## 2026-10-31, snimci u poruci levo i celi
- Odluka: sličice priloga u poruci kreću s leve strane. Visina i širina prate sliku, object-fit je contain, kadar se ne seče.
- Razlog: korisnik je pokazao snimak pribijen uz desnu ivicu i tražio contain umesto cover.
- Izvor: čet 8489ff51-c480-4ee0-9396-fa87ddab0e52, 31.10.2026. u 22:03 UTC.

## 2026-10-31, tekst Grok modela na crnoj kartici
- Odluka: naziv Grok modela je #e4e4e4, pozadina kartice crna, ivica bela. Odluka o crnim površinama od 24.10.2026. ostaje.
- Razlog: korisnik je pokazao nečitak tekst. Tamna boja #222 važila je dok je kartica bila svetla; crna pozadina je ostavila tamno na tamnom.
- Izvor: čet 8489ff51-c480-4ee0-9396-fa87ddab0e52, 31.10.2026. u 21:57 UTC.

## 2026-11-01, prelazak u nov čet traži potvrdu
- Odluka (menja automatski prelazak od 18.10.2026): sledeća poruka ne pravi sama nov čet. Kad je kontekst prešao prag, slanje pita da li poruka ide u nov čet ili ostaje ovde.
- Razlog: korisnik traži da prelazak sam potvrdi.
- Izvor: čet 006407ab-91a1-4b07-9a56-38c09a086bbf, 2026-11-01T00:08:38Z.

## 2026-11-01, prethodni čet ostaje uz trenutni
- Odluka: nastavak ne dobija dodatak „(nastavak)“ u naslovu. Prethodni čet se ne arhivira pri prelasku. Ostaje vezan, poruke se čitaju iz trenutnog četa, a lista pokazuje jedan čet. Arhivira se ceo lanac tek kada se obriše trenutni čet.
- Razlog: korisnik hoće jednu prepisku, sa svim ranijim porukama, a ne posebne nastavke koji nestaju iz liste.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T00:18:13Z.

## 2026-11-01, dugme „Nastavi u novom četu“ traži Da ili Ne
- Odluka: klik na to dugme ne otvara čet odmah. Dijalog pita „Da“ ili „Ne“. „Ne“ i Escape ostavljaju trenutni čet. „Da“ i dalje pravi sažetak i novi deo.
- Razlog: korisnik je pitao da li dugme ima potvrdu, pa je tražio da se doda.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T01:49:41Z.

## 2026-11-01, šest običnih podagenata odjednom
- Odluka (menja granicu od dva iz početnog koda): jedan glavni čet može imati do šest aktivnih običnih podčetova. Lakši modeli ostaju na 12. Jedan nivo delegiranja ostaje. Sedmi obični dobija 409 dok se mesto ne oslobodi.
- Razlog: korisnik traži više podagenata odjednom, a broj nije naveo. Šest pokriva paralelan rad punih modela. Neograničen broj i dalje deli jedan folder i troši limite.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T02:20:14Z.
- Zamenjeno 2026-11-01T02:27:52Z: korisnik traži da se ograničenje ukloni.

## 2026-11-01, nema broja istovremenih podagenata
- Odluka (menja granicu od šest i raniju od dva, i poseban kapacitet od 12 za lake modele): jedan glavni čet može pokrenuti onoliko podagenata koliko zadatak traži. 409 ostaje kad isti podagent već radi, kad je agent iscrpljen ili kad nema povezanog agenta sa limitom. Jedan nivo delegiranja ostaje.
- Razlog: korisnik pita zašto broj uopšte postoji, pa traži da se ukloni. Broj nije merio kapacitet računara.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T02:27:52Z.

## 2026-11-01, putanja u četu otvara folder ili fajl
- Odluka: napisana putanja `~/...`, `/Users/...` i `/Volumes/...` u poruci postaje link. Klik otvara folder u Finderu. Command-klik otvara taj fajl. Važi i za skrivenu putanju u home folderu. Pregled foldera i čitanje sadržaja i dalje odbijaju skrivene fajlove.
- Razlog: korisnik hoće da klik na `~/.config/mistral/api_key` otvori folder, a Command-klik sam fajl.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T02:42:28Z.

## 2026-11-01, ⌘1 do ⌘9 bira samo glavne četove
- Odluka: brojne prečice ne otvaraju podagenta, ni kada je njegov red vidljiv ispod roditelja. Brojevi idu redom samo po glavnim četovima.
- Razlog: korisnik traži da Command+1, 2 i 3 nikad ne selektuju podagenta.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T03:05:55Z.

## 2026-11-01, putanja sa razmakom i citat izbora
- Odluka: link putanje obuhvata razmak u imenu kada sledeća reč počinje velikim slovom ili brojem, i celu putanju pod navodnicima. Klik i dalje otvara folder, Command-klik fajl.
- Odluka: dugme ispod unosa veže označeni tekst jedne poruke uz sledeću poruku kao citat sa autorom. Najviše pet delova. Sadržaj fajla se time ne čita.
- Razlog: korisnik ne može da otvori `/Users/.../20261001 Newsmax Balkan/NEDOUMICE.md` jer se link sekao na razmaku, i hoće da označi deo poruke da agent vidi na šta misli.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T22:25:09Z.

## 2026-11-01, izdvojen folder probnog sajta na s83
- Odluka: probni sajt sajt.milev.rs koristi /home/roomstud/sajt.milev.rs umesto foldera ispod public_html.
- Razlog: početni folder je nasledio preusmerenje glavnog sajta; izdvajanje je omogućilo traženu adresu bez izmene postojećeg preusmerenja.
- Obim: samo probni hosting projekat, bez promene koda ili pravila Agent Deska. Node proba na s83 nije uspela i nije proglašena podržanom produkcionom postavkom.
- Izvor: čet e4b6e62e-d56e-4554-8f81-fdcc79fd2c99, zahtev korisnika 2026-11-01T11:13:55.813Z; izveštaj data/prilozi/e4b6e62e-d56e-4554-8f81-fdcc79fd2c99/cp66-s83-test.md.

## 2026-11-01, ⌘E veže citat
- Odluka: ⌘E (Ctrl+E) radi isto što i dugme sa navodnikom. Označeni tekst jedne poruke ide uz sledeću poruku. Ne važi dok su podešavanja ili dijalog otvoreni.
- Razlog: korisnik traži prečicu Command+E za citat.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T22:42:48Z.

## 2026-11-01, citat i slika u tekstu poruke
- Odluka: više označenih delova ostaje zajedno, do pet. U poruci svaki ide kao „tekst“ i red „Iz poruke:“ sa autorom i vremenom. Slika ide kao „naziv fajla“ i putanja, a pre slanja i kao mala sličica kad pregled postoji. Ručica prevlači deo iznad ili ispod drugog dela teksta. Slika iz ranije poruke može da se prevuče u tekst koji se piše.
- Razlog: korisnik hoće da vidi zasebne citate i slike dok piše o jednoj pa o drugoj, sa naznakom odakle je citat.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T22:46:42Z.
- Zamenjeno 2026-11-01: citat i slika više ne stoje iznad polja. Ulaze u samo polje, na kursor.

## 2026-11-01, citat i slika u polju za unos
- Odluka (menja prikaz iznad unosa): citat i slika stoje u polju za poruku, na mestu kursora. Tekst ispred ostaje levo, tekst iza desno, i oba se i dalje pišu. Najviše pet citata. Posle slanja oblik poruke ostaje isti.
- Razlog: korisnik ne može da piše pored citata i slike dok su van polja.
- Izvor: čet ee313d43-2745-43ae-a88d-a7616a2fb90e, 2026-11-01T22:55:20Z.

## 2026-11-03, probni interaktivni Claude uz postojeći UI
- Korisnik je odobrio primenu probnog terminalskog režima uz isti unos, poruke i MD izvoz. Opt-in po četu; ostali zadržavaju -p. Izvor: čet 6608ffcc-727a-4f99-b0b2-3f222e2e7cb0, zahtev 2026-11-03T16:35:47Z.
- Implementacija koristi neizmenjeni CLI u PTY i --resume po potezu, sa transkriptom kao izvorom odgovora. Manja potrošnja nije dokazana za ovu integraciju.

## 2026-11-03, terminalski režim za sve Claude četove
- Korisnik odobrio uključivanje za postojeće i nove četove, posle upozorenja o probnom statusu. Menja prethodni opt-in za samo jedan čet. Eksplicitno claudeTerminal:false ostaje povratak na -p. Izvor: čet 6608ffcc-727a-4f99-b0b2-3f222e2e7cb0, 2026-11-03T17:54:10Z.


## 2026-11-04, jedan tekstualni nacrt sa pregledom slika
- Menja odluke od 2026-11-01 o odvojenim delovima unosa: citat, naziv i putanja slike ulaze kao običan tekst u jedno polje, bez posebne registracije u listi priloga. Pregled slike izvodi se iz teksta ispod polja. Fizički upload sa uređaja ostaje potreban da bi agent mogao da pročita sliku.
- Razlog: odvojeni delovi su pravili uske i visoke kolone; korisnik traži čitljivost, obično brisanje i Ctrl+Z. Stari delovi automatski se spajaju bez promene redosleda.
- Izvor: čet 9c3b2f0d-d05c-41fe-8fb4-4bdf86373210, zahtev 2026-11-03T23:08:13.992Z i priloženi snimak.

## 2026-11-04, prekid glavnog četa ne gasi podagente
- Odluka: POST /api/chats/ID/stop zaustavlja samo taj čet i pauzira njegov red. Podagenti nastavljaju i zaustavljaju se svaki posebno.
- Razlog: korisnik traži da se podagenti ne stopiraju kad se jedan model zaustavi.
- Izvor: čet 6608ffcc-727a-4f99-b0b2-3f222e2e7cb0, 2026-11-04T20:19:36Z.

## 2026-11-05, odgovor vodi korisnika kroz projekat
- Odluka: završni odgovor ima Urađeno: (jedna rečenica), do dve rečenice konteksta i jedan red za akciju: Pitanje: sa preporukom ili Sledeće: sa predlogom koraka. Najviše jedno pitanje. Detalji idu u fajl ili na zahtev; kritika do dve rečenice. Menja pravilo „najviše 5 kratkih redova“.
- Razlog: korisnik kaže da ga odgovori teraju da čita mnogo, a hoće da ga agent vodi i traži najvažniji unos.
- Izvor: čet da2d9653-41cb-40eb-918a-fee6eaa02dc5, 2026-11-04T23:26:36Z.

## 2026-11-05, zaobljenje sa jednog mesta, za sada oštre ivice
- Odluka: sva zaobljenja u public/style.css idu preko `--r-sm`, `--r-md`, `--r-lg` (:root). Trenutno su 0. Zaobljen izgled se proba promenom te tri vrednosti (predlog 4px, 8px, 12px).
- Razlog: korisnik hoće jednu definiciju koja važi svuda; prvo oštre ivice, zatim zaobljene.
- Izvor: čet 09ee91d5-6faa-44b5-88a1-55519ebaeaee, 2026-11-05T01:46:08Z.

## 2026-11-05, Prilagođavanje i Dispečer sakriveni
- Odluka: dugmad i folder Prilagođavanja i Dispečera sakriveni su u interfejsu; tri prilagodljiva agenta su na statusu „pauziran“. Kod, četovi i podaci ostaju radi povratka.
- Razlog: korisnik ih ne koristi (prilagođavanje samo 2026-11-03, dispečer pregled poslednji put 2026-10-23), a agenti su trošili limit sami.
- Izvor: čet 09ee91d5-6faa-44b5-88a1-55519ebaeaee, 2026-11-05T01:47:12Z.

## 2026-11-05, agent pita samo ono što zna korisnik i ne ponavlja preskočeno pitanje
- Odluka: dopuna pravila odgovora. Pitanje: samo za podatak, utisak ili odluku o cilju; tehnički korak agent bira sam i predlaže kao Sledeće:. Pitanje koje je korisnik preskočio novim pravcem ne ponavlja se.
- Razlog: provera 45 odgovora, 13/28 pitanja preskočeno, ista pitanja ponavljana do 3 puta (data/prilozi/da2d9653-41cb-40eb-918a-fee6eaa02dc5/provera-pitanja-2026-11-05.md).
- Izvor: čet da2d9653-41cb-40eb-918a-fee6eaa02dc5, 2026-11-05T12:37Z.

## 2026-11-05, Antigravity podagenti na Claude Sonnet-u
- Odluka: agy bez izabranog modela dobija `--model claude-sonnet-4-6` (adapters.mjs, ANTIGRAVITY_DEFAULT_MODEL), umesto Gemini Flash. Opus ostaje izbor po četu.
- Razlog: korisnik ne veruje Gemini rezultatima, a AG Claude/GPT kvota nije trošena. Merenje istog zadatka: Sonnet 6% 5h i 3% nedeljno, Opus 34% i 17%.
- Izvor: čet 09ee91d5-6faa-44b5-88a1-55519ebaeaee, 2026-11-05T12:33:36Z (korisnik predložio i Opus; zamenjen Sonnet-om posle merenja).

## 2026-11-06, arhiva četova 3 dana
- Odluka: rok čuvanja arhiviranih četova je 3 dana (menja 30 dana). Postojeće arhive zadržavaju svoj upisani rok dok korisnik ne odluči drugačije.
- Izvor: čet b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-06T14:39:58Z.
- Dopuna 2026-11-06T14:42Z: korisnik potvrdio da i postojeće arhive dobiju rok od 3 dana; 409 starijih obrisano.
- Dopuna 2026-11-06T14:44Z: istek arhive briše i Claude sesiju (transkript), da četovi nestanu i iz Claude aplikacije; rok ostaje 3 dana. Ručno pokrenute Claude sesije se ne brišu.

## 2026-11-06, agenti sami commituju
- Odluka: posle izmene i uspešnog npm test agent commituje bez pitanja (AGENTS.md pravilo 7). Push na GitHub samo na zahtev.
- Izvor: čet b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-06T14:48:42Z.

## 2026-11-06, tabla projekata kao pregled više projekata
- Odluka: uz chat postoji tabla projekata koja pokazuje sve aktivne projekte i pitanja agenata; odgovori i uputstva idu sa table u postojeći čet projekta. Tabla meri prelaze između projekata i vreme odgovora i daje predloge po pravilima (docs/tabla-projekata.md).
- Razlog: korisnik radi na više projekata istovremeno, a chat ga usporava; traži da se njegovo ponašanje analizira i pristup unapređuje.
- Izvor: čet 4c7a0f5b-b2ca-4ce5-930d-ba5ccf7e883b, 2026-11-06T15:13Z i 15:18Z.

## 2026-11-07, slike redom, jedan generator
- Odluka: izuzetak od neograničenog broja podčetova: za slike radi najviše jedan generator u isto vreme, slike idu jedna po jedna, generator dobija samo umanjenu ulaznu fotografiju i kratak prompt, a nova tura ide u novom podčetu.
- Razlog: pet paralelnih GPT podčeta čekalo je po ~20 min na sliku, slalo ~90k tokena po koraku i stalan upload od 6 do 7 Mbit/s; korisnik ne želi da se resursi troše bez koristi.
- Izvor: čet 3f369728-a996-46e2-afb3-e8537fec4053, 2026-11-07T07:41Z.
- Dopuna 2026-11-07T07:45Z: ograničenje važi po modelu: najviše jedan generator po modelu (GPT/Codex, Grok, Gemini), različiti modeli rade istovremeno, unutar modela redom. Razlog: Grok je dao 3 slike za oko 9 minuta, a GPT oko 20 minuta po slici, pa paralelni rad različitih modela ne usporava. Korisnik potvrdio u četu 3f369728.

## 2026-11-07, glavni agent ne čeka podčetove
- Odluka: posle delegiranja glavni agent završava odgovor; Agent Desk ga budi automatskim izveštajem kad podčet završi ili javi grešku (child-report.mjs). Važi za sve agente.
- Razlog: korisnik hoće da glavni agent ne stoji uključen dok podčetovi rade, da se radi uporedo i ne čeka sve da bude gotovo.
- Izvor: čet 3f369728-a996-46e2-afb3-e8537fec4053, 2026-11-07T07:53Z.
- Dopuna 2026-11-07T08:03Z: izveštaj podčeta nosi i pravilo arhiviranja: podčet čiji je rezultat preuzet i zabeležen, a više nije potreban, glavni agent arhivira. Korisnik tražio u četu 3f369728.

## 2026-11-07, red za GPT slike u serveru
- Odluka: pravilo „jedan generator slika“ server sprovodi za GPT/Codex, preko svih četova (image-queue.mjs). Grok i Gemini ostaju samo na uputstvu dok se ne izmeri preklapanje.
- Razlog: pravilo je bilo samo tekst u uputstvu, pa su nezavisni četovi mogli istovremeno da pokrenu GPT generatore; korisnik pitao da li važi samo za ChatGPT.
- Izvor: čet b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-07T10:11Z.

## 2026-11-07, više Google i GitHub naloga
- Odluka: Agent Desk povezuje više Google naloga istim OAuth klijentom (token po nalogu, izbor preko `?account=`) i prikazuje sve gh naloge; nepoznat ili istekao nalog vraća grešku umesto tihog prelaska na glavni.
- Razlog: korisnik želi pristup i ROOM211 pošti i Drive-u (room211.studio, Google Workspace), sa slikama profila i adresama u podešavanjima; pošta za ROOM211 ne stiže u milev051.
- Izvor: čet b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-07T17:15Z.
- Dopuna 2026-11-07T17:25Z: pretraga repozitorijuma uklonjena iz podešavanja na zahtev korisnika.
- Dopuna 2026-11-07T17:58Z: podešavanja bez dugih objašnjenja; korisnik smatra da je dovoljno videti šta je povezano. Uputstva ostaju u docs/.

## 2026-11-07, Google aplikacija objavljena
- Odluka: Google OAuth aplikacija Agent Deska (projekat Default) prebačena iz Testing u In production, bez Google verifikacije. Branding: milev.rs/agent-desk/, milev.rs/privatnost/, domen milev.rs.
- Razlog: korisnik traži pravi, trajan pristup umesto test režima u kom prijava ističe posle 7 dana i rade samo test korisnici.
- Izvor: čet b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-07T18:14Z; potvrdu „Confirm“ kliknuo korisnik 2026-11-07T18:22Z.
- Dopuna 2026-11-07T18:24–18:32Z: jedini način dodavanja naloga je „+ Dodaj nalog“ (prvi Google nalog postaje glavni), radnje naloga su ikonice; isto za GitHub. Razlog: korisnik ne želi razliku „Poveži“/„Dodaj nalog“ ni tekstualna dugmad.
- Dopuna 2026-11-07T18:37–18:39Z: uklanjanje naloga traži potvrdu Da/Ne; WebPros dobio isti izgled kao Google i GitHub. Razlog: korisnik tražio potvrdu posle odjave GitHub naloga iz gh jednim klikom.

## 2026-11-09, red podčetova po opterećenju računara
- Odluka: Agent Desk meri CPU i memoriju po četu (stablo procesa) i kad je računar preopterećen (load ≥ 2 × jezgra, kritičan pritisak memorije, ili swap ≥ 90 % uz pritisak) novi podčetovi čekaju u redu i kreću jedan po jedan na 45 s. Sam pun swap ne blokira, jer na macOS-u ostaje pun i posle rasterećenja.
- Razlog: na 8 jezgara i 8 GB, 7 do 8 podagenata uz headless Chrome i nuxt dev dizali su load na 38 do 70 i swap na 5,4 od 6 GB, a server se restartovao; broj agenata se određivao ručno.
- Izvor: zahtev iz četa 16e6c21a, urađeno u četu b7edfcb8-2c8c-4be7-b980-f0660ae86bc8, 2026-11-09T16:18Z.

## 2026-11-16, Codex i Grok isključeni
- Odluka: Codex i Grok uklonjeni iz Agent Deska i aplikacije Limiti; isključenje ide preko `data/agents.json` ({"disabled":[...]}), pa se agent vraća bez izmene koda. Sa dva agenta ikonice menija logoa stoje stalno u gornjem redu.
- Razlog: korisnik javio da ne rade („ukloni ih ipak ne rade“). Provera je pokazala da je Grok odgovarao, a Codex padao samo zbog modela gpt-6.1-sol; korisnik je ipak tražio uklanjanje.
- Izvor: čet 8a4e27dd-da48-4aa6-b4e8-a497dcd8c9fb, 2026-11-16T11:38Z i 11:48Z.
- Dopuna 2026-11-16T12:00Z: gornji red sa limitima i ikonicama uklonjen iz bočne trake; ostaju tri male ikonice (dva agenta za nov čet, zupčanik), a radnje su u podešavanjima. Razlog: korisnik: „limiti nam ne trebaju jer ih imamo u aplikaciji za limite i u samom chatu“.

## 2026-11-17, glavni čet samo upravlja
- Odluka: u svim četovima Agent Deska glavni agent izvršni posao (kod, testovi, objava, instalacija, istraživanje, pregledač) daje podagentu i odmah završava odgovor; sam radi samo kratke provere, plan, objedinjavanje i beleške. Izuzetak: izričit zahtev korisnika da radi sam, ili čisto informativan odgovor. Pravilo je u uputstvu koje server šalje svakom glavnom četu (`managerRule`), za sve agente.
- Razlog: korisnik hoće da glavni čet ostane slobodan za upravljanje i rad na projektu bez ometanja procesa koji rade.
- Izvor: čet 8a4e27dd-da48-4aa6-b4e8-a497dcd8c9fb, 2026-11-17T12:12Z.

## 2026-11-17, glavni agent uvek imenuje podagenta
- Odluka: uz svaki delegate (nov podčet i nastavak preko childId) glavni agent šalje `name` sa kratkim nazivom trenutnog zadatka; server tim imenom preimenuje postojeći podčet. Važi za sve četove i agente.
- Razlog: korisnik 2026-11-17T12:54Z: „neka agent preimenuje podagente sam uvek kad im daje sta da rade“.
- Izvor: čet 8a4e27dd-da48-4aa6-b4e8-a497dcd8c9fb, urađeno u podčetu d801cdc0-5c09-4b59-be9f-c59683064d67.

## 2026-11-18, glavni čet nikad ne radi sam
- Odluka: zamenjuje izuzetak iz odluke od 2026-11-17. Glavni čet nikad ne izvršava posao sam, ni kad korisnik napiše „uradi to i to“; takva poruka znači dodeli podagentu. Dozvoljen je samo odgovor koji je čista informacija bez izmena, kratke provere, plan, objedinjavanje i beleške projekta.
- Tehnički: Claude glavni čet dobija `--disallowedTools Agent,Task,Workflow,NotebookEdit`, PreToolUse hook `manager-guard.mjs` i Bash ograničenje od 30 s. Beleške (STANJE.md, ODLUKE.md, HRONOLOGIJA.md, projekti.md, memorija) i scratchpad ostaju dozvoljeni za Write i Edit, zato Write i Edit nisu potpuno zabranjeni. Podčetovi ne gube nijedan alat. Delegate za zauzet podčet stavlja zadatak u red podčeta umesto 409.
- Ograničenje: Antigravity CLI ne prihvata spisak zabranjenih alata kroz `--settings`, pa tamo važi samo pravilo. Bash upis fajla (npr. kroz python) hook ne prepoznaje.
- Razlog: korisnik: „nikad, cak iako mu kazem 'uradi to i to' on treba uvek da dodeli task“. Čet Newsmax Balkan je 9,5 minuta čekao u Bash petlji jer je delegate vraćao 409 dok podčet radi.
- Izvor: čet 8a4e27dd-da48-4aa6-b4e8-a497dcd8c9fb, 2026-11-18T09:30Z.

## 2026-11-18, glavni čet sam procenjuje prekid podčeta
- Odluka: kad korisnik javi nešto što se tiče podčeta koji radi, glavni agent proveri čime se podčet bavi i prekida ga (`interrupt:true` na delegate) samo kad bi nastavak bio uzaludan posao. Dopuna ili nedoumica ide u red bez prekida, a informacija koja se ne tiče podčeta ga ne dira. Korisniku kaže šta je uradio.
- Tehnički: prekid koristi postojeći red podčeta, pa zadaci iz reda odlaze zajedno sa novom porukom, jednom. Prekinut odgovor ostaje sa statusom `stopped`, bez izveštaja roditelju i dispečeru i bez automatskog nastavka.
- Razlog: korisnik: „ako se desi slucaj da agentu prosledim nesto sto je vezano za podagenta neka ga slobodno stopira i prosledi tu informaciju da ne bi radio bezveze“.
- Izvor: čet 8a4e27dd-da48-4aa6-b4e8-a497dcd8c9fb, urađeno u podčetu 6bd3230e-bc27-460d-abf1-c87fbccd1611, 2026-11-18T11:49Z.
