import { param } from 'express-validator';

export const getValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer')
];
