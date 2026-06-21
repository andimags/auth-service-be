import { body } from 'express-validator';

export const destroyTokenValidator = [
    body('refresh_token')
        .notEmpty()
        .withMessage('Refresh token is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Refresh token must have minimum of 2 characters'),
];
