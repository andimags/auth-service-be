import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkApiKeyMiddleware } from '../middlewares/checkApiKeyMiddleware';
import { refreshTokenValidator } from '../validators/auth/refreshTokenValidator';
import { validationMiddleware } from '../middlewares/validationMiddleware';

const authRoutes = Router();

authRoutes.post('/generate-token', checkApiKeyMiddleware, authController.generateToken);

authRoutes.post('/refresh-token', validationMiddleware(refreshTokenValidator), authController.refreshToken);

authRoutes.post('/destroy-token', authController.destroyToken);

authRoutes.get('/me', authMiddleware, checkApiKeyMiddleware, authController.me);

authRoutes.get('/verify-token', authMiddleware, checkApiKeyMiddleware, authController.verifyToken);

authRoutes.get(
    '/has-any-permission',
    authMiddleware,
    checkApiKeyMiddleware,
    authController.hasAnyPermission
);

export default authRoutes;
