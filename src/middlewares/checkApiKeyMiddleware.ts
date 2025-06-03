import { NextFunction, Request, Response } from 'express';
import { IRequestWithChannel } from '../types';
import { AppError } from './errorHandler';
import Channel from '../database/models/Channel';

export const checkApiKeyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const apiKey = req.header('x-api-key');

        if (apiKey) next();

        const channel = await Channel.findOne({
            where: {
                api_key: apiKey
            }
        })

        if (!channel) throw new AppError('Invalid API key', 401);

        (req as IRequestWithChannel).channel = channel;

        next();
    } catch (error: any) {
        console.error('Token verification failed:', error.message ?? error);

        throw new AppError('Invalid or expired token', 403);
    }
};
