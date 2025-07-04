import request from 'supertest';
import app from '../src/app';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { forceDeleteInstances, generateUserData } from './utils';

describe('Auth Routes', () => {
    let token: string;
    let authUser: User | null;

    const AGENT = request.agent(app); // preserves cookies
    const DEFAULT_PASSWORD = 'abcd1234';

    beforeAll(async () => {
        await sequelize.sync(); // or authenticate() if DB is already ready
        authUser = await User.create(generateUserData());

        const res = await AGENT.post('/api/auth/generate-token').send({
            email: authUser.email,
            password: DEFAULT_PASSWORD
        });

        token = res.body.token;
    });

    afterAll(async () => {
        await forceDeleteInstances([authUser!]);
        await sequelize.close();
    });

    describe('POST /api/auth/generate-token', () => {
        it('should return 200 with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/generate-token')
                .send({
                    email: 'superadmin@gmail.com',
                    password: 'abcd1234'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe(1);
            expect(response.body).toHaveProperty('token');
        });

        it('should return 401 with invalid credentials (user not existing)', async () => {
            await request(app)
                .post('/api/auth/generate-token')
                .send({
                    email: 'superadmin123@gmail.com',
                    password: 'abcd12345'
                })
                .expect('Content-Type', /json/)
                .expect(401)
                .expect({
                    message: 'User not found'
                });
        });

        it('should return 401 with invalid credentials (incorrect email or password)', async () => {
            await request(app)
                .post('/api/auth/generate-token')
                .send({
                    email: 'superadmin@gmail.com',
                    password: 'abcd12345'
                })
                .expect('Content-Type', /json/)
                .expect(401)
                .expect({
                    message: 'Invalid email or password'
                });
        });
    });

    describe('GET /api/auth/verify-token', () => {
        it('should return 200 with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/verify-token')
                .set('Authorization', `Bearer ${token}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe(1);
            expect(response.body).toHaveProperty('decoded');
        });

        it('should return 403 with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/verify-token')
                .set('Authorization', `Bearer ${token}xxx`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toEqual({
                message: 'Invalid or expired token'
            });
        });
    });

    describe('GET /api/auth/refresh-token', () => {
        it('should return 200 with refreshed token', async () => {
            const response = await AGENT.get('/api/auth/refresh-token')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe(1);
            expect(response.body).toHaveProperty('token');
        });

        it('should return 403 refreshed token', async () => {
            const response = await request(app)
                .get('/api/auth/refresh-token')
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({ message: 'Token not found' });
        });
    });
});
