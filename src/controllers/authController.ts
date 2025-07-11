import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

const generateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findOne({
            attributes: { include: ['password'] },
            where: {
                email: req.body.email
            }
        });

        if (!user) throw new AppError('User not found', 401);

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) throw new AppError('Invalid email or password', 401);

        const token = jwt.sign(
            JSON.parse(JSON.stringify(user)),
            process.env.API_KEY!
        );

        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Protect from CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            status: 1,
            token: token
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies['refresh_token'];

        if (!token) throw new AppError('Token not found', 403);

        res.json({
            status: 1,
            token: token
        });
    } catch (error: unknown) {
        next(error);
    }
};

const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.API_KEY!);

        res.json({
            status: 1,
            decoded: decoded
        });
    } catch (error: unknown) {
        next(error);
    }
};

const hasAnyPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const hasPermissions = await (
            req.authorizedUser as User
        ).hasAnyPermission(
            req.body.permission_ref_names,
            req.body.permission_scope
        );

        if (hasPermissions) {
            res.json({
                status: 1
            });
        } else {
            throw new AppError('Unauthorized', 403);
        }
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    verifyToken,
    hasAnyPermission
};
