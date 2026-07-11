# Engineering Audit — auth-service (backend + frontend)

Produced after a business-logic review, targeted bug fixes, full Swagger/OpenAPI
documentation, and production READMEs across both `auth-service-be` and
`auth-service-fe`. This file is duplicated in both repos since both READMEs link to
it; the findings below cover both.

**Scope note on refactors**: per the guardrail for this pass, code was only changed
where functionality was provably unchanged (dead-code removal, dedup of identical
logic) or an obvious bug was fixed (wrong variable used, missing validation, missing
filter). Ambiguous product/architecture decisions were documented with comments and
listed below for a human to resolve — not silently resolved.

## Scores (out of 10, reflecting state after this pass)

| Category | Score | Why |
|---|---|---|
| Overall Architecture | 7 | Conventional, consistent layering on both sides (BE: routes→validators→controllers→services→models; FE: App Router + shared hooks/dialogs). Marked down for the FE's documented deviations from its own `AGENTS.md` rules and a genuinely ambiguous BE authorization design (Policy scoping). |
| Backend Business Logic | 7 | Core RBAC traversal is correct. This pass found and fixed 8 real bugs (see Refactors Completed) — a meaningful defect density for the codebase's size, though the pattern (copy-paste across near-identical M2M controllers) explains most of them at once. Marked down further for 3 still-open ambiguities. |
| Frontend Architecture | 8 | No correctness bugs found. Clean shared-abstraction patterns (`useEntityFormMutation`, dialog+Zustand-store pattern). Marked down only for the documented `/api/*`/`/backend/*` rule deviations. |
| Readability | 7 | Consistent naming and per-resource file structure. Docstrings/comments were sparse before this pass; now present at genuinely non-obvious points. Some remaining duplication (the three M2M controllers) hurts scanability. |
| Maintainability | 7 | BE's Jest/Supertest suite (115 tests, 7 files) was fully broken (0/7 suites even compiled) as of this pass's start; now fully green — see Test Suite Repair below. FE still has no tests. The BE suite's repair surfaced several real bugs (see Critical Issues) that manual review had missed, which is exactly the value automated tests add — future regressions in this area should now be caught. |
| Scalability | 6 | Permission resolution walks User→Role→Policy[→Permission] per request; `checkApiKeyMiddleware` does an uncached DB lookup on every request. Fine at current scale; would need caching before high request volume. |
| Security | 6 | This pass fixed one real permission-smuggling bug and one completely non-functional authorization check (present across 7 endpoints) — see Critical Issues. Post-fix state is meaningfully better, but no CORS/rate-limiting, schema managed via `sync({ alter: true })` rather than migrations, and zero regression tests to catch the next instance of this bug class. |
| Performance | 7 | No N+1 patterns found beyond one intentional two-query pagination tradeoff (count, then page) in `paginate.ts`. No caching anywhere (channel lookups, permission resolution) — acceptable at current scale. |
| Documentation | 9 | Was near-zero before this pass (BE README was a one-line stub, FE README was the unmodified template, zero API docs). Now: full Swagger/OpenAPI (46 operations), both READMEs cover all requested sections, this audit. |

## Critical Issues

All of the following were found during this pass. Items marked **[Fixed]** were
corrected as part of this pass (see Refactors Completed for detail); items marked
**[Open]** need a human product/architecture decision and were deliberately left
unresolved.

1. **[Fixed] Permission-smuggling in `addPolicyPermissions`** — checked
   `req.body.policy_ref_names` (always `undefined` on this endpoint) instead of
   `permission_ref_names` when guarding against channel-scoped keys assigning
   system/global permissions to a policy. The guard never fired.
2. **[Fixed] Non-functional "caller must already hold what they're assigning"
   check** — across 7 endpoints (`policyPermissionController.addPolicyPermissions`/
   `destroyPolicyPermissions`, `rolePolicyController.addRolePolicies`/
   `destroyRolePolicies`, and all three of `userRoleController`'s mutating
   endpoints), this check compared the requested ref_names against a variable that
   was already asserted empty by an earlier guard — the check could never fail. A
   non-superadmin caller with only the route-level `auth:assign:*` grant could
   attach/remove any existing, non-system permission/policy/role regardless of
   whether they personally held it.
