import { param } from 'express-validator';

export const getValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt()
        .withMessage('Policy ID must be integer')
];
