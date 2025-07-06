import { param } from 'express-validator';

export const findValidator = [
    param('channel_id')
        .notEmpty()
        .withMessage('Channel ID is required')
        .bail()
        .isInt()
        .withMessage('Channel ID must be integer')
];
