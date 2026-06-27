import { CustomValidator } from 'express-validator';

export const isUniqueCompositeField = (
    instance: any,
    fields: string[],
    label?: string,
    paramName: string = 'id'
): CustomValidator => {
    return async (_, { req }) => {
        const where = fields.reduce(
            (acc, field) => ({
                ...acc,
                [field]: req.body[field],
            }),
            {}
        );

        const existing = await instance.findOne({ where });

        const _label = label ?? fields.join(' + ');
        const labelTitleCase =
            _label.charAt(0).toUpperCase() + _label.slice(1);

        if (existing) {
            const currentId = req.params?.[paramName] ?? null;

            // If updating and IDs don't match → throw error
            if (!currentId || String(existing.id) !== String(currentId)) {
                throw new Error(`${labelTitleCase} already exists`);
            }
        }

        return true;
    };
};