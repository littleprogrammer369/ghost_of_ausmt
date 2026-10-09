#!/usr/bin/env node
/**
 * Workspace configuration validation for the ghost_of_ausmt monorepo.
 *
 * What this DOES validate:
 *   - Structural integrity of the root manifests (package.json, turbo.json,
 *     pnpm-workspace.yaml) parsed as JSON / YAML, not by substring search.
 *   - Manifest shape: a root of null, an array, or a scalar is rejected, as are
 *     invalid shapes for the specific fields the validator reads.
 *   - Workspace membership: exactly apps/* and packages/*, each once, with no
 *     missing, duplicate, non-string, or unsupported entries.
 *   - The pnpm lockfile's multiple YAML documents: a required env document
 *     carrying packageManagerDependencies.pnpm (specifier and version) matching
 *     the root manifest's packageManager, a separate project document with a
 *     root importer, and an agreeing lockfileVersion on both.
 *   - That the root validate script is exactly `node scripts/validate-workspace.js`,
 *     so a no-op echo or a recursive turbo invocation is rejected.
 *   - That the pinned Node runtime markers (.nvmrc, .node-version) agree with
 *     each other and with the Node process actually running this script.
 *   - That declared dev tooling (turbo) is present as a dependency, that it
 *     resolves from node_modules, and that turbo's root task (//#validate)
 *     points at that script.
 *
 * What this does NOT do:
 *   - It is NOT application lint, typecheck, or build coverage. No application
 *     code exists in this repository yet.
 *   - It does not treat the presence of a "build"/"test" script name as a
 *     defect: legitimate future tasks may add them.
 *   - It does not claim that a regex over .gitignore proves secrets are
 *     excluded, or that a regex over the ADR proves role/security semantics.
 *     Those are documentation-presence checks and are labelled as such.
 *   - It does not execute the text of any script configured in a fixture; the
 *     validate command is compared as a documented contract instead.
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
 * Create a per-run result sink.
 *
 * Each runChecks call gets its own array and its own report/fail closures, so a
 * previously returned outcome.results can never be mutated by a later run and
 * each returned array is a distinct object. Module-level mutable state was the
 * earlier defect: clearing a shared array still left every caller's array
 * aliased to it, so a second run retroactively rewrote the first run's results.
 */
