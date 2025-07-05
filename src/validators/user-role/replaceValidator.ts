import { body, param } from 'express-validator';
import { isIntegerOrArrayOfIntegers } from '../custom/isIntegerOrArrayOfIntegers';

export const replaceValidator = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .bail()
        .isInt()
        .withMessage('User ID must be integer'),

    body('role_ids')
        .notEmpty()
        .withMessage('Role IDs are required')
        .bail()
        .custom(isIntegerOrArrayOfIntegers('role IDs'))
];
