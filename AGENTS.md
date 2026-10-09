# Agent Instructions — Academic Conference Platform

This file is the repository-wide contract for Claude Code, Cline, and other coding agents. Follow it before making changes. The current workspace is still in the planning stage; do not claim an application, deployment, or test exists unless you have inspected and verified it.

## 1. Read before editing

For every task, inspect the current working tree and read the relevant source documents first:

1. `docs/README.md`
2. `docs/00-alignment-summary.html`
3. `docs/01-architecture-and-build-plan.html`
4. The relevant domain/page/design document (`02`, `03`, or `04`)
5. The task prompt and the current implementation

Treat recorded product decisions as binding. If two documents conflict, stop, identify the exact conflict, and ask for clarification; do not silently invent a new architecture.

## 2. Product and language

This is a bilingual (`fa` / `en`) academic conference-management product with independently deployed university installations, one shared codebase, and configurable conference data. Its first differentiators are the certificate-template designer and the human-confirmed AI paper assistant.

- Every user-visible string must come from the translation layer. Never hard-code Persian or English UI copy in a component, API response, validation rule, or notification.
- RTL and LTR are first-class. Test both directions for every changed screen and component.
- Emojis are prohibited in UI, headings, labels, empty states, notifications, and sample data. Use the approved icon package (Lucide) instead.
- Keep university branding configurable through approved design tokens. Never accept arbitrary CSS, HTML, or script from a tenant.

## 3. Architecture boundaries

- `apps/web` and `apps/marketing` are presentation applications. They must not import Prisma or connect to PostgreSQL directly.
- `apps/api` owns authorization, business rules, persistence, audit events, status transitions, and public API contracts.
- `apps/ai` is an internal service, not a public endpoint. The API controls access and sends only the minimum necessary content.
- `apps/renderer` is an internal PDF/rendering worker. It must not expose storage files publicly.
- Cross-app request/response contracts live in the shared contracts package and are versioned with the API.
- Use the approved monorepo package manager and committed lockfile. Do not mix npm, Yarn, and pnpm in the product workspace.
- NestJS 12 is ESM-only. Follow the repository's ESM setup; do not copy CommonJS snippets from older Nest tutorials.

## 4. Non-negotiable data and security invariants

1. Every conference-domain row is scoped by `conference_id`. Every read/write query is tenant-scoped using the authenticated, authorized conference context. Never trust a client-supplied conference ID by itself.
2. Do not add an unscoped repository method for convenience. Global/system tables must be explicitly documented as exceptions and protected by system-level authorization.
3. Every paper state transition writes `status_history`; every sensitive action writes `audit_logs` in the same transaction where feasible.
4. Paper files are private by default. No direct/public storage URL. Use a short-lived, authorized signed URL and audit sensitive downloads.
5. Never call `prisma migrate reset`, delete a database, or run destructive data commands against a shared or production environment. Ask before any destructive local reset too.
6. Never print, commit, paste into a prompt, or return secrets. Do not read `.env` values into final reports.
7. Do not send paper manuscripts, author data, or sensitive university data to an external AI provider unless the task explicitly authorizes the provider and data flow. Product AI must retain a local/degraded path.
8. AI-extracted paper fields are untrusted suggestions. Show an extraction label, evidence where available, and a correction/confirmation path; do not silently finalize AI output.
9. Validate all file type/size and scan status on the server. Do not trust MIME type or filename supplied by a browser.
10. Apply authorization at the API/service boundary, not only by hiding UI controls.

## 5. Product rules that must survive implementation

