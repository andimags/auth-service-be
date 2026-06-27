import { body, param } from 'express-validator';
import { isStringOrArrayOfStrings } from '../custom/isStringOrArrayOfStrings';

export const addValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer'),

    body('policy_ref_names')
        .notEmpty()
        .withMessage('Policy ref names are required')
        .bail()
        .custom(isStringOrArrayOfStrings('ref names'))
];
