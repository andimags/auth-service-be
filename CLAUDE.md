# CLAUDE.md — auth-service-be

Guidance for Claude Code (and any contributor) working in this repository. This
reflects the architecture **as it actually exists today** — follow existing patterns
exactly rather than introducing new ones for problems already solved.

See also [`README.md`](./README.md) (architecture/setup) and
[`ENGINEERING_AUDIT.md`](./ENGINEERING_AUDIT.md) (known gaps/gotchas — read before
"fixing" something that looks wrong, it may already be a documented, intentional
tradeoff).

## Tech Stack

- Node.js + TypeScript (strict mode), Express 5
- Sequelize-TypeScript (decorator-based models) + PostgreSQL
- `jsonwebtoken` + `bcrypt` for auth, `express-validator` for validation
- `swagger-jsdoc` / `swagger-ui-express` for API docs (`/api-docs`)
- Jest + Supertest for integration tests
- ESLint 9 (flat config) + Prettier + `knip` (unused exports/deps)

## Folder Structure

```
src/
  app.ts                    Express app: middleware wiring, route mounting, Swagger mount
  server.ts                 Entry point: sequelize.sync({ alter: true }) + app.listen()
  controllers/               One file per resource. Default-exports an object of handlers.
  services/                  Reusable business logic (RBAC traversal, etc.), named exports.
  middlewares/                authMiddleware, checkApiKeyMiddleware, hasAnyPermission,
                              validationMiddleware, errorHandler (+ AppError class)
  routes/                     One Express Router per resource, @openapi JSDoc per endpoint.
  validators/                 One folder per resource: addValidator/findValidator/
                              updateValidator/deleteValidator(/replaceValidator), plus
                              validators/custom/ for reusable cross-resource validators.
  database/
    models/                   Sequelize-TypeScript model classes (PascalCase, one per file).
    migrations/                Currently empty — see "Schema Management" below.
    seeders/                   Timestamp-prefixed sequelize-cli seed scripts (plain JS).
    sequelize.ts                Sequelize instance; every model must be registered here.
  docs/openapi-base.ts          Shared OpenAPI info/servers/components/tags.
  constants/                    enums/index.ts, httpStatus.ts, auth.ts (TTLs, bcrypt rounds),
                                globalPermissions.json / globalPolicies.json (seed source data).
  types/                        index.ts (shared interfaces), express-augment.d.ts (Request aug.)
  utils/                        One function per file (paginate, hashPassword, getScopeType, ...)
tests/                          Jest + Supertest, one <resource>-routes.test.ts per resource,
                                 plus utils.ts (factories/helpers) and types.ts (test-only types).
```

New resource? Add a file in each of `routes/`, `controllers/`, `validators/<resource>/`,
and `database/models/`, following an existing resource (`channel` is a clean, simple
reference) as the template.

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Controller/service/middleware files | camelCase, role-suffixed | `channelController.ts`, `channelService.ts`, `hasAnyPermission.ts` |
| Model files/classes | PascalCase, singular | `Channel.ts`, `RefreshToken.ts`, `UserRole.ts` |
| Validator folders | kebab-case for multi-word resources | `role-policy/`, `user-role/`, `policy-permission/` |
| Validator files | camelCase verb + `Validator` | `addValidator.ts`, `updateValidator.ts`, `replaceValidator.ts` |
| Test files | kebab-case, `<resource>-routes.test.ts` | `tests/channel-routes.test.ts` |
| Classes | PascalCase | `AppError`, `Channel` |
| Interfaces/type aliases | PascalCase | `TokenPair`, `RoleScopeFilter`, `IDecodedToken` |
| Enums | PascalCase name, snake/lowercase values matching the DB string | `UserLevelType.root_superadmin` |
| Functions/variables | camelCase | `hasAccessToChannel`, `isMorePrivileged` |
| Config constants | SCREAMING_SNAKE_CASE | `ACCESS_TOKEN_TTL_MS`, `BCRYPT_SALT_ROUNDS` |
| DB tables/columns | snake_case | `channels`, `ref_name`, `created_at`, `channel_id` |
| API routes | kebab-case, plural resource nouns | `/api/user-role`, `/api/role-policy`, `/api/auth/refresh-token` |
| Path params | snake_case, `<resource>_id` | `:channel_id`, `:user_id` |
| Request/response body fields | snake_case | `ref_name`, `role_ref_names`, `refresh_token` |

