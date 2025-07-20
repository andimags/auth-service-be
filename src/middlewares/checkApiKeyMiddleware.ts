import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';
import { IDecodedToken } from '../types';
import jwt from 'jsonwebtoken';
import Channel from '../database/models/Channel';

export const checkApiKeyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new AppError('Refresh token not found', 403);

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_SECRET!
        ) as IDecodedToken;

        let channel = await Channel.findByPk(decoded.channel_id);

        req.channel = channel;

        next();
    } catch (error: any) {
        console.error('API key verification failed:', error.message ?? error);

        throw new AppError('Invalid API key', 403);
    }
};
