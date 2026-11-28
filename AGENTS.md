# Arbeitsregeln für ioBroker.connectlife

## Auftrag und Phasengrenzen

- Aktualisierter Benutzerauftrag vom 27.11.2026: Den vorhandenen Fork `https://github.com/garfield2412/ioBroker.connectlife` lokal weiterentwickeln und erst später pushen. Dieser Ansatz ersetzt die Planung einer vollständigen Neuentwicklung. Bestehenden JavaScript-Code zunächst erhalten; keine pauschale TypeScript-Migration ohne konkreten Bedarf. Die historischen Phasenregeln gelten für den ursprünglichen Neubauplan und sperren die ausdrücklich beauftragte Arbeit am Fork nicht.
- `origin` zeigt auf den Benutzerfork, `upstream` auf `Andiweli/ioBroker.connectlife` (auf ausdrücklichen Benutzerwunsch zurückgestellt). Aktueller Arbeitsbranch: `development/dryer-support`. Ohne neuen Auftrag weder pushen noch veröffentlichen. Gerätebefehle bleiben separat freigabepflichtig.

- Projektauftrag und Kommunikation sind deutsch; Quellcode, technische Bezeichner und öffentliche Schnittstellen englisch.
- Phase 1 ist Analyse und Planung. Phase 2 darf erst nach ausdrücklicher Benutzerfreigabe beginnen. Keine produktive Implementierung vor dieser Freigabe.
- Jede weitere Phase separat abschließen, Ergebnisse und offene Punkte in `roadmap.md` aktualisieren; keine Phase eigenständig überspringen.
- Gerätebefehle und andere schreibende Cloud-Anfragen nur nach ausdrücklicher Freigabe. Auch Push-Registrierungen ändern Cloud-Zustand und sind davon erfasst. Authentifizierung ist für spätere ausdrücklich beauftragte Lesetests notwendig; sie ist kein Gerätebefehl.
- Keine Zugangsdaten für Phase 1 anfordern. Keine Nachrichten an Projektbetreiber senden, keine Veröffentlichung oder Paketregistrierung ohne Auftrag.

## Evidenz und Sicherheit

- API-Aussagen mit Repository, Commit und Dateipfad belegen. Quellcodebefund, fremde Laufzeitbeobachtung, eigene Laufzeitprüfung und Hypothese unterscheiden.
- Keine Endpunkte, Parameter, Programme oder Einheiten erfinden. Unbekannte Werte erhalten; keine Befehle aus Raw-Eigenschaften ableiten.
- Keine Passwörter, Tokens, Cookies, Signaturdaten oder vollständigen HTTP-Fehler in Logs, Fixtures, Dokumentation oder Commits. Auch Debug-Logs müssen sicher sein.
- Dumps vor dem Schreiben rekursiv anonymisieren, einschließlich IDs, Namen, Räume, Seriennummern, Netzwerkadressen und eingebetteter JSON-Zeichenketten. Tests verwenden synthetische Daten.
- Zugangsdaten später über `encryptedNative` und `protectedNative` verwalten; keine eigene Verschlüsselung erfinden. Tokens zunächst nur im Speicher.
- Kein automatischer Wechsel zu einem anderen regionalen Backend nach Loginfehlern.

## Umsetzung nach Freigabe

- Native TypeScript-Implementierung, `@iobroker/adapter-core`; keine Python-, HA-, MQTT-Broker- oder Containerpflicht.
- API-Client unabhängig von ioBroker halten. Transport, Authentifizierung, Signierung, Geräteprofile und Objektverwaltung trennen.
- Pro Instanz eigene Sitzung, Caches, Timer und Abbruchsignale; keine globalen veränderlichen Tokens.
- Zeitlimits, begrenzte Wiederholungen, Backoff mit Zufallsanteil, `Retry-After`, Authentifizierungs-Singleflight und sauberes Beenden vorsehen.
- In frühen Phasen ausschließlich lesbare Zustände mit `ack=true`; unbekannte Eigenschaften niemals schreibbar machen.
- Lizenzherkunft jeder Übernahme prüfen. GPL-Code und Mapping-Dateien nicht ungeprüft in ein MIT-Projekt übertragen; bloße Übersetzung beseitigt Lizenzpflichten nicht.
- Für Dateisuche `rg` nutzen. Nur zur Änderung passende Prüfungen ausführen und deren tatsächliches Ergebnis dokumentieren.

