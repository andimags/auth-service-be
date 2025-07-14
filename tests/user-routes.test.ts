import request from 'supertest';
import app from '../src/app';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import { IAuth } from './types';
import {
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateToken,
    generateUserData
} from './utils';

describe('User Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null
    };

    const NON_EXISTENT_USER_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/users';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser();
        const superadminRole = await Role.findOne({
            where: { ref_name: 'superadmin' }
        });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminAuth.user!.addRoles([superadminRole]);

        userWithNoPermissionsAuth.user = await User.create(
            await generateUserData()
        );
        userWithNoPermissionsAuth.accessToken = await generateToken(
            userWithNoPermissionsAuth.user.email,
            DEFAULT_PASSWORD
        );
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await userWithNoPermissionsAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/users', () => {
        it("should return 200 with users' data", async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: expect.any(Number),
                count: expect.any(Number),
                rows: expect.any(Array),
                totalPages: expect.any(Number),
                currentPage: expect.any(Number)
            });

            response.body.rows.forEach((row: any) => {
                expect(row).toEqual(
                    expect.objectContaining({
                        id: expect.any(Number),
                        username: expect.any(String),
                        email: expect.any(String),
                        first_name: expect.any(String),
                        last_name: expect.any(String),
                        status: expect.any(String),
                        created_at: expect.any(String),
                        updated_at: expect.any(String),
                        deleted_at: null
                    })
                );
            });
        });

        it("should return 403 when user doesn't have necessary permissions ['view:user', 'admin:user]", async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${userWithNoPermissionsAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('POST /api/users/', () => {
        it('should return 200 with newly created user data', async () => {
            const payload = generateUserData();

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    status: payload.status,
                    id: expect.any(Number),
                    username: payload.username,
                    email: payload.email,
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    updated_at: expect.any(String),
                    created_at: expect.any(String),
                    deleted_at: null
                }
            });

            const createdUser = await User.findByPk(response.body.data.id);
            await forceDeleteInstances([createdUser!]);
        });

        it("should return 403 when authorized user doesn't have necessary permissions", async () => {
            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${userWithNoPermissionsAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(await generateUserData())
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('PUT /api/users/:user_id', () => {
        it('should return 200 with newly updated user data', async () => {
            const targetUser = await User.create(generateUserData());
            const payload = generateUserData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    id: expect.any(Number),
                    username: payload.username,
                    email: payload.email,
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    status: payload.status,
                    created_at: expect.any(String),
                    updated_at: expect.any(String),
                    deleted_at: null
                }
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 404 with non-existent target user', async () => {
            const response = await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(await generateUserData())
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });
        });

        it('should return 403 with authorized user without permissions', async () => {
            const targetUser = await User.create(generateUserData());
            const payload = generateUserData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${userWithNoPermissionsAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 with authorized user having low level role compared to the target user', async () => {
            const targetUser = await User.create(generateUserData());
            const targetUserRole = await createRole(
                ['admin:user', 'update:user'],
                undefined,
                3
            );
            await targetUser.setRoles(targetUserRole);

            // Auth user must have lower level of role than the target user
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['admin:user', 'update:user'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const payload = generateUserData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetUser.id}`)
                .set({
                    Authorization: `Bearer ${customAuthUser.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    "You can't update a user with the same or higher privilege / role level than you"
            });

            await forceDeleteInstances([
                targetUser,
                targetUserRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });
    });

    describe('DELETE /api/users/:user_id', () => {
        it('should return 200 with the deleted user data', async () => {
            const targetUser = await User.create(generateUserData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                message: 'User successfully soft-deleted'
            });

            forceDeleteInstances([targetUser]);
        });

        it('should return 200 when force deleting a user', async () => {
            const targetUser = await User.create(generateUserData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetUser!.id}?force=true`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                message: 'User successfully deleted permanently'
            });
        });

        it('should return 404 with non-existent user ID', async () => {
            const response = await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({ message: 'User not found' });
        });

        it("should return 403 when authorized user doesn't have required permission", async () => {
            const targetUser = await User.create(generateUserData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetUser.id}`)
                .set({
                    Authorization: `Bearer ${userWithNoPermissionsAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            forceDeleteInstances([targetUser]);
        });

        it('should return 403 when deleting the main superadmin', async () => {
            // Do not delete
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetUser?.id}`) // Deleting the main superadmin
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Cannot delete superadmin user'
            });
        });

        it('should return 403 when deleting a user with higher privilege than you', async () => {
            const targetUser = await User.create(generateUserData());
            const targetUserRole = await createRole(
                ['admin:user', 'delete:user'],
                undefined,
                3
            );
            await targetUser.setRoles(targetUserRole);

            // Auth user must have lower level of role than the target user
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['admin:user', 'delete:user'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${customAuthUser.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    "You can't delete a user with the same or higher privilege / role level than you"
            });

            await forceDeleteInstances([
                targetUser,
                targetUserRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });
    });
});
