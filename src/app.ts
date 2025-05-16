import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler';

// Routes
import channelRoutes from './routes/channelRoutes';
import permissionRoutes from './routes/permissionRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoutes from './routes/userRoutes';
import userRoleRoutes from './routes/userRoleRoutes';

const app = express();

app.use(express.json());


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

app.use(errorHandler);

export default app;
