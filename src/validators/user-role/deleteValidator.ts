import { body, param } from 'express-validator';
import { isStringOrArrayOfStrings } from '../custom/isStringOrArrayOfStrings';

export const deleteValidator = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .bail()
        .isInt()
        .withMessage('User ID must be integer'),

    body('role_ref_names')
        .notEmpty()
        .withMessage('Role ref names are required')
        .bail()
        .custom(isStringOrArrayOfStrings('ref names'))
];
