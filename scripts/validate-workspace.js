#!/usr/bin/env node
/**
 * Workspace configuration validation for the ghost_of_ausmt monorepo.
 *
 * What this DOES validate:
 *   - Structural integrity of the root manifests (package.json, turbo.json,
 *     pnpm-workspace.yaml) parsed as JSON / YAML, not by substring search.
 *   - The pnpm lockfile's multiple YAML documents: the env document's
 *     packageManagerDependencies pin versus the root manifest's packageManager,
 *     and the project document's root importer dependencies.
 *   - That the pinned Node runtime markers (.nvmrc, .node-version) agree with
 *     each other and with the Node process actually running this script.
 *   - That declared dev tooling (turbo) is present as a dependency, that it
 *     resolves from node_modules, and that turbo's root task (//#validate)
 *     points at a script that exists.
 *
 * What this does NOT do:
 *   - It is NOT application lint, typecheck, or build coverage. No application
 *     code exists in this repository yet.
 *   - It does not treat the presence of a "build"/"test" script name as a
 *     defect: legitimate future tasks may add them, and whether such a script
 *     has a real executable target is a separate concern.
 *   - It does not claim that a regex over .gitignore proves secrets are
 *     excluded, or that a regex over the ADR proves role/security semantics.
 *     Those are documentation-presence checks and are labelled as such.
 *
 * The negative cases are covered by scripts/validate-workspace.test.js, which
 * runs the same check functions against deliberately broken temporary
 * fixtures. This file only executes checks; it does not self-test in-process.
 *
 * Usage:
 *   node scripts/validate-workspace.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = process.cwd();

/**
 * Every check reports a stable id so a failing run can be asserted by id,
 * and so a test can require an explicit failure rather than the mere
 * occurrence of a label that also appears in passing output.
 */
const results = [];

function report(id, passed, detail) {
  results.push({ id, passed, detail: detail === undefined ? null : detail });
  return passed;
}

function fail(id, message) {
  results.push({ id, passed: false, detail: message });
  return false;
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function readIfPresent(relPath) {
  return exists(relPath) ? read(relPath) : null;
}

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

/** Parse a JSON document, returning {ok, value, error} instead of throwing. */
function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text), error: null };
  } catch (err) {
    return { ok: false, value: null, error: err.message };
  }
}

/**
 * Parse a single YAML document, returning {ok, value, error} instead of
 * throwing. Callers that must handle multi-document input use
 * parseYamlDocuments.
 */
function parseYaml(text) {
  try {
    return { ok: true, value: yaml.load(text), error: null };
  } catch (err) {
    return { ok: false, value: null, error: err.message };
  }
}

/**
 * Parse ALL YAML documents in a lockfile.
 *
 * pnpm 12 writes either one document (project only) or two documents separated
 * by `---` (env document first, project document last). See
 * https://pnpm.io/lockfile. The documents are never merged; the project
 * document is always the LAST one.
 */
function parseYamlDocuments(text) {
  const docs = [];
  try {
    yaml.loadAll(text, (doc) => docs.push(doc), { filename: 'pnpm-lock.yaml' });
    return { ok: true, documents: docs, error: null };
  } catch (err) {
    return { ok: false, documents: docs, error: err.message };
  }
}

/** Read and parse package.json once; callers reuse this so a malformed file
 *  cannot cause an uncontrolled second parse crash. */
function loadRootManifest() {
  if (!exists('package.json')) {
    return { present: false, ok: false, value: null, error: 'package.json not found' };
  }
  const parsed = parseJson(read('package.json'));
  return { present: true, ok: parsed.ok, value: parsed.value, error: parsed.error };
}

// ---------------------------------------------------------------------------
// Runtime markers
// ---------------------------------------------------------------------------

/** Normalise a runtime marker value: strip a leading "v", trim whitespace. */
function normalizeVersion(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed.replace(/^v/, '');
}

/**
 * Compare two dotted versions. Returns -1, 0 or 1. A missing/invalid operand
 * is treated as smaller than a valid one.
 */
function compareVersions(a, b) {
  const partsOf = (v) => String(v).split('.').map((n) => Number.parseInt(n, 10));
  const ap = partsOf(a);
  const bp = partsOf(b);
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i += 1) {
    const an = Number.isFinite(ap[i]) ? ap[i] : 0;
    const bn = Number.isFinite(bp[i]) ? bp[i] : 0;
    if (an !== bn) {
      return an < bn ? -1 : 1;
    }
  }
  return 0;
}

