# Lesende Cloud-Diagnose

Diagnosefunktion mit Basisversion 0.4.1, auf dem Entwicklungsbranch bereitgestellt. Die Build-Anzeige ist installiert und auf dem Host bestätigt. Keine Gerätebefehle oder Push-Registrierungen. Die Funktion läuft nur nach ausdrücklicher Auslösung.

## Auslösen und auslesen

Für erkannte Trockner entsteht `devices.<id>.diagnostics`:

| Datenpunkt | Funktion |
| --- | --- |
| refresh | Lokaler Button: einmal auf true setzen; wird sofort mit ACK auf false zurückgesetzt |
| busy | Diagnoseabruf läuft |
| data | Anonymisierter JSON-Bericht einschließlich Einzelstatus pro Abfrage |
| lastUpdate | Zeitpunkt des Berichts; bei Cachetreffern bleibt der ursprüngliche Zeitpunkt erhalten |
| lastError | Zusammenfassung, wenn nicht alle Abfragen erfolgreich waren |

Der Button ändert nur einen lokalen ioBroker-Datenpunkt und startet lesende Cloud-Abfragen. Er ist kein Fernsteuerbefehl. Die übrigen Diagnosedatenpunkte bleiben lesbar. Die vorhandene Trockner-Schreibsperre bleibt aktiv.

Alternativ aus einem ioBroker-JavaScript-Skript:

```javascript
sendTo('connectlife.0', 'collectDiagnostics', {
    deviceObjectId: 'HIER_DIE_LOKALE_GERAETE_OBJEKT_ID'
}, result => {
    // result ist bereits anonymisiert; zum Analysieren vorzugsweise diagnostics.data nutzen.
});
```

Nur die ID eines bereits vom Adapter erkannten Trockners ist zulässig. Keine beliebigen URLs, Endpunkte oder Cloud-Gerätekennungen als Parameter. Der installierte Build 493a828 besitzt diesen Button.

## Abfragen

Die unabhängige Klasse `lib/metadata-client.js` benutzt den bestehenden API-Client mit dessen Token, Signierung, Timeout und konfiguriertem EU-Gateway. Endpunkte sind anhand des in `reference-reuse.md` belegten Python-Clients eigenständig umgesetzt:

- GET `/clife-svc/get_property_list` mit Typ-/Feature-Code.
- POST `/clife-svc/pu/query_static_data` mit Gerätekennung.
- POST `/basic/self_check/info` mit Gerätekennung und `noRecord=1`.
- POST `/clife-svc/pu/query_system_data` mit Gerätekennung (lokal ergänzt, noch kein Realnachweis).

Die POST-Operationen sind laut Referenz Leseabfragen; `/device/pu/property/set` wird nie verwendet. Systemdaten werden als vierte Abfrage nach der Selbstdiagnose ergänzt. Der Python-Client dokumentiert Programmdaten für Geschirrspüler; ob der Trockner ebenfalls nutzbare Daten liefert, ist offen. Leere Daten sind kein Nachweis fehlender Programme. Energiestatistik ist weiterhin nicht Bestandteil des Diagnoseabrufs.

Die Abfragen laufen nacheinander. Ein abgewiesenes Token wird höchstens einmal erneuert, eine Nonce höchstens einmal ersetzt. Keine rekursiven Wiederholungen. Transport-, Authentifizierungs- und Berechtigungsfehler stoppen weitere Abfragen. HTTP 429 oder API-Code 403048 lösen eine instanzweite Diagnosepause aus, mindestens 60 Sekunden beziehungsweise entsprechend Retry-After; keine automatische Wiederholung nach deren Ablauf. Normales Statuspolling wird durch diesen Diagnosecache nicht verändert.

Gleichzeitige Anforderungen desselben Geräts werden zusammengeführt. Erfolgreiche Berichte bleiben fünf Minuten im Instanzspeicher, unvollständige eine Minute. Ein erneuter Buttondruck innerhalb dieser Zeit liefert den Cache; kein Umgehen der Wartezeit. Die Sitzung wird pro Instanz getrennt verwendet. Beim Beenden werden laufende Diagnose-HTTP-Anfragen abgebrochen.

## Anonymisierung und Interpretation

`lib/diagnostics.js` entfernt sensible Schlüssel und bekannte Werte: Zugangsdaten, Tokens, Cookies, Signaturen, Geräte-/Benutzerkennungen, Seriennummern, Namen und Räume sowie E-Mail-, Netzwerk- und URL-Angaben. Arrays und eingebettete JSON-Zeichenketten werden rekursiv verarbeitet. Auch dynamische Objektschlüssel werden bereinigt. Größe und Verschachtelung sind begrenzt; große oder nicht lesbare JSON-Texte werden ersetzt. Nur bereinigte Ergebnisse werden gecacht, als Zustand geschrieben oder als Message-Antwort ausgegeben. Rohe HTTP-Fehlertexte und Antwortkörper werden nicht protokolliert oder weitergegeben.

