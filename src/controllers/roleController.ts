import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { checkPermissionLevel } from '../services/permissionService';
import { IRequestWithUserAndChannel } from '../types';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        let roles = null;

        if(customReq.isGlobalRole){
            roles = await Role.findAll({ include: Channel });
        }
        else{
            roles = await Role.findAll({ include: Channel, where: {channel_id: customReq?.channel?.id} });
        }

        res.json({
            status: 1,
            data: roles
        });

    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.scope('withChannel').findByPk(req.params.role_id);

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });
        }

        if(!customReq.isGlobalRole && role?.channel_id != customReq?.channel?.id){
            throw new AppError('Unauthorized to access roles outside your channel.', 403);
        }

        res.json({
            status: 1,
            data: role
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.create(req.body);
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            ['add:role', 'admin:role'], 
            authorizedUser,
            true
        ))!;

        if(!customReq.isGlobalRole && customReq.channel?.id != customReq.body.channel_id){
            throw new AppError("You can only add roles within your channel.", 403);
        }

        console.log('customReq.body.level', customReq.body.level);
        console.log('authorizeUserRoleLevel', authorizeUserRoleLevel)

        // Level with value 1 is the highest
        if(customReq.body.level <= authorizeUserRoleLevel){
            throw new AppError("You can only add roles with a lower level than yours.", 403);
        }

        const roleWithChannel = await Role.findByPk(role.id, { include: Channel });

        res.json({
            status: 1,
            data: roleWithChannel
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.findByPk(req.params.role_id);
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            ['add:role', 'admin:role'], 
            authorizedUser,
            true
        ))!;

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });

            return;
        }

        if(!customReq.isGlobalRole && customReq.channel?.id != role.channel_id){
            throw new AppError("You can only update roles within your channel.", 403);
        }

        if(role.level <= authorizeUserRoleLevel){
            throw new AppError("You can't update level field with a higher level than yours", 403);
        }

        // Level with value 1 is the highest
        if(customReq.body.level <= authorizeUserRoleLevel){
            throw new AppError("New value for level field must be lower level than yours.", 403);
        }

        await role?.update(req.body);

        res.json({
            status: 1,
            data: role
        });

        return;
    } catch (error: unknown) {
        next(error);
        return;
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.findByPk(req.params.role_id);
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            ['add:role', 'admin:role'], 
            authorizedUser,
            true
        ))!;

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });

            return;
        }

        if(!customReq.isGlobalRole && customReq.channel?.id != role.channel_id){
            throw new AppError("You can only delete roles within your channel.", 403);
        }

        // Level with value 1 is the highest
        if(role.level <= authorizeUserRoleLevel){
            throw new AppError("You can only delete roles with a lower level than yours.", 403);
        }

        await role?.destroy();

        res.json({
            status: 1
        });

        return;
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
