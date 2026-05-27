import { param } from 'express-validator';

export const deleteValidator = [
    param('policy_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt()
        .withMessage('Policy ID must be integer')
];
