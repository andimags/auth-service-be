import { CustomValidator } from 'express-validator';

export const isUniqueField = (instance: any, field: string): CustomValidator => {
    return async (value) => {
        const existing = await instance.findOne({ where: { [field]: value } });
        const fieldTitleCase = field.charAt(0).toUpperCase() + field.slice(1).toLowerCase();
        
        if (existing) {
            throw new Error(`${fieldTitleCase} already exists`);
        }

        return true;
    };
};
