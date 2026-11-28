# Trocknererweiterung aus vorhandenen Referenzen

Geprüft am 27.11.2026. Die Default-Branch-Stände wurden erneut per git fetch geprüft; gegenüber der ersten Analyse sind die folgenden HEADs unverändert. Keine Cloud-Abfragen, Gerätebefehle, Lizenzwechsel oder Quellcodeimporte durchgeführt.

## Quellen

| Projekt | Commit | Nutzen |
| --- | --- | --- |
| oyvindwe/connectlife | 66a273fbf39e5f9f251bbe8ee9446f5c81a0496f | Python-Client: Metadaten, Status, Fehlerbeschreibungen und Statistikabfragen |
| oyvindwe/connectlife-ha | 37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb | Gerätefamilien, Programme, Optionen, Varianten und dokumentierte Beobachtungen |
| Connectlife-LLC/HomeAssistantPlugin | ee90e2752749290b07e28c89694eda754334d2cc | Herstellerimplementierung mit MIT-Lizenz, besonders dynamische Eigenschafts-/Statikabfragen |

Die ersten beiden enthalten GPLv3-Lizenztexte. Der Herstellerclient enthält eine MIT-Lizenz. Unser Adapter bleibt vorerst MIT; direkte Übernahmen oder Übersetzungen aus GPL-Code und Mapping-Dateien werden nicht als MIT-eigener Code ausgegeben. Referenzierte Protokollbefunde und eigene Beobachtungen sind von einer Übernahme der Implementierung zu unterscheiden. Vor einem umfangreichen Mapping-Import wäre eine Lizenzstrategie oder gesonderte Erlaubnis erforderlich; kein automatischer Lizenzwechsel im Fork.

## Was schon vorhanden ist

In `connectlife-ha/custom_components/connectlife/mappings/` existieren Grundprofile für 004, 030 und 032. Für 030 liegen 13 Featureprofile vor. Exakt `030-1wk080218v0w.yaml` fehlt. Die Python-Bibliothek enthält außerdem Dumps für 004, 030 und 032; diese dienen als Strukturreferenz, werden nicht ungeprüft als eigene Fixtures importiert.

