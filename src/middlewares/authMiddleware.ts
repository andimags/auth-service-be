import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthenticatedRequest, IUser } from '../types';
import { AppError } from './errorHandler';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.header('Authorization');
        if(!authHeader) return next(new AppError('Unauthorized: No token provided', 401));

        const token = authHeader?.split(' ')[1];
        if(authHeader?.split(' ')[0] != 'Bearer' || !token) return next(new AppError('Invalid token format', 401));

        const secret = process.env.API_KEY;
        if (!secret) {
            console.error('JWT secret (API_KEY) is not set in environment variables');
            return next(new AppError('Server configuration error', 500));
        }

        const decoded = jwt.verify(token, secret) as IUser;

        (req as IAuthenticatedRequest).user = decoded;

        next();
    } catch (error: any) {
        console.error('Token verification failed:', error.message ?? error);
        next(new AppError('Invalid or expired token', 401));
    }
};