function createResultSink() {
  const results = [];
  return {
    results,
    report(id, passed, detail) {
      results.push({ id, passed, detail: detail === undefined ? null : detail });
      return passed;
    },
    fail(id, message) {
      results.push({ id, passed: false, detail: message });
      return false;
    },
  };
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
  const sink = createResultSink();
  const results = sink.results;
  const report = sink.report.bind(sink);
  const fail = sink.fail.bind(sink);
  const opts = options || {};
  const injectedNodeVersion = opts.nodeVersion || process.versions.node;

  const repoRootValue = root;
  const abs = (rel) => path.join(repoRootValue, rel);
  const has = (rel) => fs.existsSync(abs(rel));
  const text = (rel) => fs.readFileSync(abs(rel), 'utf8');
  const maybeText = (rel) => (has(rel) ? text(rel) : null);

  /**
   * Classify a parsed manifest root. Valid JSON syntax does not imply a valid
   * manifest: `null`, an array, and a bare scalar all parse successfully but
   * have no fields to read. Returns a stable failure id plus the object to
   * use downstream (empty object when invalid, so no check dereferences null).
   */
  function classifyManifest(id, value) {
    if (value === null) {
      return { id: 'manifest-null', detail: `${id} root is null`, value: {} };
    }
    if (Array.isArray(value)) {
      return { id: 'manifest-array', detail: `${id} root is an array`, value: {} };
    }
    if (typeof value !== 'object') {
      return { id: 'manifest-scalar', detail: `${id} root is a ${typeof value}`, value: {} };
    }
    return { id: null, detail: null, value };
  }

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
  // A malformed manifest is reported and the remaining checks continue with an
  // empty object, so one bad file cannot crash the run. Checks that need a
  // field then fail on their own specific id rather than a blanket exception.
  const manifest = loadManifestAt(root);
  if (!manifest.present) {
    fail('package-json-parse', 'package.json not found');
    return { passed: false, results, summary: 'package.json not found' };
  }
  if (!manifest.ok) {
    fail('package-json-parse', manifest.error);
  } else {
    report('package-json-parse', true);
  }
  const manifestShape = classifyManifest('package.json', manifest.value);
  if (manifestShape.id) {
    fail(manifestShape.id, manifestShape.detail);
  }
  const pkg = manifestShape.value;

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
      // Structurally parsed, never matched by substring. The approved layout is
      // exactly the app container and the package container, each listed once.
      const supported = ['apps/*', 'packages/*'];
      if (parsed.value === null || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
        fail('workspace-root-shape', `root must be a mapping, got ${parsed.value === null ? 'null' : Array.isArray(parsed.value) ? 'array' : typeof parsed.value}`);
      } else if (!Object.prototype.hasOwnProperty.call(parsed.value, 'packages')) {
        fail('workspace-packages-missing', 'no "packages" key');
      } else if (!Array.isArray(parsed.value.packages)) {
        // Covers a scalar/mapping container, so an unusable shape is reported
        // under the workspace id rather than crashing a later glob filter.
        fail(
          'workspace-packages-array',
          `packages must be an array, got ${parsed.value.packages === null ? 'null' : Array.isArray(parsed.value.packages) ? 'array' : typeof parsed.value.packages}`,
        );
      } else {
        const packages = parsed.value.packages;
        const nonStrings = packages.filter((g) => typeof g !== 'string');
        if (nonStrings.length > 0) {
          fail(
            'workspace-packages-non-string',
            `${nonStrings.length} non-string item(s): ${JSON.stringify(nonStrings).slice(0, 120)}`,
          );
        }
        if (packages.length === 0) {
          fail('workspace-globs-exact', 'packages is empty; both apps/* and packages/* are required');
        }
        const expected = ['apps/*', 'packages/*'];
        // A missing required container and a duplicate entry are distinct
        // defects with distinct ids rather than one combined glob message.
        for (const glob of expected) {
          const count = packages.filter((g) => g === glob).length;
          if (count === 0) {
            fail('workspace-glob-missing', `required glob "${glob}" is absent`);
          } else if (count > 1) {
            fail('workspace-glob-duplicate', `glob "${glob}" listed ${count} times`);
          }
        }
        const unsupported = packages.filter(
          (g) => typeof g === 'string' && !expected.includes(g) && !supported.includes(g),
        );
        if (unsupported.length > 0) {
          fail(
            'workspace-supported-globs',
            `unsupported glob(s): ${unsupported.join(', ')}; supported: ${supported.join(', ')}`,
          );
        }
        // Report the overall membership verdict only when no individual glob
        // problem was already reported, so a failure is not also announced as a
        // success under a coarser id.
        const globFailures = results.filter(
          (r) => r.id.startsWith('workspace-') && !r.id.endsWith('parse') && !r.id.endsWith('globs-exact'),
        );
        const anyGlobFailure = globFailures.length > 0
          || results.some((r) => r.id === 'workspace-globs-exact' && !r.passed);
        if (!anyGlobFailure) {
          report('workspace-globs-exact', true, 'apps/*, packages/* (each exactly once)');
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
      const turboShape = classifyManifest('turbo.json', parsed.value);
      if (turboShape.id) {
        fail(turboShape.id, turboShape.detail);
      }
      const turboJson = turboShape.value;
      // Task definitions must be a mapping before an individual task key can be
      // read out of it; a scalar/array here is reported, not dereferenced.
      const tasksContainer = turboJson.tasks !== undefined ? turboJson.tasks : turboJson.pipeline;
      if (tasksContainer === undefined) {
        fail('turbo-tasks-missing', 'no "tasks" (or legacy "pipeline") key');
      } else if (tasksContainer === null || typeof tasksContainer !== 'object' || Array.isArray(tasksContainer)) {
        fail(
          'turbo-tasks-shape',
          `tasks must be a mapping, got ${tasksContainer === null ? 'null' : Array.isArray(tasksContainer) ? 'array' : typeof tasksContainer}`,
        );
      }
      const tasks = tasksContainer && typeof tasksContainer === 'object' && !Array.isArray(tasksContainer)
        ? tasksContainer
        : {};
      const rootTask = tasks['//#validate'];

      if (!rootTask) {
        fail('turbo-root-task-registered', 'no //#validate task registered in turbo.json');
      } else {
        report('turbo-root-task-registered', true, '//#validate');
        if (rootTask === null || typeof rootTask !== 'object' || Array.isArray(rootTask)) {
          fail(
            'turbo-root-task-shape',
            `//#validate must be a mapping, got ${rootTask === null ? 'null' : Array.isArray(rootTask) ? 'array' : typeof rootTask}`,
          );
        } else {
          if (rootTask.cache !== false) {
            fail('turbo-root-task-cache-false', `expected cache:false, got ${JSON.stringify(rootTask.cache)}`);
          } else {
            report('turbo-root-task-cache-false', true, 'cache disabled for environment-sensitive run');
          }
        }
      }

      // The root script must be the agreed direct command. The existence of
      // scripts/validate-workspace.js on disk is not evidence that the script
      // runs it, so the command text itself is the contract: 'echo PASS' would
      // otherwise pass on the strength of a file it never invokes.
      const VALIDATE_COMMAND = 'node scripts/validate-workspace.js';
      const scriptsValue = pkg.scripts;
      if (scriptsValue === undefined || scriptsValue === null) {
        fail('turbo-root-task-targets-real-script', 'root package.json has no "scripts" object');
      } else if (typeof scriptsValue !== 'object' || Array.isArray(scriptsValue)) {
        fail(
          'turbo-root-task-targets-real-script',
          `scripts must be a mapping, got ${Array.isArray(scriptsValue) ? 'array' : typeof scriptsValue}`,
        );
      } else {
        const scripts = scriptsValue;
        if (!Object.prototype.hasOwnProperty.call(scripts, 'validate')) {
          fail('turbo-root-task-targets-real-script', 'root package.json has no "validate" script');
        } else if (typeof scripts.validate !== 'string' || scripts.validate.trim() === '') {
          fail('turbo-root-task-targets-real-script', 'root "validate" script is empty or not a string');
        } else if (!has('scripts/validate-workspace.js')) {
          fail('turbo-root-task-targets-real-script', 'validate script has no scripts/validate-workspace.js target');
        } else if (scripts.validate.trim() === VALIDATE_COMMAND) {
          report('turbo-root-task-targets-real-script', true, VALIDATE_COMMAND);
        } else if (/^echo\b/.test(scripts.validate.trim())) {
          fail(
            'turbo-root-task-targets-real-script',
            `validate is a no-op echo command: "${scripts.validate}"`,
          );
        } else if (/\bturbo\b/.test(scripts.validate)) {
          // The root task //#validate is executed BY turbo, so a root script
          // invoking turbo would recurse into the task it is already running.
          fail(
            'turbo-root-task-targets-real-script',
            `validate invokes turbo, which would recurse into //#validate: "${scripts.validate}"`,
          );
        } else {
          fail(
            'turbo-root-task-targets-real-script',
            `validate must be exactly "${VALIDATE_COMMAND}", got "${scripts.validate}"`,
          );
        }
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

      // The env document is the one carrying packageManagerDependencies. pnpm
      // writes it FIRST when present. The project document is always the LAST,
      // and it is the only place the project's dependency graph is trustworthy
      // (never pnpm's own platform binaries in the env doc). The two documents
      // are never merged.
      const envDocIndex = parsed.documents.findIndex(
        (d) => d && d.importers && d.importers['.'] && d.importers['.'].packageManagerDependencies !== undefined,
      );
      const envDoc = envDocIndex >= 0 ? parsed.documents[envDocIndex] : null;
      const projectDoc = parsed.documents[parsed.documents.length - 1];

      // Contract for THIS project: with a pnpm 12 packageManager pin in
      // package.json, pnpm writes a separate env document. A lockfile without
      // one cannot demonstrate that the manager version was pinned at install
      // time, so it is a failure rather than "nothing to compare". This is a
      // project-specific contract; it does not assert that every historical
      // single-document lockfile in general is malformed.
      if (!envDoc) {
        fail(
          'lockfile-env-document',
          'no document carries importers["."].packageManagerDependencies; a pnpm env document is required for this project',
        );
      } else if (envDocIndex !== 0) {
        fail(
          'lockfile-env-document',
          `env document found at position ${envDocIndex + 1} of ${parsed.documents.length}; pnpm writes it first`,
        );
      } else {
        report(
          'lockfile-env-document',
          true,
          `first of ${parsed.documents.length} carries packageManagerDependencies`,
        );
      }

      // A separate project document with a root importer is required, so the
      // dependency graph cannot be read out of the env document by accident.
      if (parsed.documents.length < 2) {
        fail('lockfile-project-document', 'a separate project document is required');
      } else if (!projectRootImporter(projectDoc).found) {
        fail('lockfile-project-root-importer', 'project document has no root importer (".")');
      } else {
        report('lockfile-project-root-importer', true, 'project document root importer present');
      }

      // The env and project documents must each declare a valid lockfileVersion,
      // and the two must agree. "none declared" is not acceptable here because
      // an undeclared version would make agreement unverifiable.
      const envVersion = envDoc ? envDoc.lockfileVersion : undefined;
      const projectVersion = projectDoc ? projectDoc.lockfileVersion : undefined;
      if (envVersion === undefined || envVersion === null) {
        fail('lockfile-version-env-document', 'env document declares no lockfileVersion');
      } else if (projectVersion === undefined || projectVersion === null) {
        fail('lockfile-version-project-document', 'project document declares no lockfileVersion');
      } else if (String(envVersion) !== String(projectVersion)) {
        fail(
          'lockfile-version-consistent',
          `env declares ${envVersion}, project declares ${projectVersion}`,
        );
      } else {
        report('lockfile-version-consistent', true, `both documents ${envVersion}`);
      }

      // Structural pin comparison, NOT substring search: both the specifier and
      // the resolved version in the env document must equal package.json.
      const pin = envPackageManagerPin(envDoc);
      if (!pin.found) {
        fail(
          'lockfile-package-manager-pin',
          'env document has no packageManagerDependencies.pnpm entry',
        );
      } else if (!pin.specifier || !pin.version) {
        fail(
          'lockfile-package-manager-pin',
          `env pnpm entry is incomplete: specifier=${pin.specifier} version=${pin.version}`,
        );
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
      // pnpm's own platform binaries in the env document.
      const importer = projectRootImporter(projectDoc);
      const devDepsValue = pkg.devDependencies;
      if (devDepsValue !== undefined && (devDepsValue === null || typeof devDepsValue !== 'object' || Array.isArray(devDepsValue))) {
        fail(
          'lockfile-dev-dependencies-shape',
          `package.json devDependencies must be a mapping, got ${devDepsValue === null ? 'null' : Array.isArray(devDepsValue) ? 'array' : typeof devDepsValue}`,
        );
      }
      const declaredDev = devDepsValue && typeof devDepsValue === 'object' && !Array.isArray(devDepsValue)
        ? devDepsValue
        : {};
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
  const devDeps = pkg.devDependencies;
  const declaredDev = devDeps && typeof devDeps === 'object' && !Array.isArray(devDeps) ? devDeps : {};
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
