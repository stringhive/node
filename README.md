# Stringhive for Node.js

The official Node.js package for [Stringhive](https://stringhive.com). CLI commands to sync and audit your translation files, a full API client if you want to go deeper, and zero boilerplate.

[![CI](https://github.com/stringhive/node/actions/workflows/ci.yml/badge.svg)](https://github.com/stringhive/node/actions/workflows/ci.yml)
[![Latest Version](https://img.shields.io/npm/v/stringhive)](https://www.npmjs.com/package/stringhive)
[![License](https://img.shields.io/github/license/stringhive/node)](LICENSE)

---

## Requirements

- Node.js 22+

---

## Installation

```bash
npm install stringhive
```

Or install globally to use the CLI from anywhere:

```bash
npm install -g stringhive
```

---

## Configuration

One line in your `.env` and you're done:

```env
STRINGHIVE_TOKEN=your-api-token
```

> `STRINGHIVE_URL` defaults to `https://www.stringhive.com/api`. Only set it if you're running a custom server.

### Config file

Drop a `stringhive.config.ts` (or `.js`) at your project root for options you'd rather not repeat on every command:

```ts
import { defineConfig } from 'stringhive';

export default defineConfig({
  hive: 'my-app',
  langPath: './src/locales',
  sourceLocale: 'en',
  format: 'json',
  exclude: [
    // 'en.json',       // skip a specific locale file
    // '*.json',        // skip all JSON locale files
  ],
  include: [
    // 'fr.json',       // only process this locale file
    // '*.json',        // only process JSON locale files
  ],
  push: {
    conflictStrategy: 'keep',
  },
  pull: {
    includeSource: false,
  },
});
```

CLI flags always win over the config file. The config file always wins over built-in defaults. Setting `hive` in the config file means you can run `stringhive push` and `stringhive pull` without repeating it on every command.

---

## Commands

Push, pull, and audit your translation files. All commands read the same config file and accept the same `--lang-path` / `--source-locale` flags.

### Push: local files to Stringhive

```bash
npx stringhive push [hive]
```

The `hive` argument is optional if `hive` is set in your config file.

Reads your source locale from `./lang` and pushes it to Stringhive as source strings. Translations are Stringhive's job — use `--with-translations` if you also want to seed them from local files.

```
Options:
  --sync                         Also remove strings from the hive that aren't in your files
  --conflict-strategy <strategy> What to do with translations when a source string changes: keep (default) or clear
  --with-translations            Also push translation files for non-source locales
  --source-locale <locale>       Source locale code (default: "en")
  --lang-path <path>             Use a different directory (default: "./lang")
  --format <format>              File format: json (default: "json")
  --exclude <patterns...>        Glob pattern(s) of files to skip, merged with config exclude
  --include <patterns...>        Glob pattern(s) of files to include exclusively, merged with config include
  --quiet                        Suppress progress output
```

Examples:

```bash
# Push source strings
stringhive push my-app

# Push source strings and seed all local translations
stringhive push my-app --with-translations

# Push and remove stale strings from the hive
stringhive push my-app --sync

# Wipe translations whenever a source string changes
stringhive push my-app --conflict-strategy clear

# Skip specific files (patterns are matched against the filename)
stringhive push my-app --exclude en.json
stringhive push my-app --exclude '*.json'

# Only push specific files (others are ignored)
stringhive push my-app --include fr.json
stringhive push my-app --include 'fr.json' --exclude 'en.json'
```

The output tells you what happened:

```
Pushing 1245 strings to hive 'my-app'...
✓ Source strings pushed.
```

### Pull: Stringhive to local files

```bash
npx stringhive pull [hive]
```

The `hive` argument is optional if `hive` is set in your config file.

Exports translated locales from Stringhive and writes them to your `./lang` directory. The source locale is skipped by default — you own that locally.

```
Options:
  --locale <locales...>     Pull specific locales only (omit to pull all)
  --format <format>         File format: json (default: "json")
  --dry-run                 Preview what would be written without touching anything
  --include-source          Also pull the source locale
  --source-locale <locale>  Source locale code (default: "en")
  --lang-path <path>        Use a different directory (default: "./lang")
  --exclude <patterns...>   Glob pattern(s) of files to skip, merged with config exclude
  --include <patterns...>   Glob pattern(s) of files to include exclusively, merged with config include
  --quiet                   Suppress progress output
```

Examples:

```bash
# Pull all translated locales (source excluded)
stringhive pull my-app

# Pull just French and German
stringhive pull my-app --locale fr de

# Pull everything, including the source locale
stringhive pull my-app --include-source

# See what would happen before writing anything
stringhive pull my-app --dry-run

# Skip specific files (patterns are matched against the filename and its basename)
stringhive pull my-app --exclude fr.json
stringhive pull my-app --exclude '*.json'

# Only pull specific files (others are ignored)
stringhive pull my-app --include fr.json
stringhive pull my-app --include 'fr.json' --include 'de.json'
stringhive pull my-app --include '*.json' --exclude fr.json
```

Output:

```
Pulling 3 locale(s) from hive 'my-app'...
  ✓ fr: 1245 keys → ./lang/fr.json
  ✓ de: 1240 keys → ./lang/de.json
  ✓ es: 1198 keys → ./lang/es.json
✓ Done. 3683 total keys written across 3 locale(s).
```

### Audit: diff local file against Stringhive

```bash
npx stringhive audit [hive]
```

The `hive` argument is optional if `hive` is set in your config file.

Compares the keys in your local source locale file against the keys stored in Stringhive and reports the diff. Nothing is written or changed.

```
Options:
  --format <format>         Output format: text (default) or json
  --fail-on-missing         Exit 1 if any local keys are absent from Stringhive (unpushed)
  --fail-on-orphaned        Exit 1 if any Stringhive keys are absent locally (orphaned)
  --source-locale <locale>  Source locale code (default: "en")
  --lang-path <path>        Use a different directory (default: "./lang")
  --scan-source <glob>      Also scan source files for key references (see below)
```

Examples:

```bash
# Audit key parity
stringhive audit my-app

# Gate a CI pipeline — fail if keys are out of sync in either direction
stringhive audit my-app --fail-on-missing --fail-on-orphaned

# Machine-readable output for scripting
stringhive audit my-app --format json
```

Text output:

```
Audit: my-app
  Local keys:      1245
  Stringhive keys: 1248

✗ Unpushed (2) — local but not in Stringhive:
    auth.new_feature
    settings.beta_opt_in

✗ Orphaned (3) — in Stringhive but not in local file:
    deprecated.old_key
    legacy.signup_v1
    legacy.signup_v2
```

JSON output (`--format json`):

```json
{
  "hive": "my-app",
  "local_key_count": 1245,
  "api_key_count": 1248,
  "unpushed": ["auth.new_feature", "settings.beta_opt_in"],
  "orphaned": ["deprecated.old_key", "legacy.signup_v1", "legacy.signup_v2"]
}
```

#### Static analysis with `--scan-source`

Pass a glob to also extract translation key references from your source code. The command scans for `t('key')`, `$t('key')`, and `i18n.t('key')` calls — covering Vue, React, and plain JS/TS patterns including `useI18n()` destructuring.

```bash
# Report keys referenced in code but missing from your local JSON (and vice versa)
stringhive audit my-app --scan-source 'src/**/*.{js,ts,vue}'
```

This adds two more sections to the report:

- **Undefined** — keys called in source code that don't exist in the local JSON file (runtime translation misses)
- **Unused** — keys defined in the local JSON file that are never called in source code (dead strings)

```json
{
  "hive": "my-app",
  "local_key_count": 1245,
  "api_key_count": 1248,
  "unpushed": [],
  "orphaned": [],
  "scan": {
    "source_key_count": 1239,
    "undefined": ["checkout.promo_banner"],
    "unused": ["onboarding.legacy_step3", "onboarding.legacy_step4"]
  }
}
```

### Other commands

```bash
# List all hives your token can see
stringhive hives

# List available locales for a hive
stringhive locales <hive>
```

---

## Programmatic Usage

All the same power, available from TypeScript or JavaScript. Good for deploy scripts, build tooling, or anything where you need more control.

```ts
import { StringhiveClient } from 'stringhive';

const client = new StringhiveClient(); // reads STRINGHIVE_TOKEN from env

// or pass config directly
const client = new StringhiveClient({
  token: 'your-api-token',
  baseUrl: 'https://www.stringhive.com/api',
});
```

### push / pull equivalent

```ts
// Export all translated locales for a hive
const fr = await client.export('my-app', 'fr', 'json');
// { 'auth.login': 'Connexion', 'auth.logout': 'Déconnexion', ... }

// Push source strings
await client.importStrings('my-app', {
  strings: [
    { key: 'auth.login', value: 'Login' },
    { key: 'auth.logout', value: 'Logout' },
  ],
});

// Sync (removes strings absent from the payload)
await client.syncStrings('my-app', {
  strings: [...],
  conflict_strategy: 'keep',
});

// Push translations for a locale
await client.importTranslations('my-app', {
  locale: 'fr',
  strings: [{ key: 'auth.login', value: 'Connexion' }],
});
```

---

## API Reference

### Locales

All locales available on the platform:

```ts
const locales = await client.locales();
// [{ code: 'en', name: 'English' }, ...]
```

### Hives

List all hives your token can see:

```ts
const hives = await client.hives();
// [{ slug: 'my-app', name: 'My App', locale: 'en' }, ...]
```

Stats for one hive:

```ts
const hive = await client.hive('my-app');
// { slug: 'my-app', name: 'My App', locale: 'en', string_count: 1245, translation_count: 3683 }
```

### Source Strings

Fetch with pagination:

```ts
const page = await client.strings('my-app', 2);
// { data: [...], meta: { current_page: 2, last_page: 13, per_page: 100, total: 1245 } }
```

Or grab everything at once:

```ts
const all = await client.allStrings('my-app'); // loops pages automatically
```

### Import & Sync

```ts
// Import — add or update strings, leave the rest alone
await client.importStrings('my-app', { strings });

// Sync — like import, but also removes strings not in the payload
await client.syncStrings('my-app', { strings, conflict_strategy: 'clear' });

// Import translations for a locale
await client.importTranslations('my-app', { locale: 'fr', strings });
```

### Export

```ts
const translations = await client.export('my-app', 'fr', 'json');
// { 'auth.login': 'Connexion', ... }
```

---

## Exceptions

Every error maps to a typed exception you can catch:

```ts
import {
  AuthenticationException, // 401 — bad or expired token
  ForbiddenException,      // 403 — no permission on this hive
  HiveNotFoundException,   // 404 — that slug doesn't exist
  StringLimitException,    // 422 — hit your plan's string quota
  ValidationException,     // 422 — bad payload
  NetworkException,        // fetch failed entirely
} from 'stringhive';

try {
  await client.importStrings('my-app', { strings });
} catch (err) {
  if (err instanceof StringLimitException) {
    // time to upgrade
  } else if (err instanceof ValidationException) {
    console.error(err.errors); // { field: ['error message'] }
  } else if (err instanceof HiveNotFoundException) {
    // slug typo?
  }
}
```

The CLI maps these to human-readable messages automatically. Set `STRINGHIVE_DEBUG=1` to get full stack traces.

---

## License

MIT. See [LICENSE](LICENSE).
