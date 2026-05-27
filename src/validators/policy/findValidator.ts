import { param } from 'express-validator';

export const findValidator = [
    param('policy_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt({ allow_leading_zeroes: false })
        .withMessage('Policy ID must be integer')
];
