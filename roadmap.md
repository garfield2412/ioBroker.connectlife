# Roadmap: Weiterentwicklung des ConnectLife-Forks

Stand: 27.11.2026. Weiterentwicklung des vorhandenen JavaScript-Forks; keine vollständige Neuentwicklung. origin: garfield2412/ioBroker.connectlife; upstream: Andiweli/ioBroker.connectlife. Arbeitsbranch: development/dryer-support. Basisversion bleibt 0.4.1 mit separater Build-Kennung.

## Installiert und real geprüft

- [x] Build 493a828 auf dem ioBroker-Host bestätigt (Quelle npm-lock).
- [x] Geräteerkennung und beobachtetes Profil 030 / 1wk080218v0w: Standby, Lauf, Pause, Eco/Baumwolle, Extra trocken, Rest-/Gesamtdauer.
- [x] Klimaprofil erhalten; andere Trocknertypen und unbekannte Geräte erhalten Raw-Fallback ohne Schreibfreigabe.
- [x] Kontoaktualität mit info.dataStale und begrenztem Login-Backoff.
- [x] Expliziter lesender Diagnoseabruf: Propertyliste leer, statische Nutzdaten null, Selbstdiagnoseregeln erfolgreich empfangen. Keine aktiven Fehler in der zurückgegebenen Fehlerliste.

## Lokal umgesetzt, noch nicht gepusht oder installiert

- [x] waterTankFull und cleanFilter aus real empfangenen Selbstdiagnoseregeln für das geprüfte Feature.
- [x] doorOpen aus einem einzelnen referenzierten 030-Protokollbefund; Referenzevidenz im Objekt gekennzeichnet. Eigene physische Bestätigung fehlt.
- [x] Vierte manuelle Diagnoseabfrage systemData (query_system_data) nach dem Python-Protokoll ergänzt; bestehende Anonymisierung, Cache, Abbruch und Rate-Limit-Grenzen bleiben wirksam.
- [x] Dokumentation und synthetische Tests für Türzustand, Wartung, Systemdaten und Teilfehler ergänzt.

## Nächste Schritte in Reihenfolge

1. Nach gesondertem Commit-/Pushauftrag und Installation die erweiterte Diagnose einmal auslösen. Systemdaten auf Programme/Optionen prüfen; Antwortschema und Unterstützung ausdrücklich dokumentieren. Eine leere Antwort nicht durch vermutete Tabellen ersetzen.
2. Tür offen/geschlossen bei normaler Nutzung durch den Benutzer bestätigen; Programmende, Abbruch und Zeitprogramm gezielt beobachten. Keine Gerätebefehle autonom senden.
3. Fehlerbeschreibungen aus den tatsächlich gelieferten Selbstdiagnose-Metadaten ableiten. Regeltabelle und aktuell aktive Fehler auseinanderhalten; unbekannte Codes erhalten und Sprache der Herstellertexte offenlegen.
4. Gerätebezogene Aktualität und verschwundene Geräte behandeln. Ein erfolgreicher Kontoabruf belegt keine neuen Sensordaten. Keine falsche Ende-/Aus-Erkennung aus fehlenden Daten.
5. Wiederverwendbare Familienprofile mit Feature-Overrides aus belegten Eigenschaften entwickeln. Weitere 030-Features sowie 004/032 separat anhand anonymisierter Diagnosen prüfen. Keine pauschale Übertragung von 030-Codes.
6. Energiehistorie erst nach Prüfung von Unterstützung, Zeitraum, Einheit und Zählerverhalten. Raw-Energie und Nullen aus fremden Endpunkten nicht als gemessenen Verbrauch ausgeben.
7. Steuerung bleibt eine gesonderte Entscheidung mit ausdrücklicher Freigabe und belegten modellabhängigen Bedingungen. Gleiches gilt für Veröffentlichung und TypeScript-Migration.

## Prüfstand

Build 493a828: 34 Unit-Tests, 57 Paketprüfungen, Syntax, ESLint und Controller-Starttest bestanden. Reale Cloud-Diagnose danach erfolgreich. Aktuelle lokale Fortsetzung: 37 Unit-Tests, 57 Paketprüfungen, Syntax und ESLint erfolgreich. Keine erneute Cloud-Abfrage oder Host-Installation für die lokale Systemdaten-Erweiterung. Quellen und Evidenzgrenzen: docs/reference-reuse.md, docs/diagnostics.md, docs/device-profiles.md.
