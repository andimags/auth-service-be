import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { forceDeleteInstances, generateUserData } from './utils';

describe('Auth Routes', () => {
    let accessToken: string;
    let refreshToken: string;
    let authUser: User | null;

    const AGENT = request.agent(app); // preserves cookies
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/auth';

    beforeAll(async () => {
        await sequelize.sync(); // or authenticate() if DB is already ready
        authUser = await User.create(generateUserData());

        const res = await AGENT.post(`${API_BASE_URL}/generate-token`)
            .set({
                'x-api-key': 'global'
            })
            .send({
                email: authUser.email,
                password: DEFAULT_PASSWORD,
            });

        // Bug fix: the response shape is { user, permissions, tokens: { access:
        // { value, expires_at }, refresh: { value, expires_at } } } — there is no
        // top-level access_token/status field.
        accessToken = res.body.tokens?.access?.value;
        refreshToken = res.body.tokens?.refresh?.value;
    });

    afterAll(async () => {
        await forceDeleteInstances([authUser!]);
        await sequelize.close();
    });

    describe('POST /api/auth/generate-token', () => {
        it('should return 200 with valid credentials', async () => {
            const response = await request(app)
                .post(`${API_BASE_URL}/generate-token`)
                .set({
                    'x-api-key': 'global'
                })
                .send({
                    email: 'superadmin@gmail.com',
                    password: 'abcd1234'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('permissions');
            expect(response.body).toHaveProperty('tokens.access.value');
            expect(response.body).toHaveProperty('tokens.refresh.value');
        });

        it('should return 401 with invalid credentials (user not existing)', async () => {
            await request(app)
                .post(`${API_BASE_URL}/generate-token`)
                .set({
                    'x-api-key': 'global'
                })
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
                .post(`${API_BASE_URL}/generate-token`)
                .set({
                    'x-api-key': 'global'
                })
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
            // Bug fix: this route also runs checkApiKeyMiddleware, which needs
            // x-api-key — without it every request 403s before reaching the
            // controller. Response shape is { decoded }, no top-level status field.
            const response = await request(app)
                .get(`${API_BASE_URL}/verify-token`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('x-api-key', 'global')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('decoded');
        });

        it('should return 403 with invalid token', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/verify-token`)
                .set('Authorization', `Bearer ${accessToken}xxx`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toEqual({
                message: 'Invalid or expired token'
            });
        });
    });

    describe('POST /api/auth/refresh-token', () => {
        it('should return 200 with refreshed token', async () => {
            // Bug fix: refresh-token is a POST route reading refresh_token from the
            // body — this previously sent a GET with no body, which doesn't match
            // any route and falls through into the global authMiddleware (hence the
            // "Unauthorized: No token provided" failure).
            const response = await AGENT.post(`${API_BASE_URL}/refresh-token`)
                .set({
                    'x-api-key': 'global'
                })
                .send({
                    refresh_token: refreshToken
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('permissions');
            expect(response.body).toHaveProperty('tokens.access.value');
            expect(response.body).toHaveProperty('tokens.refresh.value');
        });

        // it('should return 403 refreshed token', async () => {
        //     const response = await request(app)
        //         .get(`${API_BASE_URL}/refresh-token`)
        //         .expect('Content-Type', /json/)
        //         .expect(403);

        //     expect(response.body).toEqual({ message: 'Token not found' });
        // });
    });

    // describe('GET /api/auth/has-any-permission', () => {
    //     it('should return 200 with refreshed token', async () => {
    //         const customAuthUser: IAuth = await createAuthUser();
    //         const customAuthUserRole = await createRole(['auth:view:user']);
    //         await customAuthUser.user?.setRoles(customAuthUserRole);

    //         const payload = {
    //             permission_ref_names: 'auth:view:user',
    //             permission_scope: 'global'
    //         };

    //         const response = await AGENT
    //             .get(`${API_BASE_URL}/has-any-permission`)
    //             .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
    //             .send(payload)
    //             .expect('Content-Type', /json/)
    //             // .expect(200);

    //         expect(response.body).toMatchObject({
    //             status: 1
    //         });

    //         await forceDeleteInstances([customAuthUser.user!]);
    //     });

    //     it('should return 403 when authorized user has no permissions or permissions does not exist', async () => {
    //         const customAuthUser: IAuth = await createAuthUser();

    //         const payload = {
    //             permission_ref_names: 'auth:view:user',
    //             permission_scope: 'global'
    //         };

    //         const response = await AGENT
    //             .get(`${API_BASE_URL}/has-any-permission`)
    //             .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
    //             .send(payload)
    //             .expect('Content-Type', /json/)
    //             .expect(403);

    //         expect(response.body).toMatchObject({
    //             message: 'Unauthorized'
    //         });

    //         await forceDeleteInstances([customAuthUser.user!]);
    //     });
    // });
});