/** @returns {{nvmrc: string|null, nodeVersion: string|null}} */
function readRuntimeMarkers() {
  return {
    nvmrc: normalizeVersion(readIfPresent('.nvmrc')),
    nodeVersion: normalizeVersion(readIfPresent('.node-version')),
  };
}

// ---------------------------------------------------------------------------
// pnpm lockfile structure
// ---------------------------------------------------------------------------

/**
 * Extract the package-manager pin from the env document.
 *
 * pnpm 12 writes the env pin under
 * `importers['.'].packageManagerDependencies.pnpm`, with `specifier` (what the
 * manifest asked for) and `version` (what was resolved). Both are structured
 * values, so a stale or unrelated key elsewhere in the file cannot satisfy
 * this comparison the way a substring search could.
 *
 * @returns {{found: boolean, specifier: string|null, version: string|null}}
 */
function envPackageManagerPin(envDoc) {
  if (!envDoc || typeof envDoc !== 'object') {
    return { found: false, specifier: null, version: null };
  }
  const importers =
    envDoc.importers && typeof envDoc.importers === 'object' ? envDoc.importers : null;
  const root = importers && typeof importers['.'] === 'object' ? importers['.'] : null;
  const pmDeps = root && typeof root.packageManagerDependencies === 'object'
    ? root.packageManagerDependencies
    : null;
  const pnpmDep = pmDeps && typeof pmDeps.pnpm === 'object' ? pmDeps.pnpm : null;
  if (!pnpmDep) {
    return { found: false, specifier: null, version: null };
  }
  return {
    found: true,
    specifier: typeof pnpmDep.specifier === 'string' ? pnpmDep.specifier : null,
    version: typeof pnpmDep.version === 'string' ? pnpmDep.version : null,
  };
}

/** Extract the root importer's declared dependencies from the project document.
 *  Missing dependency maps normalise to empty objects rather than null. */
