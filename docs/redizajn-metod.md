# Redizajn: metod iz Theovog videa i plan za Agent Desk

_2026-11-05, čet 09ee91d5-6faa-44b5-88a1-55519ebaeaee_

## Vraćanje na stari izgled
Ceo folder pre redizajna (i necommitovane izmene) je sačuvan kao git oznaka
`dizajn-pre-redizajna-2026-11-05`. Grana `main` nije menjana.
- Pregled: `git show dizajn-pre-redizajna-2026-11-05 --stat`
- Vraćanje samo izgleda: `git checkout dizajn-pre-redizajna-2026-11-05 -- public/style.css public/index.html`
- Oznaka je lokalna; na GitHub ide tek sa `git push origin dizajn-pre-redizajna-2026-11-05`.

## Šta je Theo uradio (video „Agents Sucked At UI (Until Today)“, 2026-11-03)
Izvori: titlovi videa, skill `t3dotgg/tstack/skills/council/SKILL.md`, PR pingdotgg/t3code#24865.
1. Nije dodavao skillove za dizajn niti angažovao dizajnera. Problem je pretvorio u „hill climb“: petlju sa ocenom.
2. „Council“: tri modela različitih proizvođača (Opus, GPT, Gemini) dobiju snimke ekrana, samo čitaju i daju ocenu od 10 po kategorijama (hijerarhija, tipografija, ikone, boja i kontrast…).
3. Glavni agent ispravi ono oko čega se slažu, napravi nove snimke, nova runda. Kraj kad svi daju 9 ili više.
4. Ključni trik: u ocenjivanje je ubacio snimke Claude Code i Codex aplikacija kao referencu. Bez poređenja modeli su davali 9/10 za izgled koji je uz poređenje bio 7,4.
5. Da štedi limit: prvo samo jedan jeftiniji ocenjivač dok ne dostigne prag, pa tek onda skuplji.
6. Nov izgled je iza prekidača Settings → Beta → New design (`data-redesign` na `<html>`), pa korisnik bira stari ili novi.
7. Konkretne izmene (PR #24865, +583/−269, 59 fajlova): skala zaobljenja 4/6/8/12/16, debljina ikona 1,75, sive ikone do hovera, pročitani naslovi na 75% svetline, metapodaci korak tiši, jedan stil kontrola, tekst četa na 90%, tokeni za kontrast.
8. Trošak: oko 17,6 h rada agenata i oko 250–400 $ procenjene potrošnje. Za 9,5 je trebalo 10 dodatnih rundi.

## Ograničenja metoda (iz samog videa)
- Ocene su nedeterminističke: isti snimak, isti model, različita ocena. Ocene referentnih aplikacija su rasle iako se snimci nisu menjali.
- Ako ocenjivač zna ciljnu ocenu, to može da utiče na ocenu. Theo predlaže da se cilj ne kaže ocenjivačima.
- Posle više rundi dizajn je postao previše siv, pa je morao ručno da traži vraćanje boje. Završnu reč ima čovek.

## Jeftinija verzija za Agent Desk
- Ocenjivači kroz `delegate`, samo čitanje: claude i antigravity (limit 100%). Codex samo u završnoj rundi (nedeljni 22%).
- Snimci: `/snapshot` za desktop i mobile, isti scenario (lista četova, otvoren čet sa porukama, podagent koji radi, podešavanja).
- Referenca: 2–3 snimka drugih aplikacija (npr. Claude desktop, ChatGPT) koje korisnik napravi.
- Najviše 3 runde; cilj se ne saopštava ocenjivačima; kraj kad su ocene stabilne ili kad korisnik kaže da je dobro.
- Nov izgled iza prekidača (`data-redesign` na `<html>`) da se lako upoređuje i vraća.
- Prvo sređivanje tokena u `public/style.css` (201 boja, 74 veličine fonta), da izmene budu male i dosledne.