## Aktueller Entwicklungsstand und Fortsetzung

- Stand 27.11.2026: Build `493a828` auf `development/dryer-support` committed und gepusht; Installation vom Benutzer bestätigt. Der erste reale Diagnoseabruf war erfolgreich; Propertyliste leer, statische Nutzdaten null, Selbstdiagnoseregeln verfügbar.
- Basisversion bleibt auf Benutzerwunsch `0.4.1`. Die Build-Kennung wird zur Laufzeit aus Git bzw. tatsächlichen Installationsmetadaten ermittelt. Niemals den erwarteten eigenen Commit-Hash fest eintragen oder einen entfernten Branch-Stand als installierten Build ausgeben. Details in `docs/updates.md`.
- Nächster sinnvoller Schritt bei einem Entwicklungsauftrag: auf `iobroker-raspi` zunächst lesend `info.build`, `info.buildCommit`, Verbindungsstatus, `info.dataStale` und vorhandene Diagnosezustände prüfen. Keine Instanz-Konfiguration oder Zugangsdaten ausgeben. Nicht eigenständig neu installieren oder den laufenden Adapter neu starten.
- Anschließend den bereits implementierten expliziten Diagnoseabruf für den bekannten Trockner nutzen, wenn der Benutzer die weitere Analyse beauftragt. Er ist ein lokaler Trigger für lesende Metadatenabfragen, kein Gerätebefehl. Kein zusätzliches automatisches Diagnosepolling einführen. Grenzen, Cache, Rate-Limit und Anonymisierung aus `docs/diagnostics.md` beachten.
- Anonymisierte Metadaten mit `docs/reference-reuse.md`, `docs/device-profiles.md` und den bisherigen Beobachtungen vergleichen. Zuerst belegbare lesbare Zustände und eine wiederverwendbare Profilzuordnung für weitere Trockner verbessern. Typen `004`, `030`, `032` allein belegen keine identischen Eigenschaften oder Codes; das konkret beobachtete Feature ist `1wk080218v0w`.
- Offene Beobachtungen: Tür offen/geschlossen, Programmende, Abbruch und Wartung. Zustandswechsel nur zusammen mit einer bestätigten Benutzeraktion zuordnen. Keine Testbefehle ans Gerät senden. Unbekannte Codes erhalten, fehlende Daten nicht als ausgeschaltetes Gerät interpretieren.
- Gerätebezogene Aktualität und verschwundene Geräte bleiben offen; `info.dataStale` beschreibt bisher den Kontoabruf, nicht die Frische jedes Sensors.
- Vor einer Änderung Arbeitsbaum und aktuelle Implementierung prüfen. Für Profiländerungen synthetische Fixtures und passende Unit-Tests ergänzen; Syntax, Unit-/Paketprüfungen und Lint ausführen. Controller-Starttest bei Änderungen am Start-/Lebenszyklus oder der Paketierung. Installierter Build: 34 Unit-Tests, 57 Paketprüfungen und Controller-Starttest erfolgreich. Aktuelle lokale Erweiterung (Tür/Wartung/Systemdaten): 37 Unit-Tests, 57 Paketprüfungen, Syntax und ESLint erfolgreich; noch nicht gepusht oder installiert.
- Ergebnisse und verbleibende Unsicherheiten in `roadmap.md` und den betroffenen Fachdokumenten aktualisieren. Commit und Push nur auf erneuten Auftrag; keine Änderung von `main`, keine Veröffentlichung.

## Einstieg

Zuerst `roadmap.md`, `docs/reference-reuse.md`, `docs/device-profiles.md` und `docs/diagnostics.md` lesen; historische API-Analyse: `docs/api-analysis.md`. Der lokale Ordner heißt `iobroker-connectlive`; Produkt und Namespace heißen `connectlife`. Keine automatische Ordnerumbenennung.
