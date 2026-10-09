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

// ---------------------------------------------------------------------------
// Regression tests. Each one reproduces a defect that previously passed or
// threw, then asserts the exact failure id that the fixed validator reports.
// ---------------------------------------------------------------------------

/**
 * Split the fixture lockfile into its two YAML documents.
 *
 * The fixture lockfile opens with a document separator, so the first slice
 * includes that leading `---`. It is stripped here so joinLockfile can rebuild
 * the file with the documents in either order without producing a spurious
 * empty document.
 */
function splitLockfile(content) {
  const sep = content.indexOf('\n---\n');
  assert.ok(sep > 0, 'fixture lockfile should contain two documents');
  let env = content.slice(0, sep);
  if (env.startsWith('---\n')) {
    env = env.slice(4);
  }
  return { env, project: content.slice(sep + 5) };
}

function joinLockfile(env, project) {
  return `---\n${env}\n---\n${project}`;
}

/** Assert that a run failed and that exactly these ids are among the failures. */
function assertFailedWith(outcome, expectedIds, context) {
  assert.strictEqual(outcome.passed, false, `${context} should fail`);
  const failedIds = outcome.results.filter((r) => !r.passed).map((r) => r.id);
  for (const id of expectedIds) {
    assert.ok(
      failedIds.includes(id),
      `${context}: expected failure id "${id}"; actual failures: ${failedIds.join(', ') || 'none'}`,
    );
  }
  return failedIds;
}

function assertNoFailureWith(outcome, id, context) {
  const failedIds = outcome.results.filter((r) => !r.passed).map((r) => r.id);
  assert.ok(!failedIds.includes(id), `${context}: unexpected failure id "${id}"`);
}

// --- Defect 1: workspace membership ---------------------------------------

test('regression: empty packages list is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', 'packages: []\n');

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-globs-exact'], 'empty packages');
  } finally {
    ws.cleanup();
  }
});

test('regression: missing required glob is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-glob-missing'], 'apps/* only');
  } finally {
    ws.cleanup();
  }
});

