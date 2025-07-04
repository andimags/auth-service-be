import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Channel from '../database/models/Channel';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

const generateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findOne({
            attributes: { include: ['password'] },
            where: {
                email: req.body.email
            }
        });

        if (!user) throw new AppError('User not found', 401);

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) throw new AppError('Invalid email or password', 401);

        const token = jwt.sign(JSON.parse(JSON.stringify(user)), process.env.API_KEY!);

        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Protect from CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            status: 1,
            token: token
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['refresh_token'];

        if (!token) throw new AppError('Token not found', 403);

        res.json({
            status: 1,
            token: token
        });
    } catch (error: unknown) {
        next(error);
    }
};

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.API_KEY!);

        res.json({
            status: 1,
            decoded: decoded
        });
    } catch (error: unknown) {
        next(error);
    }
};

const checkPermission = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        // 1. Check if x-api-key is GLOBAL or channel-based
        // 2. If GLOBAL, loop through user's roles that have null channel_id, check each if the specific permission is attached to it.
        // 3, If Channel based, loop through user's roles that have the appropriate channel id of channel_id, check each if the specific permission is attached to it.
        const apiKey = req.header('x-api-key');
        const user = await req.authorizedUser;
        let isAuthorized = false;
        let roles = null;

        if (!user) throw new AppError('User not found', 404);

        if (apiKey == 'GLOBAL') {
            // Global roles to check
            roles = await user.getRoles({
                where: {
                    channel_id: null
                }
            });
        } else {
            const channel = await Channel.findOne({
                where: {
                    api_key: apiKey
                }
            });

            if (!channel) throw new AppError('Channel not found', 404);

            roles = await user.getRoles({
                where: {
                    channel_id: channel.id
                }
            });
        }

        for (const role of roles) {
            const permissions = await role.getPermissions();

            for (const permission of permissions) {
                if (permission.ref_name === req.params.permission_ref_name) {
                    isAuthorized = true;
                    break;
                }
            }

            if (isAuthorized) break;
        }

        if (isAuthorized) {
            return res.json({ status: 1 });
        } else {
            throw new AppError('Unauthorized', 401);
        }
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    verifyToken,
    checkPermission
};
