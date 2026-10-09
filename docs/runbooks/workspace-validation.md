# Workspace Validation

## What it validates

This check confirms the structural integrity of the minimal pnpm + Turborepo workspace foundation. It enforces these specific guarantees:

- Root manifests (`package.json`, `turbo.json`, `pnpm-workspace.yaml`) parse as JSON/YAML, not by substring search.
- Manifest shape: a root of `null`, an array, or a scalar is rejected, as are invalid shapes for the fields the validator reads (`scripts`, `devDependencies`, `tasks`, and the individual task definition).
- Workspace membership: exactly `apps/*` and `packages/*`, each present exactly once, with no missing, duplicate, non-string, or unsupported entries.
- The pnpm lockfile contains two YAML documents: an env document (written first) carrying `packageManagerDependencies.pnpm` whose **specifier and version** both match `package.json.packageManager`, plus a separate project document with a root importer. Both documents must declare an agreeing `lockfileVersion`.
- The root `validate` script is exactly `node scripts/validate-workspace.js`, so a no-op `echo` or a script that recurses back into Turbo is rejected.
- Runtime markers (`.nvmrc`, `.node-version`) agree with each other and with the Node process actually running the validation.
- Declared dev tooling (`turbo`) is present as a dependency and resolves from `node_modules` at the declared version.
- Turbo's root task `//#validate` is registered with `cache: false` and points at that script.
- Documentation-presence phrases are present in `docs/adr/0001-mvp-foundations-and-roles.md`.

It deliberately does **not** claim to be application coverage: there is no lint, typecheck, build, or end-to-end coverage here, because no application code exists in this repository yet. The documentation-presence checks are exactly that — a missing phrase is caught, but a regex cannot prove role semantics, security properties, or secret exclusion. Those remain human-review controls.

## How to run

These are distinct paths. `pnpm validate` does **not** execute the Turbo task; it runs Node directly.

```bash
# 1. Direct validation — runs the Node validator with no Turbo involvement
pnpm validate

# 2. The validation test suite (node:test)
node --test scripts/validate-workspace.test.js

# 3. Turbo task graph for the root //#validate task, without running it
pnpm exec turbo run validate --dry=json

# 4. Real execution of the root //#validate task through Turbo
pnpm exec turbo run validate
```

Use `pnpm exec turbo` for the project-local Turbo. A bare `turbo` command assumes a globally installed binary that may not exist, may be a different version, and is not part of this project's pinned toolchain.

To validate a fixture's negative cases, run the test suite; the validator itself only reports pass/fail on the real repository.

## Expected output

A clean run prints `[PASS]` for every check and ends with `all configuration checks passed` and exit code 0.

A failing run prints `[FAIL]` for the offending check(s) with a specific, stable check id and a short explanation, and exits with code 1. Tests assert on those check ids rather than on the presence of a label that also appears in passing output.

The Turbo run reports one task: `//#validate`. Because the task is registered with `cache: false`, every invocation re-runs the validator and reports `0 cached`; a cached result would mean the cache had not actually been disabled.

## Implementation notes

- Each `runChecks` call owns its result array and its own reporting functions, so no run can observe or mutate another run's results.
- Invalid input shapes are rejected with specific check ids, never by a blanket `try/catch` that would mask a genuine programming error as a pass.
- No script text from a test fixture is ever executed; the validate command is compared as a documented contract.
- Tests build private temporary workspaces (`scripts/fixture.js`) and remove only their own directories.

## Related files

- `scripts/validate-workspace.js` – the validation script itself
- `scripts/validate-workspace.test.js` – node:test suite exercising negative cases
- `scripts/fixture.js` – temporary workspace builder for the test suite
- `pnpm-lock.yaml` – contains two YAML documents; do not merge them
- `turbo.json` – declares the root task `//#validate` with `cache: false`
- `docs/runbooks/workspace-validation.md` – this file