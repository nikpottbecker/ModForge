import type { ModSpec } from "../spec.js";
import { text, type GenFile } from "./types.js";

export const NEOFORGE_VERSION = "21.1.250";
export const MODDEV_PLUGIN_VERSION = "2.0.147";
export const PARCHMENT_VERSION = "2024.11.17";

export function gradleFiles(spec: ModSpec): GenFile[] {
  return [
    text("settings.gradle", SETTINGS),
    text("build.gradle", BUILD),
    text("gradle.properties", gradleProperties(spec)),
    text("gitignore.txt", GITIGNORE),
  ];
}

const SETTINGS = `pluginManagement {
    repositories {
        gradlePluginPortal()
    }
}

plugins {
    id 'org.gradle.toolchains.foojay-resolver-convention' version '1.0.0'
}
`;

const BUILD = `plugins {
    id 'java-library'
    id 'net.neoforged.moddev' version '${MODDEV_PLUGIN_VERSION}'
    id 'idea'
}

version = mod_version
group = mod_group_id

base {
    archivesName = mod_id
}

java.toolchain.languageVersion = JavaLanguageVersion.of(21)

repositories {
    mavenCentral()
}

neoForge {
    version = project.neo_version

    parchment {
        mappingsVersion = project.parchment_mappings_version
        minecraftVersion = project.parchment_minecraft_version
    }

    runs {
        client {
            client()
        }
        server {
            server()
            programArgument '--nogui'
        }
        configureEach {
            systemProperty 'forge.logging.markers', 'REGISTRIES'
            logLevel = org.slf4j.event.Level.DEBUG
        }
    }

    mods {
        "\${mod_id}" {
            sourceSet(sourceSets.main)
        }
    }
}

// Expands \${...} placeholders in src/main/templates into the final mod metadata.
var generateModMetadata = tasks.register("generateModMetadata", ProcessResources) {
    var replaceProperties = [
            minecraft_version      : minecraft_version,
            minecraft_version_range: minecraft_version_range,
            neo_version            : neo_version,
            loader_version_range   : loader_version_range,
            mod_id                 : mod_id,
            mod_name               : mod_name,
            mod_license            : mod_license,
            mod_version            : mod_version,
            mod_authors            : mod_authors,
            mod_description        : mod_description,
    ]
    inputs.properties replaceProperties
    filteringCharset = 'UTF-8'
    expand replaceProperties
    from "src/main/templates"
    into "build/generated/sources/modMetadata"
}
sourceSets.main.resources.srcDir generateModMetadata
neoForge.ideSyncTask generateModMetadata

tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}

idea {
    module {
        downloadSources = true
        downloadJavadoc = true
    }
}
`;

function gradleProperties(spec: ModSpec): string {
  // Gradle reads gradle.properties as ISO-8859-1 (java.util.Properties), so anything
  // non-ASCII has to go in as a \uXXXX escape or it arrives in the mod metadata as mojibake.
  const escapeUnicode = (s: string) =>
    s.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  // Groovy's expand() chokes on newlines and quotes inside property values.
  const oneLine = (s: string) =>
    escapeUnicode(s.replace(/\s*\n\s*/g, " ").replace(/\\/g, "").trim());
  return `org.gradle.jvmargs=-Xmx2G
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true

parchment_minecraft_version=1.21.1
parchment_mappings_version=${PARCHMENT_VERSION}

minecraft_version=1.21.1
minecraft_version_range=[1.21.1]
neo_version=${NEOFORGE_VERSION}
loader_version_range=[1,)

mod_id=${spec.modId}
mod_name=${oneLine(spec.name)}
mod_license=${oneLine(spec.license)}
mod_version=${spec.version}
mod_group_id=${spec.groupId}
mod_authors=${oneLine(spec.authors)}
mod_description=${oneLine(spec.description) || oneLine(spec.name)}
`;
}

const GITIGNORE = `# Rename this file to ".gitignore" if you put the project under version control.
build/
.gradle/
run/
runs/
run-data/
*.log
.idea/
*.iml
.vscode/
.DS_Store
`;
