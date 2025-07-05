import { body, param } from 'express-validator';
import { isIntegerOrArrayOfIntegers } from '../custom/isIntegerOrArrayOfIntegers';

export const deleteValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer'),

    body('permission_ids')
        .notEmpty()
        .withMessage('Permission IDs are required')
        .bail()
        .custom(isIntegerOrArrayOfIntegers('permission IDs'))
];
