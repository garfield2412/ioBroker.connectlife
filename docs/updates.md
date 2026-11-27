# Versionierung und Updates des Forks

## Vorbereiteter Stand

Basisversion **0.4.1**, Changelogdatum **27.11.2026**. Der Diagnoseabruf wurde als Commit 83f314a auf dem Entwicklungsbranch veröffentlicht. Die nachfolgende Build-Anzeige ist zunächst eine lokale Änderung. Ein späterer Push des Entwicklungsbranches aktualisiert weder main noch die Installation auf dem Raspberry Pi; Tags und Veröffentlichungen sind nicht beauftragt.

Auf Benutzerwunsch bleibt die Basisversion für weitere Entwicklungsstände bei **0.4.1**. Der genaue Stand wird getrennt über den Commit gekennzeichnet. Ein neuer Commit mit identischer Basisversion ist kein regulärer ioBroker-Versionssprung; die Installation über die GitHub-URL bleibt manuell. Für spätere reguläre Releases wird die Versionsnummer wieder ausdrücklich festgelegt.

## Build-Kennung ohne Versionssprung

Beim Adapterstart werden ausschließlich lesbare Zustände gesetzt:

| Datenpunkt | Beispiel / Bedeutung |
| --- | --- |
| info.build | `0.4.1 · 83f314a` |
| info.buildCommit | vollständiger, tatsächlich installierter Commit |
| info.buildSource | `git`, `installedFrom`, `npm-lock` oder `unknown` |

Die gleiche Build-Anzeige erscheint im Startlog. `npm run build:info` gibt die ermittelte Kennung lokal als JSON aus; kein Erzeugen oder Nachtragen eines Hashes im eigenen Commit ist nötig.

Ein direkter Checkout mit eigener .git-Datei oder eigenem .git-Verzeichnis wird lokal über Git gelesen. Nicht eingecheckte Änderungen werden mit `(modified)` markiert. Bei einer Installation verwendet der Adapter einen unveränderlichen Commit in den lokalen ioBroker-Installationsmetadaten oder den aufgelösten Git-Commit aus dem übergeordneten npm-Lockfile. Ein Lockfile-Eintrag mit abweichender Paketversion wird nicht als Beleg verwendet. Branch- und Tagnamen allein sind keine Commit-Kennung. Fehlt ein Nachweis, lautet die Anzeige `0.4.1 · unknown`, der Commitzustand bleibt leer.

Es gibt keine GitHub-Abfrage beim Start: Der aktuelle Branchstand im Internet könnte bereits neuer als die Installation sein und wäre deshalb kein zuverlässiger Buildnachweis. Der Git-Client ist auf dem Produktionshost nicht erforderlich. Die Ermittlung liest keine Zugangsdaten und gibt keine Installations-URLs oder npm-Lockfile-Inhalte aus. Lokale manuelle Änderungen an einer paketierten Installation ohne .git werden durch den Commitnachweis nicht auf Dateiebene geprüft.

Für eine garantiert festgelegte GitHub-Installation kann anstelle eines Branches eine vollständige Commit-URL verwendet werden, beispielsweise `https://github.com/garfield2412/ioBroker.connectlife/tree/<vollständiger-Commit>`. Die Branch-Archiv-URL funktioniert weiterhin; in der geprüften Installation auf dem Host enthält das npm-Lockfile dazu den aufgelösten Commit.

Validierung am 27.11.2026: 34 Unit-Tests, 57 Paketprüfungen, Syntax, ESLint und der lokale Controller-Starttest bestanden (Windows, Node 26.13.1, Testcontroller 8.0.0-alpha). Zusätzlich lieferte eine ausschließlich lesende Ausführung der Build-Ermittlung auf dem Raspberry Pi `0.4.0 · 84d55e7`, Quelle npm-lock. Die Build-Anzeige selbst wurde dort noch nicht installiert. Der lokale Starttest ohne Git-Installationsnachweis zeigt erwartungsgemäß `0.4.1 · unknown`.

Homepage, Repository, Issues, README-, Icon- und Versionsbadge-Links zeigen auf garfield2412. Der ursprüngliche Autor, seine Copyright-/Lizenzangaben und der Verweis auf Andiweli bleiben erhalten. Lokal bleibt Andiweli der Upstream.

## Wie ioBroker Updates erkennt

Die [offizielle Update-Dokumentation](https://www.iobroker.com/docs/install/updateadapter.md) unterscheidet Repository-Versionen und GitHub-Installationen. Die normale Updateanzeige vergleicht die installierte Version mit dem aktiven ioBroker-Repository. Die README ist keine Updatequelle. Ein GitHub-Push, Release oder Tag allein erzeugt kein reguläres Updateangebot für einen ausschließlich per GitHub installierten Fork.

Auf dem Host wurde ausschließlich lesend js-controller **7.2.5** festgestellt. Sein `@iobroker/js-controller-cli/build/esm/lib/setup/setupInstall.js` bildet in `downloadPacket` ein npm-Paket aus dem Adapternamen beziehungsweise `source.packetName`. Eine GitHub-URL in `source.url` wird in diesem Installationspfad nicht ausgewertet. Auch der lokal geprüfte Controller 8.0.0-alpha zeigt dieses Verhalten. Ein eigener Katalog nur mit GitHub-Metadaten und Download-URL würde deshalb kein verlässlich installierbares Update ergeben und wird hier nicht angeboten.

Langfristig braucht die normale Update-Schaltfläche einen abgestimmten Veröffentlichungsweg: zum Beispiel Übernahme der Änderungen ins Upstream-Projekt und dessen reguläre npm-/Repository-Veröffentlichung. Eine unabhängige Veröffentlichung des Forks benötigt eine eigene Paket-/Namens- und Katalogentscheidung. Das bestehende npm-Paket wird nicht ungefragt veröffentlicht oder überschrieben.

## Entwicklungsupdates bis dahin

1. Lokal Prüfungen abschließen.
2. Nach ausdrücklichem Auftrag Änderungen in den Benutzerfork pushen. Der aktuelle Arbeitsbranch heißt `development/dryer-support`; ein Push dorthin verändert `main` nicht.
3. Für den Hauptzweig die geprüften Änderungen zunächst nach `main` übernehmen. Alternativ gezielt den Entwicklungsbranch installieren.
4. In ioBroker Admin im Expertenmodus „Adapter aus eigener URL installieren“ verwenden. Für den Hauptzweig:

```text
https://github.com/garfield2412/ioBroker.connectlife
```

Für den aktuellen Entwicklungsbranch kann die explizite Archiv-URL verwendet werden:

```text
https://github.com/garfield2412/ioBroker.connectlife/archive/refs/heads/development/dryer-support.tar.gz
```

5. Nach Veröffentlichung und Installation dieses Stands muss die installierte Version 0.4.1 sein. Konfiguration und Instanz müssen für ein Update nicht gelöscht werden. Eine Neuinstallation derselben URL ist weiterhin manuell; es wird keine automatische Fork-Updateanzeige zugesichert.

## Release-Workflow

Tests laufen für main, development/** und Pull Requests. Der geerbte npm-Deploy-Job ist auf das ursprüngliche Repository Andiweli/ioBroker.connectlife beschränkt. Tags im Benutzerfork lösen dadurch keine ungewollte Veröffentlichung des bestehenden npm-Pakets aus. Eine eigene Veröffentlichungsstrecke wird erst bei einem entsprechenden Auftrag eingerichtet.
