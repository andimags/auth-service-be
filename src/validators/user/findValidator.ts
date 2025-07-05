import { param } from 'express-validator';

export const findValidator = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .bail()
        .isInt()
        .withMessage('User ID must be integer')
];
