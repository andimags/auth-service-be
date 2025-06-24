import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { IRequestWithChannel } from '../types';
import { AppError } from './errorHandler';

export const checkApiKeyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const apiKey = req.header('x-api-key');

        if (!apiKey) throw new AppError('API Key not found', 401);

        if (apiKey.toLocaleLowerCase()) return next();

        const channel = await Channel.findOne({
            where: {
                api_key: apiKey
            }
        });

        if (!channel) throw new AppError('Invalid API key', 401);

        (req as IRequestWithChannel).channel = channel;

        next();
    } catch (error: any) {
        console.error('API key verification failed:', error.message ?? error);

        throw new AppError('Invalid API key', 403);
    }
};
