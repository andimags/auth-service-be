import { body } from 'express-validator';

export const updateValidator = [
    body('username')
        .optional()
        .isLength({ min: 3 })
        .withMessage('Username must have minimum of 3 characters'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Email has invalid format'),

    body('first_name')
        .optional()
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, apostrophes, and hyphens'),

    body('last_name')
        .optional()
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, apostrophes, and hyphens'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status values must be either active or inactive only'),

    body('password')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Password must have minimum of 8 characters')
];