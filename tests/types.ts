import User from "../src/database/models/User";

export interface IAuth {
    accessToken: string | null;
    user: User | null;
}