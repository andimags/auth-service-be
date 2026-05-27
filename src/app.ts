import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express from 'express';
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

app.get('/', (req, res) => {
    res.send('Welcome to Auth BE');
});

app.get('/health', (req, res) => {
    res.send('Healthy');
});

app.get('/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.send('Server is fresh');
});

app.use('/api/auth', authRoutes);

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
