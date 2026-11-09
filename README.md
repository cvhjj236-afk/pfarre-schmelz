# Pfarre Schmelz – Website mit CMS

Responsive Pfarrwebsite mit serverseitigem CMS, D1-Datenbank, versionierten Inhalten und Kalenderexport. Öffentlich erreichbare Testversion, kein offizieller Pfarrwebauftritt. Ausgangsdaten stammen von der bisherigen Website und sind vor einem offiziellen Betrieb zu prüfen.

## Benutzung

- `/`: Startseite; Navigation zu Kalender, Gottesdiensten, Pfarrleben, Glaube und Kontakt.
- `/admin`: Redaktion für Termine, Meldungen, Seiten, Kontaktdaten und regelmäßige Gottesdienstzeiten.
- Änderungen werden erst mit **Änderungen speichern** übernommen.
- Termine und Meldungen können als Entwurf gespeichert werden und erscheinen dann nicht in der Besucheransicht.
- Frühere gespeicherte Versionen lassen sich laden und als neue Version speichern.
- JSON-Export und Import sind im CMS verfügbar; Termine können als ICS-Datei exportiert werden.

## Architektur

React 19, TypeScript und Vinext; Cloudflare Worker als Backend, Cloudflare D1 (SQLite) als dauerhafte Datenbank. Keine browserlokale Speicherung redaktioneller Inhalte. Keine externen Schriftarten, Tracker oder Karten-Embeds. Der bestehende Google-Dekanatskalender wird erst nach ausdrücklicher Aktivierung eingebunden. Kartenlinks öffnen OpenStreetMap erst beim Anklicken.

Die Tabelle `revisions` speichert jeden Inhaltstand atomar. Ein Versionsvergleich verhindert verlorene Änderungen bei paralleler Bearbeitung. SQL-Parameter werden gebunden; Inhalte werden als Text ausgegeben und nicht als HTML interpretiert. Datums-, Zeit-, E-Mail- und Umfangsprüfung erfolgt serverseitig.

## Zugriff

Die Besucherwebsite ist öffentlich. `/admin` zeigt ohne Anmeldung eine Login-Seite. Die Anmeldung erfolgt über ChatGPT; Redaktionszugriff wird anschließend serverseitig gegen die Runtime-Konfiguration `CMS_EDITOR_EMAILS` geprüft. Nur freigegebene Konten können die CMS-Daten lesen, Änderungen speichern und Versionen aufrufen. Eine Anmeldung allein gibt keine Bearbeitungsrechte. Ohne konfigurierte Freigabe bleibt der Zugriff gesperrt.

`GET /api/content` liefert ausschließlich veröffentlichte Termine und Meldungen. `GET /api/content?editor=1` liefert auch Entwürfe, verlangt jedoch ein freigegebenes Konto. Schreibzugriffe verlangen außerdem einen passenden Origin-Header. Identitätsheader werden ausschließlich vom authentifizierenden Hosting-Gateway gesetzt; diese Anwendung muss hinter diesem Gateway betrieben werden. Für einen Umzug auf anderes Hosting muss die Identitätsprüfung durch dessen verifizierte Authentifizierung ersetzt werden.

Die freigegebenen E-Mail-Adressen werden als serverseitiges Secret konfiguriert und nicht im Quellcode gespeichert. `.env.example` enthält nur den Konfigurationsnamen und einen Beispielwert. Die Anwendung verwaltet keine Passwörter.

## Prüfung und Betrieb

```sh
node tests/backend.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run db:generate
npm run build
```

SQL-Migrationen liegen unter `drizzle/`; Hosting führt sie bei der Veröffentlichung aus. Die Schema-Migration enthält keine personenbezogenen Seed-Daten. Ausgangsinhalte liegen in `lib/content.ts` und werden bis zum ersten Speichern bereitgestellt.

Die Backendtests verwenden eine isolierte SQLite-Datenbank und die tatsächlichen API-Handler. Sie prüfen Authentifizierung, Origin-Schutz, ungültige Daten und Zeiten, Speicherung, Entwurfsstatus, Versionskonflikte, Historie und Wiederherstellungsdaten.

## Vor einer offiziellen Ablösung

Inhalte und sämtliche Termine bestätigen, Bildrechte klären, Impressum und Datenschutzerklärung vervollständigen, weitere Redaktionskonten gezielt freigeben, vollständigen Bestand und alte URLs migrieren sowie Domain und Weiterleitungen konfigurieren. Bild- und PDF-Uploads, wiederkehrende Einzeltermine und Benutzerverwaltung sind in dieser ersten Version noch nicht enthalten. Die regelmäßigen Gottesdienstzeiten sind separat im CMS bearbeitbar.

## Inhaltsabgleich mit der bisherigen Website

Die sieben ursprünglichen Navigationseinstiege sind wieder vorhanden: Home, Inhalt, Gottesdienste, Dekanatskalender, Pfarre, Glaube und Kindertagesheim. Kontakt bleibt zusätzlich erreichbar.

- 23 HTML-Adressen geprüft; 22 erreichbar, ein alter Gebetsschatz-Pfad liefert 404.
- 20 Inhaltsseiten übernommen; das Inhaltsverzeichnis und der Dekanatskalender sind als eigene neue Ansichten umgesetzt.
- 52 bisherige Inhaltsverzeichniseinträge erhalten, ergänzt um thematische Direkteinstiege.
- Der Gebetsschatz verweist auf die tatsächlich vorhandene Seite `gebetsschatz.htm`.
- Beide Wochenkalender-PDFs liegen lokal unter `public/dokumente`.
- Übernommene Inhaltsseiten sind unter „Übernommene Inhalte“ im CMS bearbeitbar.
- Kindergartenbeschreibung und Kindergarten-Kontaktdaten sind im CMS editierbar.
- Der Dekanatskalender übernimmt die sieben ursprünglichen öffentlichen Kalenderkennungen. Google wird erst nach Klick geladen; die Kalender werden weiterhin extern gepflegt.
- Historische Veranstaltungsvorschau 2024 und ältere Sommerhinweise sind als solche gekennzeichnet. Die ursprüngliche Chronik war inhaltsleer; dies wird transparent angezeigt.
- Alte Windows-Dateiverweise werden nicht übernommen; Verweise auf das Bibelabkürzungsverzeichnis wurden repariert.

Die Übernahme ergänzt alte gespeicherte Inhaltsstände beim Lesen um die neuen Felder. Vorhandene Änderungen an Terminen, Meldungen, Seiten und Kontakten bleiben erhalten. Es ist keine Datenbankschemaänderung erforderlich.

## GitHub-Veröffentlichung

Der Quellcode kann in einem eigenen Repository versioniert werden. Zugangsdaten, lokale Datenbankzustände und Laufzeitdateien gehören nicht in Git. Der vorbereitete Quellcodeexport enthält ausschließlich versionierte Dateien und keine internen Git-Metadaten; die installationsspezifische Site-ID wird beim Export entfernt.

Zum lokalen Start: `npm ci`, anschließend `npm run build`. D1 benötigt die Migration aus `drizzle/`; lokale Ausführung siehe Starter-Skripte und `.openai/hosting.json`. Ein öffentliches Repository allein stellt keinen laufenden Datenbank- oder Authentifizierungsdienst bereit. Die aktuelle vollständige Anwendung wird als Worker mit D1-Datenbank und vorgeschaltetem Login-Gateway gehostet.

Vorhandene Pfarrtexte, Fotos und PDFs sind übernommene Inhalte der bisherigen Pfarrwebsite. Für diese Fremdinhalte wird mit der Veröffentlichung des technischen Quellcodes keine neue Lizenz vergeben.
