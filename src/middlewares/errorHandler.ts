import { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
    status?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(err.status ?? 500).json({
        message: err.message || 'Internal Server Error'
    });
};

export const throwError = (message: string, status: number = 500) => {
    const error: AppError = new Error(message) as AppError;
    error.status = status;
    throw error;
};
