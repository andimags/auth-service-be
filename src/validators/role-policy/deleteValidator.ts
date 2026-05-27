import { body, param } from 'express-validator';
import { isIntegerOrArrayOfIntegers } from '../custom/isIntegerOrArrayOfIntegers';

export const deleteValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer'),

    body('policy_ids')
        .notEmpty()
        .withMessage('Policy IDs are required')
        .bail()
        .custom(isIntegerOrArrayOfIntegers('policy IDs'))
];
