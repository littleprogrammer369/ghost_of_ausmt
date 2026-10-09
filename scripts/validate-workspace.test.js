'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { runChecks, parseYamlDocuments, parseJson, parseYaml, normalizeVersion, compareVersions, envPackageManagerPin, projectRootImporter } = require('./validate-workspace.js');
const { makeWorkspace } = require('./fixture.js');

test('valid fixture passes', async (t) => {
  const ws = makeWorkspace();
  try {
    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, true, `validation should pass: ${outcome.summary}`);
  } finally {
    ws.cleanup();
  }
});

test('mismatched package-manager pin fails', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.packageManager = 'pnpm@12.10.0'; // off by one patch
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to package manager pin mismatch');
    const pinFail = outcome.results.find(r => r.id === 'lockfile-package-manager-pin' && !r.passed);
    assert.ok(pinFail, 'should have a lockfile-package-manager-pin failure');
  } finally {
    ws.cleanup();
  }
});

test('malformed workspace YAML fails (trailing junk after quoted glob)', async (t) => {
  const ws = makeWorkspace();
  try {
    // Valid single-line YAML content, but trailing junk on the same line
    // after the quoted scalar. A substring search for "apps/*" would still
    // find the glob text and wrongly report success; the parser must reject it.
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*' junk-after-glob\n  - 'packages/*'\n");

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to malformed YAML');
    const yamlFail = outcome.results.find(r => r.id === 'workspace-yaml-parse' && !r.passed);
    assert.ok(yamlFail, 'should have a workspace-yaml-parse failure');
  } finally {
    ws.cleanup();
  }
});

test('malformed workspace YAML fails (leading tab)', async (t) => {
  const ws = makeWorkspace();
  try {
    const content = ws.readFile('pnpm-workspace.yaml');
    ws.writeFile('pnpm-workspace.yaml', '\t' + content); // leading tab invalid in YAML 1.2

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to malformed YAML');
    const yamlFail = outcome.results.find(r => r.id === 'workspace-yaml-parse' && !r.passed);
    assert.ok(yamlFail, 'should have a workspace-yaml-parse failure');
  } finally {
    ws.cleanup();
  }
});

test('unsupported workspace glob fails', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'services/*'\n");

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to unsupported glob');
    const globFail = outcome.results.find(r => r.id === 'workspace-supported-globs' && !r.passed);
    assert.ok(globFail, 'should have a workspace-supported-globs failure');
  } finally {
    ws.cleanup();
  }
});

test('valid two-document lockfile accepted', async (t) => {
  const ws = makeWorkspace();
  try {
    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, true, `valid two-document lockfile should pass: ${outcome.summary}`);
  } finally {
    ws.cleanup();
  }
});

test('malformed lockfile document fails', async (t) => {
  const ws = makeWorkspace();
  try {
    // Keep both documents, but corrupt the second one with a tab used for
    // indentation, which YAML rejects outright. A byte-length truncation is
    // not sufficient: cutting at a clean boundary still parses as a valid,
    // merely-shorter document, so it would not exercise a parser failure.
    const content = ws.readFile('pnpm-lock.yaml');
    const separator = content.lastIndexOf('\n---\n');
    assert.ok(separator > 0, 'fixture lockfile should contain two documents');
    const secondDoc = content.slice(separator + 5);
    ws.writeFile('pnpm-lock.yaml', `${content.slice(0, separator)}\n---\n\t${secondDoc}`);

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to malformed lockfile');
    const lockfileFail = outcome.results.find(r => r.id === 'lockfile-parse' && !r.passed);
    assert.ok(lockfileFail, 'should have a lockfile-parse failure');
  } finally {
    ws.cleanup();
  }
});

test('project dependency graph is read from the project document', async (t) => {
  const ws = makeWorkspace();
  try {
    // The env document (first) carries pnpm's platform binary, which must
    // never be reported as a project dependency. Add an extra dev dependency
    // name to the env document only; if the validator wrongly read the env
    // document as the project graph, this would surface as a missing lock
    // entry rather than being ignored.
    const content = ws.readFile('pnpm-lock.yaml');
    const separator = content.indexOf('\n---\n');
    assert.ok(separator > 0, 'fixture lockfile should contain two documents');
    const envDoc = content.slice(0, separator);
    const projectDoc = content.slice(separator + 5);
    const doctored = `${envDoc}\n  phantomImporterDevDep:\n    specifier: 1.0.0\n    version: 1.0.0\n---\n${projectDoc}`;
    ws.writeFile('pnpm-lock.yaml', doctored);

    const outcome = runChecks(ws.dir);
    assert.strictEqual(
      outcome.passed,
      true,
      `env-document-only additions must not affect the project graph: ${outcome.summary}`,
    );
  } finally {
    ws.cleanup();
  }
});

test('undeclared project dev dependency detected', async (t) => {
  const ws = makeWorkspace();
  try {
    const content = ws.readFile('pnpm-lock.yaml');
    const sep = content.lastIndexOf('\n---\n');
    assert.ok(sep > 0, 'fixture lockfile should contain two documents');
    const envDoc = content.slice(0, sep);
    let projectDoc = content.slice(sep + 5);

    const anchor = '        specifier: 2.11.7\n        version: 2.11.7\n';
    assert.ok(projectDoc.includes(anchor), 'fixture should contain the turbo lock entry');
    projectDoc = projectDoc.replace(anchor, `${anchor}      phantomDep:\n        specifier: 1.0.0\n        version: 1.0.0\n`);
    ws.writeFile('pnpm-lock.yaml', `${envDoc}\n---\n${projectDoc}`);

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'an undeclared locked dev dependency should fail');
    const fail = outcome.results.find(
      r => r.id === 'lockfile-no-undeclared-dev-deps' && !r.passed,
    );
    assert.ok(fail, 'should have a lockfile-no-undeclared-dev-deps failure');
  } finally {
    ws.cleanup();
  }
});

test('disagreeing Node markers fail separately', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('.nvmrc', '24.21.0');
    ws.writeFile('.node-version', '24.20.0'); // different patch

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to node markers disagreement');
    const agreeFail = outcome.results.find(r => r.id === 'node-markers-agree' && !r.passed);
    assert.ok(agreeFail, 'should have a node-markers-agree failure');
  } finally {
    ws.cleanup();
  }
});

test('runtime/marker mismatch fails with injected value', async (t) => {
  const ws = makeWorkspace();
  try {
    const outcome = runChecks(ws.dir, { nodeVersion: '22.0.0' });
    assert.strictEqual(outcome.passed, false, 'should fail due to runtime/marker mismatch');
    const mismatchFail = outcome.results.find(r => r.id === 'node-runtime-matches-marker' && !r.passed);
    assert.ok(mismatchFail, 'should have a node-runtime-matches-marker failure');
  } finally {
    ws.cleanup();
  }
});

test('missing required file fails cleanly', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.remove('package.json');

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to missing package.json');
    const missingFail = outcome.results.find(r => r.id === 'required-files' && !r.passed);
    assert.ok(missingFail, 'should have a required-files failure');
  } finally {
    ws.cleanup();
  }
});

test('malformed JSON fails cleanly', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('package.json', '{ not valid json');

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to malformed JSON');
    const jsonFail = outcome.results.find(r => r.id === 'package-json-parse' && !r.passed);
    assert.ok(jsonFail, 'should have a package-json-parse failure');
  } finally {
    ws.cleanup();
  }
});

test('missing Turbo dependency detected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    delete pkg.devDependencies.turbo;
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to missing turbo dependency');
    const turboFail = outcome.results.find(r => r.id === 'turbo-declared-dependency' && !r.passed);
    assert.ok(turboFail, 'should have a turbo-declared-dependency failure');
  } finally {
    ws.cleanup();
  }
});

test('wrong root-task registration detected', async (t) => {
  const ws = makeWorkspace();
  try {
    const turbo = JSON.parse(ws.readFile('turbo.json'));
    turbo.tasks = { '//#build': { cache: false } }; // wrong task name
    ws.writeFile('turbo.json', JSON.stringify(turbo, null, 2));

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, false, 'should fail due to missing //#validate task');
    const taskFail = outcome.results.find(r => r.id === 'turbo-root-task-registered' && !r.passed);
    assert.ok(taskFail, 'should have a turbo-root-task-registered failure');
  } finally {
    ws.cleanup();
  }
});
