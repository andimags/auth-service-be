import { NextFunction, Request, Response } from 'express';
import Policy from '../database/models/Policy';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';
import { HttpStatus } from '../constants/httpStatus';

const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

const find = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

        res.json(targetPolicy);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const newPolicy = await Policy.create(req.body);

        res.json(newPolicy);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

        await targetPolicy?.update(req.body);

        res.json(targetPolicy);
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policy = await Policy.findByPk(req.params.policy_id);
        if (!policy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

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
