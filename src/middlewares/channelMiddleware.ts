import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Channel from '../database/models/Channel';
import { IDecodedToken } from '../types';
import { AppError } from './errorHandler';

export const channelMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_SECRET!
        ) as IDecodedToken;

        req.channel = await Channel.findByPk(decoded.channel_id) ?? undefined;

        next();
    } catch (error: unknown) {
        console.error('API key verification failed:', error instanceof Error ? error.message : error);

        next(new AppError('Invalid API key', 403));
    }
};
