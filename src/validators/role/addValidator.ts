import { body } from 'express-validator';
import { isUniqueField } from '../custom/isUniqueField';
import { RoleScopeType } from '../../constants/enums';
import Role from '../../database/models/Role';

export const addValidator = [
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
        .custom(isUniqueField(Role, 'ref_name', 'ref name')),

    body('channel_id')
        .optional({ nullable: true })
        .toInt()
        .isInt({ min: 1 })
        .withMessage('Channel ID must be a numeric integer'),

    body('scope')
        .notEmpty()
        .withMessage('Scope is required')
        .bail()
        .isIn(Object.values(RoleScopeType))
        .withMessage("Scope value must only be either 'channel' or 'global'"),
];
