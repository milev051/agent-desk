// Quota readers adapted from the local Limiti app. Credentials never leave this process except for requests to their own provider.
import Foundation
struct Prozor: Identifiable {
    let id = UUID()
    let naziv: String
    let procenat: Double
    let reset: Date?
    var quotaGroup: String? = nil

    // Prikazuje se koliko je ostalo, a procenat ostaje potrošnja, kao u API-ju.
    var ostalo: Int { max(0, 100 - Int(procenat.rounded())) }
    var potrosen: Bool { ostalo == 0 }
}

struct Izvor: Identifiable {
    let id: String
    let ime: String
    let skraceno: String
    let imeUTraci: String
    var plan: String?
    var prozori: [Prozor] = []
    var napomena: String?
    var greska: String?
    var azurirano: Date?

    // U traci su samo glavni prozori, bez posebnih nedeljnih limita po modelu.
    // Ako je nedelja potrošena, 5h limit se ne prikazuje.
    var zaTraku: [Prozor] {
        let p = prozori.filter { !$0.naziv.contains(",") }
        return nedeljaPotrosena ? p.filter { $0.naziv != "5 sati" } : p
    }
    var vidljiviProzori: [Prozor] {
        nedeljaPotrosena ? prozori.filter { $0.naziv != "5 sati" } : prozori
    }
    var najveci: Double? { zaTraku.map(\.procenat).max() }
    var nedeljaPotrosena: Bool {
        prozori.contains { $0.naziv.contains("Nedelja") && $0.ostalo == 0 }
    }
}

struct Ocitavanje {
    var plan: String?
    var prozori: [Prozor]
    var napomena: String? = nil
}

struct GreskaIzvora: Error {
    let poruka: String
    let pauza: Double?
    init(_ poruka: String, pauza: Double? = nil) { self.poruka = poruka; self.pauza = pauza }
}

// MARK: - Preuzimanje

func preuzmiJSON(_ zahtev: URLRequest, prijava: String, retryConnection: Bool = true) async throws -> [String: Any] {
    let podaci: Data
    let odgovor: URLResponse
    do {
        (podaci, odgovor) = try await URLSession.shared.data(for: zahtev)
    } catch {
        guard retryConnection else { throw GreskaIzvora("Nema veze sa serverom.") }
        // Jedan ponovni pokušaj, jer veza ume da pukne posle buđenja računara.
        try? await Task.sleep(for: .seconds(2))
        guard let drugi = try? await URLSession.shared.data(for: zahtev) else {
            throw GreskaIzvora("Nema veze sa serverom.")
        }
        (podaci, odgovor) = drugi
    }
    let kod = (odgovor as? HTTPURLResponse)?.statusCode ?? 0
    switch kod {
    case 200: break
    case 401, 403: throw GreskaIzvora(prijava)
    case 429:
        let retry = (odgovor as? HTTPURLResponse)?.value(forHTTPHeaderField: "Retry-After").flatMap(Double.init) ?? 600
        throw GreskaIzvora("Server traži pauzu (429). Očitavanje je privremeno usporeno.", pauza:max(120,retry))
    default: throw GreskaIzvora("Server je vratio grešku \(kod).")
    }
    guard let json = try? JSONSerialization.jsonObject(with: podaci) as? [String: Any] else {
        throw GreskaIzvora("Odgovor servera nije u očekivanom obliku.")
    }
    return json
}

