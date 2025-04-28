import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler';
import channelRoutes from './routes/channelRoutes';
import roleRoutes from './routes/roleRoutes';

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

app.use(errorHandler);

export default app;
