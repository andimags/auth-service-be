import { body, param } from 'express-validator';

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
        .custom((value) => {
            // If it's a single value, convert it to an array
            const values = Array.isArray(value) ? value : [value];

            // Validate all are integers
            if (!values.every((v) => Number.isInteger(Number(v)))) {
                throw new Error('All role IDs must be integers');
            }

            return true;
        })
];
