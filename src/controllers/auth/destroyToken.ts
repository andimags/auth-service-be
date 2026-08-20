import { NextFunction, Request, Response } from 'express';
import * as authService from '../../services/authService';

/**
 * POST /api/auth/destroy-token — logout. Deletes the refresh-token row matching
 * the token's `jti`. Idempotent: an already-revoked token yields a 0 count, not
 * an error.
 */
export const destroyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        authService.assertRefreshSecretConfigured();

        const decoded = authService.decodeRefreshToken(req.body['refresh_token']);
        const deletedCount = await authService.revokeRefreshToken(decoded.jti);

        res.json({
            message: 'Logout successful',
            deleted_refresh_token_rows: deletedCount
        });
    } catch (error) {
        next(error);
    }
};
