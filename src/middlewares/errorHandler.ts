import { NextFunction, Request, Response } from 'express';
import { AxiosError } from 'axios'; // optional, if you use Axios in your services

export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype); // Required for instanceof
    }
    }

    export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
    ) => {
    console.error('Backend error:', err);

    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof AxiosError) {
        // Optional: if your backend services throw Axios errors
        statusCode = err.response?.status || 500;
        message = err.response?.data?.message || err.message;
    } else if (err instanceof Error) {
        message = err.message;
    }

    // Always return JSON with consistent structure
    res.status(statusCode).json({
        status: 0, // 0 = failure, 1 = success
        message,
    });
};