3. **[Fixed] Permission updates were completely broken** —
   `permission/updateValidator.ts`'s `isUniqueField` call omitted the `paramName`
   argument, defaulting to look up `req.params.id` on a route whose param is
   `permission_id`. Every `PUT /api/permissions/:id` request (ref_name is a required
   field on update) failed as "already exists," including when `ref_name` was
   unchanged.
4. **[Fixed] Data-scoping leak in `roleController.getAll`** — the unpaginated branch
   (`page`/`size` omitted) queried with no channel filter at all, unlike the
   paginated branch and unlike the equivalent branch in `channelController`. A
   channel-scoped API key could see roles from every channel by omitting pagination
   params.
5. **[Open] `role/addValidator.ts` vs `role/updateValidator.ts` disagree on
   `ref_name` uniqueness** — add enforces global uniqueness; update enforces
   uniqueness scoped to `{scope}` only. Neither obviously matches intended tenant
   isolation (`{scope, channel_id}` is arguably correct but implemented nowhere).
   Needs a product decision on the intended uniqueness key before either side is
   "fixed."
6. **[Open] `destroyPolicyPermissions`/`destroyRolePolicies` have no system/global
   resource protection**, unlike their `add`/`replace` counterparts — a
   channel-scoped key with the relevant `remove` permission can strip a system/global
   permission or policy from a role/policy in its channel. Not confirmed intentional.
7. **[User-confirmed, documented not fixed] `roleController.add`/`update`/`destroy`
   have no privilege-tier protection at all** — `Role` has no `level` column, and
   these three controllers only check channel ownership, never a privilege
   comparison. Unlike `userController` (which requires strictly-higher privilege to
   manage another user), any caller holding the relevant `auth:*:role` permission in
   a channel can create/modify/delete any role in that channel regardless of their
   own or the target's privilege. Discovered while repairing the test suite (see Test
   Suite Repair) — several tests asserted a 403 "lower level than yours" restriction
   that doesn't exist. Presented to the user as a choice (fix the tests to match
   reality vs. add the missing check to production code vs. skip); the user chose to
   document actual behavior in the tests and here, not to change `roleController`.

## Medium Priority Improvements

- **FE still has no automated tests.** BE's suite is now repaired (115 tests, 7
  files, all passing — see Test Suite Repair below); FE has none. The bug class in
  Critical Issue #2 (copy-pasted, subtly-wrong authorization logic across
  near-identical controllers) is exactly what integration tests around the M2M
  assignment endpoints caught once the BE suite was made to actually run — the same
  argument applies to giving the FE some test coverage, particularly around
  `lib/rbac.ts` and the `app/api/**/route.ts` handlers.
- **The M2M controller duplication itself was deliberately not refactored.**
  `policyPermissionController`, `rolePolicyController`, and `userRoleController` are
  ~80% structurally identical (this is *why* bug #1/#2 above existed and were easy to
  miss) but differ in real ways (ownership checks, privilege-vs-scope authorization
  model, superadmin special-casing). A generic extraction is a reasonable follow-up,
  but should come with the integration tests above *first*, so the extraction can be
  verified against real behavior rather than against a fresh read-through.
- **`addUserRoles` has no "superadmin's roles cannot be modified" guard**, unlike
  `replaceUserRoles`/`destroyUserRole` in the same file. Not confirmed intentional.
- **`permissionController.find`/`update` require the caller to also hold the target
  permission's own ref_name** (when channel-scoped), on top of the route-level
  permission gate — `add`/`destroy` have no equivalent extra check. Not confirmed
  intentional; decide whether all four verbs should be consistent.
- **FE's `services/*.service.ts` call the backend directly**, bypassing the
  `/backend/*` Next.js rewrite `AGENTS.md` calls for, and the six entity detail pages
  call those services directly as server components, bypassing `/api/*` entirely.
  Both are real, current deviations from the FE's own stated architecture rules
  (confirmed by direct code inspection, not assumed from prior docs). Fixing this is
  a ~9-call-site architecture change, not a bug fix, so it wasn't done as part of this
  pass — but `app/api/users/[userId]/route.ts`'s `GET` handler actually *does* follow
  the rewrite pattern while its own `PUT`/`DELETE` don't, showing the deviation isn't
  even internally consistent.