Note: the `I`-prefix on interfaces is used inconsistently in the existing code
(`IDecodedToken` has it, `TokenPair`/`SearchOptions` don't) — match whichever sibling
type you're extending rather than picking a side.

## Request Flow / Architecture

This is **not** a strict controller → service → repository pattern. It's:

```
Route → authMiddleware → checkApiKeyMiddleware → hasAnyPermission(...) →
  validationMiddleware(validatorArray) → controller → (Model directly, or a services/*
  helper — often called from BOTH the controller and the model's own instance methods)
  → errorHandler (registered last, catches everything via next(error))
```

Rules of thumb, based on how the codebase actually splits logic:

- **Simple CRUD**: controller calls the Sequelize model directly
  (`Channel.create(req.body)`, `Channel.findByPk(...)`). Don't add a service function
  just to wrap a one-line model call.
- **Reusable/cross-cutting logic** (RBAC traversal, privilege comparison, scope
  resolution): put it in `services/<resource>Service.ts` as a named export. These are
  called from controllers **and** re-exposed as instance methods on the relevant model
  (e.g. `User.hasAnyPermission()` in `database/models/User.ts` just delegates to
  `services/permissionService.ts`) — follow that same "fat model delegates to service"
  shape for new RBAC-adjacent logic rather than duplicating the traversal in a
  controller.
- **Validation** always lives in `validators/<resource>/<verb>Validator.ts` as an
  `express-validator` chain array, applied via `validationMiddleware(...)` in the route
  definition — never inline in the controller.
- **Auth routes are the exception** to global middleware: `/api/auth/*` is mounted
  *before* `authMiddleware`/`checkApiKeyMiddleware` in `app.ts`, and individual auth
  routes apply `checkApiKeyMiddleware` themselves where the tenant must be known before
  credentials are checked (e.g. `generate-token`, `refresh-token`).
- Route ordering in `app.ts`: mount new resource routers alongside the existing block
  (after the global middlewares), and always keep `errorHandler` registered last.

## Database / Models

- Models are `sequelize-typescript` decorator classes; every new model **must** be
  added to the `models` array in `database/sequelize.ts` or it won't be recognized.
- Use `@DeletedAt deleted_at: Date` (paranoid/soft-delete) on every new resource model
  to match the existing pattern — hard delete is opt-in via `?force=true` at the
  controller level, not the default.
- Put persistence-time business rules in lifecycle hooks on the model
  (`@BeforeValidate` for hashing/derived fields, `@BeforeCreate`/`@BeforeUpdate`/
  `@BeforeDestroy` for protection rules), not in the controller — see `User.ts`
  (password hashing, root-superadmin protection) and `Channel.ts` (API key
  generation) for the pattern.
- M2M relationships: declare `@BelongsToMany(() => Target, () => JoinModel)` plus the
  explicit `declare get/set/add/removeX` mixin signatures, and give the join model its
  own file (`UserRole.ts`, `RolePolicy.ts`, `PolicyPermission.ts`) with
  `@ForeignKey`/`@BelongsTo` pairs.
- **Schema changes**: this project does not use migrations day-to-day — schema is
  synced via `sequelize.sync({ alter: true })` on every server boot
  (`src/server.ts`). `sequelize-cli` is configured but `database/migrations/` is
  empty. Practically: **edit the model class**, restart the dev server, and the schema
  follows. Don't hand-write a migration file unless the team has explicitly decided to
  move off `sync({ alter: true })` for production — see `ENGINEERING_AUDIT.md`.
- Seed reference/lookup data (permissions, policies) as JSON under `constants/`, and
  drive a `database/seeders/<timestamp>-*.js` file from it — see the existing
  `globalPermissions.json` / `globalPolicies.json` + their seeders for the pattern.

## Validation

- One array of `express-validator` chains per verb, per resource, in
  `validators/<resource>/<verb>Validator.ts`.
- Reuse `validators/custom/` helpers (`isUniqueField`, `isStringOrArrayOfStrings`)
  instead of re-implementing uniqueness/type checks inline.
- `isUniqueField(Model, field, label, paramName?)` needs `paramName` set correctly on
  *update* routes so it excludes the current record from the uniqueness check — a real
  bug from getting this wrong is documented in `ENGINEERING_AUDIT.md`; double-check
  this whenever adding an update validator for a new resource.
- Always wire validators into the route via `validationMiddleware([...chains])` — never
  skip validation on a route that accepts a body/query, even for internal-only
  endpoints (the one exception in this codebase, `has-any-permission`, is called out in
  its own route comment as unusual, not as a pattern to repeat).

## Error Handling

- Throw `new AppError(message, statusCode, details?)` (from
  `middlewares/errorHandler.ts`) for any expected failure condition — never throw a
  bare `Error` for something the client should see a specific status code for.
- Every controller/middleware wraps its body in `try { ... } catch (error: unknown) {
  next(error); }` — do not `res.status(...).json(...)` errors directly, let the global
  `errorHandler` shape the response so it stays uniform
  (`{ message, ...(details && { details }) }`).
- Use `constants/httpStatus.ts`'s `HttpStatus` enum instead of magic numbers.

## Auth & RBAC (specific to this being an auth service)

- Access tokens carry only `{ id }` — never put channel/tenant context in the JWT.
  Tenant scope is resolved per-request from the `x-api-key` header by
  `checkApiKeyMiddleware`, independently of the JWT.
- Refresh tokens are single-use and rotated transactionally
  (`services/authService.ts`'s `rotateTokens`) — if you touch refresh logic, keep the
  "delete old row, insert new row, same transaction, 403 if 0 rows deleted" shape; it's
  what prevents refresh-token replay/explosion under concurrent requests.
- Gate new protected routes with `hasAnyPermission([...refNames], requireGlobalRole?)`
  as the first middleware after the global ones — don't hand-roll a permission check in
  the controller.
- Compare privilege via `User.isMorePrivileged()` / `isMorePrivilegedThanLevel()`
  instance methods, not raw `UserLevelType` string/number comparisons at the call site.
- Password hashing happens automatically via a model `@BeforeValidate` hook — never
  call `bcrypt.hash` manually in a controller/service.

## Testing

- Integration-style: real Express `app` via `supertest.agent(app)` against a real dev
  Postgres DB — not unit-mocked. New resource → new
  `tests/<resource>-routes.test.ts`, structured as
  `describe('<Resource> Routes')` → `describe('<METHOD> <path>')` → `it('should ...')`.
- Reuse `tests/utils.ts` factories (`generateXData`, `createAuthUser`,
  `createAuthHeaders`) instead of duplicating setup per test file.
- Tests run with `maxWorkers: 1` (`jest.config.ts`) because suites share one database —
  don't parallelize test runs without provisioning a dedicated test DB first.

## Style / Tooling

- 4-space indent, single quotes, semicolons required, no trailing commas (Prettier).
- `no-floating-promises` / `no-misused-promises` / `await-thenable` are ESLint errors —
  always `await` or explicitly `void` a promise.
- `no-console` is an error in production builds — there's no logging library in this
  codebase (plain `console.error`/`console.log` today), so don't introduce a new one
  without discussing it first; keep any new logging consistent with the existing
  `console.*` calls in `authMiddleware.ts` / `checkApiKeyMiddleware.ts` /
  `errorHandler.ts`.
- Run `npm run lint` and `npm run format` before considering a change done;
  `npm run knip` if you removed/renamed exports.
