@AGENTS.md

# Claude Code Project Notes

## Source of truth

Before implementing a feature, read `docs/README.md` and the applicable design documents. In particular:

- `docs/01-architecture-and-build-plan.html` — architecture, technology policy, deployment, AI boundaries.
- `docs/02-data-model.html` — domain schema and state machines.
- `docs/03-pages-and-wireframes.html` — routes, page access, workflows, and API envelope.
- `docs/04-design-system.html` — visual rules and component contracts.

The HTML files are human-readable product specifications. Do not treat their sample content or wireframes as production code. If the task prompt conflicts with an approved decision, explain the conflict and wait for direction.

## Framework and dependency discipline

- The target runtime is Node.js 24 LTS. The project is planned for Next.js 16, NestJS 12, Prisma 7, and PostgreSQL 18; exact versions must be pinned in the package manager lockfile/container image when the scaffold is created.
- Prisma 8 is not approved until it is generally available and a deliberate upgrade task is accepted. Follow Prisma 7 documentation, not Prisma 6 or preview-version snippets.
- Follow NestJS 12's ESM conventions. Do not add `require`, `module.exports`, or CommonJS-only configuration to the API.
- Never perform an unrequested major dependency upgrade. For any security patch, update the lockfile, review release notes, and run the full affected test suite.

## Claude Code task protocol

For a non-trivial task, begin with a short plan and state which repository documents you read. Then implement one vertical slice and validate it. Do not start a broad refactor before the requested behavior works.

## GitHub branch and push protocol

Follow the mandatory same-branch workflow in `AGENTS.md`: verify the repository root, `origin`, current branch, and baseline status before editing; stay on that exact branch; never initialize a repository, create/switch branches, or force-push. Stage only files from the current task, never secrets or pre-existing user changes. Before committing, verify the local author identity is correct; if the email is missing or is a placeholder, stop and ask the owner to configure a verified GitHub email/noreply with `git config --local`. Never print the email or change global identity. After all relevant checks pass and the diff is reviewed, make a focused commit and push to that same branch on `origin`. If the repository/remote/branch is wrong, checks fail, or push is rejected, stop and report rather than changing branches or rewriting history. Read-only audits never commit or push.

Do not:

- run database resets, destructive migrations, or production deployment commands without explicit approval;
- expose or repeat `.env`, API keys, model credentials, signed URLs, or personal data;
- send conference manuscripts to a third-party provider as a “quick test”;
- invoke a model/API that may incur charges unless the owner has verified the exact route is $0 or covered by free quota;
- report tests, builds, browser checks, or migrations as passing unless you actually ran them;
- use emoji in user-visible copy, mock data, icons, or commit-facing screenshots;
- add payment-gateway work to the MVP without a new explicit task.

## Required final response for every coding task

Return a concise report with:

1. **Implemented:** user-visible behavior and important technical decisions.
2. **Files changed:** paths, grouped by app/package.
3. **Validation:** exact commands run and pass/fail results.
4. **Security/tenant checks:** authorization, conference scoping, file access, and audit/status events touched.
5. **Known gaps:** anything not implemented, not tested, or blocked.
6. **GitHub:** current branch, commit hash, whether the commit was pushed to that same branch, and any push blocker.

If the workspace is still only documents or the relevant app has not been scaffolded, stop after a safe plan and say what is missing. Do not fabricate a repository, command output, or successful test.
