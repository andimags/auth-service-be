import { body, param } from 'express-validator';
import { isIntegerOrArrayOfIntegers } from '../custom/isIntegerOrArrayOfIntegers';

export const deleteValidator = [
    param('policy_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt()
        .withMessage('Policy ID must be integer'),

    body('permission_ids')
        .notEmpty()
        .withMessage('Permission IDs are required')
        .bail()
        .custom(isIntegerOrArrayOfIntegers('permission IDs'))
];
