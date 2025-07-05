import { param } from 'express-validator';

export const getValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('User ID is required')
        .bail()
        .isInt()
        .withMessage('User ID must be integer')
];
