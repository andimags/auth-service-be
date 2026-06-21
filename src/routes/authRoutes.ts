import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkApiKeyMiddleware } from '../middlewares/checkApiKeyMiddleware';
import { refreshTokenValidator } from '../validators/auth/refreshTokenValidator';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { generateTokenValidator } from '../validators/auth/generateTokenValidator';
import { destroyTokenValidator } from '../validators/auth/destroyTokenValidator';

const authRoutes = Router();

authRoutes.post('/generate-token', checkApiKeyMiddleware, validationMiddleware(generateTokenValidator), authController.generateToken);

authRoutes.post('/refresh-token', checkApiKeyMiddleware, validationMiddleware(refreshTokenValidator), authController.refreshToken);

authRoutes.post('/destroy-token', validationMiddleware(destroyTokenValidator), authController.destroyToken);

authRoutes.get('/me', authMiddleware, checkApiKeyMiddleware, authController.me);

authRoutes.get('/verify-token', authMiddleware, checkApiKeyMiddleware, authController.verifyToken);

authRoutes.get(
    '/has-any-permission',
    authMiddleware,
    checkApiKeyMiddleware,
    authController.hasAnyPermission
);

export default authRoutes;
