import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import channelRoutes from './routes/channelRoutes';
import permissionRoutes from './routes/permissionRoutes';
import rolePermissionRoutes from './routes/rolePermissionRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoleRoutes from './routes/userRoleRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Welcome to Auth BE');
});

app.get('/health', (req, res) => {
    res.send('Healthy');
});

app.use('/api/roles', roleRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user-role', userRoleRoutes);
app.use('/api/role-permission', rolePermissionRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;
