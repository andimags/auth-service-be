import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const authRoutes = Router();

authRoutes.post('/generate-token', authController.generateToken);

authRoutes.get('/refresh-token', authController.refreshToken);

authRoutes.get('/me', authMiddleware, authController.me);

authRoutes.get('/roles-and-permissions', authMiddleware, authController.getRolesAndPermissions);

authRoutes.get('/verify-token', authMiddleware, authController.verifyToken);

authRoutes.get(
    '/has-any-permission',
    authMiddleware,
    authController.hasAnyPermission
);

export default authRoutes;
