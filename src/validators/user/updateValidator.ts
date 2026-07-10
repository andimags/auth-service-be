import { body, param } from 'express-validator';
import { UserStatusType } from '../../constants/enums';
import User from '../../database/models/User';

export const updateValidator = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .bail()
        .isInt()
        .withMessage('User ID must be integer'),

    body('username')
        .optional()
        .notEmpty()
        .withMessage('Username cannot be empty')
        .isLength({ min: 3 })
        .withMessage('Username must have minimum of 3 characters')
        .custom(async (username, { req }) => {
            // Find user with the same username
            const existingUser = await User.findOne({ where: { username } });

            // If user exists and is not the same as the one being updated
            if (
                existingUser &&
                existingUser.id !== Number(req.params?.user_id)
            ) {
                throw new Error('Username already exists');
            }

            return true;
        }),

    body('email')
        .optional()
        .notEmpty()
        .withMessage('Email cannot be empty')
        .isEmail()
        .withMessage('Email has invalid format')
        .custom(async (email, { req }) => {
            // Find user with the same email
            const existingUser = await User.findOne({ where: { email } });

            // If user exists and is not the same as the one being updated
            if (
                existingUser &&
                existingUser.id !== Number(req.params?.user_id)
            ) {
                throw new Error('Email already exists');
            }

            return true;
        }),

    body('first_name')
        .optional()
        .notEmpty()
        .withMessage('First name cannot be empty')
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(
            'First name can only contain letters, spaces, apostrophes, and hyphens'
        ),

    body('last_name')
        .optional()
        .notEmpty()
        .withMessage('Last name cannot be empty')
        .isLength({ min: 2 })
        .withMessage('First name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(
            'First name can only contain letters, spaces, apostrophes, and hyphens'
        ),

    body('status')
        .optional()
        .notEmpty()
        .withMessage('Status cannot be empty')
        .isIn(Object.values(UserStatusType))
        .withMessage('Status values must be either active or inactive only'),

    body('password')
        .optional()
        .notEmpty()
        .withMessage('Password cannot be empty')
        .isLength({ min: 8 })
        .withMessage('Password must have minimum of 8 characters')
];
