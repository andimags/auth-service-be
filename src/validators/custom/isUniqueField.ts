import { CustomValidator } from 'express-validator';

export const isUniqueField = (
    instance: any,
    field: string,
    label?: string,
    paramName: string = 'id' // default primary key field
): CustomValidator => {
    return async (value, { req }) => {
        const existing = await instance.findOne({ where: { [field]: value } });
        const _label = label ?? field;
        const labelTitleCase =
            _label.charAt(0).toUpperCase() + _label.slice(1).toLowerCase();

        if (existing) {
            const currentId = req.params?.[paramName as string] ?? null;
            console.log('currentId', currentId)

            // If updating and IDs don't match → throw error
            if (!currentId || String(existing['id']) !== String(currentId)) {
                throw new Error(`${labelTitleCase} already exists`);
            }
        }

        return true;
    };
};
