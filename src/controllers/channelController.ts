import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Number.parseInt(req.query.page as string);
        const size = Number.parseInt(req.query.size as string);

        if(!req.query.page && !req.query.size){
            const channels = await Channel.findAll({
                ...(req.channel?.id && {
                    where: {
                        id: req.channel.id,
                    },
                }),
            });
            res.json(channels);
            return;
        }

        const searchTerm = (req.query.search as string) || undefined;
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedChannels = await paginate(
            Channel,
            page - 1,
            size,
            {
                searchTerm: searchTerm,
                stringFields: ['name', 'description', 'ref_name'],
                baseWhere: {
                    ...(req.channel?.id && {
                        id: req.channel.id,
                    }),
                }
            },
            {
                field: sortField,
                desc: sortDesc
            }
        );

        res.json(paginatedChannels);
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channel = await Channel.findByPk(req.params.channel_id);
        if (!channel) throw new AppError('Channel not found', 404);

        if (!req.isGlobalScope && (req.channel?.id !== channel.id)) {
            throw new AppError(
                `Access is limited to the API key's channel`,
                403
            );
        }

        res.json(channel);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channel = await Channel.create(req.body);

        res.json(channel);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channel = await Channel.findByPk(req.params.channel_id);
        if (!channel) throw new AppError('Channel not found', 404);

        const isAllowed = req.isGlobalScope || (req.channel?.id === channel.id);

        if (!req.isGlobalScope && !isAllowed) {
            throw new AppError(
                "You can only update channels you're associated to",
                403
            );
        }

        await channel?.update(req.body);

        res.json(channel);
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const channel = await Channel.findByPk(req.params.channel_id, {
            paranoid: false
        });
        
        if (!channel) throw new AppError('Channel not found', 404);

        const isAllowed = req.isGlobalScope || (req.channel?.id === channel.id);

        if (!req.isGlobalScope && !isAllowed) {
            throw new AppError(
                "You can only delete channels you're associated to",
                403
            );
        }

        await channel?.destroy({ force: shouldForce });

        res.json({
            message: shouldForce
                ? 'Channel successfully deleted permanently'
                : 'Channel successfully soft-deleted'
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