- **Schema is managed via `sequelize.sync({ alter: true })`**, not migrations —
  `src/database/migrations/` is empty despite `sequelize-cli`/`.sequelizerc`/npm
  scripts being fully configured. Fine for development; commonly considered unsafe for
  production (no rollback path, can silently alter/drop columns).

## Nice-to-Have Improvements

- No Dockerfile in either repo — plain Node/npm deployment only.
- `express` is listed under `devDependencies` in `auth-service-be/package.json`
  instead of `dependencies` — works today because `npm install` installs both, but is
  a misleading package-manifest error for a runtime-required framework.
- Unused env vars: `API_KEY` (BE, present in `.env.example`, unread anywhere in
  `src/`) and `NEXT_PUBLIC_AUTH_SERVICE_BASE_URL` (FE, confirmed via full-repo grep to
  have zero references). Either wire them up or remove them.
- Stray root file `auth-service-be/TS + Express Set Up Guide` contains only two
  unrelated external tutorial links — candidate for deletion.
- `authController.refreshToken`/`destroyToken` use two different error messages for
  the same "REFRESH_SECRET not configured" condition.
- `checkApiKeyMiddleware` does an uncached DB lookup on every single request to
  resolve the channel from `x-api-key` — fine now, worth caching if request volume
  grows.
- `paginate.ts` runs a separate `count()` query before the main `findAndCountAll()` to
  pre-clamp the requested page — a defensible tradeoff (guarantees a valid page on the
  first request) but is an extra round trip; flagging for awareness, not changing.
- `role/updateValidator.ts` was flagged (by the agent that wrote the Swagger docs) as
  accepting a `level` field with no corresponding column on the `Role` model — noted
  here for someone to verify against the current `Role` model, not independently
  confirmed by hand in this pass.
- **Live screenshots for the FE README could not be captured** — the available
  browser-automation tooling's screenshot/zoom capture consistently timed out in this
  environment (the app itself worked fine: pages loaded, DOM/accessibility tree was
  readable, network requests succeeded — only pixel capture failed). Completing the
  login flow to reach authenticated pages would also have required passing the real
  superadmin password as a visible tool-call parameter, which wasn't done. The FE
  README has placeholders and exact manual-capture steps instead.

## Test Suite Repair (BE)

A separate pass, after the above, repaired `auth-service-be`'s Jest/Supertest suite
(`tests/`), which was entirely broken: 0 of 7 suites even compiled, and the ~3 tests
that could run were failing. All fixes were scoped to `tests/` and `jest.config.ts` —
no `src/` production code was changed in this pass except where noted above.

