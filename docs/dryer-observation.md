# Trockner: Einschalten und Standby

27.11.2026, Adapteraktualisierung 10:59:51 Uhr MEZ. Nur vorhandene ioBroker-Zustände gelesen. Keine Cloud-Befehle oder Konfigurationsänderungen.

Gerätebezeichnung DH3i80-DVW003-000, Typ 030, Feature 1wk080218v0w. Gerätekennung und persönliche Metadaten werden nicht dokumentiert.

## Befunde

- Beim Einschalten um 10:52:23: online false → true, machine_status 0 → 1, Drum_Light 0 → 1.
- Im vom Benutzer gemeldeten Standby: online true, machine_status 1, Drum_Light 0, ApplicationPermissions 3 statt initial 2.
- online und ApplicationPermissions haben zuletzt um 10:59:51 gewechselt. Dazwischen liegt keine durchgehende Aufzeichnung vor; Zwischenzustände sind unbekannt.
- Programm-ID 28 und alle drei Zeitfelder mit 198 Minuten bleiben erhalten. Current_program_phase bleibt 2. Diese Werte belegen keinen laufenden Trockengang.
- Cloud verbunden; lastError und nextRetry leer. lastUpdate bezeichnet den Adapterabruf, nicht zwingend neue Gerätemesswerte.

## Einordnung

