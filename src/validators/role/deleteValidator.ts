import { param } from 'express-validator';

export const deleteValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer')
];
