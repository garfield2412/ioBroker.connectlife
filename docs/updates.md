# Versionierung und Updates des Forks

## Vorbereiteter Stand

Version **0.4.1**, Changelogdatum **27.11.2026**, ist der neue lokale Entwicklungsstand mit expliziter lesender Metadatendiagnose. Der zuvor gepushte und auf dem Host installierte Stand ist 0.4.0. `package.json`, `io-package.json`, Root-Einträge im Lockfile, beide README-Changelogs und `common.news` stimmen überein. Die neue Version wurde noch nicht erneut gepusht oder installiert. Ein späterer Push des Entwicklungsbranches aktualisiert weder main noch die Installation auf dem Raspberry Pi; Tags und Veröffentlichungen sind nicht beauftragt.

Neue Funktionen erhöhen die Minor-Version, reine Fehlerkorrekturen die Patch-Version. Nach der Veröffentlichung einer Version werden weitere Änderungen unter einer neuen Nummer geführt; ein neuer Commit mit identischer Version ist kein erkennbarer Versionssprung.

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
