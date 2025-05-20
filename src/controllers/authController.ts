import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Channel from "../database/models/Channel";
import User from '../database/models/User';
import { throwError } from '../middlewares/errorHandler';
import { IAuthenticatedRequest } from "../types";

const generateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        })

        if (!user) return throwError('User not found', 404, next);

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) return throwError('Invalid email or password', 404, next);

        const token = jwt.sign(JSON.parse(JSON.stringify(user)), process.env.API_KEY!);

        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: true,          // Only send over HTTPS
            sameSite: 'strict',    // Protect from CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            status: 1,
            token: token
        })
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['refresh_token'];
        
        if (!token) return throwError('Token not found', 404, next);

        res.json({
            status: 1,
            token: token
        })
    } catch (error: unknown) {
        next(error);
    }
};

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) return throwError('Token not found', 404, next);

        const decoded = jwt.verify(token, process.env.API_KEY!);

        res.json({
            status: 1,
            decoded: decoded
        })
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
        const decoded = (req as IAuthenticatedRequest).user;
        const user = await User.findByPk(decoded.id);
        let isAuthorized = false;
        let roles = null;

        if (!user) return throwError('User not found', 404, next);

        if(apiKey == 'GLOBAL'){
            // Global roles to check
            roles = await user.getRoles({
                where: {
                    channel_id: null
                }
            });
        }
        else{
            const channel = await Channel.findOne({
                where: {
                    'api_key': apiKey
                }
            });

            if (!channel) return throwError('Channel not found', 404, next);

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

        return isAuthorized ? res.json({status: 1}) : throwError('Unauthorized', 401, next);
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
