import { body, param } from 'express-validator';
import Policy from '../../database/models/Policy';
import { isUniqueField } from '../custom/isUniqueField';

export const updateValidator = [
    param('policy_id')
        .notEmpty()
        .withMessage('Policy ID is required')
        .bail()
        .isInt()
        .withMessage('Policy ID must be integer'),

    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Name must have minimum of 2 characters'),

    body('description').optional(),

    body('ref_name')
        .notEmpty()
        .withMessage('Ref name is required')
        .bail()
        .matches(/^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$/)
        .withMessage(
            'Ref name may include letters, numbers, colons, underscores, or dashes between words'
        )
        .custom(isUniqueField(Policy, 'ref_name', 'Ref name')),

    body('is_system')
        .optional()
        .isBoolean()
        .withMessage('Is system must be a boolean value'),
];
