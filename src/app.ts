import express from 'express';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Welcome to Auth BE");
})

app.get('/health', (req, res) => {
    res.send("Healthy");
})

app.use(errorHandler);

export default app;
