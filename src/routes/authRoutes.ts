import { Router } from 'express';
import authController from '../controllers/authController';

const authRoutes = Router();

authRoutes.post('/generate-token', authController.generateToken);
authRoutes.get('/refresh-token', authController.refreshToken);
authRoutes.get('/verify-token', authController.verifyToken);

export default authRoutes;
