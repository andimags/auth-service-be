import { body } from 'express-validator';
import Channel from '../../database/models/Channel';
import { isUniqueField } from '../custom/isUniqueField';

export const refreshTokenValidator = [
    body('refresh_token')
        .notEmpty()
        .withMessage('Refresh token is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Refresh token must have minimum of 2 characters'),
];