- Payment gateway integration is not in the MVP. Do not build checkout, provider credentials, payment callbacks, or subscription billing until a later approved task.
- Review mode is configured per conference (`open`, `single_blind`, or `double_blind`) and captured for each assignment so later configuration changes do not rewrite an in-flight review.
- Each conference configures its maximum number of papers per submitting account. A null limit means unlimited. Enforce the limit atomically for `(conference_id, submitter_id)`; co-authors listed on a paper do not consume the submitter's quota by themselves.
- Certificates support numeric and words-based dates. The editor chooses the format per placement/template.
- Visual mapping: company marketing site = restrained Neumorphism; public conference site = controlled Glassmorphism; university-facing panels = restrained Claymorphism. Dense text, forms, and tables remain high-contrast and readable.
- The proposed palette and morphology rules are in `docs/04-design-system.html`; the interactive comparison is `docs/04-design-system-preview.html`.

## 6. Agent workflow

Before editing:

1. Check `git status` and inspect relevant files.
2. State a small implementation plan and identify files, risks, and tests.
3. Keep changes limited to the requested vertical slice. Do not opportunistically rewrite unrelated modules.

While editing:

- Prefer small, typed, testable changes and established framework patterns.
- Add or update tests for changed business rules, authorization, and failure paths.
- Use transactions for multi-row decisions such as paper-limit enforcement and status transitions.
- Update the relevant docs and translation keys in the same task.
- The owner requires zero-cost model use. Before any external model call, confirm that the exact provider/model/account route is $0 or covered by explicitly verified free quota; a successful connection, green status, or a model name containing “free” is not proof. If cost is uncertain, do not call the model; use local/rule-based tests or stop and report.
- Do not upgrade major dependencies or add a new service without an ADR/task approval.

Before finishing:

- Run the relevant lint, typecheck, unit, integration, and/or end-to-end checks that exist.
- Report exactly which checks ran and their result. Do not say “tested” if only code review was performed.
- Report changed files, assumptions, remaining risks, and any command that could not run.
- If the app scaffold or test command does not exist yet, say so clearly; do not invent successful output.

## 7. GitHub branch, commit, and push policy

The product owner explicitly wants implementation changes pushed to the existing GitHub branch so the project can later be deployed manually to another server.

Before editing any code:

1. Verify the actual worktree with `git rev-parse --show-toplevel`.
2. Verify `origin` points to the intended private repository; never print credentials embedded in a URL.
3. Record `git branch --show-current` and `git status --short --branch` as the baseline.
4. If this is not a Git worktree, `origin` is missing/wrong, HEAD is detached, or the branch is unexpected, stop and report. Do not run `git init`, clone, switch/create a branch, or guess the destination.
5. Record pre-existing dirty files and never stage them as part of the task.

For every coding task:

- Stay on the currently checked-out branch. Do not create, switch, rename, rebase, reset, or delete branches.
- Stage only explicit task files; never use `git add .` or `git add -A`.
- Never stage `.env`, API keys, tokens, Claude settings containing secrets, personal/university data, or unreviewed generated output.
- Run the relevant validation, inspect the full diff, run `git diff --check`, and check the staged diff for secrets before committing.
- Before committing, verify the repository-local Git author identity is intentional and not a sample placeholder. If `user.name`/`user.email` is missing or the email is not confirmed by the owner as their verified GitHub address or GitHub noreply, stop before commit/push and ask the owner to set it with `git config --local`. Never print the email, set it with `--global`, or guess it.
- If required validation fails, do not commit or push; report the exact failure.
- If validation passes, create a focused commit and push to the same current branch on `origin`. Never force-push. If the branch is protected, diverged, or the push is rejected, stop and report; do not create a workaround branch or rewrite history.
- Read-only audit prompts must not edit, commit, or push anything.
- In the final report, include the branch, commit hash, push result, tests, and any blockers.

## 8. Quality gates

A change is not complete unless it has:

- correct fa/en translation keys and RTL/LTR behavior;
- server-side validation and authorization;
- `conference_id` scoping and relevant audit/status history;
- tests for the principal success and failure cases;
- no emoji or hard-coded user-visible copy;
- updated API/docs when a contract or workflow changed;
- accessible keyboard/focus behavior and usable mobile layout for UI changes;
- a reviewed, secret-free commit pushed to the same branch, unless the task is explicitly read-only or a validation/push blocker is reported.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
