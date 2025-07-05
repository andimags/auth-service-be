import { body } from 'express-validator';
import User from '../../database/models/User';

export const addValidator = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .bail()
        .isLength({ min: 3 })
        .withMessage('Username must have minimum of 3 characters')
        .custom(async (username) => {
            const existingUser = await User.findOne({where: {username: username}});

            if (existingUser) {
                throw new Error('Username already exists');
            }

            return true;
        }),

    body('email')
        .notEmpty()
        .withMessage('Username is required')
        .bail()
        .isEmail()
        .withMessage('Email has invalid format')
        .custom(async (email) => {
            const existingUser = await User.findOne({where: {email: email}});

            if (existingUser) {
                throw new Error('Email already exists');
            }

            return true;
        }),

    body('first_name')
        .notEmpty()
        .withMessage('First name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(
            'First name can only contain letters, spaces, apostrophes, and hyphens'
        ),

    body('last_name')
        .notEmpty()
        .withMessage('First name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(
            'First name can only contain letters, spaces, apostrophes, and hyphens'
        ),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status values must be either active or inactive only'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .bail()
        .isLength({ min: 8 })
        .withMessage('Password must have minimum of 8 characters')
];
