import { body, param } from 'express-validator';
import { checkUniqueRefNameScope } from './checkUniqueRefNameScope';

export const updateValidator = [
    param('role_id')
        .notEmpty()
        .withMessage('Role ID is required')
        .bail()
        .isInt()
        .withMessage('Role ID must be integer'),

    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Name must have minimum of 2 characters'),

    body('description')
        .optional(),

    body('ref_name')
        .optional()
        .matches(/^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$/)
        .withMessage('Ref name may include letters, numbers, colons, underscores, or dashes between words')
        .custom(checkUniqueRefNameScope),

    body('channel_id')
        .optional()
        .isInt()
        .withMessage('Channel ID must be integer'),

    body('scope')
        .notEmpty()
        .withMessage('Scope is required')
        .bail()
        .isIn(['global', 'channel'])
        .withMessage("Scope value must only be either 'channel' or 'global'"),

    body('level')
        .notEmpty()
        .withMessage('Level is required')
        .bail()
        .isInt({min: 1})
        .withMessage('Level must be integer and be greater or equal to 1'),

];
