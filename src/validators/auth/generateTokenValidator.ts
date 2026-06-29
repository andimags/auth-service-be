import { body } from 'express-validator';

export const generateTokenValidator = [
    body('email')
        .notEmpty()
        .withMessage('Username is required')
        .bail()
        .isEmail()
        .withMessage('Email has invalid format'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .bail(),
];
