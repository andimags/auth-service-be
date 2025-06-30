import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generatePermissionData,
    generateToken,
    generateUserData
} from './utils';

describe('Role Permission Routes', () => {
    interface IAuth {
        token: string | null,
        user: User | null
    }

    let superadminAuth: IAuth = {
        token: null,
        user: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        token: null,
        user: null
    };

    const NON_EXISTENT_ROLE_ID = 999999;
    const NON_EXISTENT_PERMISSION_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/role-permission/role';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser();
        const superadminRole = await Role.findOne({ where: { ref_name: 'superadmin' } });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminAuth.user!.addRoles([superadminRole]);

        userWithNoPermissionsAuth.user = await User.create(await generateUserData());
        userWithNoPermissionsAuth.token = await generateToken(
            userWithNoPermissionsAuth.user.email,
            DEFAULT_PASSWORD
        );
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/role-permission/role/:role_id', () => {
        it(`should return 200 with role's permissions for authorized user`, async () => {
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            await targetRole?.destroy({force: true});
        });

        it('should return 404 when role is non-existent', async () => {
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .get(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await targetRole?.destroy({force: true});
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });

            await targetRole?.destroy({force: true});
        });

        it("should return 403 when authorized user is viewing a role outside their channel ", async () => {
            const customAuth: IAuth = await createAuthUser();
            const correctChannel = await Channel.create(await generateChannelData());
            const wrongChannel = await Channel.create(await generateChannelData());
            const role = await createRole(['admin:role_permission'], correctChannel.id);

            await customAuth.user?.setRoles(role);

            // For mocking of viewing role's permissions not within the auth user's channel
            const targetRole = await createRole(['admin:role_permission'], wrongChannel.id);

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.token!, correctChannel.api_key))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Unauthorized to view this role's permissions"
            });

            await forceDeleteInstances([targetRole, role, correctChannel, wrongChannel, customAuth.user!]);
        });
    });

    describe('POST /api/role-permission/role/:role_id', () => {
        it(`should return 200 with permissions attached to the role`, async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 with non-existent role", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .post(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 when the payload for permission_ids does not exist", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(['admin:role_permission'], undefined, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const payload = {
                "permission_ids": NON_EXISTENT_PERMISSION_ID
            }

            // Role level is lower than the authUserRole level so they are able to edit this until the validation of non-existent permission IDs
            const targetRole = await createRole(['admin:role_permission'], undefined, 5);

            const response = await request(app)
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Permission IDs ${NON_EXISTENT_PERMISSION_ID} do not exist`
            });

            await forceDeleteInstances([customAuthUser.user!, authUserRole, targetRole])
        });

        it("should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const lowLevelRole = await createRole(['admin:role_permission'], undefined, 5);

            await customAuthUser.user?.setRoles(lowLevelRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You cannot add permissions from a role with the higher or same level as your role'
            });

            await forceDeleteInstances([permissionForPayload, targetRole, customAuthUser.user!, lowLevelRole])
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const correctChannel = await Channel.create(generateChannelData());
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(['admin:role_permission'], correctChannel.id, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const targetRole = await createRole(['admin:role_permission'], wrongChannel.id,5);

            const response = await request(app)
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!, correctChannel.api_key))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to add permissions to this role'
            });

            await forceDeleteInstances([customAuthUser.user!, correctChannel, wrongChannel, authUserRole, permissionForPayload, targetRole])
        });

        it("should return 403 when authorized user lacks required permissions", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have highest role level as possible
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });
    });

    describe('PUT /api/role-permission/role/:role_id', () => {
        it(`should return 200 with new permissions attached to the role`, async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 with non-existent role", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 when the payload for permission_ids does not exist", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(['admin:role_permission'], undefined, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const payload = {
                "permission_ids": NON_EXISTENT_PERMISSION_ID
            }

            // Role level is lower than the authUserRole level so they are able to edit this until the validation of non-existent permission IDs
            const targetRole = await createRole(['admin:role_permission'], undefined, 5);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Permission IDs ${NON_EXISTENT_PERMISSION_ID} do not exist`
            });

            await forceDeleteInstances([customAuthUser.user!, authUserRole, targetRole])
        });

        it("should return 403 when authorized user is replacing permissions to a role with higher or equal level to theirs", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const lowLevelRole = await createRole(['admin:role_permission'], undefined, 5);

            await customAuthUser.user?.setRoles(lowLevelRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You cannot replace permissions from a role with the higher or same level as your role'
            });

            await forceDeleteInstances([permissionForPayload, targetRole, customAuthUser.user!, lowLevelRole])
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const correctChannel = await Channel.create(generateChannelData());
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(['admin:role_permission'], correctChannel.id, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const targetRole = await createRole(['admin:role_permission'], wrongChannel.id,5);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!, correctChannel.api_key))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to replace permissions to this role'
            });

            await forceDeleteInstances([customAuthUser.user!, correctChannel, wrongChannel, authUserRole, permissionForPayload, targetRole])
        });

        it("should return 403 when authorized user lacks required permissions", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have highest role level as possible
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });
    });

    describe('DELETE /api/role-permission/role/:role_id', () => {
        it(`should return 200 with status == 1`, async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'Role permission successfully deleted',
                status: 1
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 with non-existent role", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission']);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });

        it("should return 404 when the payload for permission_ids does not exist", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(['admin:role_permission'], undefined, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const payload = {
                "permission_ids": NON_EXISTENT_PERMISSION_ID
            }

            // Role level is lower than the authUserRole level so they are able to edit this until the validation of non-existent permission IDs
            const targetRole = await createRole(['admin:role_permission'], undefined, 5);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Permission IDs ${NON_EXISTENT_PERMISSION_ID} do not exist`
            });

            await forceDeleteInstances([customAuthUser.user!, authUserRole, targetRole])
        });

        it("should return 403 when authorized user is deleting permissions to a role with higher or equal level to theirs", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const lowLevelRole = await createRole(['admin:role_permission'], undefined, 5);

            await customAuthUser.user?.setRoles(lowLevelRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You cannot delete permissions from a role with the higher or same level as your role'
            });

            await forceDeleteInstances([permissionForPayload, targetRole, customAuthUser.user!, lowLevelRole])
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const correctChannel = await Channel.create(generateChannelData());
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(['admin:role_permission'], correctChannel.id, 3);

            await customAuthUser.user?.setRoles(authUserRole);

            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const targetRole = await createRole(['admin:role_permission'], wrongChannel.id,5);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.token!, correctChannel.api_key))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to delete permissions to this role'
            });

            await forceDeleteInstances([customAuthUser.user!, correctChannel, wrongChannel, authUserRole, permissionForPayload, targetRole])
        });

        it("should return 403 when authorized user lacks required permissions", async () => {
            const permissionForPayload = await Permission.create(await generatePermissionData());
            const payload = {
                "permission_ids": permissionForPayload.id
            }
            
            // Make target role to have highest role level as possible
            const targetRole = await createRole(['admin:role_permission'], undefined, 1);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([permissionForPayload, targetRole])
        });
    });

});