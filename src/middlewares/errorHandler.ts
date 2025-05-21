import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
    status: number;

    constructor(message: string, status: number = 500) {
        super(message);
        this.status = status;
        Object.setPrototypeOf(this, AppError.prototype); // Required for instanceof
    }
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(err.status ?? 500).json({
        message: err.message || 'Internal Server Error'
    });
};