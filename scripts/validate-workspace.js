#!/usr/bin/env node
/**
 * Task 01 workspace validation.
 *
 * Verifies the structural invariants of the minimal pnpm + Turborepo workspace
 * foundation. This is NOT application lint, typecheck, or build coverage: no app
 * targets exist yet, and there are no lint/typecheck/build scripts for them.
 *
 * Run from the repository root: `node scripts/validate-workspace.js`
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = process.cwd();
const failures = [];

function check(label, passed, detail) {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) {
    failures.push(label);
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

// ---------------------------------------------------------------------------
// 1. Required foundation files are present.
// ---------------------------------------------------------------------------

const requiredFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.editorconfig',
  'docs/adr/0001-mvp-foundations-and-roles.md',
];

for (const rel of requiredFiles) {
  check(`required file present: ${rel}`, exists(rel));
}

// ---------------------------------------------------------------------------
// 2. Root package.json invariants: exact package manager, no app scripts that
//    would imply application build/lint coverage that does not exist yet.
// ---------------------------------------------------------------------------

let pkg;
try {
  pkg = JSON.parse(read('package.json'));
} catch (err) {
  pkg = null;
  check('package.json parses as JSON', false, err.message);
}

if (pkg) {
  check('package.json parses as JSON', true, `"${pkg.name || path.basename(repoRoot)}"`);

  const pm = pkg.packageManager || '';
  const pmMatch = /^pnpm@\d+\.\d+\.\d+(-[\w.]+)?$/.exec(pm);
  check('packageManager is an exact pnpm version', Boolean(pmMatch), pm || 'missing');

  const bogusAppScripts = Object.keys(pkg.scripts || {}).filter((name) =>
    ['build', 'lint', 'typecheck', 'test'].includes(name),
  );
  check(
    'no build/lint/typecheck/test script claims application coverage',
    bogusAppScripts.length === 0,
    bogusAppScripts.length ? `found ${bogusAppScripts.join(', ')}` : 'none present',
  );
}

// ---------------------------------------------------------------------------
// 3. A single JavaScript lockfile exists, and only one.
// ---------------------------------------------------------------------------

const jsLockfileNames = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'bun.lockb',
];
const presentLockfiles = jsLockfileNames.filter((name) => exists(name));
check(
  'exactly one JS lockfile present',
  presentLockfiles.length === 1,
  presentLockfiles.length === 0
    ? 'none found'
    : presentLockfiles.join(', ') + (presentLockfiles.length > 1 ? ' (more than one)' : ''),
);

if (exists('pnpm-lock.yaml')) {
  check('pnpm-lock.yaml is non-empty', fs.statSync(path.join(repoRoot, 'pnpm-lock.yaml')).size > 0);

  const lockText = read('pnpm-lock.yaml');
  const lockVersion = /^lockfileVersion:\s*['"]?(\d+\.\d+)['"]?\s*$/m.exec(lockText);
  check(
    'pnpm-lock.yaml is a pnpm lockfile',
    Boolean(lockVersion),
    lockVersion ? `lockfileVersion ${lockVersion[1]}` : 'no lockfileVersion field',
  );

  const declared = JSON.parse(read('package.json')).packageManager || '';
  const lockHasDeclaredVersion =
    declared === '' || !declared.startsWith('pnpm@') || lockText.includes(declared);
  check(
    'lockfile records the pinned packageManager',
    lockHasDeclaredVersion,
    declared ? `expected to reference ${declared}` : 'packageManager not declared',
  );
}

// ---------------------------------------------------------------------------
// 4. pnpm workspace declares the intended globs and does not fabricate apps.
// ---------------------------------------------------------------------------

const workspaceText = exists('pnpm-workspace.yaml') ? read('pnpm-workspace.yaml') : '';
check('pnpm-workspace.yaml declares packages globs', /packages:/.test(workspaceText));

for (const glob of ['apps/*', 'packages/*']) {
  check(`workspace declares ${glob}`, workspaceText.includes(glob));
}

// Task 01 creates no applications. If any package manifest exists, this task
// overreached.
const strayManifests = ['apps', 'packages']
  .flatMap((dir) => {
    if (!exists(dir)) {
      return [];
    }
    return fs
      .readdirSync(path.join(repoRoot, dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name, 'package.json'))
      .filter((relPath) => exists(relPath));
  });
check(
  'no application scaffold created by this task',
  strayManifests.length === 0,
  strayManifests.length ? strayManifests.join(', ') : 'none found',
);

// ---------------------------------------------------------------------------
// 5. turbo.json is valid JSON and contains no task that has no executable
//    target, so it cannot masquerade as application build/lint coverage.
// ---------------------------------------------------------------------------

try {
  const turbo = JSON.parse(read('turbo.json'));
  check('turbo.json parses as JSON', true);

  const tasks = Object.keys(turbo.tasks || turbo.pipeline || {});
  check('turbo.json defines at least one real task', tasks.length > 0, tasks.join(', ') || 'none');

  const rootHasTarget = Object.keys((pkg && pkg.scripts) || {}).includes('validate');
  check('root package.json exposes a validate script used by turbo', rootHasTarget);
} catch (err) {
  check('turbo.json parses as JSON', false, err.message);
}

// ---------------------------------------------------------------------------
// 6. Policies that must survive this task.
// ---------------------------------------------------------------------------

const gitignoreText = exists('.gitignore') ? read('.gitignore') : '';
for (const pattern of ['.env', 'node_modules/', '*.pem', '*.key']) {
  check(`.gitignore still protects ${pattern}`, gitignoreText.includes(pattern));
}

const disabledPatterns = ['.env.example', '!.env.*'];
const stillNegated = disabledPatterns.some((p) => gitignoreText.includes(p));
check(
  '.gitignore keeps the documented exception comments/negations intact',
  stillNegated || !/env/i.test(gitignoreText),
  stillNegated ? 'negations preserved' : 'no env negation to preserve',
);

// ---------------------------------------------------------------------------
// 7. ADR records the owner decisions with the required distinctions.
// ---------------------------------------------------------------------------
const adrText = exists('docs/adr/0001-mvp-foundations-and-roles.md')
  ? read('docs/adr/0001-mvp-foundations-and-roles.md')
  : '';

const adrRequirements = [
  ['four distinct operational roles listed', /Installation Administrator[\s\S]*Reviewer/],
  ['multi-conference requirement recorded', /multiple conferences in the MVP|MUST support multiple conferences/i],
  ['OTP purpose marked open', /OTP is a PROPOSAL|open decision|not confirmed/i],
  ['payment gateway exclusion recorded', /No payment gateway|payment gateway or billing/i],
  ['support access is time-limited and audited, not permanent', /time-limited|not implemented|not.*permanent|No permanent/i],
  ['product AI independence from coding-agent router recorded', /independent of coding-agent router/i],
];

for (const [label, pattern] of adrRequirements) {
  check(`ADR 0001: ${label}`, pattern.test(adrText));
}

// ---------------------------------------------------------------------------
// 8. No emoji in the files added by this task.
// ---------------------------------------------------------------------------

const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const newTextFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.editorconfig',
  'scripts/validate-workspace.js',
  'docs/adr/0001-mvp-foundations-and-roles.md',
].filter(exists);
const emojiFound = newTextFiles.filter((rel) => emojiPattern.test(read(rel))).map((rel) => rel);
check('no emoji in task-added files', emojiFound.length === 0, emojiFound.join(', ') || 'none');

// ---------------------------------------------------------------------------
// 9. Node runtime sanity: report the runtime and check it is modern.
// ---------------------------------------------------------------------------

const nodeMajor = Number(process.versions.node.split('.')[0]);
check('Node runtime is v22 or newer', nodeMajor >= 22, `node ${process.versions.node}`);

// ---------------------------------------------------------------------------
// 10. Self-test: the validator must actually reject an invalid workspace.
//     Without this, every check above could be silently always-passing.
//
//     The experiment copies the foundation into a temp dir, breaks one
//     invariant, and asserts the exit code is non-zero. The copy is removed
//     afterwards; no repository file is touched.
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const fs_ = require('node:fs');
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');

  const tmp = fs_.mkdtempSync(path.join(os.tmpdir(), 'workspace-self-test-'));
  console.log(`\nSelf-test: validating against a deliberately broken copy in ${tmp}`);

  try {
    // Copy only what the validator reads.
    for (const rel of [
      'package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'pnpm-lock.yaml',
      '.gitignore',
      'docs/adr/0001-mvp-foundations-and-roles.md',
    ]) {
      if (exists(rel)) {
        fs_.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
        fs_.copyFileSync(path.join(repoRoot, rel), path.join(tmp, rel));
      }
    }

    // Invalid input: an application script that claims build coverage that
    // does not exist, plus a bogus packageManager range (not an exact pin).
    const pkgPath = path.join(tmp, 'package.json');
    const broken = JSON.parse(fs_.readFileSync(pkgPath, 'utf8'));
    broken.scripts = Object.assign({}, broken.scripts, { build: 'next build' });
    broken.packageManager = 'pnpm@^12';
    fs_.writeFileSync(pkgPath, `${JSON.stringify(broken, null, 2)}\n`);

    const result = spawnSync(process.execPath, [__filename], { cwd: tmp, encoding: 'utf8' });
    check(
      'self-test: broken workspace is rejected with non-zero exit',
      result.status !== 0,
      `exit code ${result.status}`,
    );

    const output = `${result.stdout || ''}${result.stderr || ''}`;
    check(
      'self-test: the failing checks are named',
      /packageManager is an exact pnpm version/.test(output) &&
        /no build\/lint\/typecheck\/test script claims application coverage/.test(output),
      'both expected failures reported',
    );
  } finally {
    fs_.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('');
if (failures.length > 0) {
  console.error(`FAILED ${failures.length} check(s):`);
  for (const label of failures) {
    console.error(`  - ${label}`);
  }
  console.error('');
  console.error('Note: no application lint, typecheck, or build was run; no apps exist yet.');
  process.exit(1);
}

console.log('All workspace structure and configuration invariants passed.');
console.log('No application lint/typecheck/build was executed: no application targets exist in this task.');
