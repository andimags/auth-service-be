import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../database/models/User';
import { throwError } from '../middlewares/errorHandler';

const generateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        })

        if (!user) return throwError('User not found', 404, next);

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) return throwError('Invalid email or password', 404, next);

        const token = jwt.sign(JSON.parse(JSON.stringify(user)), process.env.API_KEY!);

        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: true,          // Only send over HTTPS
            sameSite: 'strict',    // Protect from CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            status: 1,
            token: token
        })
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['refresh_token'];
        
        if (!token) return throwError('Token not found', 404, next);

        res.json({
            status: 1,
            token: token
        })
    } catch (error: unknown) {
        next(error);
    }
};

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const token = req.header('x-api-key')?.split(' ')[1];

        if (!token) return throwError('Token not found', 404, next);

        const decoded = jwt.verify(token, process.env.API_KEY!);

        res.json({
            status: 1,
            decoded: decoded
        })
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    verifyToken
};