Die [Typ-030-Referenz](https://github.com/oyvindwe/connectlife-ha/blob/37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb/custom_components/connectlife/mappings/030.yaml) ordnet machine_status 0/1/2/3 als aus/Standby/laufend/pausiert ein. Für dieses Gerät sind bisher nur 0 und 1 beobachtet. Door_status 2 entspricht laut Referenz geschlossen; gezielte Türprobe fehlt. Programm 28 entspricht im allgemeinen Mapping Eco, aber Modellvarianten weichen ab; Displayabgleich erforderlich.

ApplicationPermissions 3 deutet laut Referenz auf erweiterte Fernsteuerberechtigung. Das ist kein Nachweis einer sicheren Befehlsausführung an diesem Modell. Actions 0 ist ein Befehlsfeld und kein Laufstatus.

energy 66 ist kein belegter Verbrauchszähler: die Referenz beschreibt programmabhängige Schätzwerte. Einheit und Skalierung des konkreten Modells sind ungeprüft. Auch temperature 0 ist keine belegte Messung von 0 °C. washing_machine_type_kg 18 beweist keine Kapazität von 18 kg. parse_lib_ver 20260722 ist eine Parserkennung, keine nachgewiesene Firmwareversion.

Die Verbrauchsteilfelder sind 0; reale Messung, Skalierung und Rücksetzverhalten bleiben offen. Trockenstufe Dry_Level 1 und dry_time 1 benötigen einen Displayabgleich; dry_time ist bei verwandten Geräten je nach Programm Trockenart oder Minuten. Keine pauschale Minutenzuordnung.

Wartungs-, Fehler- und Funktionsflags bleiben weitgehend 0. Daraus folgt weder garantierte Fehlerfreiheit noch die Verfügbarkeit einer Funktion. Freq_alert 1 und Childlock_newfuntion 1 haben ungeklärte Bedeutung und sind nicht automatisch Alarm oder aktive Kindersicherung. Alle Assistentenparameter DryingWizzard_* sind 0 und ohne Modellnachweis nicht auszuwerten.

## Konsequenz für den Adapter

Onlinezustand, Hauptbetriebszustand und Programmkontext getrennt darstellen. Current_program_phase allein darf keinen running-Zustand setzen. Restzeit im Standby als gespeicherten Programmwert behandeln, Fortschritt nicht daraus berechnen. Unbekannte Felder lesbar erhalten und keine Steuerung daraus ableiten.

Nächste Validierung: Türöffnung, Programmwechsel mit Displayabgleich und später ein vom Benutzer am Gerät gestarteter Trockengang. Keine Referenzdateien oder Mapping-Quelltexte übernommen.

## Vollständige Rohwerte

### Nachtrag: Wechsel Eco → Baumwolle

Benutzer hat am Gerät von Eco auf Baumwolle gewechselt. Adapteraktualisierung am 27.11.2026 um 11:01:57 Uhr MEZ. Vergleich aller 107 Rohwerte mit dem Standby-Snapshot ergibt genau fünf Änderungen:

| Eigenschaft | Eco | Baumwolle |
| --- | --- | --- |
| Selected_program_ID | 28 | 8 |
| drying_linkage_programid | 28 | 8 |
| Selected_program_remaining_time_in_minutes | 198 | 200 |
| Selected_program_total_time_in_minutes | 198 | 200 |
| Selected_program_total_running_time_in_minutes | 198 | 200 |

Damit sind Programm 28 = Eco und 8 = Baumwolle durch Benutzerhandlung und API-Beobachtung am konkreten Gerät belegt. Alle drei Zeitfelder wechseln bereits bei Programmauswahl; total_running_time ist somit kein einfacher Zähler bisheriger tatsächlicher Laufminuten. Der Benutzer hat die Displayanzeige von 3:20 Stunden bestätigt; sie entspricht den 200 Minuten aus der API.

machine_status bleibt 1, Current_program_phase bleibt 2, energy bleibt 66, Dry_Level und dry_time bleiben 1, ApplicationPermissions bleibt 3 und Door_status bleibt 2. Der Programmwechsel allein startet nach den beobachteten Hauptzuständen keinen Trockengang. energy reagiert in diesem Vergleich nicht auf den Programmwechsel; die frühere Referenzvermutung eines Programmschätzwerts ist für dieses Modell weiterhin ungeprüft.

### Rohwertliste des ursprünglichen Standby-Snapshots

### Nachtrag: Baumwolle auf Extra trocken

Benutzer erhöht den Trockengrad auf Extra trocken und meldet 3:30 am Display. Nach der regulären Adapteraktualisierung am 27.11.2026 um 11:03:59 Uhr MEZ ändern sich genau fünf der 107 Rohwerte gegenüber Baumwolle mit 3:20:

| Eigenschaft | Vorher | Extra trocken |
| --- | --- | --- |
| dry_time | 1 | 3 |
| energy | 66 | 70 |
| Selected_program_remaining_time_in_minutes | 200 | 210 |
| Selected_program_total_time_in_minutes | 200 | 210 |
| Selected_program_total_running_time_in_minutes | 200 | 210 |

Programm-ID bleibt 8, Dry_Level bleibt 1; auch dry_level_new und Dry_Level_show bleiben 0. Die beobachtete Bedienung verändert somit dry_time, nicht Dry_Level. Für das konkrete Baumwollprogramm ist dry_time=3 mit der vom Benutzer bezeichneten Option Extra trocken belegt; die vorherige Stufenbezeichnung für dry_time=1 wurde nicht ausdrücklich bestätigt. Die Semantik darf nicht auf Zeitprogramme verallgemeinert werden.

210 Minuten entsprechen den bestätigten 3:30 am Display. energy steigt bereits durch die Auswahl von 66 auf 70, ohne einen Programmstart. Es ist damit kein einfacher Zähler ausschließlich tatsächlich verbrauchter Energie. Ein programm-/optionsabhängiger Schätzwert ist plausibel; Einheit und Skalierung bleiben unbestätigt. Alle übrigen Rohwerte bleiben gegenüber dem Baumwoll-Snapshot unverändert.

### Startversuch über die App: noch kein belastbarer Zustandsnachweis

Der Benutzer kündigte den Start des aktuellen Programms über die App an. Wiederholte rein lesende ioBroker-Abfragen zeigten zunächst weiterhin machine_status=1 und 210 Minuten. Der letzte erfolgreiche Adapterabruf blieb bei 27.11.2026 11:06:04 MEZ stehen. info.lastError meldete Netzwerkfehler ETIMEDOUT und EHOSTUNREACH beim Abruf der Geräteliste; info.connection war trotzdem noch true. Deshalb sind die unveränderten Zustände veraltet und keine Aussage über Erfolg oder Misserfolg des App-Starts. Eine Zuordnung von machine_status=2 als tatsächlich beobachteter Laufzustand dieses Geräts ist damit noch nicht belegt. Keine zusätzlichen Cloud-Anfragen, Befehle oder Neustarts ausgelöst.

### Laufzustand anschließend bestätigt

Der Benutzer bestätigt den tatsächlichen Lauf und in der App angebotene Pause-/Stopp-Funktionen. Der erfolgreiche Adapterabruf vom 27.11.2026 um 11:09:09 Uhr MEZ liefert wieder aktuelle Daten; lastError und nextRetry sind leer. Vergleich aller Rohwerte mit Baumwolle Extra trocken vor Start ergibt genau zwei Änderungen: machine_status 1 → 2 und Selected_program_remaining_time_in_minutes 210 → 207. Beide Gesamtzeitfelder bleiben 210, Programm-ID bleibt 8, Current_program_phase bleibt 2, ApplicationPermissions bleibt 3, Actions bleibt 0, energy bleibt 70 und error_code bleibt 0.

Damit ist machine_status=2 durch reale Beobachtung als laufender Betrieb dieses Geräts bestätigt. Die verbleibende Zeit zählt während des Laufs herunter, während die Gesamtzeit zunächst bestehen bleibt. Actions=0 bildet den Lauf nicht ab. Dass die App Pause und Stopp anbietet, belegt noch nicht die native API-Befehlssemantik; keine Befehle durch den Entwicklungsclient ausgeführt. Ein tatsächlicher Pausenzustand wurde noch nicht beobachtet.

### Pause über die App bestätigt

Nach der vom Benutzer betätigten Pause zeigt der erfolgreiche Adapterabruf vom 27.11.2026 um 11:10:12 Uhr MEZ genau zwei Rohwertänderungen gegenüber dem zuletzt beobachteten Laufzustand: machine_status 2 → 3 und Drum_Light 0 → 1. Damit ist machine_status=3 für dieses Gerät als pausiert bestätigt.

Die Restzeit steht im Snapshot weiterhin auf 207 Minuten, beide Gesamtzeitfelder auf 210. Ob der Countdown während längerer Pause vollständig stehen bleibt, benötigt eine weitere zeitversetzte Beobachtung. Current_program_phase bleibt 2, Actions bleibt 0, ApplicationPermissions bleibt 3, Door_status bleibt 2, energy bleibt 70 und error_code bleibt 0. Programm-ID bleibt 8, dry_time bleibt 3. Somit unterscheiden weder Current_program_phase noch Actions zuverlässig zwischen Lauf und Pause; machine_status tut dies im beobachteten Übergang. Keine Steuerbefehle durch den Entwicklungsclient ausgeführt.

Die folgende Liste enthält alle 107 Eigenschaften; nur die oben genannten Interpretationen sind eingegrenzt. Alle übrigen Werte bleiben semantisch offen.

| Eigenschaft | Wert |
| --- | --- |
| Actions | 0 |
| AllergySafe | 0 |
| AntiCrease | 0 |
| AntiCrease_NotDelayEnd_flag | 0 |
| APPControl_flag | 0 |
| ApplicationPermissions | 3 |
| Aromatherapy | 0 |
| Auxiliary_heat | 0 |
| CancelDelayEndFlag | 0 |
| Child_lock | 0 |
| Childlock_newfuntion | 1 |
| ChildLockFlag | 0 |
| Clean_Filter | 0 |
| CloudProgramFlag | 0 |
| Current_program_phase | 2 |
| currrent_dry_level_time | 0 |
| Damp_Alert | 0 |
| default_dry_level | 0 |
| delay_close_dryer_time | 0 |
| delay_time_hour_min | 4 |
| DelayEndTime_Hour | 0 |
| DelayEndTime_Minute | 0 |
| Door_status | 2 |
| DownLight_LightTime | 0 |
| Drum_Light | 0 |
| Dry_Level | 1 |
| dry_level_new | 0 |
| Dry_Level_show | 0 |
| dry_time | 1 |
| DryEndReminder | 0 |
| drying_linkage_order | 0 |
| drying_linkage_preheat_time | 0 |
| drying_linkage_programid | 28 |
| drying_washing_linkage_state | 0 |
| DryingWizzard_ClothesDryLevel | 0 |
| DryingWizzard_ClothesDryLevel1 | 0 |
| DryingWizzard_ClothesDryTarget | 0 |
| DryingWizzard_ClothesDryTarget1 | 0 |
| DryingWizzard_ClothesMaterialCharacteristics | 0 |
| DryingWizzard_ClothesMaterialCharacteristics_first | 0 |
| DryingWizzard_ClothesMaterialCharacteristics_second | 0 |
| DryingWizzard_ClothesMaterialCharacteristics_third | 0 |
| DryingWizzard_ClothingType | 0 |
| DryingWizzard_ClothingType_eighth | 0 |
| DryingWizzard_ClothingType_eleventh | 0 |
| DryingWizzard_ClothingType_fifth | 0 |
| DryingWizzard_ClothingType_first | 0 |
| DryingWizzard_ClothingType_fourth | 0 |
| DryingWizzard_ClothingType_ninth | 0 |
| DryingWizzard_ClothingType_second | 0 |
| DryingWizzard_ClothingType_seventh | 0 |
| DryingWizzard_ClothingType_sixth | 0 |
| DryingWizzard_ClothingType_tenth | 0 |
| DryingWizzard_ClothingType_third | 0 |
| DryingWizzard_ClothingType_thirteenth | 0 |
| DryingWizzard_ClothingType_twelfth | 0 |
| Electricit_consumption_decimal | 0 |
| Electricit_consumption_int | 0 |
| energy | 66 |
| error_code | 0 |
| Favour_program_ID | 0 |
| FilterCleanRemindFlag | 0 |
| FilterCleanRunCycle  | 0 |
| FilterCleanSetCycle | 0 |
| FilterCleanSwitch | 0 |
| Freq_alert | 1 |
| FunctionValueID | 0 |
| Hard_pairing_commond | 0 |
| Hard_pairing_status | 0 |
| Ion_Refresh | 0 |
| Iron_Dry_Time | 0 |
| Language | 0 |
| machine_status | 1 |
| mute | 0 |
| Natural_Dry | 0 |
| Night_Dry | 0 |
| parse_lib_ver | 20260722 |
| Pause_AntiCrease_flag | 0 |
| PreheatEndReminder | 0 |
| QuickerMode | 0 |
| Remote_hold | 0 |
| ScreenSaverTime | 0 |
| Selected_program_ID | 28 |
| Selected_program_remaining_time_in_minutes | 198 |
| Selected_program_total_running_time_in_minutes | 198 |
| Selected_program_total_time_in_minutes | 198 |
| Session_pairing_commond | 0 |
| Session_pairing_states | 0 |
| Sound_setting | 0 |
| StandardElectricitconsumption_decimal | 0 |
| StandardElectricitConsumption_int | 0 |
| Steam | 0 |
| SteamEngineLackWaterState | 0 |
| stoprunning_flag | 0 |
| Store_Dry_Time | 0 |
| support_preheat_state | 0 |
| temperature | 0 |
| TemperatureHideFlag | 0 |
| time_autoflag | 0 |
| timezone | 0 |
| UV_Sterilization | 0 |
| washing_machine_type | 0 |
| washing_machine_type_kg | 18 |
| washing_program_kg | 0 |
| Waterbox_Full | 0 |
| Wear_Dry_Time | 0 |
| Zibian_program_ID | 0 |
