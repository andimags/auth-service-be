import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import sequelize from './database/sequelize';
import { openapiBaseOptions } from './docs/openapi-base';
import { errorHandler } from './middlewares/errorHandler';

// Augmentations
import type {} from './types/express-augment';

// Routes
import { authMiddleware } from './middlewares/authMiddleware';
import { checkApiKeyMiddleware } from './middlewares/checkApiKeyMiddleware';
import authRoutes from './routes/authRoutes';
import channelRoutes from './routes/channelRoutes';
import permissionRoutes from './routes/permissionRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoleRoutes from './routes/userRoleRoutes';
import userRoutes from './routes/userRoutes';
import policyRoutes from './routes/policyRoutes';
import rolePolicyRoutes from './routes/rolePolicyRoutes';
import policyPermissionRoutes from './routes/policyPermissionRoutes';

const app = express();

app.use(express.json());
app.use(cookieParser());

/**
 * @openapi
 * /:
 *   get:
 *     summary: Service welcome message
 *     description: Plain-text landing endpoint. No authentication required.
 *     tags: [Utility]
 *     security: []
 *     responses:
 *       200:
 *         description: Static welcome text.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: Welcome to Auth BE
 */
app.get('/', (req, res) => {
    res.send('Welcome to Auth BE');
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Readiness probe
 *     description: >
 *       Verifies the database connection actually works (calls
 *       `sequelize.authenticate()`), not just that the process is up. Intended for
 *       orchestrator/load-balancer readiness checks. No authentication required.
 *     tags: [Utility]
 *     security: []
 *     responses:
 *       200:
 *         description: Database connection is reachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Database connection failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 db:
 *                   type: string
 *                   example: unreachable
 *                 message:
 *                   type: string
 *                   example: Connection refused
 */
// Readiness probe: verifies the DB connection actually works, not just that the
// process is up. Use this for orchestrator/load-balancer health checks.
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', db: 'connected' });
    } catch (error: unknown) {
        res.status(503).json({
            status: 'error',
            db: 'unreachable',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @openapi
 * /ping:
 *   get:
 *     summary: Liveness probe
 *     description: >
 *       Cheap check with no DB round-trip — only confirms the process itself is
 *       responsive. Response is sent with `Cache-Control: no-store`. No
 *       authentication required.
 *     tags: [Utility]
 *     security: []
 *     responses:
 *       200:
 *         description: The process is alive.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: Server is fresh
 */
// Liveness probe: cheap, no DB round-trip. Use this to check the process itself
// is responsive.
app.get('/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.send('Server is fresh');
});

app.use('/api/auth', authRoutes);

// API docs (Swagger UI). Mounted before the global authMiddleware/
// checkApiKeyMiddleware so the docs UI itself doesn't require auth — this is an
// internal service, so that's an acceptable default. The spec is assembled here
// (rather than in openapi-base.ts) so the `apis` glob stays colocated with app
// wiring; openapi-base.ts only owns the shared info/servers/components.
const openapiSpec = swaggerJsdoc({
    ...openapiBaseOptions,
    // src/app.ts is included alongside the routes glob so the @openapi blocks on
    // the utility endpoints below (/, /health, /ping) are also picked up.
    apis: ['./src/routes/*.ts', './src/app.ts']
});
app.get('/api-docs.json', (req, res) => {
    res.json(openapiSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use(authMiddleware);
app.use(checkApiKeyMiddleware);

app.use('/api/roles', roleRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/user-role', userRoleRoutes);
app.use('/api/role-policy', rolePolicyRoutes);
app.use('/api/policy-permission', policyPermissionRoutes);

app.use(errorHandler);

export default app;
