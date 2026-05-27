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

        req.channel = channel ?? null;
        req.isGlobalScope = !channel;

        next();
    } catch (error: any) {
        console.error('API key verification failed:', error.message ?? error);

        throw new AppError('Invalid API key', 403);
    }
};
