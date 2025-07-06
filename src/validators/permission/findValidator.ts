import { param } from 'express-validator';

export const findValidator = [
    param('permission_id')
        .notEmpty()
        .withMessage('Permission ID is required')
        .bail()
        .isInt()
        .withMessage('Permission ID must be integer')
];