function projectRootImporter(projectDoc) {
  const empty = { dependencies: {}, devDependencies: {}, configDependencies: {} };
  if (!projectDoc || typeof projectDoc !== 'object') {
    return { found: false, ...empty };
  }
  const importers = projectDoc.importers;
  if (!importers || typeof importers !== 'object' || !importers['.']) {
    return { found: false, ...empty };
  }
  const root = importers['.'];
  const map = (v) => (v && typeof v === 'object' ? v : {});
  return {
    found: true,
    dependencies: map(root.dependencies),
    devDependencies: map(root.devDependencies),
    configDependencies: map(root.configDependencies),
  };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * Run all checks against a directory. `options.nodeVersion` lets a test inject
 * a simulated runtime instead of switching the real one.
 *
 * @returns {{passed: boolean, results: Array, summary: string}}
 */
function runChecks(root, options) {
  // Reset results for each invocation so tests are isolated.
  results.length = 0;
  const opts = options || {};
  const injectedNodeVersion = opts.nodeVersion || process.versions.node;

  const repoRootValue = root;
  const abs = (rel) => path.join(repoRootValue, rel);
  const has = (rel) => fs.existsSync(abs(rel));
  const text = (rel) => fs.readFileSync(abs(rel), 'utf8');
  const maybeText = (rel) => (has(rel) ? text(rel) : null);

  const required = [
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    'pnpm-lock.yaml',
    '.nvmrc',
    '.node-version',
    'docs/adr/0001-mvp-foundations-and-roles.md',
  ];
  const missing = required.filter((rel) => !has(rel));
  if (missing.length > 0) {
    fail('required-files', `missing: ${missing.join(', ')}`);
    return { passed: false, results, summary: `missing required files: ${missing.join(', ')}` };
  }
  report('required-files', true, `${required.length} files present`);

  // --- package.json -------------------------------------------------------
  const manifest = loadManifestAt(root);
  if (!manifest.present) {
    fail('package-json-parse', 'package.json not found');
    return { passed: false, results, summary: 'package.json not found' };
  }
  if (!manifest.ok) {
    // Deliberately no second parse attempt: report and keep the rest of the
    // checks running with an empty manifest so one bad file cannot crash the run.
    fail('package-json-parse', manifest.error);
  } else {
    report('package-json-parse', true);
  }
  const pkg = manifest.ok ? manifest.value : {};

  const pm = typeof pkg.packageManager === 'string' ? pkg.packageManager : '';
  const pmMatch = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pm);
  if (!pmMatch) {
    fail('package-manager-exact-pin', `expected pnpm@<exact x.y.z>, got "${pm || 'missing'}"`);
  } else {
    report('package-manager-exact-pin', true, pm);
  }

  // --- pnpm-workspace.yaml -------------------------------------------------
  if (!has('pnpm-workspace.yaml')) {
    fail('workspace-yaml-parse', 'pnpm-workspace.yaml not found');
  } else {
    const parsed = parseYaml(text('pnpm-workspace.yaml'));
    if (!parsed.ok) {
      fail('workspace-yaml-parse', parsed.error);
    } else {
      report('workspace-yaml-parse', true);
      const packages = parsed.value && parsed.value.packages;
      if (!Array.isArray(packages)) {
        fail('workspace-packages-array', `packages must be an array, got ${typeof packages}`);
      } else {
        const supported = ['apps/*', 'packages/*'];
        const unsupported = packages.filter((g) => !supported.includes(g));
        if (unsupported.length > 0) {
          fail(
            'workspace-supported-globs',
            `unsupported glob(s): ${unsupported.join(', ')}; supported: ${supported.join(', ')}`,
          );
        } else {
          report(
            'workspace-supported-globs',
            true,
            packages.length === supported.length ? 'apps/*, packages/*' : packages.join(', '),
          );
        }
      }
    }
  }

  // --- turbo.json ----------------------------------------------------------
  if (!has('turbo.json')) {
    fail('turbo-json-parse', 'turbo.json not found');
  } else {
    const parsed = parseJson(text('turbo.json'));
    if (!parsed.ok) {
      fail('turbo-json-parse', parsed.error);
    } else {
      report('turbo-json-parse', true);
      const turboJson = parsed.value;
      const tasks = turboJson.tasks || turboJson.pipeline || {};
      const rootTask = tasks['//#validate'];

      if (!rootTask) {
        fail('turbo-root-task-registered', 'no //#validate task registered in turbo.json');
      } else {
        report('turbo-root-task-registered', true, '//#validate');
        if (rootTask.cache !== false) {
          fail('turbo-root-task-cache-false', `expected cache:false, got ${JSON.stringify(rootTask.cache)}`);
        } else {
          report('turbo-root-task-cache-false', true, 'cache disabled for environment-sensitive run');
        }
      }

      const scripts = pkg.scripts || {};
      if (!Object.prototype.hasOwnProperty.call(scripts, 'validate')) {
        fail('turbo-root-task-targets-real-script', 'root package.json has no "validate" script');
      } else if (typeof scripts.validate !== 'string' || scripts.validate.length === 0) {
        fail('turbo-root-task-targets-real-script', 'root "validate" script is empty');
      } else if (!has('scripts/validate-workspace.js')) {
        fail('turbo-root-task-targets-real-script', 'validate script has no scripts/validate-workspace.js target');
      } else {
        report('turbo-root-task-targets-real-script', true, scripts.validate);
      }
    }
  }

  // --- pnpm-lock.yaml ------------------------------------------------------
  if (!has('pnpm-lock.yaml')) {
    fail('lockfile-parse', 'pnpm-lock.yaml not found');
  } else {
    const parsed = parseYamlDocuments(text('pnpm-lock.yaml'));
    if (!parsed.ok) {
      fail('lockfile-parse', parsed.error);
    } else if (parsed.documents.length === 0) {
      fail('lockfile-parse', 'no YAML documents found');
    } else if (parsed.documents.some((d) => d === null || d === undefined)) {
      fail('lockfile-parse', 'at least one YAML document is empty or malformed');
    } else {
      report('lockfile-parse', true, `${parsed.documents.length} document(s)`);

      // Every document must declare the same lockfileVersion.
      const versions = parsed.documents
        .map((d) => d.lockfileVersion)
        .filter((v) => v !== undefined);
      const uniqueVersions = [...new Set(versions.map(String))];
      if (uniqueVersions.length > 1) {
        fail('lockfile-version-consistent', `conflicting lockfileVersion values: ${uniqueVersions.join(', ')}`);
      } else {
        report('lockfile-version-consistent', true, uniqueVersions[0] || 'none declared');
      }

      // The env document is the one carrying packageManagerDependencies.
      // pnpm writes it first when present; the project document is always the
      // LAST document, and it is the only place the project's dependency graph
      // is trustworthy (never pnpm's own platform binaries in the env doc).
      const envDocIndex = parsed.documents.findIndex(
        (d) => d && d.importers && d.importers['.'] && d.importers['.'].packageManagerDependencies !== undefined,
      );
      const envDoc = envDocIndex >= 0 ? parsed.documents[envDocIndex] : null;
      const projectDoc = parsed.documents[parsed.documents.length - 1];

      if (envDoc) {
        const position = envDocIndex === 0 ? 'first' : `document ${envDocIndex + 1}`;
        report(
          'lockfile-env-document',
          true,
          `${position} of ${parsed.documents.length} carries packageManagerDependencies`,
        );
      } else {
        report('lockfile-env-document', true, 'single-document lockfile; no env document');
      }

      // Structural pin comparison, NOT substring search: the version resolved
      // in the env document must equal the version pinned in package.json.
      const pin = envPackageManagerPin(envDoc);
      if (!pin.found) {
        report('lockfile-package-manager-pin', true, 'no env packageManagerDependencies to compare');
      } else if (!pmMatch) {
        fail('lockfile-package-manager-pin', `manifest pin is not exact, cannot compare (${pm || 'missing'})`);
      } else {
        const declaredVersion = pmMatch[1];
        const resolved = pin.version;
        if (pin.specifier !== declaredVersion || resolved !== declaredVersion) {
          fail(
            'lockfile-package-manager-pin',
            `env lockfile has specifier=${pin.specifier} version=${resolved}, manifest declares ${declaredVersion}`,
          );
        } else {
          report('lockfile-package-manager-pin', true, `specifier and version both ${declaredVersion}`);
        }
      }

      // Project dependency graph comes from the PROJECT document, never from
      // pnpm's platform binaries in the env document.
      const importer = projectRootImporter(projectDoc);
      const declaredDev = pkg.devDependencies || {};
      const declaredDevNames = Object.keys(declaredDev);

      for (const name of declaredDevNames) {
        const specifier = declaredDev[name];
        const locked = importer.devDependencies[name];
        if (!locked) {
          fail(
            `lockfile-locks-dev-dep:${name}`,
            `declared in package.json but absent from the project lockfile importer`,
          );
          continue;
        }
        if (locked.specifier !== specifier) {
          fail(
            `lockfile-locks-dev-dep:${name}`,
            `manifest specifier "${specifier}" != lockfile specifier "${locked.specifier}"`,
          );
        } else {
          report(`lockfile-locks-dev-dep:${name}`, true, `${name}@${specifier} -> ${locked.version}`);
        }
      }

      // A dependency locked but not declared would mean a stale lockfile.
      const undeclared = Object.keys(importer.devDependencies).filter(
        (name) => !declaredDevNames.includes(name),
      );
      if (undeclared.length > 0) {
        fail('lockfile-no-undeclared-dev-deps', `locked but not declared: ${undeclared.join(', ')}`);
      } else {
        report('lockfile-no-undeclared-dev-deps', true, `${Object.keys(importer.devDependencies).length} dev dep(s) all declared`);
      }
    }
  }

  // --- single JS lockfile manager -----------------------------------------
  const jsLockfiles = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'npm-shrinkwrap.json',
    'yarn.lock',
    'bun.lockb',
    'bun.lock',
  ];
  const presentLockfiles = jsLockfiles.filter((rel) => has(rel));
  if (presentLockfiles.length !== 1) {
    fail(
      'single-js-lockfile',
      presentLockfiles.length === 0
        ? 'no JS lockfile found'
        : `multiple lockfiles: ${presentLockfiles.join(', ')}`,
    );
  } else {
    report('single-js-lockfile', true, presentLockfiles[0]);
  }

  // --- declared tooling resolves for real ----------------------------------
  // A declaration in package.json is not proof of installation; this check
  // resolves turbo from node_modules and reports the truth.
  const declaredDev = pkg.devDependencies || {};
  const turboDeclared = Object.prototype.hasOwnProperty.call(declaredDev, 'turbo');
  if (!turboDeclared) {
    fail('turbo-declared-dependency', 'turbo is not a root devDependency');
  } else {
    report('turbo-declared-dependency', true, `turbo@${declaredDev.turbo}`);
    const turboManifest = abs('node_modules/turbo/package.json');
    if (!fs.existsSync(turboManifest)) {
      fail('turbo-resolves-locally', 'node_modules/turbo not installed');
    } else {
      const installed = parseJson(fs.readFileSync(turboManifest, 'utf8'));
      if (!installed.ok) {
        fail('turbo-resolves-locally', `installed manifest unreadable: ${installed.error}`);
      } else if (installed.value.version !== declaredDev.turbo) {
        fail(
          'turbo-resolves-locally',
          `installed ${installed.value.version} != declared ${declaredDev.turbo}`,
        );
      } else {
        report('turbo-resolves-locally', true, `node_modules/turbo@${installed.value.version}`);
      }
    }
  }

  // --- runtime markers -----------------------------------------------------
  const markers = readRuntimeMarkersAt(root);
  if (!markers.nvmrc) {
    fail('node-marker-nvmrc-present', '.nvmrc missing or empty');
  } else {
    report('node-marker-nvmrc-present', true, markers.nvmrc);
  }
  if (!markers.nodeVersion) {
    fail('node-marker-node-version-present', '.node-version missing or empty');
  } else {
    report('node-marker-node-version-present', true, markers.nodeVersion);
  }
  if (markers.nvmrc && markers.nodeVersion && markers.nvmrc !== markers.nodeVersion) {
    fail('node-markers-agree', `.nvmrc=${markers.nvmrc} .node-version=${markers.nodeVersion}`);
  } else if (markers.nvmrc && markers.nodeVersion) {
    report('node-markers-agree', true, markers.nvmrc);
  } else {
    fail('node-markers-agree', 'cannot compare: a marker is missing');
  }

  const actual = normalizeVersion(injectedNodeVersion);
  if (markers.nvmrc && actual && markers.nvmrc !== actual) {
    fail(
      'node-runtime-matches-marker',
      `pinned ${markers.nvmrc} != running ${actual} (validation subprocess must use the pinned runtime)`,
    );
  } else if (markers.nvmrc && actual) {
    report('node-runtime-matches-marker', true, actual);
  } else {
    fail('node-runtime-matches-marker', 'cannot compare: marker or runtime missing');
  }

  // --- documentation presence (labelled honestly, not semantic proof) -----
  const adrText = maybeText('docs/adr/0001-mvp-foundations-and-roles.md');
  if (adrText === null) {
    fail('adr-present', 'ADR 0001 not found');
  } else {
    // DOCUMENTATION-PRESENCE CHECKS ONLY. A regex cannot prove that the ADR
    // restricts support access, defines roles correctly, or that any security
    // property holds. It only shows the expected phrase is present, so an
    // accidental deletion is caught. Human review remains the actual control.
    const docChecks = [
      ['adr-doc-multi-conference', /multiple conferences in the MVP|MUST support multiple conferences/i],
      ['adr-doc-four-roles', /Installation Administrator[\s\S]{0,2000}Reviewer/],
      ['adr-doc-support-scoped', /time-limited|ticket-linked/i],
      ['adr-doc-email-password-login', /email and password/i],
      ['adr-doc-otp-open', /OTP is a PROPOSAL|open decision|not confirmed/i],
      ['adr-doc-no-payment-gateway', /No payment gateway|no payment gateway/i],
    ];
    for (const [id, pattern] of docChecks) {
      const present = pattern.test(adrText);
      report(id, present, present ? 'text present' : 'text not found');
    }
  }

  const failedCount = results.filter((r) => !r.passed).length;
  return {
    passed: failedCount === 0,
    results,
    summary: failedCount === 0 ? 'all configuration checks passed' : `${failedCount} check(s) failed`,
  };
}

