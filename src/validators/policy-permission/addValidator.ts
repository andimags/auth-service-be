import { body, param } from 'express-validator';
import { isStringOrArrayOfStrings } from '../custom/isStringOrArrayOfStrings';

export const addValidator = [
    param('policy_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt()
        .withMessage('Policy ID must be integer'),

    body('permission_ref_names')
        .notEmpty()
        .withMessage('Permission ref names are required')
        .bail()
        .custom(isStringOrArrayOfStrings('permission ref names'))
];
