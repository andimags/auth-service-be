import dotenv from 'dotenv';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler';

// Routes
import channelRoutes from './routes/channelRoutes';
import permissionRoutes from './routes/permissionRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(express.json());

dotenv.config();

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

app.use(errorHandler);

export default app;
