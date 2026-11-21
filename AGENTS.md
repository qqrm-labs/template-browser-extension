# Repository Agent Instructions

## Core Principles
- Keep solutions small, explicit, and production-oriented.
- Reuse mature tooling before writing custom scripts.
- Keep workflows deterministic and observable.

## Workflow Rules
- Use feature branches; keep `main` protected.
- Run `npm run verify` before opening a PR.
- Treat GitHub workflows as first-class code and review changes carefully.

## CI Gate
- CI must pass before merge.
- Do not bypass failing checks.

## Test Design and Evidence
- `npm run verify` currently runs publisher tests, extension lint, and package
  builds. It does not test extension behavior in a browser. When adding runtime
  tests, wire their real discovery path into `npm test` or an explicit required CI
  job; the current glob only discovers `scripts/*.test.mjs`.
- Define the observable contract and production entry point before writing tests.
  Assert independent expected results, including relevant failure and boundary
  cases. Do not compute expectations by repeating the implementation or test a
  replacement that already contains the expected answer.
- Consider `fast-check` for URL/text normalization, parsers, and state transitions
  with meaningful invariants. Deliberately generate relevant valid and invalid
  classes, retain minimized failures, and record seed/replay data. An idempotence
  or round-trip property alone is insufficient when a constant/wrong result could
  also satisfy it; add independent expectations for the actual contract.
- When strengthening tests or changing critical behavior, run a clean baseline,
  introduce a plausible defect in an isolated copy of production code, run the
  same tests, restore the code, and rerun. Verify the intended assertion fails.
  Prefer a reviewer-selected defect for an independent audit.
- Consider StrykerJS for compatible runners, or focused manual mutations when
  runner support is unsuitable. Keep raw reports, tested scope, survivors, and
  per-case equivalence explanations. Distinguish assertion kills, syntax/compile
  errors, runner failures, timeouts, crashes, and exclusions. Stryker's detected
  total includes timeouts; it is not an assertion-kill count.
- Record the revision, commands, versions, discovered test count, browser/runner,
  and limits. A missing browser, zero tests, skipped job, or successful build is
  not a passing behavioral check. Do not add artificial tests for prose changes.

## Browser Tool Selection
- Use the existing Node test runner for pure modules and tooling. Publisher tests
  must use injected/local HTTP responses and never publish to a store.
- For extension integration, use Playwright with the actual built/unpacked
  extension loaded in its supported persistent Chromium context. Assert the
  user-visible effect and relevant permissions, messages, storage, or worker
  lifecycle. A mocked DOM/API unit test does not establish browser integration.
- Check Firefox-specific behavior separately when it differs; Chromium success
  does not establish Firefox compatibility. Keep browser fixtures deterministic
  and separate from live accounts, external services, and real publication.
- These additional tools are not installed by the template. Introduce one only
  with compatible pinned dependencies/browser binaries, a reproducible command,
  a meaningful detection control, and explicit CI trigger/cost. Required checks
  fail when prerequisites or test execution are missing; optional checks expose
  skips. Choose tools for actual risks instead of installing the whole list.

References: [fast-check](https://fast-check.dev/docs/introduction/why-property-based/),
[Stryker outcome definitions](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/),
[Playwright extensions](https://playwright.dev/docs/chrome-extensions).
