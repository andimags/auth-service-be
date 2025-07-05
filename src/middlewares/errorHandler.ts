import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype); // Required for instanceof
    }
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);
    res.status(err.statusCode ?? 500).json({
        message: err.message || 'Internal Server Error'
    });
};
