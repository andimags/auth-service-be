import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Channel from '../database/models/Channel';
import RefreshToken from '../database/models/RefreshToken';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { IDecodedToken } from '../types';
import Permission from '../database/models/Permission';
import Role from '../database/models/Role';

const generateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Credentials checking
        const user = await User.findOne({
            attributes: { include: ['password'] },
            where: {
                email: req.body.email
            }
        });
        if (!user) throw new AppError('User not found', 401);

        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) throw new AppError('Invalid email or password', 401);

        // Channel checking
        const apiKey = req.header('x-api-key');
        if (!apiKey) throw new AppError('API Key not found', 401);

        let channel = null;

        if (apiKey.toLowerCase() != 'global') {
            channel = await Channel.findOne({
                where: {
                    api_key: apiKey
                }
            });

            if (!channel) throw new AppError('Invalid API key', 401);
        }

        // Generating of refresh and access tokens
        const jti = uuidv4();

        const refreshToken = jwt.sign(
            { id: user.id, jti },
            process.env.REFRESH_SECRET!,
            { expiresIn: '7d' }
        );

        await RefreshToken.create({
            user_id: user.id,
            jti,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Protect from CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        const accessToken = jwt.sign(
            { id: user.id, channel_id: channel?.id ?? null },
            process.env.ACCESS_SECRET!,
            { expiresIn: '15m' }
        );

        res.json({
            status: 1,
            access_token: accessToken
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new AppError('Refresh token not found', 403);

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_SECRET!
        ) as IDecodedToken;

        // 🔍 Check if refresh token exists in DB
        const tokenRecord = await RefreshToken.findOne({
            where: {
                user_id: decoded.id,
                jti: decoded.jti
            }
        });

        if (!tokenRecord) {
            throw new AppError('Refresh token invalid or revoked', 403);
        }

        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError('User not found', 404);

        const newAccessToken = jwt.sign(
            { id: user.id, channel: decoded.channel_id },
            process.env.ACCESS_SECRET!,
            { expiresIn: '15m' }
        );

        res.json({
            status: 1,
            access_token: newAccessToken
        });
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Refresh token expired', 403));
        }

        return next(new AppError('Invalid or expired refresh token', 403));
    }
};

const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);

        res.json({
            status: 1,
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
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!) as any;
        const user = await User.findByPk(decoded.id);

        res.json({
            status: 1,
            user: user
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Get current logged in user's roles and permissions (only globals and the specific channel depending on the api key)
const getRolesAndPermissions = async (    
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!) as any;
        const user = await User.findByPk(decoded.id);
        const rolesWithPermissions = await Role.findAll({
            attributes: ['id', 'ref_name', 'level', 'channel_id'],
            include: [
                {
                    model: Permission,
                    attributes: ['id', 'ref_name', 'scope'],
                    through: { attributes: [] } // hide Role → Permission join table
                },
                {
                    model: User,
                    attributes: [], // don’t return any user fields
                    where: { id: user?.id }, // filter roles for this user
                    through: { attributes: [] } // hide User → Role join table
                }
            ]
        });

        res.json({
            status: 1,
            rolesWithPermissions
        });
    } catch (error: unknown) {
        next(error);
    }
}

const hasAnyPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_SECRET!
        ) as IDecodedToken;
        const hasPermissions = await (
            req.authorizedUser as User
        ).hasAnyPermission(
            req.body.permission_ref_names,
            req.body.permission_scope,
            decoded.channel_id ?? null
        );

        console.log('hasPermissions', hasPermissions);

        if (hasPermissions) {
            res.json({
                status: 1
            });
        } else {
            throw new AppError('Unauthorized', 403);
        }
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    verifyToken,
    me,
    getRolesAndPermissions,
    hasAnyPermission
};
