import { body } from 'express-validator';
import Permission from '../../database/models/Permission';
import { isUniqueField } from '../custom/isUniqueField';

export const updateValidator = [
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
        .custom(isUniqueField(Permission, 'ref_name', 'ref name')),

    body('module')
        .notEmpty()
        .withMessage('Module is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Module must have minimum of 2 characters'),

    body('access_level')
        .notEmpty()
        .withMessage('Access level is required')
        .bail()
        .isIn(['read', 'write', 'admin'])
        .withMessage(
            "Access level value must only be either 'read', 'write', or 'admin"
        )
];
