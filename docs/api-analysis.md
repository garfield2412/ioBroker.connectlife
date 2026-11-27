# ConnectLife-API: Analyse für eine native TypeScript-Portierung

Stand: 27.11.2026. Untersuchungsumfang: öffentlich zugängliche aktuelle Default-Branch-Quelltexte. Keine eigenen authentifizierten Cloud-Tests.

## 1. Evidenz und reproduzierbare Quellen

**Q** bezeichnet einen selbst geprüften Quellcodebefund. **R** bezeichnet eine Laufzeitbeobachtung, die nur die Referenz berichtet. **E** wäre ein eigener Cloud-Nachweis; solche Nachweise liegen nicht vor. **P** bezeichnet einen Architekturvorschlag oder eine offene Annahme. Alle nachfolgenden Protokollbeschreibungen sind Q, soweit nicht anders markiert. Sie sind keine Herstellergarantie.

| Quelle | Geprüfter Commit | Relevante Dateien und Lizenz |
| --- | --- | --- |
| [oyvindwe/connectlife](https://github.com/oyvindwe/connectlife) | `66a273fbf39e5f9f251bbe8ee9446f5c81a0496f` | `connectlife/api.py`, `oauth.py`, `trir.py`, `push.py`, `appliance.py`, Tests, Dumps; GPLv3-Lizenztext, Version 0.15.0 |
| [oyvindwe/connectlife-ha](https://github.com/oyvindwe/connectlife-ha) | `37cb0b020818d83d5eb723d1e9bce99ef8bdc1cb` | `custom_components/connectlife/{manifest.json,config_flow.py,coordinator.py,device_mappings.py,mappings/}`; GPLv3-Lizenztext, Version 1.1.1 |
| [bilan/connectlife-api-connector](https://github.com/bilan/connectlife-api-connector) | `f3b43b3b63756f6158e2b2c4e7eda5fab2bfd787` | `app/Services/ConnectlifeApiService.php`, `composer.json`; MIT laut Manifest, kein LICENSE im Repository-Wurzelverzeichnis gefunden |
| [Connectlife-LLC/HomeAssistantPlugin](https://github.com/Connectlife-LLC/HomeAssistantPlugin) | `ee90e2752749290b07e28c89694eda754334d2cc` | `custom_components/hisense_ac_plugin/{api.py,oauth2.py,const.py,manifest.json}`; MIT, Copyright Hisense 2025 |
| [Andiweli/ioBroker.connectlife](https://github.com/Andiweli/ioBroker.connectlife) | `5ab2d0222137cca597c3fccf578784f00acdc580` | `lib/connectlife-client.js`, `lib/connectlife-client-v011.js`, `main.js`, `package.json`, README; MIT, Version 0.3.1 |
| [GermanBluefox/ioBroker.connectlife](https://github.com/GermanBluefox/ioBroker.connectlife) | `5ab2d0222137cca597c3fccf578784f00acdc580` | Beim Abruf identischer Stand zum oben genannten Projekt; kein unabhängiger API-Nachweis |
| [ioBroker/create-adapter](https://github.com/ioBroker/create-adapter) | `43f5382eccd539c6b8f98ea7b7e5ca8662afead1` | `templates/package.json.ts`, `templates/io-package.json.ts`, Testvorlagen; MIT |
| [ioBroker/ioBroker.docs](https://github.com/ioBroker/ioBroker.docs) | `2b2c3a52e3f1a644f86795c828ae97129719e317` | `docs/de/dev/adaptersecurity.md`, `adaptertesting.md`; MIT |

Permalinks entstehen durch `https://github.com/<owner>/<repo>/blob/<commit>/<pfad>`. Beispiel: [geprüfter API-Client](https://github.com/oyvindwe/connectlife/blob/66a273fbf39e5f9f251bbe8ee9446f5c81a0496f/connectlife/api.py), [Hersteller-Client](https://github.com/Connectlife-LLC/HomeAssistantPlugin/blob/ee90e2752749290b07e28c89694eda754334d2cc/custom_components/hisense_ac_plugin/api.py).

Zusätzlich wurden [AdapterRequest #779 einschließlich Kommentare](https://github.com/ioBroker/AdapterRequests/issues/779) und der [ConnectLife Developer Hub](https://www.developer.connectlife.io/docs) geprüft. Das historische Issue nennt noch keine offizielle API; die aktuelle Lage ist weiter: Herstellerintegration, Developer-Portal und vorhandener ioBroker-Adapter existieren. Das Portal verlangt Registrierung, App-Credentials und Freigabe. Frei sichtbare Portaltexte liefern noch keinen vollständigen Vertrag für Endpunkte, Quoten oder unterstützte Trockner. Keine Anmeldung im Portal vorgenommen.

## 2. Login und Sitzungen

### EU-Passwortfluss

Die Referenz `api.py` implementiert vier Schritte:

1. `POST https://accounts.eu1.gigya.com/accounts.login`, Formdaten `loginID`, `password`, `APIKey`. Benötigt werden `UID` und `sessionInfo.cookieValue`.
2. `POST https://accounts.eu1.gigya.com/accounts.getJWT`, Formdaten `APIKey`, `login_token` mit dem zuvor erhaltenen Cookie-Wert. Ergebnis `id_token`.
3. `POST https://oauth.hijuconn.com/oauth/authorize`, JSON mit `client_id`, `redirect_uri`, `idToken`, `response_type=code`, `thirdType=CDC`, `thirdClientId=UID`. Ergebnis `code`.
4. `POST https://oauth.hijuconn.com/oauth/token`, Formdaten `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`, `code`. Ergebnis mindestens `access_token` und `expires_in`; außerdem Refresh-Informationen.

Die Referenz nutzt `https://api.connectlife.io/swagger/oauth2-redirect.html` als Redirect-URI. App-/Clientkennungen und Signaturkonstanten sind im Fremdcode enthalten; deren Werte werden hier bewusst nicht vervielfältigt. Verfügbarkeit oder erlaubte Nutzung durch einen neuen Adapter folgt daraus nicht.

Der Login ist kein gewöhnlicher einzelner REST-Bearer-Login. HTTP 200 kann einen fachlichen Fehler enthalten. Gigya `206001` bedeutet laut Referenz ausstehende Registrierung/Zustimmung zu Bedingungen (R); Benutzer muss dies gegebenenfalls in der offiziellen App erledigen. Falsche Zugangsdaten, Zustimmungsbedarf, temporäre Serverfehler und Netzwerkfehler benötigen unterschiedliche Behandlung. Social-only-Konten sind für den Passwortfluss nicht zugesichert.

### Token-Lebenszyklus

`access_token`, `refresh_token`, `expires_in` und optional `refreshTokenExpiredTime` werden benötigt. Die Referenz erneuert 90 Sekunden vor Ablauf und versteht Refresh-Ablauf als Millisekunden-Zeitstempel oder ISO-Zeit. Fehlende Refresh-Tokens führen später zur Neuanmeldung. Refresh erfolgt am selben Token-Endpunkt mit `grant_type=refresh_token`, Refresh-Token und Client-/Redirect-Angaben. Neue Refresh-Tokens müssen alte atomar ersetzen. Die Referenz fällt bei Refresh-Fehlern auf Login zurück; eine Portierung sollte dies bei Netz-/Rate-Limit-Fehlern begrenzen, um keine Login-Stürme auszulösen (P).

UID, Gigya-Sitzung, JWT und Autorisierungscode sind kurzlebige Zwischenwerte; keine ioBroker-Zustände. Tokens zunächst ausschließlich im Instanzspeicher. Refresh-Singleflight verhindert konkurrierende Erneuerungen. Rotation und Wechselwirkungen zweier Instanzen sind ohne Realtest offen.

### Browser-OAuth und Herstellerweg

`oauth.py` und die Herstellerintegration verwenden `https://oauth.hijuconn.com/login` als Browser-Einstieg und `/oauth/token` für den Austausch. Im Unterschied dazu ist `/oauth/authorize` oben ein JSON-Endpunkt für den Passwortfluss. Der Browserweg ermöglicht laut Referenz auch Social Login und Zustimmungen. Die vorhandene HA-Clientidentität akzeptiert einen HA-Redirect; ein ioBroker-Redirect ist damit nicht belegt. Eine eigene registrierte App ist der bevorzugte langfristige Weg (P). Callback, `state` und gegebenenfalls PKCE müssen anhand der registrierten App geprüft werden; PKCE-Unterstützung ist hier nicht nachgewiesen.

## 3. Cloud-Zugänge und Signierung

| Zugang | Host | Verfahren und Einordnung |
| --- | --- | --- |
| EU-App-Gateway | `https://clife-eu-gateway.hijuconn.com` | Gigya/OAuth-Token, signierte Query-/JSON-Parameter, verschachteltes `response` |
| Drittanbieter-API | `https://juapi-3rd.hijuconn.com` | Browser-OAuth, HMAC-SHA256-Header, Ergebnis auf oberster Ebene |
| Russland/CIS TRIR | `https://clife-ru2-gateway.hijuconn.com` | Separater Login, AES-/RSA-Transport und SHA1-Signierung; eigenes Backendprofil erforderlich |

Für weitere Weltregionen ist keine vollständige, verifizierte Hostliste vorhanden. Keine US-/China-Hosts aus Namensmustern ableiten. Der Drittanbieterhost ist ein API-Zugang, kein Beleg für eine zusätzliche Kontoregion.

**EU-Signierung:** `accessToken`, `appId`, `appSecret`, `languageId`, `randStr`, `timeStamp`, `timezone`, `version` und fachliche Parameter bilden die Basis. Schlüssel ohne `sign` lexikografisch sortieren, strukturierte Werte kompakt als JSON, Paare als `key=value` mit `&` verbinden, festen Suffix anhängen, SHA-256 bilden. Anschließend Digest mit RSA-Public-Key und PKCS#1-v1.5-Encryption verschlüsseln und Base64 kodieren. Das ist keine RSA-Signatur mit einem privaten Schlüssel. `randStr` ist in der aktuellen Referenz ein frischer kryptografischer 16-Byte-Zufallswert als 32 Hexzeichen; Zeitstempel in Millisekunden. Wiederverwendete Nonces werden laut Referenz abgewiesen (R).

TypeScript kann dies mit `node:crypto` (`createHash`, `publicEncrypt`, `randomBytes`, `constants.RSA_PKCS1_PADDING`) abbilden. Die RSA-Verschlüsselung ist randomisiert: Tests dürfen nicht pauschal gleiche Ciphertexte erwarten. Stattdessen synthetisches Schlüsselpaar verwenden und den entschlüsselten Digest vergleichen (P). Serialisierung, Unicode, String-/Zahlwerte und URL-Encoding benötigen eigenständige Testvektoren.

**Drittanbieter:** Systemparameter enthalten zusätzlich dauerhaftes `sourceId` und `platformId`. Signatur-Header `Authorization: Signature …`, `Date`, `hi-params-encrypt` und `Digest` verwenden HMAC-SHA256 beziehungsweise SHA-256 über den Body. Bei GET liegt das Zugriffstoken im Header, bei POST im JSON. Pfad inklusive Query und exakte Bodybytes beeinflussen die Signierung. `oauth.py` wechselt für Energie-, Systemdaten- und Push-Anfragen zurück zum App-Gateway. Gleiche Pfade bedeuten deshalb keine austauschbaren Signaturverfahren.

**TRIR:** `POST /account/acc/login_pwd`, `POST /account/acc/refresh_token`, `POST /br/getDeviceTabList`. Initiallogin verwendet RSA-verpackten MD5-Passworthash und `HENC-`-Envelope mit AES-CBC; Signatur basiert auf SHA1 und abweichender Feldfilterung. Passwort-/Signaturkonstanten werden nicht übertragen. TRIR zunächst dokumentiert, nicht Teil des ersten EU-Clients (P).

## 4. Endpunkte und Datenabruf

Folgende Methoden stammen aus `api.py`; Host ist das EU-Gateway, soweit nicht anders angegeben. POST bedeutet hier nicht automatisch Geräteänderung; einige Abfragen verwenden POST.

| Methode / Pfad | Fachliche Parameter ohne gemeinsame Signaturfelder | Ergebnis/Zweck |
| --- | --- | --- |
| GET `/clife-svc/pu/get_device_status_list` | keine zusätzlichen | `response.deviceList`, einschließlich Metadaten und `statusList` aller Geräte |
| POST `/clife-svc/pu/query_static_data` | `puid` | gerätespezifische, nicht vollständig dokumentierte Metadaten |
| GET `/clife-svc/get_property_list` | `deviceTypeCode`, `deviceFeatureCode` | Eigenschaftsliste für Typ-/Feature-Kombination |
| POST `/clife-svc/pu/query_system_data` | `puid` | System-/Programmdaten; Schema abhängig vom Gerät |
| POST `/basic/self_check/info` | `puid`, `noRecord="1"` | mögliche und aktuelle Fehler mit Beschreibungen laut Referenz |
| POST `/clife-svc/pu/get_hour_power` | `puid`, `date` | Stundenstatistik; für Nicht-AC laut Referenz oft Nullen |
| POST `/clife-svc/pu/air_duct_energy` | Typ-/Feature-Code, `puid`, Zeitraumparameter, `curve` | AC-Energiestatistik; nicht als Trocknerenergie interpretieren |
| POST `/clife-svc/pu/energyConsumptionCurve` | Typ-/Feature-Code, `puid`, Zeitraumparameter | Energie/Wasser/Zyklen; Zeiträume und Einheiten geräteabhängig prüfen |
| POST `/device/pu/property/set` | `puid`, `properties` | **Geräteschreibzugriff: ausgeschlossen** |
| POST `/msg/registerPhoneDevice` | `phoneCode` | **Cloud-Registrierung: ohne Freigabe ausgeschlossen** |
| GET `/msg/get_msg_and_channels` | `phoneCode`, `pageNo`, `pageSize`, `queryType` | Push-Server und Kanäle |

Energieabfragen sind nicht für den ersten Pollingpfad vorgesehen. Exakte Zeitraumfelder vor Implementierung am jeweiligen Referenzaufruf prüfen; keine gemeinsame, erfundene Statistik-API schaffen. Es ist kein separater Einzelgeräte-Statusabruf für den initialen EU-Pfad erforderlich: die Liste liefert bereits Zustände. Eine Anfrage pro Konto und Zyklus genügt zunächst.

## 5. Geräteidentität, Beschreibungen und Kategorien

`deviceId` dient der Geräteidentität, `puid` der Adressierung vieler Cloud-Abfragen/Befehle; `wifiId` ist eine weitere Kennung. Nicht ohne Beleg gleichsetzen. Weitere Felder sind `deviceNickName`, `deviceTypeCode`, `deviceTypeName`, `deviceFeatureCode`, `deviceFeatureName`, `role`, Raum- und Zeitinformationen. Seriennummer, tatsächliche Modellnummer und Firmware sind damit noch nicht generell nachgewiesen. `offlineState=1` bedeutet im geprüften Modell **online**, `0` offline.

`statusList` ist eine Map mit häufig als Strings gelieferten Werten. Fehlende, leere und gecachte Statuslisten müssen unterscheidbar sein; ein Geräteausfall darf nicht aus einer einzelnen unvollständigen Cloud-Liste abgeleitet werden. Unbekannte Felder erhalten, Zahlen nicht blind konvertieren: führende Nullen, Sentinelwerte, Bitfelder und Zeitangaben können Bedeutung tragen.

| Typcode / Familie | Nachweis und Konsequenz |
| --- | --- |
| `004` | ASKO-Pro-Trockner im Dump; andere Parameter als neuere Geräte |
| `030`, `032` | Trockner-Dumps und HA-Mappings; in der generischen `DEVICE_TYPES`-Tabelle von `appliance.py` nicht vollständig erfasst |
| `003`, `025`, `027` | Waschmaschinen mit unterschiedlichen Protokoll-/Propertyfamilien |
| `015` | Geschirrspüler |
| `026` | Kühlschrankfamilie; kein allgemeiner Nachweis jedes Gefriergeräts |
| `013`, `023` | Backöfen |
| `009` | Klimaanlagen |
| `006`, `016`, `010`/`020`/`021` | Entfeuchter, Wärmepumpen und Hauben laut Typzuordnung |

Herstellername oder Gerätetyp allein reichen nicht für ein Profil. HA nutzt lokale YAML-Mappings einschließlich modell-/featureabhängiger Varianten. Dynamische Propertylisten existieren, aber zwei Geräte mit demselben Typ-/Feature-Code erhalten dieselbe Liste; sie beweisen weder tatsächliche Verfügbarkeit noch sichere Schreibbarkeit. `query_static_data` kann Unterschiede pro Gerät zeigen. Ein hybrider Ansatz aus Metadaten, beobachteten Properties und geprüften Profilen ist erforderlich (P).

Trocknerbeispiele zeigen `DeviceStatus` gegenüber `Appliance_status`, unterschiedliche Programm-/Zeitfelder sowie Alarm-/Fehlerbits. Invertierte Bedeutungen sind möglich; aus `Error_1=1` darf ohne Profil kein Fehler abgeleitet werden. Werte wie `255`, `65535` und extreme Datumswerte sind mögliche Sentinels. Für den konkreten Hisense-Wärmepumpentrockner liegen keine eigenen Daten vor. Programmnummern, Restlaufzeit, Fortschritt, Energie und Wartung bleiben daher modellbezogen offen.

## 6. Protokolle, Polling und Push

Die Cloud-Anfragen verwenden HTTPS mit JSON/Formdaten. Ein MQTT-Broker ist beim bilan-Projekt eine lokale Integrationsbrücke zu HA, kein Nachweis für ein benötigtes ConnectLife-MQTT-Protokoll. Der native Adapter benötigt diese Brücke nicht.

Die Python-Referenz enthält experimentellen WebSocket-Push: Client registrieren, Kanal/Host/Port abrufen, dann `wss://<server>:<ssl-port>/ws/<channel>` mit `phoneCode` und Token als Queryparametern verbinden. Nachrichten sind Base64-JSON, `content` kann wiederum JSON-Text sein. Relevante Typen: `status_devicestatus`, `iot_devicestate_change`, `status_wifistatus`. Heartbeat, Deduplizierung, Wiederverbindung und anschließender Snapshot sind nötig. Tokenhaltige URLs dürfen nie in Fehlern erscheinen.

HA verwendet 60 Sekunden Polling; bei aktivem Push 15 Minuten Sicherheitsabfrage, Statistiken separat alle 10 Minuten. Das sind Referenzentscheidungen, **keine offiziellen Quoten**. Für den ersten Client ist rein lesendes Polling vorgesehen; Push erst nach separater Freigabe der Registrierung. Kein Push ist für die grundsätzliche Integration erforderlich.

## 7. Abhängigkeiten und Lizenzen

Python benötigt `aiohttp>=3.9.5` und `cryptography>=42.0.0` bei Python >=3.11. HA bindet `connectlife==0.15.0` ein und verwendet HA-/YAML-Infrastruktur. Bilan benötigt PHP ^8.2, OpenSSL/pcntl, Laravel ^10.10, Guzzle ^7.8 und php-mqtt/client ^2.0. Diese Stacks werden nicht übernommen. Die Herstellerintegration nennt im Manifest keine zusätzlichen Pip-Anforderungen, verwendet aber HA-/Python-APIs. Der vorhandene ioBroker-Adapter verwendet `@iobroker/adapter-core ^3.4.1` und `axios ^1.19.0`, ist am geprüften Stand JavaScript und auf Klimaanlagen getestet.

Für TypeScript genügen voraussichtlich `fetch`, `node:crypto` und Abbruch-/Timer-APIs für den EU-Lesepfad; ioBroker kommt erst in Phase 3 hinzu (P). Build-/Testwerkzeuge werden nach Freigabe passend zum aktuellen Generator gewählt und festgeschrieben. Keine transitive Sicherheitsfreigabe allein aus einem Manifest ableiten: vollständiges Dependency-Audit ist erst mit eigenem Lockfile sinnvoll.

GPLv3-Quellcode, Tests und YAML-Mappings werden nicht kopiert. Eine sprachliche Portierung kann weiterhin eine Bearbeitung sein. Eine spätere Übernahme erfordert passende Projektlizenz und Erfüllung der jeweiligen Bedingungen. MIT-Übernahmen erfordern Erhalt von Lizenz- und Copyright-Hinweisen. Beim bilan-Projekt ist die MIT-Angabe im Manifest schwächer belegt als ein mitgelieferter Lizenztext; vor Übernahme klären. In Phase 1 wurde nur eigenständige Dokumentation erstellt, kein Referenzcode oder Mapping importiert. Eine Projekt-LICENSE wird noch nicht willkürlich festgelegt.

## 8. Risiken und offene Nachweise

- Undokumentierte App-Konstanten, geänderte OAuth-Clients oder Signaturregeln können den Zugriff unterbrechen.
- Herstellerportal eröffnet einen offiziellen Weg, belegt aber noch keine Freigabe für diesen Adapter und seinen Funktionsumfang.
- Rate-Limits, Sitzungsgrenzen und regionale Kontozuordnung sind nicht vollständig öffentlich dokumentiert. HTTP 429 und `Retry-After` berücksichtigen; fehlgeschlagene Logins nicht schnell wiederholen.
- HTTP- und fachliche Fehler getrennt behandeln. Referenzcodes `100026` (Token) und `101005` (Nonce) sind Ansatzpunkte, keine vollständige Fehlerliste.
- Auth-Response-Debuglogging aus der Python-Referenz darf nicht übernommen werden; es kann Tokens enthalten.
- Reale Daten müssen Profilsemantik, Einheiten, Onlineverhalten, Token-Rotation und Mehrinstanzen bestätigen. Mocktests können diese Nachweise nicht ersetzen.
- Seriennummer, Firmware, Fortschritt und Energie nur bereitstellen, wenn Quelle und Bedeutung belegt sind. Fortschritt nicht aus unbekannter Gesamtdauer schätzen.
- Das bereits vorhandene Projekt nutzt denselben Paketnamen. Vor Veröffentlichung sind Wiederverwendung/Kooperation und Namensentscheidung erforderlich.

**Machbarkeit:** Ein eigenständiger nativer TypeScript-Leseclient ist technisch gut begründet. Verlässliche Unterstützung des konkreten Hisense-Trockners und dauerhafte Cloud-Kompatibilität sind noch nicht nachgewiesen. Steuerung erfordert zusätzlich eine eigene Sicherheits- und Semantikprüfung.