func datumIzISO(_ tekst: String) -> Date? {
    // Anthropic vraća mikrosekunde, koje ISO8601DateFormatter ne čita pouzdano.
    let bezDelova = tekst.replacingOccurrences(of: #"\.\d+"#, with: "", options: .regularExpression)
    return ISO8601DateFormatter().date(from: bezDelova)
}

func velikoPrvo(_ tekst: String?) -> String? {
    guard let tekst, !tekst.isEmpty else { return nil }
    return tekst.prefix(1).uppercased() + tekst.dropFirst()
}

// Čita se preko /usr/bin/security, jer su ga alatke same tako upisale, pa
// Keychain ne traži dozvolu kao što bi tražio za direktan pristup iz aplikacije.
func procitajKeychain(servis: String, nalog: String? = nil) -> Data? {
    let proces = Process()
    proces.executableURL = URL(fileURLWithPath: "/usr/bin/security")
    proces.arguments = ["find-generic-password", "-s", servis] + (nalog.map { ["-a", $0] } ?? []) + ["-w"]
    let izlaz = Pipe()
    proces.standardOutput = izlaz
    proces.standardError = Pipe()
    guard (try? proces.run()) != nil else { return nil }
    let podaci = izlaz.fileHandleForReading.readDataToEndOfFile()
    proces.waitUntilExit()
    return proces.terminationStatus == 0 ? podaci : nil
}

func deloJWT(_ jwt: String) -> [String: Any]? {
    let delovi = jwt.split(separator: ".")
    guard delovi.count > 1 else { return nil }
    var tekst = delovi[1].replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    tekst += String(repeating: "=", count: (4 - tekst.count % 4) % 4)
    guard let podaci = Data(base64Encoded: tekst) else { return nil }
    return try? JSONSerialization.jsonObject(with: podaci) as? [String: Any]
}

func ucitajClaude() async throws -> Ocitavanje {
    guard let podaci = procitajKeychain(servis: "Claude Code-credentials"),
          let json = try? JSONSerialization.jsonObject(with: podaci) as? [String: Any],
          let oauth = json["claudeAiOauth"] as? [String: Any],
          let token = oauth["accessToken"] as? String
    else { throw GreskaIzvora("Nema Claude prijave u Keychain-u. Pokreni claude i prijavi se.") }

    if let istice = oauth["expiresAt"] as? Double, Date(timeIntervalSince1970: istice / 1000) < Date() {
        throw GreskaIzvora("Claude token je istekao. Pokreni claude da ga osveži.")
    }

    var zahtev = URLRequest(url: URL(string: "https://api.anthropic.com/api/oauth/usage")!, timeoutInterval: 15)
    zahtev.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    zahtev.setValue("oauth-2025-04-20", forHTTPHeaderField: "anthropic-beta")
    let odgovor = try await preuzmiJSON(zahtev, prijava: "Claude je odbio prijavu. Pokreni claude da je osveži.", retryConnection: false)

    let kljucevi = [
        ("five_hour", "5 sati"),
        ("seven_day", "Nedelja"),
        ("seven_day_opus", "Nedelja, Opus"),
        ("seven_day_sonnet", "Nedelja, Sonnet"),
    ]
    let prozori = kljucevi.compactMap { kljuc, naziv -> Prozor? in
        guard let deo = odgovor[kljuc] as? [String: Any],
              let procenat = deo["utilization"] as? Double else { return nil }
        return Prozor(naziv: naziv, procenat: procenat, reset: (deo["resets_at"] as? String).flatMap(datumIzISO))
    }
    return Ocitavanje(plan: velikoPrvo(oauth["subscriptionType"] as? String), prozori: prozori)
}

func ucitajCodex() async throws -> Ocitavanje {
    let putanja = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex/auth.json")
    guard let podaci = try? Data(contentsOf: putanja),
          let json = try? JSONSerialization.jsonObject(with: podaci) as? [String: Any],
          let tokeni = json["tokens"] as? [String: Any],
          let token = tokeni["access_token"] as? String
    else { throw GreskaIzvora("Nema Codex prijave. Pokreni codex i prijavi se preko ChatGPT naloga.") }

    var zahtev = URLRequest(url: URL(string: "https://chatgpt.com/backend-api/wham/usage")!, timeoutInterval: 15)
    zahtev.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    zahtev.setValue("codex_cli_rs", forHTTPHeaderField: "User-Agent")
    if let nalog = tokeni["account_id"] as? String {
        zahtev.setValue(nalog, forHTTPHeaderField: "ChatGPT-Account-Id")
    }
    let odgovor = try await preuzmiJSON(zahtev, prijava: "Codex je odbio prijavu. Pokreni codex da je osveži.")

    let limit = odgovor["rate_limit"] as? [String: Any] ?? [:]
    let prozori = ["primary_window", "secondary_window"].compactMap { kljuc -> Prozor? in
        guard let deo = limit[kljuc] as? [String: Any],
              let procenat = (deo["used_percent"] as? NSNumber)?.doubleValue else { return nil }
        let trajanje = (deo["limit_window_seconds"] as? NSNumber)?.intValue ?? 0
        let naziv: String
        switch trajanje {
        case 18000: naziv = "5 sati"
        case 604800: naziv = "Nedelja"
        default: naziv = "\(trajanje / 3600) h"
        }
        let reset = (deo["reset_at"] as? NSNumber).map { Date(timeIntervalSince1970: $0.doubleValue) }
        return Prozor(naziv: naziv, procenat: procenat, reset: reset)
    }
    return Ocitavanje(plan: velikoPrvo(odgovor["plan_type"] as? String), prozori: prozori)
}

// Antigravity (agy) drži Google prijavu u Keychain-u, a pristupni token traje
// sat vremena i agy ga obnavlja samo dok radi. Ovde se token samo čita, ne
// obnavlja se, pa limit stiže dok je agy nedavno radio.
actor AntigravityPrijava {
    static let deljena = AntigravityPrijava()

    private var plan: String?
    private var projekat: String?

    func pristup() async throws -> String {
        guard let sirovo = procitajKeychain(servis: "gemini", nalog: "antigravity"),
              var tekst = String(data: sirovo, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        else { throw GreskaIzvora("Nema Antigravity prijave. Pokreni agy i prijavi se.") }
        if let dvotacka = tekst.firstIndex(of: ":"), tekst.hasPrefix("go-keyring") {
            tekst = String(tekst[tekst.index(after: dvotacka)...])
        }
        guard let dekodirano = Data(base64Encoded: tekst) ?? tekst.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: dekodirano) as? [String: Any],
              let deo = json["token"] as? [String: Any]
        else { throw GreskaIzvora("Antigravity prijava nije u očekivanom obliku.") }

        guard let postojeci = deo["access_token"] as? String,
              let kraj = (deo["expiry"] as? String).flatMap(datumIzISO),
              kraj > Date().addingTimeInterval(60)
        else { throw GreskaIzvora("Antigravity prijava je istekla. Pokreni agy da je osveži.", pauza: 600) }
        return postojeci
    }

    func podaciNaloga(token: String) async throws -> (plan: String?, projekat: String?) {
        if plan != nil || projekat != nil { return (plan, projekat) }
        var zahtev = URLRequest(url: URL(string: "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist")!, timeoutInterval: 15)
        zahtev.httpMethod = "POST"
        zahtev.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        zahtev.setValue("antigravity", forHTTPHeaderField: "User-Agent")
        zahtev.setValue("application/json", forHTTPHeaderField: "Content-Type")
        zahtev.httpBody = Data(#"{"metadata":{"ideType":"ANTIGRAVITY"}}"#.utf8)
        let odgovor = try await preuzmiJSON(zahtev, prijava: "Antigravity je odbio prijavu. Pokreni agy.")
        let placeni = (odgovor["paidTier"] as? [String: Any])?["name"] as? String
        let trenutni = (odgovor["currentTier"] as? [String: Any])?["name"] as? String
        plan = placeni ?? trenutni
        projekat = odgovor["cloudaicompanionProject"] as? String
        return (plan, projekat)
    }
}

func ucitajAntigravity() async throws -> Ocitavanje {
    let prijava = AntigravityPrijava.deljena
    let token = try await prijava.pristup()
    let nalog = try await prijava.podaciNaloga(token: token)

    var zahtev = URLRequest(url: URL(string: "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary")!, timeoutInterval: 15)
    zahtev.httpMethod = "POST"
    zahtev.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    zahtev.setValue("antigravity", forHTTPHeaderField: "User-Agent")
    zahtev.setValue("application/json", forHTTPHeaderField: "Content-Type")
    zahtev.httpBody = try JSONSerialization.data(withJSONObject: nalog.projekat.map { ["project": $0] } ?? [:])
    let odgovor = try await preuzmiJSON(zahtev, prijava: "Antigravity je odbio prijavu. Pokreni agy.")

    return parsirajAntigravity(odgovor, plan: nalog.plan)
}

func parsirajAntigravity(_ odgovor: [String: Any], plan: String?) -> Ocitavanje {
    let grupe = odgovor["groups"] as? [[String: Any]] ?? []
    let gemini = grupe.first { (($0["displayName"] as? String) ?? "").localizedCaseInsensitiveContains("Gemini") }
    let claude = grupe.first { (($0["displayName"] as? String) ?? "").localizedCaseInsensitiveContains("Claude") }
    guard let grupa = gemini ?? claude else {
        return Ocitavanje(plan: plan, prozori: [], napomena: "Antigravity nije vratio prepoznatljivu kvotu modela.")
    }
    let oznaka = gemini != nil ? "gemini" : "claudeGpt"
    let prozori = (grupa["buckets"] as? [[String: Any]] ?? []).compactMap { kofa -> (Int, Prozor)? in
        let prozor = kofa["window"] as? String ?? ""
        guard prozor == "5h" || prozor == "weekly" else { return nil }
        let (redosled, naziv) = prozor == "5h" ? (0, "5 sati") : (1, "Nedelja")
        // Kad je kvota potrošena, polje sa ostatkom izostaje iz odgovora.
        let preostalo = (kofa["remainingFraction"] as? NSNumber)?.doubleValue ?? 0
        guard preostalo.isFinite else { return nil }
        let reset = (kofa["resetTime"] as? String).flatMap(datumIzISO)
        return (redosled, Prozor(naziv: naziv, procenat: (1 - max(0, min(1, preostalo))) * 100, reset: reset, quotaGroup: oznaka))
    }.sorted { $0.0 < $1.0 }.map(\.1)
    return Ocitavanje(plan: plan, prozori: prozori, napomena: gemini == nil ? "Claude/GPT kvota. Gemini kvota trenutno nije dostupna." : nil)
}

// Grok ima samo nedeljni SuperGrok limit, zajednički za Grok Build (CLI) i chat.
func ucitajGrok() async throws -> Ocitavanje {
    let putanja = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".grok/auth.json")
    guard let podaci = try? Data(contentsOf: putanja),
          let json = try? JSONSerialization.jsonObject(with: podaci) as? [String: Any],
          let nalog = json.values.compactMap({ $0 as? [String: Any] }).first,
          let token = nalog["key"] as? String
    else { throw GreskaIzvora("Nema Grok prijave. Pokreni grok i prijavi se.") }

    if let istice = deloJWT(token)?["exp"] as? Double, Date(timeIntervalSince1970: istice) < Date() {
        throw GreskaIzvora("Grok token je istekao. Pokreni grok da ga osveži.")
    }

    var zahtev = URLRequest(url: URL(string: "https://cli-chat-proxy.grok.com/v1/billing?format=credits")!, timeoutInterval: 15)
    zahtev.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    let odgovor = try await preuzmiJSON(zahtev, prijava: "Grok je odbio prijavu. Pokreni grok da je osveži.")

    guard let podesavanja = odgovor["config"] as? [String: Any],
          let procenat = (podesavanja["creditUsagePercent"] as? NSNumber)?.doubleValue
    else { return Ocitavanje(plan: nil, prozori: [], napomena: "Grok nije vratio podatke o limitu.") }

    let period = podesavanja["currentPeriod"] as? [String: Any]
    let vrsta = period?["type"] as? String ?? ""
    let naziv = vrsta.hasSuffix("MONTHLY") ? "Mesec" : vrsta.hasSuffix("DAILY") ? "Dan" : "Nedelja"
    let kraj = ((period?["end"] ?? podesavanja["billingPeriodEnd"]) as? String).flatMap(datumIzISO)

    let proizvodi = (podesavanja["productUsage"] as? [[String: Any]] ?? []).compactMap { stavka -> String? in
        guard let ime = stavka["product"] as? String,
              let deo = (stavka["usagePercent"] as? NSNumber)?.doubleValue else { return nil }
        let citljivo = ["GrokBuild": "Grok Build", "GrokChat": "Chat"][ime] ?? ime
        return "\(citljivo) \(Int(deo.rounded()))%"
    }
    return Ocitavanje(
        plan: nil,
        prozori: [Prozor(naziv: naziv, procenat: procenat, reset: kraj)],
        napomena: proizvodi.isEmpty ? nil : "potrošeno: " + proizvodi.joined(separator: ", ")
    )
}


actor PauzeLimita {
    var rokovi: [String:Date] = [:]
    let file: URL?
    init(){
        file=CommandLine.arguments.count>1 ? URL(fileURLWithPath:CommandLine.arguments[1]) : nil
        if let file,let data=try? Data(contentsOf:file),let saved=try? JSONSerialization.jsonObject(with:data) as? [String:Double]{rokovi=saved.mapValues{Date(timeIntervalSince1970:$0)}}
    }
    func ceka(_ id:String) -> Bool { (rokovi[id] ?? .distantPast) > Date() }
    func rok(_ id:String) -> Double { (rokovi[id] ?? .distantPast).timeIntervalSince1970*1000 }
    func postavi(_ id:String,sekunde:Double) {
        rokovi[id]=Date().addingTimeInterval(max(120,sekunde))
        if let file,let data=try? JSONSerialization.data(withJSONObject:rokovi.mapValues{$0.timeIntervalSince1970}){try? data.write(to:file,options:.atomic);try? FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:file.path)}
    }
}
let pauzeLimita=PauzeLimita()
func ocitaj(_ id: String) async -> [String: Any] {
    if await pauzeLimita.ceka(id) { return ["agent":id,"windows":[],"updatedAt":Date().timeIntervalSince1970*1000,"error":"Sledeće očitavanje je odloženo.","nextAttemptAt":await pauzeLimita.rok(id)] }

    await pauzeLimita.postavi(id,sekunde:120)
    do {
        let value: Ocitavanje
        switch id {
        case "claude": value = try await ucitajClaude()
        case "codex": value = try await ucitajCodex()
        case "antigravity": value = try await ucitajAntigravity()
        default: value = try await ucitajGrok()
        }
        let windows: [[String: Any]] = value.prozori.compactMap { w in
            let period: String
            switch w.naziv {
            case "5 sati": period = "fiveHour"
            case "Nedelja": period = "weekly"
            case "Nedelja, Opus": period = "weeklyOpus"
            case "Nedelja, Sonnet": period = "weeklySonnet"
            default: period = ""
            }
            guard !period.isEmpty else { return nil }
            var result: [String: Any] = ["period":period,"remaining":w.ostalo,"resetAt":w.reset.map { $0.timeIntervalSince1970 * 1000 } as Any? ?? NSNull()]
            if let group = w.quotaGroup { result["quotaGroup"] = group }
            return result
        }
        return ["agent":id,"windows":windows,"updatedAt":Date().timeIntervalSince1970 * 1000,"error":value.napomena as Any? ?? NSNull()]
    } catch let error as GreskaIzvora {
        if let pause=error.pauza { await pauzeLimita.postavi(id,sekunde:pause) }
        return ["agent":id,"windows":[],"updatedAt":Date().timeIntervalSince1970 * 1000,"error":error.poruka]
    } catch {
        return ["agent":id,"windows":[],"updatedAt":Date().timeIntervalSince1970 * 1000,"error":"Limit trenutno nije dostupan."]
    }
}
Task {
    while true {
        await withTaskGroup(of: Void.self) { group in
            for id in ["codex","claude","antigravity","grok"] {
                group.addTask {
                    var result = await ocitaj(id)
                    result["nextAttemptAt"]=await pauzeLimita.rok(id)
                    if let data = try? JSONSerialization.data(withJSONObject:result), let line = String(data:data,encoding:.utf8) {
                        print(line);fflush(stdout)
                    }
                }
            }
        }
        try? await Task.sleep(nanoseconds:120_000_000_000)
    }
}
dispatchMain()
