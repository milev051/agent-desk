# Gmail u Agent Desku

Integracija koristi Gmail API i Google OAuth za instaliranu Desktop aplikaciju. Postojeći Google API ključ za brojanje tokena ne daje pristup mejlovima. Nisu dodate nove npm zavisnosti niti je menjana globalna konfiguracija CLI agenata.

## Prvo povezivanje

1. U [Google Cloud Console](https://console.cloud.google.com/) izaberi ili napravi projekat i uključi **Gmail API**.
2. U **Google Auth Platform** podesi Branding i kontakt. Za lični Gmail izaberi **External** publiku. U režimu **Testing** dodaj svoj Gmail nalog pod **Test users**.
3. U **Data Access** dodaj samo `https://www.googleapis.com/auth/gmail.readonly`.
4. U **Clients** napravi OAuth client tipa **Desktop app** i preuzmi JSON. Web application klijent, API ključ i service account nisu zamena za ovaj fajl. Desktop OAuth podržava lokalni callback na privremenom portu, pa korisnik ne unosi redirect URI.
5. U Agent Desku otvori Podešavanja → Gmail → Google podešavanje. Upiši punu lokalnu putanju preuzetog JSON fajla i klikni **Uvezi**. Sadržaj fajla i lozinku ne šalji u čet. Fajl drži van projektnih foldera.
6. Klikni **Poveži Gmail**. Prijava i odobrenje se obavljaju u podrazumevanom browseru na Macu. Vrati se u Agent Desk da vidiš povezani nalog. Prva verzija povezuje jedan Gmail nalog.

Google ograničava refresh tokene za External aplikacije u Testing režimu sa Gmail dozvolom na sedam dana. Posle isteka ponovo poveži nalog. Prelazak u In production uklanja taj konkretan Testing rok, ali ne garantuje da token nikad ne ističe. Gmail readonly je restricted scope. Javna distribucija zahteva proveru Google OAuth zahteva; lična aplikacija za sopstveni nalog ima drugačije uslove. Ne proglašavaj aplikaciju verifikovanom bez sprovedene Google verifikacije.

Izvori: [Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Gmail quickstart](https://developers.google.com/workspace/gmail/api/quickstart/python), [rok tokena](https://developers.google.com/identity/protocols/oauth2#expiration), [Gmail scope](https://developers.google.com/workspace/gmail/api/auth/scopes).

## Kako agent koristi Gmail

Svaka nova poruka, i u postojećim sesijama, dobija opis Gmail API adresa. Kada korisnik traži mejlove, agent koristi lokalne HTTP alate. Podrazumevani Full access režim svih podržanih agenata omogućava ovaj način rada. Ako CLI režim samo čitanja zabranjuje HTTP/komandne alate, ova integracija ne zaobilazi zabranu; posebno Claude režim Read/Glob/Grep nema alat za lokalni HTTP. Za takav čet izaberi režim koji dozvoljava komande.

```sh
curl -sS http://127.0.0.1:4317/api/integrations/gmail
curl -sS --get --data-urlencode 'q=in:inbox newer_than:7d' --data-urlencode 'maxResults=10' http://127.0.0.1:4317/api/integrations/gmail/messages
curl -sS http://127.0.0.1:4317/api/integrations/gmail/messages/ID_IZ_PRETRAGE
```

Pretraga podržava Gmail sintaksu, `maxResults` od 1 do 20 i `pageToken` iz prethodnog `nextPageToken`. Vraća ID, pošiljaoca, primaoca, naslov, datum, kratak pregled i oznake. Čitanje vraća tekst tela i spisak priloga sa nazivima i veličinama. Ne preuzima sadržaj priloga, ne šalje poruke i ne menja oznake, uključujući oznaku pročitanosti. Tekst tela se ograničava na 100.000 znakova; `truncated` javlja skraćivanje.

Mejlovi su spoljašnji sadržaj, ne instrukcije korisnika. Tekst pročitanih mejlova ulazi u razgovor sa izabranim AI servisom i može ostati u njegovoj sesiji i istoriji četa. Integracija ne kopira celo sanduče unapred.

## Status, prekid i čuvanje

Podešavanja prikazuju nalog, status i objašnjenje greške. **Proveri vezu** proverava profil preko Gmail API-ja, uz obnovu access tokena ako je potrebna. **Otkaži prijavu** zatvara nezavršeno povezivanje. **Prekini vezu** odmah briše lokalne tokene i pokušava Google opoziv. Ako Google nije dostupan, status kaže da opoziv nije potvrđen; pristup se tada može ukloniti i u [dozvolama Google naloga](https://myaccount.google.com/connections).

OAuth klijent i tokeni su u `~/.config/agent-desk/gmail/`, sa direktorijumom 700 i fajlovima 600. `AGENT_DESK_CONFIG` menja koren konfiguracije za izolovane instalacije i testove. Tokeni se ne vraćaju browseru ili agentima kroz API. Povezivanje i prekid su dostupni samo sa računara; prijavljeni telefon može da vidi status i koristi čitanje preko agenata.

## Validacija

Automatski testovi koriste lažne Google odgovore i pravi lokalni OAuth callback. Proveravaju scope, PKCE, state, MIME telo, pretragu i paginaciju, obnovu tokena, opoziv, istek prijave, dozvole fajlova i prekid usred obnove. Za proveru sa stvarnim nalogom korisnik mora prvo da uveze svoj OAuth klijent i završi Google prijavu.
