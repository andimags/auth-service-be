/**
 * File: eslint.config.js
 * Path: src/
 * Description: ESLint configuration file (new format for ESLint v9.x)
 */

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    // Base ESLint configuration for JavaScript files
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: true
        }
    },

    // TypeScript specific configuration
    {
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json'
            }
        },
        rules: {
            // TypeScript specific rules
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-empty-interface': 'warn',

            // Indent with 4 spaces
            'indent': ['error', 4, { 'SwitchCase': 1 }],

            // Require semicolons
            'semi': ['error', 'always'],

            // Use single quotes
            'quotes': ['error', 'single', { 'avoidEscape': true }],

            // Console warnings (allow in development)
            'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

            // Prefer const over let
            'prefer-const': 'error',

            // Avoid var
            'no-var': 'error',

            // Async/await consistency
            'require-await': 'error',

            // No unused vars (handled by TypeScript rule above)
            'no-unused-vars': 'off'
        }
    },

    // Test file specific configuration
    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'require-await': 'off'
        }
    },

    // Configuration file specific settings
    {
        files: ['eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
        }
    },

    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '**/*.js',
            '!eslint.config.js'
        ]
    }
];
