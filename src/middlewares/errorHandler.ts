import { AxiosError } from "axios";
import { ErrorRequestHandler } from "express";

export class AppError extends Error {
    statusCode: number;
    details?: unknown;
    isOperational: boolean; // true = expected/handled error, false = a bug that slipped through

    constructor(message: string, statusCode: number = 500, details?: unknown) {
        super(message);
        // this.name = 'Backend Error';
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err);

    let statusCode = 500;
    let message = 'Internal Server Error';
    let details: unknown;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    } else if (err instanceof AxiosError) {
        statusCode = err.response?.status || 500;
        message = err.response?.data?.message || err.message;
    } else if (err instanceof Error) {
        message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    }

    res.status(statusCode).json({
        message,
        ...(details !== undefined && { details }),
    });
};