# Dashboard agent instructions

This Angular dashboard is a separate Git repository, sharing the NestJS backend with the Ionic
frontend. The backend owns authentication, Hub roles, country scope and sovereignty checks;
Angular guards and hidden controls cannot grant or enforce access. Preserve unrelated changes.
For cross-repository work, consult the canonical product and architecture documents in
`../onehealth_backend/docs/project/` and the backend constitution before changing backend code.

## Permanent security rules

- Security is required in every change, proportionally. Low-risk text, style and harmless
  refactors need secure coding and relevant tests, not a whole-repository scan.
- Authentication, authorization, roles, API calls, user input, uploads, filesystem access,
  external URLs, tokens, cookies, passwords, secrets, admin features, webhooks, payments,
  containers, infrastructure, CI/CD and cloud configuration are security-sensitive. Inspect
  trust boundaries and realistic abuse cases, then review the Git diff.
- Authentication is not authorization. Never rely on UI visibility to protect Hub resources;
  confirm the corresponding backend endpoint enforces ownership, role and country scope, denying
  IDOR/BOLA, cross-user access and privilege escalation.
- Treat API content, map popups, Markdown, Rudolf output, exported data and all user input as
  untrusted. Use Angular escaping and bounded validation; assess XSS, injection, SSRF, path
  traversal, unsafe uploads, mass assignment and unsafe deserialization when relevant. Do not
  bypass existing framework protections. Keep CSV formula neutralization and CSP intact.
- No passwords, API keys, access tokens, private keys, cloud credentials or production `.env` in
  Git, logs, reports or terminal output. Provider keys stay on the backend, never in Angular
  environment files. Minimize personal and health-sensitive data in UI and error telemetry.
- Avoid unnecessary dependencies and homemade cryptography/authentication. Install
  `@openai/codex-security` globally as a development tool, never as an app runtime dependency.

## Review and verification

1. For security-sensitive changes, verify auth versus authorization, input validation, least
   privilege, data exposure and abuse paths. Explain and avoid an obviously unsafe approach.
2. Run focused tests and review the diff. Use the official `codex-security` CLI for a targeted
   review where useful. A full scan is reserved for explicit requests, major releases, major
   auth/infrastructure changes or evidence of broader risk; never repeat scans of unchanged code
   without reason.
3. Before reporting a vulnerability, establish attacker-controlled input, reachable code,
   the trust boundary, existing protections and impact. Distinguish **Confirmed vulnerability**,
   **Needs verification** and **Hardening recommendation**.
4. Fix the root cause with a small safe change and tests; check for new bypasses. Finish with a
   concise check of authorization, validation, secret hygiene, data minimization and privileges.
   Avoid broad unrelated audits and long reports unless requested.

Simulated Hub records must remain visibly simulated. Do not run load tests against production or
claim frontend checks replace backend enforcement. Refer to `SECURITY.md` when present.
