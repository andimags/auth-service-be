import fs from 'fs';
import path from 'path';
import type { Options } from 'swagger-jsdoc';

// Read the version straight from package.json instead of hardcoding it, so this
// stays correct without needing a manual bump every release. Done with fs/JSON
// instead of a JSON import because tsconfig.json does not set
// "resolveJsonModule": true.
const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

// Matches .env.example's PORT default (4000). dotenv/config is imported at the
// top of src/app.ts before this module, so process.env.PORT is already populated
// by the time this runs.
const PORT = process.env.PORT || 4000;

/**
 * Base swagger-jsdoc options (everything except `apis`, which is added in
 * src/app.ts alongside the actual glob of route files to scan). Kept here so the
 * shared info/servers/components definition isn't tangled up with app wiring.
 */
export const openapiBaseOptions: Options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Auth Service API',
            version: pkg.version,
            description:
                'RBAC-based, multi-tenant (channel-scoped) authentication and ' +
                'authorization service. Every request outside of `/api/auth/*`, `/`, ' +
                '`/health`, and `/ping` must present both a JWT access token ' +
                '(`Authorization: Bearer <token>`, obtained from ' +
                '`POST /api/auth/generate-token`) and an `x-api-key` header identifying ' +
                'the tenant (a channel\'s `api_key`, or the literal string `global` for ' +
                'unscoped/global access). Most resource routes additionally require the ' +
                'caller to hold specific RBAC permission ref_names, enforced via the ' +
                '`hasAnyPermission` middleware and documented per endpoint below.'
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Local development server (see PORT in .env)'
            }
        ],
        tags: [
            { name: 'Auth', description: 'Token issuance/refresh/revocation and identity introspection.' },
            { name: 'Users', description: 'User account CRUD.' },
            { name: 'Roles', description: 'Role CRUD. Roles are global or channel-scoped and group Policies.' },
            { name: 'Channels', description: 'Channel (tenant) CRUD.' },
            { name: 'Permissions', description: 'Permission CRUD. Permissions are the atomic RBAC unit, grouped into Policies.' },
            { name: 'Policies', description: 'Policy CRUD. Policies are a shared/global grouping of Permissions attached to Roles.' },
            { name: 'Role-Policy', description: 'Manage which Policies are attached to a Role.' },
            { name: 'Policy-Permission', description: 'Manage which Permissions are attached to a Policy.' },
            { name: 'User-Role', description: 'Manage which Roles are assigned to a User.' },
            { name: 'Utility', description: 'Unauthenticated liveness/readiness/info endpoints.' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'Access token returned by `POST /api/auth/generate-token` (and ' +
                        'rotated by `POST /api/auth/refresh-token`). Required on every ' +
                        'route except `/api/auth/*`, `/`, `/health`, and `/ping`. Sent as ' +
                        '`Authorization: Bearer <access_token>`.'
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description:
                        'Identifies the tenant a request is scoped to. Either a Channel\'s ' +
                        '`api_key` value (channel-scoped) or the literal string `global` ' +
                        '(unscoped). Required on every route except `/api/auth/*`, `/`, ' +
                        '`/health`, and `/ping`.'
                }
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    description:
                        'Uniform error shape returned by errorHandler for every non-2xx ' +
                        'response. `details` is only present when the underlying error ' +
                        'carried extra data (e.g. express-validator field errors on a 400).',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Validation failed'
                        },
                        details: {
                            description:
                                'Present only on some errors. For validation failures (400), ' +
                                'this is the express-validator `errors.array()` output.',
                            nullable: true,
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', example: 'field' },
                                    value: { example: '' },
                                    msg: { type: 'string', example: 'Email is required' },
                                    path: { type: 'string', example: 'email' },
                                    location: { type: 'string', example: 'body' }
                                }
                            }
                        }
                    },
                    required: ['message']
                },
                PaginatedResponse: {
                    type: 'object',
                    description:
                        'Generic pagination envelope returned by src/utils/paginate.ts. ' +
                        'The `rows` item type varies per endpoint; see that endpoint\'s ' +
                        'response schema for the concrete shape.',
                    properties: {
                        count: {
                            type: 'integer',
                            description: 'Total number of rows matching the filters, across all pages.',
                            example: 42
                        },
                        rows: {
                            type: 'array',
                            items: {},
                            description: 'The current page of results.'
                        },
                        totalPages: {
                            type: 'integer',
                            example: 5
                        },
                        currentPage: {
                            type: 'integer',
                            description: '1-based current page number.',
                            example: 1
                        }
                    },
                    required: ['count', 'rows', 'totalPages', 'currentPage']
                },
                User: {
                    type: 'object',
                    description:
                        'A user account. `password` is never present on responses — it is ' +
                        'excluded by the model\'s @DefaultScope.',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        username: { type: 'string', example: 'jdoe' },
                        email: { type: 'string', format: 'email', example: 'jdoe@example.com' },
                        first_name: { type: 'string', example: 'John' },
                        last_name: { type: 'string', example: 'Doe' },
                        status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
                        level: {
                            type: 'string',
                            enum: ['root_superadmin', 'superadmin', 'admin', 'manager', 'moderator', 'member'],
                            example: 'member'
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        deleted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                Role: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Channel Admin' },
                        description: { type: 'string', nullable: true },
                        ref_name: { type: 'string', example: 'channel_admin' },
                        channel_id: {
                            type: 'integer',
                            nullable: true,
                            description: 'Null for global-scope roles; required for channel-scope roles.'
                        },
                        scope: { type: 'string', enum: ['global', 'channel'], example: 'channel' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        deleted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                Channel: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Acme Corp' },
                        description: { type: 'string', nullable: true },
                        ref_name: { type: 'string', example: 'acme_corp' },
                        api_key: {
                            type: 'string',
                            description:
                                'Auto-generated server-side on create (BeforeValidate hook); ' +
                                'cannot be set by the client. Send this value as the ' +
                                '`x-api-key` header to authenticate as this channel.'
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        deleted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                Permission: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'View Channel' },
                        description: { type: 'string', nullable: true },
                        ref_name: { type: 'string', example: 'auth:view:channel' },
                        module: { type: 'string', example: 'channel' },
                        access_level: { type: 'string', enum: ['read', 'write', 'admin'], example: 'read' },
                        is_system: {
                            type: 'boolean',
                            description: 'System permissions are seeded and cannot be created, modified, or deleted via the API.',
                            example: false
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        deleted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                Policy: {
                    type: 'object',
                    description: 'A shared, channel-agnostic grouping of Permissions that Roles attach to via Role-Policy.',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Channel Management' },
                        description: { type: 'string', nullable: true },
                        ref_name: { type: 'string', example: 'channel_management' },
                        is_system: {
                            type: 'boolean',
                            description: 'System policies are seeded and cannot be created, modified, or deleted via the API.',
                            example: false
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        deleted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                }
            }
        }
    },
    apis: []
};
