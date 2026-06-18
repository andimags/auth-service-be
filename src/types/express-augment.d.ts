import Channel from '../database/models/Channel';
import User from '../database/models/User';

declare module 'express-serve-static-core' {
    interface Request {
        authorizedUser?: User;
        channel?: Channel;
        isGlobalScope?: boolean;
    }
}