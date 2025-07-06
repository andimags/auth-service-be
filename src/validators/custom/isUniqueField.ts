import { CustomValidator } from 'express-validator';

export const isUniqueField = (instance: any, field: string): CustomValidator => {
    return async (value) => {
        const existing = await instance.findOne({ where: { [field]: value } });

        if (existing) {
            throw new Error(`${field} already exists`);
        }

        return true;
    };
};