Das [030-Grundprofil](https://github.com/oyvindwe/connectlife-ha/blob/37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb/custom_components/connectlife/mappings/030.yaml) enthält Betriebszustände, Programme, Tür-/Filter-/Wassertankhinweise, Trockenoptionen und Energieeinordnungen. Unsere beobachteten Programm- und Hauptzustandswerte stimmen damit überein. Ein Großteil muss daher nicht erneut blind gesucht werden.

Ein Gegenbeispiel zur pauschalen Übernahme ist [030-1wk080066v0w](https://github.com/oyvindwe/connectlife-ha/blob/37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb/custom_components/connectlife/mappings/030-1wk080066v0w.yaml): Die Trockenart wird anders benannt; Zeitprogramme interpretieren denselben Parameter anders. Das Profil dokumentiert zudem eine Einschränkung des Eco-Programms, das an unserem Gerät vorhanden ist. Gleiches Familienpräfix bedeutet daher nicht vollständige Modellgleichheit.

Für [032](https://github.com/oyvindwe/connectlife-ha/blob/37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb/custom_components/connectlife/mappings/032.yaml) werden andere Propertynamen und Zustandscodes verwendet. Die Befehlszuordnungen sind dort ausdrücklich als am Gerät ungeprüft bezeichnet. Das ist kein ausreichender Nachweis für sichere Schreibzugriffe.

Das HA-Projekt verwendet Familiengrundlagen mit Feature-Overrides. Diese Aufteilung eignet sich auch als Architekturprinzip für unseren unabhängigen Profilcode. Referenzbasiert und am eigenen Gerät bestätigt müssen als unterschiedliche Evidenzstufen dokumentiert bleiben.

## Dynamische Informationen statt ausschließlich fester Tabellen

Der [Python-Client](https://github.com/oyvindwe/connectlife/blob/66a273fbf39e5f9f251bbe8ee9446f5c81a0496f/connectlife/api.py) implementiert bereits:

| Abfrage | Identifikation | Möglicher Nutzen und Grenze |
| --- | --- | --- |
| GET /clife-svc/get_property_list | deviceTypeCode, deviceFeatureCode | Eigenschaften pro Familie/Feature; nicht automatisch Nachweis der tatsächlichen Gerätefähigkeiten oder Schreibbarkeit |
| POST /clife-svc/pu/query_static_data | puid | gerätespezifische Metadaten; unvollständig dokumentiertes Schema |
| POST /clife-svc/pu/query_system_data | puid | je nach Gerät Programminformationen; Trocknerumfang noch nicht nachgewiesen |
| POST /basic/self_check/info | puid, noRecord=1 | mögliche und aktuelle Fehler mit Property, Fehlerwert und Beschreibungen laut Referenz |
| POST /clife-svc/pu/energyConsumptionCurve | geräte-/zeitraumbezogene Parameter | historische Statistik; tatsächliche Unterstützung für unseren Trockner noch offen |

Diese Methoden sind im Referenzcode nachgewiesen. Propertyliste, statische Daten und Selbstdiagnose sind inzwischen real abgefragt; Systemdaten und Energiehistorie bleiben ungeprüft. POST-Abfragen in dieser Tabelle sind lesende Fachoperationen; sie sind von Befehlsendpunkten zu unterscheiden. Vor Integration genaue Antwortformen validieren und anonymisieren, Token-Handling des bestehenden Clients wiederverwenden und Metadaten nur bei Bedarf/cachiert laden, nicht bei jedem Statuspoll.

Der [MIT-Herstellerclient](https://github.com/Connectlife-LLC/HomeAssistantPlugin/blob/ee90e2752749290b07e28c89694eda754334d2cc/custom_components/hisense_ac_plugin/api.py) zeigt ebenfalls Property- und Statikabfragen. Er filtert die unterstützten Typen allerdings auf 009, 008, 007, 006, 016 und 035; unsere Trocknertypen sind darin nicht enthalten. Er ist deshalb eine Quelle für die Metadatenmechanik, kein fertiges Trocknerprofil. Außerdem nutzt er den Drittanbieterzugang und eine andere Signierung; nicht ungeprüft in den App-Gateway-Client einsetzen.

## Konkreter nächster Ausbau

Fortsetzung vom 27.11.2026: Beide Python-/HA-Repositories erneut gefetcht; die oben genannten Default-Branch-Commits sind unverändert. Schritte 1 und 2 sind umgesetzt und die ersten drei Abfragen real erfolgreich. Die vierte Abfrage `query_system_data` ist jetzt lokal ergänzt (eigene Implementierung des belegten POST-Protokolls mit ausschließlich puid als Fachparameter; Quelle `connectlife/api.py`, Methode `query_system_data`, Zeilen 417–431). Realunterstützung durch unseren Trockner steht aus. Ein einzelner Türstatusbefund wird mit sichtbarer Evidenzkennzeichnung genutzt; kein vollständiger GPL-Mappingimport.

Prioritäten nach dieser lokalen Erweiterung: Systemdaten nach Installation einmal auswerten; wenn sie leer sind, keine festen Programme daraus erfinden. Danach Metadaten-basierte Fehlerbeschreibungen entwickeln und Geräteaktualität behandeln. Weitere Familien getrennt über anonymisierte Diagnosen unterstützen. Die 030-Referenz dokumentiert für `dry_time` unterschiedliche Bedeutungen bei Sensor- und Zeitprogrammen; `Current_program_phase` ist am eigenen Gerät auch im Standby unverändert und eignet sich allein nicht als Fertigsignal. Energieabfragen benötigen eigene Einheiten-/Antwortvalidierung.

1. Metadatenabfragen unabhängig von ioBroker implementieren und mit synthetischen Antworten testen. Fachliche Fehler und fehlende Unterstützung ausdrücklich abbilden.
2. Einen ausdrücklich ausgelösten Diagnoseabruf für Propertyliste, statische Daten und Selbstdiagnose ergänzen. Keine Befehls- oder Push-Registrierung ausführen. Ergebnisse vor Speicherung anonymisieren.
3. Aus Antworten und referenzierten Familienkenntnissen ein Trockner-Grundprofil mit Feature-Overrides erstellen. Betriebszustand, Tür, Programme und Wartung priorisieren; Quellen und Evidenzstufe je Regel festhalten.
4. Mit wenigen gezielten Gerätetests nur offene Modellabweichungen prüfen. Programmende, Abbruch und Zeitprogramme bleiben besonders relevant.
5. Typen 004 und 032 separat ergänzen; keine 030-Codes übertragen. Steuerung erst nach eigener ausdrücklicher Freigabe und belastbarer Semantik.

Die manuellen Tests sind damit eine gezielte Validierung der Referenzen statt einer vollständigen Neuerforschung. Python und Home Assistant werden im Produktivbetrieb weiterhin nicht benötigt.
