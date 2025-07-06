import { param } from 'express-validator';

export const deleteValidator = [
    param('permission_id')
        .notEmpty()
        .withMessage('Permission ID is required')
        .bail()
        .isInt()
        .withMessage('Permission ID must be integer')
];
