import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../database/models/User';
import { IDecodedToken } from '../types';
import { AppError } from './errorHandler';
import { HttpStatus } from '../constants/httpStatus';

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader)
            return next(new AppError('Unauthorized: No token provided', HttpStatus.UNAUTHORIZED));

        const accessToken = authHeader?.split(' ')[1];
        if (authHeader?.split(' ')[0] != 'Bearer' || !accessToken)
            return next(new AppError('Invalid token format', HttpStatus.UNAUTHORIZED));

        const secret = process.env.ACCESS_SECRET;
        if (!secret) {
            console.error(
                'JWT secret (ACCESS_SECRET) is not set in environment variables'
            );
            return next(new AppError('Server configuration error', HttpStatus.INTERNAL_SERVER_ERROR));
        }

        const decoded = jwt.verify(accessToken, secret) as IDecodedToken;

        req.authorizedUser = await User.findByPk(decoded.id) ?? undefined;

        next();
    } catch (error: unknown) {
        console.error('Token verification failed:', error instanceof Error ? error.message : error);
        next(new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED));
    }
};
