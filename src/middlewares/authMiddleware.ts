import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthenticatedRequest, IUser } from '../types';
import { throwError } from './errorHandler';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): any => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) return throwError('Unauthorized', 401);

        const decoded = jwt.verify(token, process.env.API_KEY!) as IUser;
        (req as IAuthenticatedRequest).user = decoded;

        next();
    } catch (error: any) {
        console.error('Token verification failed:', error.message || error);

        return throwError('Invalid or expired token', 403);
    }
};