// Directory-scoped helpers used by runChecks.
function loadManifestAt(root) {
  const p = path.join(root, 'package.json');
  if (!fs.existsSync(p)) {
    return { present: false, ok: false, value: null, error: 'not found' };
  }
  const parsed = parseJson(fs.readFileSync(p, 'utf8'));
  return { present: true, ok: parsed.ok, value: parsed.value, error: parsed.error };
}

function readRuntimeMarkersAt(root) {
  const readMarker = (rel) => {
    const p = path.join(root, rel);
    return fs.existsSync(p) ? normalizeVersion(fs.readFileSync(p, 'utf8')) : null;
  };
  return { nvmrc: readMarker('.nvmrc'), nodeVersion: readMarker('.node-version') };
}

module.exports = {
  runChecks,
  parseYamlDocuments,
  parseJson,
  parseYaml,
  normalizeVersion,
  compareVersions,
  envPackageManagerPin,
  projectRootImporter,
};

// ---------------------------------------------------------------------------
// CLI entry point. The test file imports the module and never reaches this.
// ---------------------------------------------------------------------------

if (require.main === module) {
  const outcome = runChecks(repoRoot);

  for (const r of outcome.results) {
    const marker = r.passed ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${r.id}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log('');
  console.log(`${outcome.results.length} checks, ${outcome.summary}`);
  console.log('');
  console.log('Scope: workspace configuration only. No application lint, typecheck,');
  console.log('or build was executed and no application targets exist in this task.');

  if (!outcome.passed) {
    process.exit(1);
  }
}
