import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../database/models/User';
import { IDecodedToken, IUser } from '../types';
import { AppError } from './errorHandler';

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader)
            return next(new AppError('Unauthorized: No token provided', 401));

        const accessToken = authHeader?.split(' ')[1];
        if (authHeader?.split(' ')[0] != 'Bearer' || !accessToken)
            return next(new AppError('Invalid token format', 401));

        const secret = process.env.ACCESS_SECRET;
        if (!secret) {
            console.error(
                'JWT secret (ACCESS_SECRET) is not set in environment variables'
            );
            return next(new AppError('Server configuration error', 500));
        }

        const decoded = jwt.verify(accessToken, secret) as IDecodedToken;

        req.authorizedUser = await User.findByPk(decoded.id);

        next();
    } catch (error: any) {
        console.error('Token verification failed:', error.message ?? error);
        next(new AppError('Invalid or expired token', 401));
    }
};
