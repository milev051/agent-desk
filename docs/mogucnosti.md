# Mogućnosti Agent Deska

Pregled mogućnosti lokalne aplikacije Agent Desk. Uz svaku mogućnost naveden je primer šta korisnik može reći agentu u četu.

- **Četiri CLI agenta i modeli:** Podrška za Codex CLI, Claude Code, Grok Build i Antigravity CLI uz izbor odgovarajućeg modela i nivoa razmišljanja za svaki zadatak („prebaci ovaj čet na Claude Sonnet 4.5 sa visokim nivoom razmišljanja“).
- **Automatski izbor agenta:** Mogućnost automatskog rutiranja zadatka prema vrsti posla i trenutnoj dostupnosti („delegiraj ovaj zadatak automatski najpovoljnijem agentu“).
- **Podčetovi i delegiranje radnika:** Glavni agent može da otvori do dva paralelna podčeta koji rade u istoj fascikli i imaju sačuvane sesije („pokreni podagenta sa Codex-om da napiše testove za ovu funkciju dok ti istražuješ“).
- **Praćenje i zaštita limita:** Evidencija potrošnje i preostalih kvota po agentima i prozorima obnove, uz automatsko sprečavanje pokretanja iscrpljenih agenata („proveri limite agenata pre nego što delegiraš veliki posao“).
- **Projekti i radni folderi:** Povezivanje proizvoljnih lokalnih projektnih fascikli na Macu, uz automatsko mapiranje i evidenciju u spisku projekata („postavi radni folder ovog četa na /Users/milev051/Desktop/milev.rs“).
- **Stanje projekta (`STANJE.md`):** Kratak sažetak stanja projekta do 15–20 redova koji agenti čitaju pri ulasku i ažuriraju na kraju rada („pročitaj STANJE.md ovog projekta i reci mi gde smo stali“).
- **Nastavak rada u novom četu:** Sažimanje duge istorije i prenošenje u čist čet sa istim podešavanjima uz ažuriranje stanja („nastavi ovaj razgovor u novom četu i napravi sažetak prethodnog rada“).
- **Kratki odgovori agenata:** Sažeto formatiranje u najviše 5 redova sa oznakama Urađeno, Proveri i Pitanje, bez nepotrebnog brbljanja („napiši samo šta je urađeno i imaš li neko pitanje“).
- **Zvučna i vizuelna obaveštenja:** Web Audio tonovi za završetak odgovora, pitanje ili grešku, kao i desktop i push obaveštenja na telefonu („javi mi zvukom kad završiš kompajliranje“).
- **Prijavljeni telefon i daljinski pristup:** Rad sa istim četovima sa telefona preko Tailscale privatne veze i PWA interfejsa („otvoriću ovaj isti čet na telefonu dok sam van radnog stola“).
- **Google Gmail integracija:** Pretraga, čitanje, priprema nacrta i slanje mejlova preko lokalnog API-ja uz izričito odobrenje („pronađi nepročitane mejlove od klijenta i sastavi nacrt odgovora“).
- **Google Drive integracija:** Pretraga fascikli, čitanje tekstualnog sadržaja dokumenata i kreiranje novih fajlova („pretraži moj Google Drive za ugovor i preuzmi njegov tekst“).
- **Google Tasks integracija:** Čitanje spiskova zadataka, kreiranje novih obaveza i označavanje završenih („dodaj novi zadatak u Google Tasks sa rokom za sutra u 10 sati“).
- **Google Calendar integracija:** Pregled zakazanih događaja, planiranje sastanaka, pomeranje termina i slanje pozivnica („proveri šta imam u kalendaru u petak popodne i zakaži pregled koda“).
- **Rad sa lokalnim fajlovima i prilozi:** Prikaz stabla fajlova, diff pregled izmena, kačenje slika iz privremene memorije i preuzimanje priloga („prikaži razlike koje si napravio u ovom fajlu“).
- **Glasovno čitanje naglas (TTS):** Pretvaranje odgovora agenta ili izabranog teksta u prirodan govor na srpskom jeziku („pročitaj naglas tvoj poslednji odgovor“).
- **Restart servera preko API-ja:** Bezbedno ponovno pokretanje lokalnog servera uz opciju čekanja da svi aktivni agenti završe rad („zakaži restart servera čim svi agenti završe trenutne poslove“).
- **Dnevna provera i zagrevanje agenata:** Mogućnost automatskog slanja kratke probne poruke agentima jednom dnevno radi provere rada i sesija, a kad pišeš jednom agentu, ostali sa nepokrenutim 5h ili nedeljnim limitom dobiju kratku poruku da limiti počnu zajedno („proveri da li se svi CLI agenti uspešno odazivaju“).
- **Statistika tokena i procena troškova:** Detaljan uvid u iskorišćene ulazne, izlazne i keširane tokene po modelu i procena API cene („prikaži mi ukupnu potrošnju tokena u ovom projektu“).
- **Red čekanja za poruke:** Slanje novih poruka u red dok agent još radi, uz automatsko izvršavanje redom („stavi ovo pitanje u red čekanja dok trenutni zadatak ne bude gotov“).

- **Dispečer projekata:** jedan pregled kratkih beležaka svih četova i razgovor sa manjim agentom o tome šta je urađeno, šta preostaje i šta čeka tebe, bez pokretanja modela pri osvežavanju pregleda („otvori Dispečer i reci šta je ostalo na Okanoviću“).
