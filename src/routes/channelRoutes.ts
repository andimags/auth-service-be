import { Router } from 'express';
import channelController from '../controllers/channelController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/channel/addValidator';
import { deleteValidator } from '../validators/channel/deleteValidator';
import { findValidator } from '../validators/channel/findValidator';
import { updateValidator } from '../validators/channel/updateValidator';

const channelRoutes = Router();

/**
 * @openapi
 * /api/channels:
 *   get:
 *     summary: List channels
 *     description: >
 *       Requires `auth:view:channel` or `auth:admin:channel`, checked against the
 *       caller's current scope (the channel identified by `x-api-key`, or global if
 *       `x-api-key: global`). A superadmin/root-superadmin using `x-api-key: global`
 *       bypasses the permission check entirely. If neither `page` nor `size` is
 *       supplied, returns a plain (unpaginated) JSON array instead of the paginated
 *       envelope. A channel-scoped API key only ever sees its own channel, whether
 *       paginated or not.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-based page number. Omit (along with `size`) to get the unpaginated array instead.
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *         description: Page size.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match against name, description, ref_name.
 *       - in: query
 *         name: sort_field
 *         schema:
 *           type: string
 *         description: Any real column on the Channel model; silently ignored otherwise.
 *       - in: query
 *         name: sort_desc
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Sort descending when "true".
 *     responses:
 *       200:
 *         description: Channel list.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Channel'
 *                   description: Returned when neither page nor size is supplied.
 *                 - allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         rows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Channel'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing/invalid x-api-key, or caller lacks the required permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
channelRoutes.get(
    '/',
    hasAnyPermission(['auth:view:channel', 'auth:admin:channel'], false),
    channelController.getAll
);

/**
 * @openapi
 * /api/channels/{channel_id}:
 *   get:
 *     summary: Get a channel by ID
 *     description: >
 *       Requires `auth:view:channel` or `auth:admin:channel` in the caller's
 *       current scope (see list endpoint for the scope/bypass rules). A
 *       channel-scoped API key can only fetch its own channel — requesting any
 *       other channel_id returns 403, even if the permission check itself passed.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: channel_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The channel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       400:
 *         description: channel_id is missing or not an integer.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the requested channel isn't the caller's own (message: \"Access is limited to the API key's channel\")."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Channel not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
channelRoutes.get(
    '/:channel_id',
    hasAnyPermission(['auth:view:channel', 'auth:admin:channel'], false),
    validationMiddleware(findValidator),
    channelController.find
);

/**
 * @openapi
 * /api/channels:
 *   post:
 *     summary: Create a channel
 *     description: >
 *       Requires `auth:add:channel` or `auth:admin:channel` on a **global-scope**
 *       role — a channel-scoped API key cannot create channels even if it holds a
 *       channel-scoped role with this permission ref_name, unless the caller is a
 *       superadmin/root-superadmin authenticating with `x-api-key: global`. The
 *       `api_key` field is generated server-side and cannot be set by the client.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: 'Letters, numbers, colons, underscores, or dashes between words. Must be unique across all channels.'
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *           example:
 *             name: Acme Corp
 *             ref_name: acme_corp
 *     responses:
 *       200:
 *         description: Channel created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       400:
 *         description: Validation failed (missing/short name, malformed or duplicate ref_name).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing/invalid x-api-key, or caller lacks a global-scope grant of the required permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
channelRoutes.post(
    '/',
    hasAnyPermission(['auth:add:channel', 'auth:admin:channel'], true),
    validationMiddleware(addValidator),
    channelController.add
);

/**
 * @openapi
 * /api/channels/{channel_id}:
 *   put:
 *     summary: Update a channel
 *     description: >
 *       Requires `auth:update:channel` or `auth:admin:channel` in the caller's
 *       current scope. A channel-scoped API key can only update its own channel.
 *       All body fields are optional (partial update); `ref_name` uniqueness
 *       excludes the record being updated.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: channel_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *     responses:
 *       200:
 *         description: Updated channel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the target channel isn't the caller's own (message: \"You can only update channels you're associated to\")."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Channel not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
channelRoutes.put(
    '/:channel_id',
    hasAnyPermission(['auth:update:channel', 'auth:admin:channel'], false),
    validationMiddleware(updateValidator),
    channelController.update
);

/**
 * @openapi
 * /api/channels/{channel_id}:
 *   delete:
 *     summary: Delete (soft or hard) a channel
 *     description: >
 *       Requires `auth:delete:channel` or `auth:admin:channel` on a
 *       **global-scope** role (this route does not pass `requireGlobalRole:
 *       false`, unlike GET/PUT above) — a channel-scoped API key cannot delete
 *       channels even with a channel-scoped grant of this permission, unless the
 *       caller is a superadmin/root-superadmin using `x-api-key: global`. By
 *       default this is a soft delete (sets `deleted_at`); pass `force=true` to
 *       hard-delete the row.
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: channel_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: When "true", permanently deletes the row instead of soft-deleting it.
 *     responses:
 *       200:
 *         description: Deletion result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Channel successfully soft-deleted
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks a global-scope grant of the required permission; or (channel-scoped key only) the target channel isn't the caller's own."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Channel not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
channelRoutes.delete(
    '/:channel_id',
    hasAnyPermission(['auth:delete:channel', 'auth:admin:channel']),
    validationMiddleware(deleteValidator),
    channelController.destroy
);

export default channelRoutes;
