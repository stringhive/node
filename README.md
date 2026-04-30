# Stringhive for Node.js

The official Node.js package for [Stringhive](https://stringhive.com). CLI commands to sync and audit your translation files, a full API client if you want to go deeper, and zero boilerplate.

[![CI](https://github.com/stringhive/node/actions/workflows/ci.yml/badge.svg)](https://github.com/stringhive/node/actions/workflows/ci.yml)
[![Latest Version](https://img.shields.io/npm/v/stringhive)](https://www.npmjs.com/package/stringhive)
[![License](https://img.shields.io/github/license/stringhive/node)](LICENSE)

## Installation

```bash
npm install stringhive
```

## Quick start

```bash
# Push your source strings to Stringhive
npx stringhive push <hive>

# Pull translated locales back to your project
npx stringhive pull <hive>
```

For configuration options, all commands, and programmatic usage, see the [full documentation](https://www.stringhive.com/docs/sdk/node/setup).

## License

MIT. See [LICENSE](LICENSE).
