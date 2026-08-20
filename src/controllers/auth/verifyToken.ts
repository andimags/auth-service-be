import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middlewares/errorHandler';
import { HttpStatus } from '../../constants/httpStatus';

/**
 * GET /api/auth/verify-token — decode and echo back the current bearer access
 * token's JWT payload. Useful for debugging/introspection.
 */
export const verifyToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', HttpStatus.NOT_FOUND);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);

        res.json({ decoded });
    } catch (error: unknown) {
        next(error);
    }
};
