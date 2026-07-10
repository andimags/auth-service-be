import Channel from '../src/database/models/Channel';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generatePermissionData,
    generateUserData
} from './utils';

describe('Role Permission Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null
    };

    const NON_EXISTENT_USER_ID = 999999;
    const NON_EXISTENT_ROLE_ID = 999999;
    const API_BASE_URL = '/api/user-role/user';

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
        userWithNoPermissionsAuth = await createAuthUser();
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await userWithNoPermissionsAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/user-role/user/:user_id', () => {
        it(`should return 200 with user's roles for authorized user`, async () => {
            const targetUser = await User.create(await generateUserData());
            const role = await createRole(['admin:role_permission']);

            await targetUser?.setRoles([role]);

            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${targetUser.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            expect(response.body.data.length).toBeGreaterThan(0);

            await forceDeleteInstances([targetUser, role]);
        });

        it('should return 404 when role is non-existent', async () => {
            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());

            const response = await userWithNoPermissionsAuth.agent
                .get(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser]);
        });
    });

    describe('POST /api/user-role/user/:user_id', () => {
        it(`should return 200 with roles of the user if authorized user has required permissions`, async () => {
            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/);
            // .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            // Make sure that the role attached to the target user must match the ID for roleForPayload
            expect(response.body.data[0].id).toEqual(roleForPayload.id);

            await forceDeleteInstances([targetUser, roleForPayload]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ids: NON_EXISTENT_ROLE_ID
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role IDs ${NON_EXISTENT_ROLE_ID} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/);
            // .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be added: they either belong to a different channel or have a level equal to or higher than your own'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be added: they either belong to a different channel or have a level equal to or higher than your own'
            });

            // await forceDeleteInstances([customAuthUser.user!, correctChannel, wrongChannel, authUserRole, targetUser, roleForPayload])
            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload,
                wrongChannel,
                correctChannel
            ]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await userWithNoPermissionsAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser, roleForPayload]);
        });
    });

    describe('PUT /api/user-role/user/:user_id', () => {
        it(`should return 200 with roles of the user if authorized user has required permissions`, async () => {
            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            // Make sure that the role attached to the target user must match the ID for roleForPayload
            expect(response.body.data[0].id).toEqual(roleForPayload.id);

            await forceDeleteInstances([targetUser, roleForPayload]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ids: NON_EXISTENT_ROLE_ID
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role IDs ${NON_EXISTENT_ROLE_ID} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/);
            // .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be replaced: they either belong to a different channel or have a level equal to or higher than your own'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be replaced: they either belong to a different channel or have a level equal to or higher than your own'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it('should return 403 when trying to delete user with superadmin username', async () => {
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Superadmin's roles cannot be updated"
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await userWithNoPermissionsAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser, roleForPayload]);
        });
    });

    describe('DELETE /api/user-role/user/:user_id', () => {
        it(`should return 200 with success message`, async () => {
            const targetUser = await User.create(await generateUserData());
            const targetUserPermission = await Permission.create(
                await generatePermissionData()
            );
            const targetUserRole = await createRole([
                targetUserPermission.ref_name
            ]);

            await targetUser.setRoles([targetUserRole]);

            const payload = {
                role_ids: targetUserRole.id
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: {},
                status: 1,
                message: 'User role successfully deleted'
            });

            await forceDeleteInstances([
                targetUser,
                targetUserPermission,
                targetUserRole
            ]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 403 when trying to delete user with username superadmin', async () => {
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });
            const roleForPayload = await createRole(['admin:role_permission']);
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser?.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Superadmin's roles cannot be deleted"
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ids: NON_EXISTENT_ROLE_ID
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role IDs ${NON_EXISTENT_ROLE_ID} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be deleted: they either belong to a different channel or have a level equal to or higher than your own'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ids: roleForPayload.id
            };

            const response = await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'One or more roles cannot be deleted: they either belong to a different channel or have a level equal to or higher than your own'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });
    });
});
