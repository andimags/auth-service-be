import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { AppError } from './errorHandler';
import { HttpStatus } from '../constants/httpStatus';

export const checkApiKeyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Channel checking
        const apiKey = req.header('x-api-key');
        if (!apiKey) throw new AppError('API Key not found', HttpStatus.UNAUTHORIZED);

        let channel = null;

        if (apiKey.toLowerCase() != 'global') {
            channel = await Channel.findOne({
                attributes: ['id', 'name', 'ref_name'],
                where: {
                    api_key: apiKey
                }
            });

            if (!channel) throw new AppError('Invalid API key', HttpStatus.UNAUTHORIZED);
        }

        req.channel = channel ?? undefined;
        req.isGlobalScope = !channel;

        next();
    } catch (error: unknown) {
        console.error('API key verification failed:', error instanceof Error ? error.message : error);

        next(new AppError('Invalid API key', HttpStatus.FORBIDDEN));
    }
};
