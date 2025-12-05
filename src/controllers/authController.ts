import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { IDecodedToken } from '../types';
import Role from '../database/models/Role';
import Permission from '../database/models/Permission';

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

        // Generating of refresh and access tokens
        const jti = uuidv4();

        const refreshToken = jwt.sign(
            { id: user.id, jti },
            process.env.REFRESH_SECRET!,
            { expiresIn: '7d' }
        );

        const accessToken = jwt.sign(
            { id: user.id },
            process.env.ACCESS_SECRET!,
            { expiresIn: '15m' }
        );

        // Store refreshToken to cookies
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: false, // true only in production over HTTPS
            sameSite: 'lax', // or 'none' if cross-domain with secure=true
            maxAge: 15 * 60 * 1000
        });

        res.json({
            status: 1,
            access_token: accessToken
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldRefreshToken = req.cookies['refresh_token'];
        if (!oldRefreshToken) throw new AppError('Refresh token not found', 403);

        let decoded: IDecodedToken;

        try {
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET!) as IDecodedToken;
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                throw new AppError('Refresh token expired', 403);
            } else {
                throw new AppError('Invalid refresh token', 403);
            }
        }

        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError('User not found', 404);

        // Generate new tokens
        const jti = uuidv4();

        const newRefreshToken = jwt.sign(
        { id: user.id, jti },
        process.env.REFRESH_SECRET!,
        { expiresIn: '7d' }
        );

        const newAccessToken = jwt.sign(
        { id: user.id, channel_id: decoded.channel_id },
        process.env.ACCESS_SECRET!,
        { expiresIn: '15m' }
        );

        // Store newRefreshToken to cookies
        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: false, // true only in production over HTTPS
            sameSite: 'lax', // or 'none' if cross-domain with secure=true
            maxAge: 15 * 60 * 1000
        });

        res.json({
            status: 1,
            access_token: newAccessToken
        });
    } catch (error) {
        next(error);
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
            status: 1,
            channel: req.channel ?? null,
            user: {
                ...req.authorizedUser.toJSON(),
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
    hasAnyPermission
};
