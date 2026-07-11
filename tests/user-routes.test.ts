import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { UserLevelType } from '../src/constants/enums';
import { IAuth } from './types';
import {
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateUserData
} from './utils';

describe('User Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null,
        apiKey: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null,
        apiKey: null
    };

    const NON_EXISTENT_USER_ID = 999999;
    const API_BASE_URL = '/api/users';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser('global', UserLevelType.superadmin);
        userWithNoPermissionsAuth = await createAuthUser();
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await userWithNoPermissionsAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/users', () => {
        it("should return 200 with users' data", async () => {
            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                count: expect.any(Number),
                rows: expect.any(Array),
                totalPages: expect.any(Number),
                currentPage: expect.any(Number)
            });

            expect(response.body.rows).toEqual(
                expect.arrayContaining([
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
                ])
            );
        });

        it("should return 403 when user doesn't have necessary permissions ['auth:view:user', 'admin:user]", async () => {
            const response = await userWithNoPermissionsAuth.agent
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

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: payload.status,
                id: expect.any(Number),
                username: payload.username,
                email: payload.email,
                first_name: payload.first_name,
                last_name: payload.last_name,
                updated_at: expect.any(String),
                created_at: expect.any(String),
                deleted_at: null
            });

            const createdUser = await User.findByPk(response.body.id);
            await forceDeleteInstances([createdUser!]);
        });

        it("should return 403 when authorized user doesn't have necessary permissions", async () => {
            const response = await userWithNoPermissionsAuth.agent
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

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                id: expect.any(Number),
                username: payload.username,
                email: payload.email,
                first_name: payload.first_name,
                last_name: payload.last_name,
                status: payload.status,
                created_at: expect.any(String),
                updated_at: expect.any(String),
                deleted_at: null
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 404 with non-existent target user', async () => {
            const response = await superadminAuth.agent
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

            const response = await userWithNoPermissionsAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${userWithNoPermissionsAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            // PUT /:user_id has no route-level permission gate (self-service update
            // is always allowed) — for a non-self update, the only protection is
            // the privilege-rank check in userService.applyUserUpdate, which
            // produces this message rather than a generic "no permission" one.
            expect(response.body).toEqual({
                message: "You cannot update a user with level 'member'"
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 with authorized user having low level role compared to the target user', async () => {
            const targetUser = await User.create(generateUserData());
            const targetUserRole = await createRole(
                ['auth:admin:user', 'auth:update:user'],
                undefined,
                3
            );
            await targetUser.setRoles([targetUserRole]);

            // Auth user must have lower level of role than the target user
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['auth:admin:user', 'auth:update:user'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            const payload = generateUserData();

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetUser.id}`)
                .set({
                    Authorization: `Bearer ${customAuthUser.accessToken}`,
                    'x-api-key': 'global'
                })
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            // Note: Role.level (assigned above) is unrelated to this check —
            // applyUserUpdate compares User.level, and both users here default to
            // 'member' (generateUserData never sets level), so this hits the same
            // privilege-rank message as the previous test regardless of the Role
            // levels assigned.
            expect(response.body).toEqual({
                message: "You cannot update a user with level 'member'"
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

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'User successfully soft-deleted'
            });

            forceDeleteInstances([targetUser]);
        });

        it('should return 200 when force deleting a user', async () => {
            const targetUser = await User.create(generateUserData());

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}?force=true`)
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'User successfully deleted permanently'
            });
        });

        it('should return 404 with non-existent user ID', async () => {
            const response = await superadminAuth.agent
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

            const response = await userWithNoPermissionsAuth.agent
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
            // Do not delete. The root_superadmin seed user can't be deleted by a
            // 'superadmin'-level caller: userController.destroy compares privilege
            // rank (isMorePrivileged), and root_superadmin outranks superadmin, so
            // this hits the generic privilege-comparison guard, not a special
            // "superadmin" name check.
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser?.id}`) // Deleting the main superadmin
                .set({
                    Authorization: `Bearer ${superadminAuth.accessToken}`,
                    'x-api-key': 'global'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    "You can't delete a user with the same or higher privilege / role level than you"
            });
        });

        it('should return 403 when deleting a user with higher privilege than you', async () => {
            const targetUser = await User.create(generateUserData());
            const targetUserRole = await createRole(
                ['auth:admin:user', 'auth:delete:user'],
                undefined,
                3
            );
            await targetUser.setRoles([targetUserRole]);

            // Auth user must have lower level of role than the target user
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['auth:admin:user', 'auth:delete:user'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            const response = await customAuthUser.agent
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
