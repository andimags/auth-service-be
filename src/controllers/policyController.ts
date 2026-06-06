import { NextFunction, Request, Response } from 'express';
import Policy from '../database/models/Policy';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Number.parseInt(req.query.page as string);
        const size = Number.parseInt(req.query.size as string);

        if(!req.query.page && !req.query.size){
            const policies = await Policy.findAll();
            res.json(policies);
            return;
        }

        const searchTerm = (req.query.search as string) || undefined;
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedPolicies = await paginate(
            Policy,
            page - 1,
            size,
            {
                baseWhere: req.channel ? { channel_id: req.channel.id } : undefined,
                searchTerm: searchTerm,
                stringFields: ['name', 'description', 'ref_name']
            },
            {
                field: sortField,
                desc: sortDesc
            }
        );

        res.json({
            status: 1,
            ...paginatedPolicies
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        res.json(targetPolicy);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.isGlobalScope && req.channel?.id != req.body.channel_id) {
            throw new AppError(
                'You can only add policies within your channel',
                403
            );
        }

        const newPolicy = await Policy.create(req.body);

        res.json(newPolicy);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        await targetPolicy?.update(req.body);

        res.json(targetPolicy);
    } catch (error: unknown) {
        next(error);
        return;
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const policy = await Policy.findByPk(req.params.policy_id);
        if (!policy) throw new AppError('Policy not found', 404);

        const shouldForce = req.query.force === 'true';

        await policy?.destroy({ force: shouldForce });

        res.json({
            message: shouldForce
                ? 'Policy successfully deleted permanently'
                : 'Policy successfully soft-deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getAll,
    find,
    add,
    update,
    destroy
};
