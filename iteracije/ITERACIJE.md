# Iteracije · Agent Desk

## 2026-11-21 11:55 · ažuriranje aplikacije sa GitHub-a
- **Citat:** „ljudi koji su klonirali repo treba da vide kad postoji novo ažuriranje“ (zadatak glavnog četa Agent Desk 6, podčet d8279741)
- **Razlog:** repo milev051/agent-desk je javan i drugi ga kloniraju; treba da vide nove izmene i ažuriraju jednim klikom.
- **Urađeno:** `app-update.mjs` (git fetch pri pokretanju i na 4 h, pull --ff-only, npm install samo za promenjen package-lock, restart whenIdle), `public/app-update.mjs` (zelena strelica levo od zupčanika, prozor sa brojem i naslovima izmena, Ne/Da). Odbija bez diranja kod necommitovanih izmena, druge grane ili lokalnih commitova. Uz to commitovan `board-router.mjs`, koji `server.mjs` uvozi od d644eec, a nije bio u repou, pa čista kopija sa GitHub-a nije mogla da se pokrene.
- **Dokaz:** npm test; probni server na kopiji 2 commita iza origin-a: ikonica, prozor i poruka odbijanja. Snimci u `iteracije/snimci/` (azuriranje-prozor.jpg, azuriranje-odbijeno.png, pregled-racunar, pregled-telefon); pre izmene ikonice nema, snimak „pre“ nije pravljen.
- **Status:** zadržano
