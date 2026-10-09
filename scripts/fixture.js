'use strict';

/**
 * Fixture helpers for scripts/validate-workspace.test.js.
 *
 * Every test mutates a private temporary copy of the workspace foundation, so
 * no repository file is touched and no test can observe another's state.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function repoFile(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/**
 * Build a temporary copy of the current workspace foundation.
 *
 * `options.skip` lists relative paths to omit, so a single test can exercise
 * "required file missing" without hand-authoring a partial fixture.
 */
function makeWorkspace(options) {
  const opts = options || {};
  const skip = new Set(opts.skip || []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-validation-'));

  const copies = [
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    'pnpm-lock.yaml',
    '.nvmrc',
    '.node-version',
    '.editorconfig',
    '.gitignore',
    'docs/adr/0001-mvp-foundations-and-roles.md',
    // A stub validates the relationship between the root script and the
    // validator's on-disk target. It is not a substitute for running the real
    // validator: that is exercised directly by the CLI entry point.
    'scripts/validate-workspace.js',
    // The installed-dependency check reads node_modules/turbo/package.json and
    // compares it to the declared version. The real 2.11.7 manifest is copied
    // so the fixture mirrors a genuinely installed workspace rather than
    // inventing one; the check itself is still verified for real when the
    // validator runs against the repository root.
    'node_modules/turbo/package.json',
  ];

  for (const rel of copies) {
    if (skip.has(rel)) {
      continue;
    }
    const source = path.join(repoRoot, rel);
    if (!fs.existsSync(source)) {
      continue;
    }
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
  }

  return {
    dir,
    readFile(relPath) {
      const p = path.join(dir, relPath);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    },
    writeFile(relPath, content) {
      const dest = path.join(dir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content, 'utf8');
    },
    remove(relPath) {
      fs.rmSync(path.join(dir, relPath), { force: true });
    },
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

module.exports = { makeWorkspace, repoRoot, repoFile };