test('regression: duplicate glob is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'apps/*'\n  - 'packages/*'\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-glob-duplicate'], 'duplicated apps/*');
  } finally {
    ws.cleanup();
  }
});

test('regression: non-string glob item is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 42\n  - 'packages/*'\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-packages-non-string'], 'numeric glob item');
  } finally {
    ws.cleanup();
  }
});

test('regression: null glob item is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - null\n  - 'packages/*'\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-packages-non-string'], 'null glob item');
  } finally {
    ws.cleanup();
  }
});

test('regression: non-array packages container is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  'apps/*': true\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-packages-array'], 'mapping packages container');
  } finally {
    ws.cleanup();
  }
});

test('regression: scalar packages container is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', 'packages: apps/*\n');

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-packages-array'], 'scalar packages container');
  } finally {
    ws.cleanup();
  }
});

test('regression: null root document is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', 'null\n');

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-root-shape'], 'null workspace root');
  } finally {
    ws.cleanup();
  }
});

test('regression: missing packages key is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "otherKey:\n  - value\n");

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['workspace-packages-missing'], 'absent packages key');
  } finally {
    ws.cleanup();
  }
});

test('regression: valid globs still pass', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'packages/*'\n");

    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, true, `valid globs should pass: ${outcome.summary}`);
    const ok = outcome.results.find((r) => r.id === 'workspace-globs-exact');
    assert.ok(ok && ok.passed, 'workspace-globs-exact should pass');
  } finally {
    ws.cleanup();
  }
});

// --- Defect 2: required pnpm env pin document ------------------------------

test('regression: lockfile without env document is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    ws.writeFile('pnpm-lock.yaml', project);

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-env-document'], 'project document only');
  } finally {
    ws.cleanup();
  }
});

test('regression: env document in the wrong position is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { env, project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    ws.writeFile('pnpm-lock.yaml', joinLockfile(project, env));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-env-document'], 'env document second');
  } finally {
    ws.cleanup();
  }
});

test('regression: env document without a pnpm pin is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { env, project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    const strippedEnv = env.replace(/\n    packageManagerDependencies:\n(?:      .*\n)+/, '\n');
    assert.ok(!strippedEnv.includes('packageManagerDependencies'), 'fixture mutation should remove the pin');
    ws.writeFile('pnpm-lock.yaml', joinLockfile(strippedEnv, project));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-package-manager-pin'], 'env document with no pnpm entry');
  } finally {
    ws.cleanup();
  }
});

test('regression: an incomplete pnpm entry (version only) is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { env, project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    const doctored = env.replace('        specifier: 12.10.1\n', '');
    ws.writeFile('pnpm-lock.yaml', joinLockfile(doctored, project));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-package-manager-pin'], 'pnpm entry without a specifier');
  } finally {
    ws.cleanup();
  }
});

test('regression: conflicting lockfileVersion between documents is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { env, project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    const doctoredProject = project.replace("lockfileVersion: '9.0'", "lockfileVersion: '6.0'", 1);
    ws.writeFile('pnpm-lock.yaml', joinLockfile(env, doctoredProject));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-version-consistent'], 'mismatched lockfileVersion');
  } finally {
    ws.cleanup();
  }
});

test('regression: project document without lockfileVersion is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const { env, project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    const doctoredProject = project.replace("lockfileVersion: '9.0'\n", '');
    ws.writeFile('pnpm-lock.yaml', joinLockfile(env, doctoredProject));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-version-project-document'], 'project document without a version');
  } finally {
    ws.cleanup();
  }
});

test('regression: single-document lockfile requires a project document', async (t) => {
  const ws = makeWorkspace();
  try {
    const { project } = splitLockfile(ws.readFile('pnpm-lock.yaml'));
    ws.writeFile('pnpm-lock.yaml', project);

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['lockfile-project-document'], 'single-document lockfile');
  } finally {
    ws.cleanup();
  }
});

test('regression: valid two-document lockfile still passes every lockfile check', async (t) => {
  const ws = makeWorkspace();
  try {
    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, true, `valid lockfile should pass: ${outcome.summary}`);
    assertNoFailureWith(outcome, 'lockfile-env-document', 'valid two-document lockfile');
    assertNoFailureWith(outcome, 'lockfile-project-root-importer', 'valid two-document lockfile');
    assertNoFailureWith(outcome, 'lockfile-version-consistent', 'valid two-document lockfile');
  } finally {
    ws.cleanup();
  }
});

// --- Defect 3: invalid JSON shapes -----------------------------------------

test('regression: package.json with a null root is rejected without throwing', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('package.json', 'null');

    let outcome;
    assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, 'a null root must not throw');
    assertFailedWith(outcome, ['manifest-null'], 'package.json null root');
  } finally {
    ws.cleanup();
  }
});

test('regression: turbo.json with a null root is rejected without throwing', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('turbo.json', 'null');

    let outcome;
    assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, 'a null root must not throw');
    assertFailedWith(outcome, ['manifest-null'], 'turbo.json null root');
  } finally {
    ws.cleanup();
  }
});

test('regression: array root manifests are rejected', async (t) => {
  for (const file of ['package.json', 'turbo.json']) {
    const ws = makeWorkspace();
    try {
      ws.writeFile(file, '[]');

      let outcome;
      assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, `an array root must not throw`);
      assertFailedWith(outcome, ['manifest-array'], `${file} array root`);
    } finally {
      ws.cleanup();
    }
  }
});

test('regression: scalar root manifests are rejected', async (t) => {
  for (const file of ['package.json', 'turbo.json']) {
    const ws = makeWorkspace();
    try {
      ws.writeFile(file, '"just a string"');

      let outcome;
      assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, `a scalar root must not throw`);
      assertFailedWith(outcome, ['manifest-scalar'], `${file} scalar root`);
    } finally {
      ws.cleanup();
    }
  }
});

test('regression: non-object scripts field is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.scripts = 'node scripts/validate-workspace.js';
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    let outcome;
    assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, 'a string scripts field must not throw');
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'scripts as a string');
  } finally {
    ws.cleanup();
  }
});

test('regression: missing scripts field is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    delete pkg.scripts;
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'absent scripts object');
  } finally {
    ws.cleanup();
  }
});

test('regression: invalid devDependencies shape is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.devDependencies = null;
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    let outcome;
    assert.doesNotThrow(() => { outcome = runChecks(ws.dir); }, 'null devDependencies must not throw');
    assertFailedWith(outcome, ['lockfile-dev-dependencies-shape'], 'null devDependencies');
  } finally {
    ws.cleanup();
  }
});

test('regression: invalid tasks shape is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('turbo.json', JSON.stringify({ tasks: 'validate' }, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-tasks-shape'], 'tasks as a string');
  } finally {
    ws.cleanup();
  }
});

test('regression: missing tasks key is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('turbo.json', JSON.stringify({ globalDependencies: [] }, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-tasks-missing'], 'absent tasks key');
  } finally {
    ws.cleanup();
  }
});

test('regression: non-object root task definition is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    ws.writeFile('turbo.json', JSON.stringify({ tasks: { '//#validate': 'node x.js' } }, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-shape'], 'root task defined as a string');
  } finally {
    ws.cleanup();
  }
});

// --- Defect 4: actual validation script relationship ----------------------

test('regression: a no-op echo validate script is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.scripts.validate = 'echo PASS';
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'echo validate script');
  } finally {
    ws.cleanup();
  }
});

test('regression: a validate script that only touches files is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.scripts.validate = 'true';
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'no-op validate script');
  } finally {
    ws.cleanup();
  }
});

test('regression: a validate script that recurses into turbo is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.scripts.validate = 'turbo run validate';
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'recursive turbo validate script');
  } finally {
    ws.cleanup();
  }
});

test('regression: a differently-named script target is rejected', async (t) => {
  const ws = makeWorkspace();
  try {
    const pkg = JSON.parse(ws.readFile('package.json'));
    pkg.scripts.validate = 'node scripts/other-check.js';
    ws.writeFile('package.json', JSON.stringify(pkg, null, 2));

    const outcome = runChecks(ws.dir);
    assertFailedWith(outcome, ['turbo-root-task-targets-real-script'], 'wrong script target');
  } finally {
    ws.cleanup();
  }
});

test('regression: the agreed validate command still passes', async (t) => {
  const ws = makeWorkspace();
  try {
    const outcome = runChecks(ws.dir);
    assert.strictEqual(outcome.passed, true, `baseline validate script should pass: ${outcome.summary}`);
    const check = outcome.results.find((r) => r.id === 'turbo-root-task-targets-real-script');
    assert.ok(check && check.passed, 'turbo-root-task-targets-real-script should pass');
  } finally {
    ws.cleanup();
  }
});

// --- Defect 5: result isolation -------------------------------------------

test('regression: a later failing run does not mutate an earlier result', async (t) => {
  const good = makeWorkspace();
  const bad = makeWorkspace();
  try {
    const first = runChecks(good.dir);
    assert.strictEqual(first.passed, true, 'the first run should pass');
    const firstLength = first.results.length;
    const firstPassingIds = first.results.filter((r) => r.passed).map((r) => r.id);

    const badPkg = JSON.parse(bad.readFile('package.json'));
    badPkg.packageManager = 'pnpm@12.10.0';
    bad.writeFile('package.json', JSON.stringify(badPkg, null, 2));
    const second = runChecks(bad.dir);
    assert.strictEqual(second.passed, false, 'the second run should fail');

    // The first result object must be frozen against the second run's writes.
    assert.strictEqual(first.results.length, firstLength, 'first result length must be unchanged');
    assert.strictEqual(
      first.results.filter((r) => !r.passed).length,
      0,
      'first result must still contain no failures',
    );
    assert.ok(
      first.results.every((r) => firstPassingIds.includes(r.id)),
      'first result entries must be unchanged',
    );
    // Distinct storage, not the same array reused.
    assert.notStrictEqual(first.results, second.results, 'each run must have its own result array');
  } finally {
    good.cleanup();
    bad.cleanup();
  }
});

test('regression: two concurrent runs keep independent results', async (t) => {
  const a = makeWorkspace();
  const b = makeWorkspace();
  try {
    // Arrange a failing fixture first, then run a passing one, to catch any
    // ordering dependence in result storage.
    const badPkg = JSON.parse(a.readFile('package.json'));
    badPkg.scripts.validate = 'echo PASS';
    a.writeFile('package.json', JSON.stringify(badPkg, null, 2));

    const failing = runChecks(a.dir);
    const passing = runChecks(b.dir);

    assert.strictEqual(failing.passed, false, 'fixture a should fail');
    assert.strictEqual(passing.passed, true, 'fixture b should pass');
    assert.strictEqual(
      passing.results.filter((r) => !r.passed).length,
      0,
      'the passing result must not inherit fixture a failures',
    );
    assert.notStrictEqual(failing.results, passing.results);
  } finally {
    a.cleanup();
    b.cleanup();
  }
});
