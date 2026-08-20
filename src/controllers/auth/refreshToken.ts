import { NextFunction, Request, Response } from 'express';
import User from '../../database/models/User';
import { AppError } from '../../middlewares/errorHandler';
import * as authService from '../../services/authService';
import { HttpStatus } from '../../constants/httpStatus';

/**
 * POST /api/auth/refresh-token — rotate the refresh token (old one destroyed, new
 * one issued transactionally) and mint a new access token.
 */
export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const oldRefreshToken = req.body['refresh_token'];
        if (!oldRefreshToken) throw new AppError('Refresh token not found', HttpStatus.FORBIDDEN);
        authService.assertRefreshSecretConfigured();

        const decoded = authService.decodeRefreshToken(oldRefreshToken);

        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError('User not found', HttpStatus.NOT_FOUND);

        const tokens = await authService.rotateTokens(user.id, decoded.jti);

        const { user: userPayload, permissions } = await authService.getAuthResponsePayload(
            user,
            Boolean(req.isGlobalScope),
            req.channel?.id
        );

        res.json(authService.buildTokenResponse(userPayload, permissions, tokens));
    } catch (error) {
        next(error);
    }
};
