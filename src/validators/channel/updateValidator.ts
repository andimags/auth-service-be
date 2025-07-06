import { body } from 'express-validator';
import Channel from '../../database/models/Channel';
import { isUniqueField } from '../custom/isUniqueField';

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
        .custom(isUniqueField(Channel, 'ref_name', 'ref name'))
];
