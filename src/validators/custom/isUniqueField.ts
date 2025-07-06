import { CustomValidator } from 'express-validator';

export const isUniqueField = (instance: any, field: string, label?: string): CustomValidator => {
    return async (value) => {
        const existing = await instance.findOne({ where: { [field]: value } });
        const _label = field ?? label;
        const labelTitleCase = _label.charAt(0).toUpperCase() + _label.slice(1).toLowerCase();
        
        if (existing) {
            throw new Error(`${labelTitleCase} already exists`);
        }

        return true;
    };
};
