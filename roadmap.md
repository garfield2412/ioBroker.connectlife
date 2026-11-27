# Roadmap: Weiterentwicklung des ConnectLife-Forks

Der ursprüngliche Neubauauftrag wurde durch Weiterentwicklung des Forks ersetzt. origin: garfield2412/ioBroker.connectlife; upstream: Andiweli/ioBroker.connectlife. Commit und Push des Entwicklungsbranches wurden am 27.11.2026 ausdrücklich beauftragt. Keine Veröffentlichung oder Änderung von main beauftragt.

- [x] Kontoweite Geräteerkennung geprüft.
- [x] Typ 030 / Feature 1wk080218v0w real beobachtet: Standby, Eco/Baumwolle, Extra trocken, Lauf und Pause.
- [x] Profile für Klima, Trockner und generischen Fallback implementiert.
- [x] Lesbare Trocknerzustände ohne Gerätebefehle ergänzt.
- [x] Behandlung unbekannter Codes und fehlender Eigenschaften implementiert.
- [x] Kontoabrufe mit info.dataStale kennzeichnen.
- [x] Syntax, 15 Unit-Tests, 57 Paketprüfungen und ESLint erfolgreich (Windows, Node 26.13.1).
- [x] Lokaler Controller-Integrationstest bestanden: Start und sauberes Beenden, ohne Zugangsdaten oder Cloud-Aufrufe.
- [x] Version 0.4.0 in Manifesten, Lockfile und README-Changelogs vorbereitet; Fork-Metadaten und Updateweg dokumentiert. Kein automatisches Updateangebot für reine GitHub-Installationen zugesichert.
- [ ] Entwicklungsstand nach Abstimmung auf dem ioBroker-Host erproben.
- [ ] Türzustände, Ende, Abbruch und Wartung real beobachten.
- [ ] Weitere Typ-/Featureprofile mit anonymisierten Daten ergänzen.
- [ ] Gerätebezogene Aktualität und fehlende Geräte genauer behandeln.

Steuerung benötigt separate Freigabe und belegte Sicherheitsbedingungen. TypeScript-Migration und Veröffentlichung sind getrennte Entscheidungen. Details: `docs/device-profiles.md`.
