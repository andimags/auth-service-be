import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { AppError } from './errorHandler';

export const checkApiKeyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        // Channel checking
        const apiKey = req.header('x-api-key');
        if (!apiKey) throw new AppError('API Key not found', 401);

        let channel = null;

        if (apiKey.toLowerCase() != 'global') {
            channel = await Channel.findOne({
                attributes: ['id', 'name', 'ref_name'],
                where: {
                    api_key: apiKey
                }
            });

            if (!channel) throw new AppError('Invalid API key', 401);
        }

        console.log('[checkApiKeyMiddleware] isGlobalScope', !channel)
        console.log('[checkApiKeyMiddleware] channel', channel)

        req.channel = channel ?? undefined;
        req.isGlobalScope = !channel;

        next();
    } catch (error: any) {
        console.error('API key verification failed:', error.message ?? error);

        throw new AppError('Invalid API key', 403);
    }
};