Unbekannte frei formulierte Inhalte können nicht allein anhand ihres Namens sicher eingeordnet werden. Vor öffentlichem Teilen eines Berichts zusätzlich prüfen, ob ungewöhnliche herstellerspezifische Freitexte personenbezogene Inhalte enthalten. Das Werkzeug schreibt keine Dumpdateien und führt keinen Git-Upload aus.

Status je Abfrage: `ok`, `unsupported`, `apiError`, `invalidResponse`, `authentication`, `forbidden`, `transport`, `rateLimited`, `missingFeatureCode`, `cancelled`, `internal` oder `skipped`. Nur HTTP 404/405/501 wird als fehlende Endpunktunterstützung eingeordnet. Andere fachliche Fehler bleiben mit numerischem Code sichtbar, ohne erfundene Bedeutungen. Fehlende Unterstützung einer Metadatenabfrage ist kein Beweis, dass das Gerät selbst keine entsprechende Funktion besitzt.

Ein erfolgreicher HTTP-Aufruf liefert noch keine vollständig geprüfte Beschreibung. Die Antwortschemas bleiben zunächst herstellerabhängig. Aus Propertylisten wird insbesondere keine Schreibfreigabe abgeleitet. Fehlertabellen und Programmbeschreibungen werden erst nach Sichtung der echten Antworten in Profile übernommen.

## Tests und Realnachweis

Synthetische Tests prüfen Endpunkte, Signierung, Wiederholungsgrenzen, Rate-Limit-Behandlung, Teilfehler, Anonymisierung, Cache, parallele Anforderungen und den lokalen ioBroker-Button. Keine persönlichen Fixtures und keine Cloud-Aufrufe in Tests. Der erste Realabruf ist erfolgt; Ergebnisse stehen im folgenden Abschnitt Realprüfung.

Prüfergebnis am 27.11.2026 unter Windows / Node 26.13.1: 28 Unit-Tests, 57 Paketprüfungen, Syntaxprüfungen und ESLint erfolgreich. Der lokale Starttest mit js-controller 8.0.0-alpha.27-20261126-6d87adfc0 bestand ebenfalls, einschließlich sauberem Beenden. Der Starttest verwendet keine Zugangsdaten und bestätigt keine reale Cloud-Unterstützung der Metadatenendpunkte.

## Realprüfung am 27.11.2026

Installierter Build `0.4.1 · 493a828` aus npm-lock bestätigt. Ein expliziter Diagnoseabruf um 11:49:55 UTC war für alle drei Endpunkte erfolgreich. Zuvor trat beim normalen Statuspolling ein DNS-Fehler EAI_AGAIN auf; dataStale war korrekt true. Kein Neustart und keine Gerätebefehle ausgeführt.

Für Typ 030 / Feature 1wk080218v0w: Propertyliste leer (`properties: []`), statische Nutzdaten `data: null`. Die Selbstdiagnose liefert eine Regeltabelle mit 29 Einträgen und eine leere `selfCheckFailedList`. Die Regeltabelle ist kein Verzeichnis aktuell aktiver Fehler. Inhalte kamen auf Polnisch; keine deutschen Übersetzungen aus diesen Freitexten abgeleitet.

Zwei direkt nutzbare Regeln: `Waterbox_Full=1` mit contentKey `selfcheck_dryer_content_water_storage_box`; `Clean_Filter=1` mit contentKey `selfcheck_dryer_content_filter_status`. Beide Metaregeln nennen ebenfalls denselben statusKey/statusValue und statusOperator 0. Aktuelle Raw-Werte waren jeweils 0. Daraus werden ausschließlich im geprüften Featureprofil die lesbaren Hinweise `waterTankFull` und `cleanFilter` ergänzt: 1 aktiv, 0 nicht gesetzt, andere/ungültige Werte unbekannt (null). Kein Nachweis der physischen Auslösung; Warnungen nicht durch absichtliches Füllen oder Verschmutzen testen. Andere Gerätefamilien bleiben unverändert.

Türstatus, Programmende und weitere Programme sind durch diese Antworten nicht geklärt. Fehlertexte können später unabhängig aus den Metadaten abgeleitet werden; die bloße Existenz einer Regel belegt keinen aktuellen Fehler. Keine vollständigen Geräteberichte oder personenbezogenen Fixtures im Repository gespeichert.
