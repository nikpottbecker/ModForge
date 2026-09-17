# ModForge

[English](README.md)

Ein visueller Editor, der aus zusammengeklickten Items, Blöcken, Werkzeugen, Rüstungen und Rezepten
ein vollständiges **NeoForge-Mod-Projekt für Minecraft 1.21.1** erzeugt — und es auf Knopfdruck zu
einer fertigen `.jar` kompiliert.

Kein Java-Wissen nötig. Wer will, bekommt trotzdem ein sauberes Gradle-Projekt zum Weiterarbeiten.

![Die Mod-Seite von ModForge](docs/mod.png)

## Was rauskommt

Aus einer Beschreibung entstehen unter anderem:

- `build.gradle`, `settings.gradle`, `gradle.properties` und der Gradle-Wrapper
- Java-Quellcode: Hauptklasse, `ModItems`, `ModBlocks`, `ModCreativeTabs`, `ModToolTiers`,
  `ModArmorMaterials`, Brennstoff-Handler
- Blockstates, Item- und Block-Modelle
- Texturen als PNG — selbst gezeichnet oder automatisch erzeugt
- Loot-Tables inkl. Glück- und Behutsamkeits-Varianten wie beim Diamanterz
- Rezepte (Werkbank, formlos, Ofen und Schmelzofen), Werkzeug- und Rüstungsrezepte automatisch
- Erz-Weltgenerierung: `configured_feature`, `placed_feature` und der passende NeoForge-`biome_modifier`
- Block-Tags (`mineable/*`, `needs_*_tool`)
- Sprachdateien `en_us` und `de_de`

## Erze, die auch wirklich vorkommen

Ein Erzblock im Kreativmenü ist schnell gebaut — einer, der beim Graben auftaucht, nicht. Dafür
braucht es drei aufeinander verweisende JSON-Dateien, und jeder Tippfehler darin führt zu genau
demselben Ergebnis: Die Welt sieht aus wie immer, und niemand sagt einem, warum.

ModForge schreibt diese Kette selbst und bietet die Vanilla-Werte als Vorlage an — „Wie Eisen“,
„Wie Diamant“, „Wie Smaragd“. Daneben steht eine Schätzung, wie viele Blöcke pro Chunk dabei
herauskommen, verglichen mit echten Erzen.

![Erz-Einstellungen mit Vorlagen und Häufigkeits-Schätzung](docs/blocks.png)

## Die Prüfung vor dem Bauen

Minecraft lädt fehlerhafte Mods oft klaglos und lässt einfach etwas weg. ModForge prüft deshalb
vorher und erklärt jeden Fund, statt nur eine Zeilennummer zu nennen:

- Erz-Höhen außerhalb der Dimension — im Nether liegt über Y 127 die Bedrock-Decke
- vertauschte Minimal- und Maximalhöhe
- Erz ohne Drop, Blöcke, die nur mit Werkzeug abbaubar sind, aber keines zulassen
- doppelte IDs, unbekannte Zutaten, leere Rezepte, ungültige Mod-IDs

Fehler blockieren den Build, Warnungen nicht.

![Die Bauen-Seite mit Prüfergebnis](docs/build.png)

## Loslegen

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Der Button **Beispiel laden** füllt alles mit einer
funktionierenden Demo-Mod.

Zum Kompilieren wird ein **JDK 21** gebraucht. ModForge sucht selbst in den üblichen Pfaden; sonst
hilft:

```bash
export MODFORGE_JAVA_HOME=/pfad/zum/jdk21
```

Ohne JDK funktioniert weiterhin der ZIP-Export.

## Bedienung

| Bereich   | Inhalt                                                           |
| --------- | ---------------------------------------------------------------- |
| Mod       | Name, ID, Version, Autor, Kreativ-Tab                            |
| Items     | Stapelgröße, Seltenheit, Tooltips, Nahrung, Brennstoff, Glitzern |
| Blöcke    | Härte, Werkzeugstufe, Licht, Geräusch, Drops, XP, Weltgenerierung |
| Werkzeuge | Ein Set erzeugt Spitzhacke, Axt, Schaufel, Hacke und Schwert      |
| Rüstung   | Helm bis Stiefel samt der beiden getragenen Ebenen               |
| Rezepte   | Werkbank (3×3), formlos und Ofen                                 |
| Bauen     | Prüfung, ZIP-Export und `.jar`-Build mit Live-Log                |

Texturen entstehen im eingebauten Pixel-Editor (16×16, Rüstungsebenen 64×32). Ohne eigene Zeichnung
erzeugt ModForge aus der ID eine deterministische Platzhalter-Grafik, damit nie ein Modell fehlt.

Die Arbeit wird automatisch im Browser gesichert. **Speichern** legt die Beschreibung als
`.modforge.json` ab, **Öffnen** lädt sie zurück. Der geöffnete Bereich steht in der Adresszeile,
ein Neuladen landet also wieder dort.

## Mod installieren

Die gebaute `.jar` in den `mods`-Ordner einer Minecraft-Installation mit NeoForge für 1.21.1 legen.

## Aufbau

```
src/core/      Generator — läuft identisch in Node und im Browser
  spec.ts        Zod-Schema, die einzige Wahrheit über eine Mod
  generator/     gradle.ts, java.ts, resources.ts
  png.ts         PNG-Encoder ohne Abhängigkeiten
  textures.ts    Platzhalter-Grafiken
src/server/    Fastify: Validieren, ZIP-Export, Gradle-Build mit Log-Stream
src/ui/        React-Oberfläche
mdk/1.21.1/    Gradle-Wrapper aus dem offiziellen MDK
test/          Vitest
```

Der Generator hängt an keiner Browser- oder Node-API, deshalb kann die Oberfläche dieselbe Vorschau
rechnen, die der Server später auf die Platte schreibt.

## Befehle

```bash
npm run dev        # Server und Oberfläche zusammen
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run build      # Oberfläche für den Produktivbetrieb bauen
npm start          # Server allein (liefert dist/ mit aus, wenn vorhanden)
```

`npx tsx scripts/build-demo.ts [ordner]` erzeugt die Demo-Mod und baut sie direkt durch — praktisch,
um den Generator ohne Oberfläche zu prüfen. `npx tsx scripts/screenshots.ts` erneuert die Bilder in
`docs/` (braucht einen laufenden `npm run dev`).

## Mitarbeiten

Fehlerberichte und Pull Requests sind willkommen. Zwei Hausregeln:

1. **Minecraft-APIs und JSON-Formate nie aus dem Gedächtnis schreiben.** Sie ändern sich zwischen
   Versionen still, und falsche Felder werden beim Laden kommentarlos verworfen. Gegen die echte
   Client-Jar und die entpackten NeoForge-Quellen prüfen.
2. **Jede Änderung am Generator braucht einen Test** und einen echten Durchlauf von
   `npx tsx scripts/build-demo.ts`. Dass TypeScript kompiliert, sagt nichts darüber, ob Minecraft
   die Dateien mag.

## Lizenz

ModForge steht unter der [MIT-Lizenz](LICENSE).

**Was du damit baust, gehört dir.** Auf generierte Mods erhebt dieses Projekt keinerlei Anspruch —
kein Namensnennungszwang, keine Auflagen für Veröffentlichung oder Verkauf, egal ob auf CurseForge,
Modrinth oder privat. Der erzeugte Java-Code und die erzeugten Ressourcen stehen ohne Bedingungen
zu deiner freien Verfügung.

## Versionen

Minecraft 1.21.1 · NeoForge 21.1.250 · ModDevGradle 2.0.147 · Java 21
