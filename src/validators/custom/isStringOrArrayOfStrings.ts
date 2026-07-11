import { CustomValidator } from 'express-validator';

export const isStringOrArrayOfStrings =
    (label = 'Values'): CustomValidator =>
        (value) => {
            const values = Array.isArray(value) ? value : [value];

            const allStrings = values.every(
                (v) => typeof v === 'string'
            );

            if (!allStrings) {
                throw new Error(`All ${label} must be strings`);
            }

            return true;
        };