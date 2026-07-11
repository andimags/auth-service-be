import { body, param } from 'express-validator';
import Permission from '../../database/models/Permission';
import { isUniqueField } from '../custom/isUniqueField';

export const updateValidator = [
    param('permission_id')
        .notEmpty()
        .withMessage('Permission ID is required')
        .bail()
        .isInt()
        .withMessage('Permission ID must be integer'),

    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Name must have minimum of 2 characters'),

    body('description').optional(),

    // Bug fix: isUniqueField's paramName arg was omitted, so it defaulted to
    // looking up req.params.id — but this route's param is permission_id. That
    // made currentId always null/undefined, so the "same record, unchanged
    // ref_name" exemption never matched and every update (ref_name is required
    // above) unconditionally failed as "already exists".
    body('ref_name')
        .notEmpty()
        .withMessage('Ref name is required')
        .bail()
        .matches(/^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$/)
        .withMessage(
            'Ref name may include letters, numbers, colons, underscores, or dashes between words'
        )
        .custom(isUniqueField(Permission, 'ref_name', 'ref name', 'permission_id')),

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
            "Access level value must only be either 'read', 'write', or 'admin'"
        )
];
