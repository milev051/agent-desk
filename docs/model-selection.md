# Modeli i reasoning

Logika je ponovo implementirana prema read-only pregledu instaliranog AionUi 2.2.2 (`agentRuntimeCatalog` i `RuntimeSelectorPill`), bez kopiranja njegovog minifikovanog koda ili menjanja aplikacije.

- Modeli i njihove reasoning opcije potiču iz agent metadata. Ne postoji jedna zajednička lista nivoa.
- Codex: lokalni `models_cache.json`, samo javna model polja `slug`, `display_name`, `visibility`, `supported_reasoning_levels`.
- Claude: native stream-json initialize kontrolni zahtev, bez prompta i bez alata. `supportsEffort` i `supportedEffortLevels` imaju prednost nad AionUi snapshotom. Instalirani CLI ne oglašava Ultracode u ovoj listi, iako ga AionUi katalog navodi.
- Grok: `grok models` osvežava dostupne modele; reasoning opcije iz AionUi provider `thought_level` konfiguracije pridružuju se poznatim modelima. Izvor ne daje posebne liste po Grok modelu, pa se ne tvrdi da su zasebno proverene. Novi nepoznat model nema izmišljene reasoning opcije.
- Antigravity: model ID već sadrži nivo (npr. `gemini-3.8-flash-high`). Nema zasebnog reasoning selectora. Chat adapter je povezan preko `agy` headless režima.
- Ručni nepoznat model dopušten je uz podrazumevani reasoning. Backend odbija nepodržane kombinacije pre pokretanja CLI-ja.
- Promena modela poništava izabrani reasoning. Promene važe od sledeće poruke, koristeći postojeću native sesiju. Ovo su effort nivoi, a ne numerički budžet reasoning tokena; numerički budžet se ne izmišlja ako ga agent ne izlaže.

Katalog se kešira pet minuta. Claude, Antigravity i Grok imaju rezervni snapshot iz AionUi kataloga od 3. oktobra 2026; snapshot nije garancija pretplatničkog pristupa. Konačan pristup potvrđuje prijavljeni CLI pri zahtevu. Za ponovno preuzimanje unutar AionUi terminala:

```sh
"$AIONUI_HELPER_BIN" config agents list | node tools/import-catalog.mjs
```

Importer čuva samo modele i nivoe, bez naloga, ključeva, komandi agenata ili MCP konfiguracije. Nakon importa server učitava snapshot po isteku keša.

# Markdown i kopiranje

Poruke se renderuju kroz [Marked](https://marked.js.org/) sa GFM tabelama, listama, naslovima i blokovima koda. HTML se filtrira kroz [DOMPurify](https://github.com/cure53/DOMPurify) sa ograničenom listom oznaka i atributa. Skripte, inline stilovi, forme, slike i događaji nisu dozvoljeni. Biblioteke se poslužuju lokalno.

Ikonica za kopiranje čuva tačan izvorni tekst poruke, uključujući Markdown. Privremena kvačica potvrđuje uspešan clipboard write; neuspeh prikazuje grešku.

## Antigravity adapter i nalog

`agy models` osvežava model ID-jeve i nazive. `--input-format stream-json --output-format stream-json` prima jedan `user` događaj; `init.conversation_id` čuva native sesiju, `step_update.text_delta` dopunjuje odgovor, a terminalni `result.response` daje konačan tekst bez duplikata. `--conversation` nastavlja tačno odabranu sesiju. Greške koraka prikazuju se i kad završni status glasi SUCCESS. Full access prosleđuje `--dangerously-skip-permissions`; read-only nije predstavljen kao podržan režim. Slash komandna ekspanzija je isključena za poruke.

[Doku­mentacija headless režima](https://www.antigravity.google/docs/cli/headless/) i [prijava](https://www.antigravity.google/docs/cli/install/). Promenu naloga radi korisnik u zvaničnom CLI toku u terminalu; interfejs ne preuzima kredencijale.