Root causes found and fixed:
- `setRoles(role)` calls (Sequelize's mixin needs an array) were left unfixed in 5 of
  7 suites by a prior partial fix; completed across all files.
- Several suites' setup assumed a Role named `"superadmin"` exists to grant elevated
  test users their privileges — `"superadmin"` is a `User.level` value in this
  codebase, not an assignable Role, so this always threw and cascaded into every
  other test in the suite failing (including `afterAll` cleanup crashing on `null`
  users). Fixed by adding a `level` parameter to the `createAuthUser` test helper.
- `generateToken()` (test helper) read `res.body.access_token`, a field that hasn't
  existed since the login/refresh response shape changed to `{ user, permissions,
  tokens }` — every test using this helper silently authenticated as `undefined`.
- `createAuthHeaders()` (test helper) never set the `x-api-key` header at all — every
  request using it 403'd with "Invalid API key" regardless of actual permissions.
  This was the single highest-impact bug (100+ call sites).
- Numerous stale assertions throughout: expected `{status, data}`-wrapped response
  shapes that don't match the actual flat-object/array responses controllers return
  (only `policyController.getAll`'s paginated branch ever used that wrapper);
  hardcoded error messages that didn't match current controller text; a payload
  field/data-model mismatch (`permission_ids`/numeric IDs vs. the current
  `policy_ref_names`/ref_name-string contract) throughout
  `role-permission-routes.test.ts`, which also targeted a URL
  (`/api/role-permission/role`) that doesn't exist — the real route is
  `/api/role-policy/role/:role_id`; that file was rewritten to match Policy-based
  reality.
- Jest's default parallel workers were causing real cross-suite database contention
  (all suites share one dev Postgres DB, no per-worker test DB) — `beforeAll` hooks
  intermittently timed out under load even though each suite passed cleanly alone.
  Fixed by setting `maxWorkers: 1` in `jest.config.ts`.
- Also surfaced Critical Issue #7 above (`roleController` has no privilege-tier
  check) — user-confirmed disposition: document, don't fix.

Final state: `npm test` → 7 suites, 115 tests, all passing.

## Refactors Completed

**Backend:**
- Removed the dead `channel_id` field from the access-token JWT payload
  (`authService.rotateTokens`, `authController.refreshToken`, `IDecodedToken` type) —
  it was signed but never read anywhere; channel context flows entirely through
  `x-api-key`, independent of the JWT.
- `/health` now performs a real `sequelize.authenticate()` check (503 on failure);
  `/ping` remains a cheap liveness-only probe.
- Added `level` field validation to `user/addValidator.ts` and
  `user/updateValidator.ts` — was previously fully unvalidated, so a malformed value
  crashed the privilege-comparison check with an uncaught plain `Error` (500) instead
  of a clean 400.
- Extracted the duplicated Role-scope `where`-clause-building logic from
  `permissionService.getUserPermissions` and `policyService.getUserPolicies` into a
  shared `src/utils/resolveRoleScopeWhere.ts`.
- Fixed the `addPolicyPermissions` permission-smuggling bug (Critical #1).
- Fixed the non-functional privilege check across all 7 affected endpoints
  (Critical #2).
- Fixed `permissionController.getAll`'s `scope` query filter, which referenced a
  column that doesn't exist on the `Permission` model (would 500 if used).
- Fixed `permission/updateValidator.ts`'s missing `paramName` argument (Critical #3),
  and added the missing `param('permission_id')` validation for consistency with the
  other resources' update validators.
- Fixed `roleController.getAll`'s missing channel filter on its unpaginated branch
  (Critical #4).
- Fixed `GET /api/auth/has-any-permission` never forwarding `channelId`, which made
  `role_scope: "channel"` requests always fail with a 400 regardless of whether the
  caller had a resolvable channel.
- Added inline comments documenting (not changing) the intentional self-service user
  access exception, the Policy-is-unscoped design, and the two still-open ambiguities
  listed as Critical #5/#6 above.
- Full Swagger/OpenAPI documentation: `swagger-jsdoc` + `swagger-ui-express`, mounted
  at `/api-docs` and `/api-docs.json`, covering all 46 operations across 22 paths with
  auth/authz requirements, parameters, request/response schemas, and examples.
- `.env.example` updated to include `ACCESS_SECRET`/`REFRESH_SECRET` (previously
  present in the real `.env` but missing from the example file).
- Full README rewrite covering all 14 requested sections.

**Frontend:**
- Added inline comments at representative sites (`lib/api.ts`,
  `services/user.service.ts`) documenting the confirmed `AGENTS.md` architecture-rule
  deviations, without silently "fixing" a ~9-call-site architecture change.
- Created `.env.example` (didn't exist) with all 5 known env vars and a note on the
  unused one.
- Full README rewrite covering all 13 requested sections.
- No source-level refactors beyond comments — the FE's actual business logic
  (`lib/rbac.ts`, `hooks/use-entity-form-mutation.ts`) was already correct.

## Remaining Recommendations

1. Resolve the two **[Open]** Critical Issues above (role `ref_name` uniqueness key;
   destroy-endpoint system/global protection) — both need a product decision, not more
   code archaeology.
2. The BE test suite (now repaired, 115 tests) already covers the M2M assignment
   endpoints reasonably well — review its coverage before attempting the
   controller-deduplication refactor described in Medium Priority, and add cases if
   gaps remain. Consider adding equivalent test coverage on the FE (`lib/rbac.ts`,
   `app/api/**/route.ts`) — it currently has none.
3. Decide on a migration strategy (introduce real `sequelize-cli` migrations) before
   this service reaches a production deployment where `sync({ alter: true })`'s lack
   of a rollback path becomes a real operational risk.
4. Decide whether to fix the FE's `/api/*`/`/backend/*` routing deviations to match
   `AGENTS.md`, or update `AGENTS.md` to reflect the pattern that's actually in place
   — right now the documented rule and the actual code disagree, which will keep
   confusing future contributors (and future agents) either way.
5. Capture the FE README's screenshots manually (steps are in the README) once
   convenient, or when the screenshot-capture tooling issue in this environment is
   resolved.
