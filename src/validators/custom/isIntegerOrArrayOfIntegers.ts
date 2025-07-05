import { CustomValidator } from 'express-validator';

export const isIntegerOrArrayOfIntegers =
    (label = 'Values'): CustomValidator =>
    (value) => {
        const values = Array.isArray(value) ? value : [value];

        const allIntegers = values.every((v) => Number.isInteger(Number(v)));

        if (!allIntegers) {
            throw new Error(`All ${label} must be integers`);
        }

        return true;
    };
