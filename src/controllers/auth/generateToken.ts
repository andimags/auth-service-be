import { NextFunction, Request, Response } from 'express';
import * as authService from '../../services/authService';

/**
 * POST /api/auth/generate-token — verify email/password and issue a fresh
 * access/refresh token pair plus the caller's scoped permission list.
 */
export const generateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await authService.verifyCredentials(req.body.email, req.body.password);
        const tokens = await authService.issueTokens(user.id);

        const { user: userPayload, permissions } = await authService.getAuthResponsePayload(
            user,
            Boolean(req.isGlobalScope),
            req.channel?.id
        );

        res.json(authService.buildTokenResponse(userPayload, permissions, tokens));
    } catch (error: unknown) {
        next(error);
    }
};
