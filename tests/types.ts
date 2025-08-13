import User from '../src/database/models/User';
import { TestAgent } from 'supertest';

export interface IAuth {
    accessToken: string | null;
    user: User | null;
    agent: TestAgent | null;
}
