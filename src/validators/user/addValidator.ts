import { body } from 'express-validator';
import { UserLevelType, UserStatusType } from '../../constants/enums';
import User from '../../database/models/User';
import { isUniqueField } from '../custom/isUniqueField';

export const addValidator = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .bail()
        .isLength({ min: 3 })
        .withMessage('Username must have minimum of 3 characters')
        .custom(isUniqueField(User, 'username')),

    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .bail()
        .isEmail()
        .withMessage('Email has invalid format')
        .custom(isUniqueField(User, 'email')),

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
        .withMessage('Last name is required')
        .bail()
        .isLength({ min: 2 })
        .withMessage('Last name must have minimum of 2 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(
            'Last name can only contain letters, spaces, apostrophes, and hyphens'
        ),

    body('status')
        .optional()
        .isIn(Object.values(UserStatusType))
        .withMessage('Status values must be either active or inactive only'),

    // Was previously unvalidated: a malformed level made isLevelMorePrivileged()
    // (called in userController.add before User.create) throw a plain Error,
    // which errorHandler surfaces as a 500 instead of a clean 400. The privilege
    // rank check itself still fully gates which *valid* level can be assigned.
    body('level')
        .optional()
        .isIn(Object.values(UserLevelType))
        .withMessage('Level must be a valid user level'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .bail()
        .isLength({ min: 8 })
        .withMessage('Password must have minimum of 8 characters')
];
