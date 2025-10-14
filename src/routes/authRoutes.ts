import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkApiKeyMiddleware } from '../middlewares/checkApiKeyMiddleware';

const authRoutes = Router();

authRoutes.post('/generate-token', authController.generateToken);

authRoutes.get('/refresh-token', authController.refreshToken);

authRoutes.get('/me', authMiddleware, checkApiKeyMiddleware, authController.me);

authRoutes.get('/verify-token', authMiddleware, checkApiKeyMiddleware, authController.verifyToken);

authRoutes.get(
    '/has-any-permission',
    authMiddleware,
    checkApiKeyMiddleware,
    authController.hasAnyPermission
);

export default authRoutes;
