import { Channel } from "../models/Channel";
import { User } from "../models/User";

declare global {
    namespace Express {
        interface Request {
        authorizedUser?: User;
        channel?: Channel;
        isGlobalScope?: boolean;
        }
    }
}