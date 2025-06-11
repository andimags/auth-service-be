import { Request } from 'express';

export interface IAuthenticatedRequest extends Request {
    user: IUser;
    isGlobalRole: boolean;
}

export interface IRequestWithChannel extends Request {
    channel?: IChannel;
}

export interface IRequestWithUserAndChannel extends IAuthenticatedRequest, IRequestWithChannel {}

export interface IRole {
    id: number;
    name: string;
    description: string;
    ref_name: string;
    scope: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface IUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    password: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface IChannel {
    id: number;
    name: string;
    description: string;
    ref_name: string;
    api_key: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface IPermission {
    id: number;
    name: string;
    description: string;
    ref_name: string;
    module: string;
    scope: string;
    access_level: string;
    sequence: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}
