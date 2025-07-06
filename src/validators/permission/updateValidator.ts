import { body } from 'express-validator';
import { checkUniqueRefNameScope } from '../role/checkUniqueRefNameScope';

export const updateValidator = [
    body('name')
        .optional()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .isLength({ min: 2 })
        .withMessage('Name must have minimum of 2 characters'),

    body('description')
        .optional(),

    body('ref_name')
        .optional()
        .notEmpty()
        .withMessage('Ref name cannot be empty')
        .matches(/^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$/)
        .withMessage('Ref name may include letters, numbers, colons, underscores, or dashes between words')
        .custom(checkUniqueRefNameScope),

    body('module')
        .optional()
        .notEmpty()
        .withMessage('Module cannot be empty')
        .isLength({ min: 2 })
        .withMessage('Module must have minimum of 2 characters'),

    body('scope')
        .optional()
        .notEmpty()
        .withMessage('Scope cannot be empty')
        .isIn(['global', 'channel'])
        .withMessage("Scope value must only be either 'channel' or 'global'"),

    body('access_level')
        .optional()
        .notEmpty()
        .withMessage('Access level cannot be empty')
        .isIn(['read', 'write', 'admin'])
        .withMessage("Access level value must only be either 'read', 'write', or 'admin"),

    
    body('sequence')
        .optional()
        .isInt({min: 1})
        .withMessage("Sequence must be greater or equal to 1"),
];
