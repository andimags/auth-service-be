import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const authRoutes = Router();

authRoutes.post('/generate-token', authController.generateToken);

authRoutes.get('/refresh-token', authController.refreshToken);

authRoutes.get('/verify-token', authMiddleware, authController.verifyToken);

authRoutes.get(
    '/check-permission/:permission_ref_name',
    authMiddleware,
    authController.checkPermission
);

export default authRoutes;
