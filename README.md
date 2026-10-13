# Browser Extension Template

Template repository for cross-browser extension delivery with GitHub Actions.

## Included
- CI (`.github/workflows/ci.yml`)
- Manual deploy workflow for Firefox AMO and Chrome Web Store (`.github/workflows/release.yml`)
- Codex cleanup workflow (`.github/workflows/codex-cleanup.yml`)

## Required Secrets
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`
- `CWS_EXTENSION_ID`
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

## Usage
1. Create a repository from this template.
2. Set the secrets listed above.
3. Update `extension/manifest.json` and extension source files.
4. Run `Deploy Browser Extension` workflow manually.

## Local Commands
- `npm ci`
- `npm run verify`
- `npm run build:firefox`
- `npm run build:chrome`

## Delivery and maintenance guarantees

`npm run verify` tests the publisher with mocked HTTP responses, builds both packages, and checks that the Chrome ZIP has `manifest.json` at its root. Store publication remains manual. The Chrome publisher uses the [Web Store API v2](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish), fails on HTTP/API errors, and waits for successful upload before submitting for review. It does not skip store review. Set repository variable `CWS_PUBLISHER_ID` to the publisher ID from the Web Store developer dashboard before Chrome deployment; OAuth secrets remain as listed above. No production publication is performed by tests.

Weekly Dependabot maintenance groups Actions and npm updates. Auto-merge requires verified Dependabot commits and successful `ci-gate` and `workflow-security-gate` checks at the exact current PR head, plus repository branch protection.

Known development-tool advisory: `web-ext@10.7.0` brings `node-forge@1.4.0` through its Android adbkit integration ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)); no patched node-forge release is available as of 2026-10-14. This package is not shipped inside the extension. Keep Android debugging disabled and track the upstream fix. The shell-quote override pins the patched 1.12.0 release until fx-runner updates its dependency. Do not apply npm audit's suggested downgrade to obsolete web-ext 5.1.0.
