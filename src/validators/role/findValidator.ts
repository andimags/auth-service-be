import { param } from 'express-validator';

export const findValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt({ allow_leading_zeroes: false })
        .withMessage('Role ID must be integer')
];
