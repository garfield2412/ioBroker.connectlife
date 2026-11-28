# Geräteprofile und lesbare Trockner-Unterstützung

`lib/device-profiles.js` wählt das Geräteprofil und liefert ioBroker-unabhängige Zustandsdefinitionen. `main.js` erzeugt Objekte und schreibt Rückmeldungen mit ACK. Das bestehende Klimamapping liegt in `lib/climate-profile.js`; Datenpunkt-IDs und Umwandlungen bleiben erhalten.

| Profil | Auswahl | Umfang |
| --- | --- | --- |
| climate-legacy | Typ 009; ohne Typcode alternativ bekannte Klimaeigenschaften | bisherige Klimasteuerung |
| dryer-030-1wk080218v0w | exakt Typ 030 und Feature 1wk080218v0w | lesbare Trocknerzustände |
| dryer-generic | andere Features von Typ 030, Typ 004 oder 032 | Metadaten und Raw-Daten |
| generic | andere Geräte | Metadaten und Raw-Daten |

Unbekannte Typcodes werden nicht allein wegen ähnlich benannter Properties als Klimagerät gesteuert. Trockner und generische Geräte bleiben auch bei aktivierter Raw-Schreiboption lesend; der Eventhandler blockiert ebenfalls Schreibversuche.

## Datenpunkte

`devices.<id>.info.category` und `.profile` zeigen die Auswahl. Das konkrete Profil ergänzt unter `.status`:

| Name | Typ | Bedeutung |
| --- | --- | --- |
| operation | string | off, standby, running, paused, unknown |
| running / paused | boolean | aus machine_status; unbekannte Codes ergeben null |
| program | number | Originalcode; 8 Baumwolle, 28 Eco bestätigt; unbekannte Codes erhalten |
| remainingTime / totalTime | number, min | gemeldete Restzeit / gewählte Gesamtdauer |
| dryingOption | string | nur Baumwolle und dry_time=3: extraDry; sonst unknown |
| drumLight | boolean | beobachtetes Trommellicht |
| doorOpen | boolean | Referenzbefund für 030: 1 offen, 2 geschlossen; 0/andere Codes null; lokal noch nicht physisch bestätigt |
| waterTankFull / cleanFilter | boolean | Cloud-Selbstdiagnoseregeln: 1 Hinweis aktiv, 0 nicht gesetzt, sonst null |
| errorCode | string | Originalcode ohne erfundene Fehlerbeschreibung |

Alle Zustände sind lesbar. Fehlende Quellen erzeugen keine neuen Datenpunkte; vorhandene Profilzustände werden dann null mit Qualitätscode 1, auch nach Neustart. Ungültige Zahlen und Minutenwerte ab 65535 werden ebenfalls null. Raw-Daten bleiben unverändert verfügbar.

Restzeit bleibt im Standby als Programmwert erhalten. Kein berechneter Fortschritt, keine Umdeutung der Programmphase als läuft, keine Verbrauchs- oder Temperaturmessung ohne Nachweis. Die Semantik von dry_time wird nicht auf Zeitprogramme übertragen.

## Datenalter

`info.dataStale` startet mit true, wird nach erfolgreichem Kontoabruf false und bei Abruffehlern sofort true. Ein lokaler Timer markiert die Daten auch nach zwei konfigurierten Pollintervallen plus 30 Sekunden als alt; keine zusätzlichen Cloud-Anfragen. `info.lastUpdate` bleibt der letzte erfolgreiche Abruf. `info.connection` behält die bisherige Fehlertoleranz.

Das kennzeichnet die Aktualität des Kontoabrufs, nicht die Frische jedes Sensors. Offlinegeräte oder Cloud-Caches können ältere Daten enthalten; zusätzlich den Geräte-Onlinezustand prüfen. Einzelne fehlende Geräte benötigen später eine eigene Alterserkennung.

## Weitere Profile

Anonymisierte Daten und gezielte Beobachtungen für Typ-/Feature-Kombinationen sammeln: Standby, Lauf, Pause, Tür, Programmwechsel und Ende. Profil mit synthetischen Tests ergänzen. Ähnliche Propertynamen allein reichen nicht. Bestehende Klimatests müssen bestehen bleiben.

Herkunft: eigene Beobachtungen in `dryer-observation.md`, Referenzübersicht in `api-analysis.md`. Keine GPL-Quelltexte oder YAML-Mappings übernommen. Start/Pause/Stopp über den Adapter bleiben außerhalb dieser Erweiterung.

## Validierung des lokalen Entwicklungsstands

Am 27.11.2026 unter Windows mit Node 26.13.1 geprüft:

- `npm test`: Syntaxprüfungen, 15 Unit-Tests und 57 Paketprüfungen bestanden.
- `npm run lint`: bestanden.
- `npm run test:integration`: ein Controller-Starttest bestanden; sauberes Beenden. Die Testumgebung installierte js-controller 8.0.0-alpha.27-20261126-6d87adfc0. Keine Zugangsdaten, kein Cloud-Test.
- Zusätzlich wurde die ausgelagerte Klimamapping-Funktion mit dem bisherigen Inhalt verglichen; Wertumwandlungen und Datenpunktdefinitionen sind identisch.

Entwicklungsabhängigkeiten wurden mit aktivierter Zertifikatsprüfung über den Windows-Zertifikatsspeicher installiert (`NODE_USE_SYSTEM_CA=1`); das Lockfile hält die Auflösung fest. Für weitere Installation und Tests kann derselbe Umgebungsparameter nötig sein. Keine Änderung der globalen npm-Konfiguration.

Build 493a828 ist auf dem Raspberry Pi installiert und bestätigt. Die danach lokal ergänzten Wartungs- und Türzustände sind dort noch nicht installiert. Der lokale Starttest ersetzt keine Prüfung weiterer Node-/Controller-Versionen.

Der Türzustand verwendet zwei einzelne Protokollbefunde aus `connectlife-ha` Commit `37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb`, Datei `custom_components/connectlife/mappings/030.yaml`, Property `Door_status`; die Featuredatei `030-1wk080066v0w.yaml` dokumentiert die Fremdvalidierung. Es wurde keine Mapping-Datei übernommen. Das Objekt trägt `native.evidence=reference` und eine Quellenkennung. Keine Ableitung von läuft, fertig oder einer Startfreigabe aus der Türstellung. Die Umsetzung bleibt zunächst auf unser bestehendes Featureprofil begrenzt.

Aktuelle lokale Erweiterung nach Realdiagnose: waterTankFull (Waterbox_Full) und cleanFilter (Clean_Filter), boolean, rein lesend, nur im geprüften Featureprofil. 1 aktiv, 0 nicht gesetzt, sonst null. Quelle und Grenzen: docs/diagnostics.md, Realprüfung am 27.11.2026.
