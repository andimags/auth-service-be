import { body } from 'express-validator';
import { checkUniqueRefNameScope } from '../role/checkUniqueRefNameScope';

export const updateValidator = [
    body('name')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Name must have minimum of 2 characters'),

    body('description')
        .optional(),

    body('ref_name')
        .optional()
        .matches(/^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$/)
        .withMessage('Ref name may include letters, numbers, colons, underscores, or dashes between words')
        .custom(checkUniqueRefNameScope),

    body('module')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Module must have minimum of 2 characters'),

    body('scope')
        .optional()
        .isIn(['global', 'channel'])
        .withMessage("Scope value must only be either 'channel' or 'global'"),

    body('access_level')
        .optional()
        .isIn(['read', 'write', 'admin'])
        .withMessage("Access level value must only be either 'read', 'write', or 'admin"),

    
    body('sequence')
        .optional()
        .isInt({min: 1})
        .withMessage("Sequence must be greater or equal to 1"),
];
