# ADR 0001: MVP Foundations and Role Definitions

## Status
Accepted

## Context
This document records the owner's current decisions for the MVP of the ghost_of_ausmt academic conference platform, superseding previous assumptions about single-conference deployment and AgentRouter dependencies.

## Decisions

### 1. Deployment Model
- **Confirmed**: One shared configurable codebase with independent deployment per university
- **Requirement**: Each installation MUST support multiple conferences in the MVP (not single-conference-only)
- **Mechanism**: University branding and conference data are configuration/data, not customer-specific source forks

### 2. Operational Roles (Four required in MVP)
- **Company/Installation Administrator**: Provisioning, editor accounts, configuration, technical support
- **University Editor**: Conference configuration/content/topics, reviewer accounts, registration/review forms, desk screening, assignments, final editorial decisions, certificate issuance
- **Reviewer**: Authorized assignments, accept/decline invitations, review forms, recommendations/comments (NOT final editorial acceptance/rejection)
- **Participant/Author**: Registration, own submissions/revisions, human confirmation of extracted fields, status tracking, own eligible certificates

### 3. Support Access Design
- **Requirement**: Company administrator must provide ticket-based and online support including diagnosis access
- **Constraints**: 
  - No permanent unrestricted access or hidden impersonation
  - No password disclosure or automatic scientific overrides
  - **Proposed (not implemented)**: Editor approval, ticket-linked time-limited conference-scoped support grant, read-only default, explicit elevation, visible support-session banner, revocation, audit trail recording both real admin and effective editor identity

### 4. Authentication
- **Confirmed**: MVP login uses email and password
- **Open Decision**: SMS-provider integration not required; OTP option requested but purpose/channel unconfirmed
  - Email OTP is a PROPOSAL (not confirmed channel)
  - Need clarification: passwordless email login vs second-factor OTP vs other OTP purpose
  - Future verified contact identifiers should be supported without binding user IDs to email/telephone
  - Adding contact information must not enable login without ownership verification and uniqueness checks

### 5. Certificate Eligibility
- **Configurable per conference**: Acceptance-only vs required attendance/presentation confirmation must be explicit
- **Separate concerns**: Certificate type and permitted recipients are independent
- **Constraint**: Do not automatically issue every certificate type to all coauthors
- **Date Support**: Numeric and words-based dates both required

### 6. Payment Gateway
- **Excluded**: No payment gateway or billing/checkout flow in the MVP

### 7. Internationalization and Design
- **Complete**: fa/en and RTL/LTR support required
- **UI Constraint**: No emojis in user-visible copy; use Lucide icons only
- **Visual Mapping**:
  - Marketing site: restrained Neumorphism
  - Public conference site: controlled Glassmorphism  
  - University panels: restrained Claymorphism with readable forms/tables

### 8. Product AI
- **Independent**: Product AI is independent of coding-agent router
- **Capabilities**: Extract title, abstract, keywords, references, authors from DOCX; suggest topics from active conference's configured topics
- **Requirement**: Require human review/confirmation of AI suggestions
- **Fallback**: Keep local/rules-based path and manual completion when AI unavailable
- **Constraint**: Do not promise perfect availability or extraction accuracy; external manuscript processing requires explicit authorization

### 9. AI Router Usage
- **Confirmed**: Use already configured 9Router -> shit_combo -> Fallback route
- **Constraints**: 
  - Do NOT edit router/model/auth settings
  - Do NOT call AgentRouter, add routes, use Fusion, force fallback test, or invoke extra model APIs
  - Stop if route may incur charges or quota expiration could incur charges
  - Report underlying model only if execution metadata actually establishes it
  - Owner confirms key rotation and zero-cost access for all 16 configured member routes

## Implementation Plan for Task 01

### A. Documentation
- Create this ADR (0001) to record owner decisions and supersede obsolete assumptions

### B. Workspace Foundation
- Establish minimal Turborepo/pnpm workspace with:
  - Root package.json with exact packageManager version
  - pnpm-workspace.yaml
  - turbo.json
  - Generated pnpm-lock.yaml
  - Basic .editorconfig and compatible TypeScript/format/lint configuration
  - Narrowly updated .gitignore (preserving credential protections)
  - Root README with accurate instructions
  - Small real workspace validation test

### C. Non-Goals (explicitly excluded from this task)
- No Next/Nest apps, domain schema, migrations, users, auth, OTP, support sessions
- No review workflows, certificate rendering, product AI services
- No SMS, payments, production Compose/deployment scripts
- No production database access
- No secrets or real university data
- No mock panels presented as functional features

## Consequences
- Makes explicit the multi-conference per installation requirement
- Documents the four-role authorization model
- Preserves historical decisions while marking superseded assumptions
- Establishes foundation for subsequent implementation tasks