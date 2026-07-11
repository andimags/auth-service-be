// validationMiddleware.ts
import { NextFunction, Request, Response } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';
import { HttpStatus } from '../constants/httpStatus';

export const validationMiddleware = (validations: ValidationChain[]) => {
    return [
        ...validations,
        (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new AppError('Validation failed', HttpStatus.BAD_REQUEST, errors.array()));
            }
            next();
        },
    ];
};