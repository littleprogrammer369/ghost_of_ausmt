# Workspace Validation

## What it validates

This check confirms the structural integrity of the minimal pnpm + Turborepo workspace foundation:

- Root manifests (`package.json`, `turbo.json`, `pnpm-workspace.yaml`) parse as JSON/YAML, not by substring search.
- The pnpm lockfile contains two YAML documents:
  1. Env document: `packageManagerDependencies.pnpm` (specifier & version) must match `package.json.packageManager`.
  2. Project document: root importer's `devDependencies` must exactly match `package.json.devDependencies`.
- Declared dev tooling (`turbo`) must be installed locally and resolve from `node_modules`.
- Runtime markers (`.nvmrc`, `.node-version`) must agree with each other and with the actual Node process executing the validation.
- Required documentation phrases are present in `docs/adr/0001-mvp-foundations-and-roles.md` (multi-conference MVP, four roles, scoped support access, email+password login, OTP as open decision, no payment gateway in MVP). These are documentation-presence checks only; they do not prove any behavioural or security property.

## How to run

```bash
# Validate using the pinned runtime
node scripts/validate-workspace.js

# Or via Turbo (same thing)
pnpm validate
# or
turbo run validate
```

## Expected output

A clean run prints `[PASS]` for every check and ends with `all configuration checks passed` and exit code 0.

A failing run prints `[FAIL]` for the offending check(es), includes a short explanation, and exits with code 1.

## Implementation notes

- The validation is deliberately narrow: it does **not** execute any application lint, typecheck, or build, because no application code exists in this repository yet.
- It does **not** treat the presence of a `build` or `test` script name as a defect; legitimate future work may add them.
- It does **not** claim that a regex over `.gitignore` proves secrets are excluded, or that a regex over the ADR proves role or security semantics. Those checks are labelled as documentation presence only.
- Test cases live in `scripts/validate-workspace.test.js` and are executed via `node --test scripts/`.
- The fixture helpers in `scripts/fixture.js` copy the real workspace foundation into a temporary directory so no repository file is mutated during testing.

## Related files

- `scripts/validate-workspace.js` – the validation script itself
- `scripts/validate-workspace.test.js` – node:test suite exercising negative cases
- `scripts/fixture.js` – temporary workspace builder for the test suite
- `pnpm-lock.yaml` – contains two YAML documents; do not merge them
- `turbo.json` – declares the root task `//#validate` with `cache: false`
- `docs/runbooks/workspace-validation.md` – this file