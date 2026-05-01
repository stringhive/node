# CLI Commands

## audit

Audit key parity between your local source file and Stringhive, and optionally gate on translation approval rates.

```bash
npx stringhive audit [hive]
```

### Options

| Option | Default | Description |
|---|---|---|
| `--format <format>` | `text` | Output format: `text` or `json` |
| `--fail-on-orphaned` | off | Exit 1 if orphaned keys are found (in Stringhive but not local) |
| `--fail-on-missing` | off | Exit 1 if unpushed keys are found (local but not in Stringhive) |
| `--fail-on-unapproved` | off | Exit 1 if any locale has unapproved translations |
| `--locale <codes>` | all locales | Comma-separated locale codes to scope the `--fail-on-unapproved` check |
| `--min-approved <pct>` | `100` | Minimum approved % to pass. Only applies with `--fail-on-unapproved`. |
| `--source-locale <locale>` | `en` | Source locale code |
| `--lang-path <path>` | `./lang` | Path to language files directory |
| `--scan-source <glob>` | — | Glob pattern for source files to scan for key references (`.js`/`.ts`/`.vue`) |

### Examples

```bash
# Basic key parity check
npx stringhive audit my-app

# Fail the build if any keys are out of sync
npx stringhive audit my-app --fail-on-missing --fail-on-orphaned

# Fail if any locale has unapproved translations
npx stringhive audit my-app --fail-on-unapproved

# Scope the approval check to specific locales
npx stringhive audit my-app --fail-on-unapproved --locale fr,de,es

# Allow up to 5% unapproved (pass at 95% or above)
npx stringhive audit my-app --fail-on-unapproved --min-approved 95

# Machine-readable JSON output
npx stringhive audit my-app --format json
```

### Approval check behavior

When `--fail-on-unapproved` is set, the command fetches live approval stats from `GET /api/hives/{slug}` and checks each locale's `approved_percent` against `--min-approved` (default `100`).

- Without `--locale`, all locales in the hive are checked.
- With `--locale fr,de,es`, only the listed locales are checked.
- Exit code is `1` if any checked locale falls below the threshold.

The JSON output includes an `approval` array when `--fail-on-unapproved` is used:

```json
{
  "hive": "my-app",
  "local_key_count": 120,
  "api_key_count": 120,
  "unpushed": [],
  "orphaned": [],
  "approval": [
    { "locale": "fr", "approved_percent": 98.5, "pass": false },
    { "locale": "de", "approved_percent": 100, "pass": true }
  ]
}
```

## push

Push source strings to Stringhive.

```bash
npx stringhive push [hive]
```

### Options

| Option | Default | Description |
|---|---|---|
| `--sync` | off | Use sync mode (update existing strings, apply conflict strategy) |
| `--conflict-strategy <strategy>` | — | How to handle changed source strings: `keep` or `clear` |
| `--with-translations` | off | Also push local translated files |
| `--source-locale <locale>` | `en` | Source locale code |
| `--lang-path <path>` | `./lang` | Path to language files directory |
| `--format <format>` | `json` | File format |
| `--exclude <patterns...>` | — | Glob pattern(s) of files to skip (repeatable) |
| `--include <patterns...>` | — | Glob pattern(s) of files to include exclusively (repeatable) |
| `--quiet` | off | Suppress progress output |

## pull

Pull translations from Stringhive.

```bash
npx stringhive pull [hive]
```

### Options

| Option | Default | Description |
|---|---|---|
| `--locale <locales...>` | all locales | Specific locales to pull |
| `--format <format>` | `json` | File format |
| `--dry-run` | off | Preview what would be written without writing files |
| `--include-source` | off | Include the source locale in the pull |
| `--source-locale <locale>` | `en` | Source locale code (excluded from pull by default) |
| `--lang-path <path>` | `./lang` | Path to language files directory |
| `--exclude <patterns...>` | — | Glob pattern(s) of files to skip (repeatable) |
| `--include <patterns...>` | — | Glob pattern(s) of files to include exclusively (repeatable) |
| `--quiet` | off | Suppress progress output |

## hives

List all hives accessible with your token.

```bash
npx stringhive hives
```

## locales

List available locales for a hive.

```bash
npx stringhive locales <hive>
```
