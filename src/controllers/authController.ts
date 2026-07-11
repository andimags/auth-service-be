import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from '../constants/auth';
import Permission from '../database/models/Permission';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import * as authService from '../services/authService';
import { HttpStatus } from '../constants/httpStatus';

const generateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await authService.verifyCredentials(req.body.email, req.body.password);
        const { accessToken, refreshToken } = await authService.issueTokens(user.id);
        const { user: userPayload, permissions } = await authService.getAuthResponsePayload(
            user,
            Boolean(req.isGlobalScope),
            req.channel?.id
        );

        res.json({
            user: userPayload,
            permissions,
            tokens:{
                access:{
                    value: accessToken,
                    expires_at: Date.now() + ACCESS_TOKEN_TTL_MS
                },
                refresh:{
                    value: refreshToken,
                    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS
                }
            }
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const oldRefreshToken = req.body['refresh_token'];
        if (!oldRefreshToken) throw new AppError('Refresh token not found', HttpStatus.FORBIDDEN);
        authService.assertRefreshSecretConfigured('Refresh token not found');

        const decoded = authService.decodeRefreshToken(oldRefreshToken);

        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError('User not found', HttpStatus.NOT_FOUND);

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            await authService.rotateTokens(user.id, decoded.jti);

        const { user: userPayload, permissions } = await authService.getAuthResponsePayload(
            user,
            Boolean(req.isGlobalScope),
            req.channel?.id
        );

        res.json({
            user: userPayload,
            permissions,
            tokens:{
                access:{
                    value: newAccessToken,
                    expires_at: Date.now() + ACCESS_TOKEN_TTL_MS
                },
                refresh:{
                    value: newRefreshToken,
                    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const destroyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        authService.assertRefreshSecretConfigured('REFRESH_SECRET on env not set');

        const oldRefreshToken = req.body['refresh_token'];
        const decoded = authService.decodeRefreshToken(oldRefreshToken);

        const deletedCount = await authService.revokeRefreshToken(decoded.jti);

        res.json({
            message: 'Logout successful',
            deleted_refresh_token_rows: deletedCount
        });
    } catch (error) {
        next(error);
    }
};

const verifyToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', HttpStatus.NOT_FOUND);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);

        res.json({
            decoded: decoded
        });
    } catch (error: unknown) {
        next(error);
    }
};

const me = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const roles = await Role.findAll({
            attributes: ['id', 'ref_name', 'scope', 'level', 'channel_id'],
            where: {
                channel_id: req.channel?.id ? req.channel.id : null
            },
            include: [
                {
                    model: Permission,
                    attributes: ['id', 'ref_name', 'scope'],
                    through: { attributes: [] } // hide Role → Permission join table
                },
                {
                    model: User,
                    attributes: [], // don’t return any user fields
                    where: { id: req.authorizedUser?.id }, // filter roles for this user
                    through: { attributes: [] } // hide User → Role join table
                }
            ]
        });

        res.json({
            channel: req.channel ?? null,
            user: {
                ...req.authorizedUser?.toJSON(),
                roles
            },
        });
    } catch (error: unknown) {
        next(error);
    }
};

const hasAnyPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', HttpStatus.NOT_FOUND);

        // Bug fix: channelId was never forwarded here, so a request with
        // role_scope: "channel" always 400'd inside getUserPermissions
        // ("channelId is required when roleScope is channel"), regardless of
        // whether the caller actually had a resolvable channel via x-api-key.
        const hasPermissions = await (
            req.authorizedUser!
        ).hasAnyPermission(
            req.body.permission_ref_names,
            req.body.role_scope,
            req.isGlobalScope ? undefined : req.channel?.id,
        );

        if (hasPermissions) {
            res.json({
                status: 1
            });
        } else {
            throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);
        }
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    destroyToken,
    verifyToken,
    me,
    hasAnyPermission
};
