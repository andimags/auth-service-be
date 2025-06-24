import { faker } from '@faker-js/faker';
import request from "supertest";
import app from '../src/app';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';

let superadminUser: User | null;
let superadminToken: string | null;

const agent = request.agent(app); // preserves cookies
const nonExistentUserId = 999999; // For testing unhappy paths
const defaultPassword = 'abcd1234'; // All users use this password

async function generateUserPayload(){
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
        username: `${firstName}_${lastName}`,
        email: `${firstName}_${lastName}@gmail.com`,
        first_name: firstName,
        last_name: lastName,
        password: defaultPassword,
        status: 'active'
    }
}

async function generateToken(email: string, password: string){
    const res = await agent
        .post('/api/auth/generate-token')
        .send({
            email: email,
            password: password
        });

    return res.body.token;
}

beforeAll(async () => {
    await sequelize.sync(); // or authenticate() if DB is already ready

    superadminUser = await User.create(await generateUserPayload());

    // Find superadmin role and attach to the new created superadmin user
    const superadminRole = await Role.findOne({where: {ref_name: 'superadmin'}});
    if(!superadminRole) throw new AppError('Superadmin role not found');
    superadminUser.addRoles([superadminRole]);

    superadminToken = await generateToken(superadminUser.email, defaultPassword)
});

describe("GET /api/users", () => {
    let userWithNoPermissions: User | null; 
    let userWithNoPermissionsToken: string | null;

    beforeAll(async () => {
        userWithNoPermissions = await User.create(await generateUserPayload());
        userWithNoPermissionsToken = await generateToken(userWithNoPermissions.email, defaultPassword);
    })

    it("should return 200 with users' data", async () => {
        const response = await request(app)
            .get("/api/users")
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toEqual(1);
    });

    it("should return 403 when user doesn't have necessary permissions ['view:user', 'admin:user]", async () => {
        const response = await request(app)
            .get("/api/users")
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({
            "message": "You do not have the required permissions to perform this action"
        });
    });

    afterAll(async () => {
        await userWithNoPermissions?.destroy({ force: true});
    });

});

describe("GET /api/users/:user_id", () => {
    let userWithNoPermissions: User | null; 
    let userWithNoPermissionsToken: string | null;
    let targetUser: User | null; // Use this ID for parameter user_id

    beforeAll(async () => {
        userWithNoPermissions = await User.create(await generateUserPayload());
        if(!userWithNoPermissions) throw new AppError('userWithNoPermissions is null');
        userWithNoPermissionsToken = await generateToken(userWithNoPermissions.email, defaultPassword);

        targetUser = await User.create(await generateUserPayload());
    })

    it("should return 200 with user's data", async () => {
        const response = await request(app)
            .get(`/api/users/${targetUser!.id}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toEqual(1);
    });

    it("should return 200 if authorized user doesn't have necessary permission but only fetching her own details", async () => {
        const response = await request(app)
            .get(`/api/users/${userWithNoPermissions!.id}`)
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toEqual(1);
    });

    it("should return 404 when user with the given user_id doesn't exist", async () => {
        const response = await request(app)
            .get(`/api/users/${nonExistentUserId}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(404)

            expect(response.body).toEqual({
                "message": "User not found"
            });
    });

    it("should return 403 if authorized user doesn't have necessary permission", async () => {
        const response = await request(app)
            .get(`/api/users/${targetUser!.id}`)
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(403)

            expect(response.body).toEqual({
                "message": "You do not have the required permissions to perform this action"
            });
    });

    afterAll(async () => {
        await userWithNoPermissions?.destroy({ force: true});
        await targetUser?.destroy({ force: true});
    });

});

describe("POST /api/users/", () => {
    let userWithNoPermissions: User | null; 
    let userWithNoPermissionsToken: string | null;
    let targetUser: User | null; // Use this ID for parameter user_id

    beforeAll(async () => {
        userWithNoPermissions = await User.create(await generateUserPayload());
        if(!userWithNoPermissions) throw new AppError('userWithNoPermissions is null');
        userWithNoPermissionsToken = await generateToken(userWithNoPermissions.email, defaultPassword);

        targetUser = await User.create(await generateUserPayload());
    })

    it("should return 200 with newly created user data", async () => {
        const response = await request(app)
            .post(`/api/users`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .send(await generateUserPayload())
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toEqual(1);
    });

    it("should return 403 when authorized user doesn't have necessary permissions", async () => {
        const response = await request(app)
            .post(`/api/users`)
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .send(await generateUserPayload())
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({
            "message": "You do not have the required permissions to perform this action"
        });
    });


    afterAll(async () => {
        await userWithNoPermissions?.destroy({ force: true});
        await targetUser?.destroy({ force: true});
    });

});

describe("PUT /api/users/:user_id", () => {
    let userWithNoPermissions: User | null; 
    let userWithNoPermissionsToken: string | null;

    // This user has ['update:user', 'admin:user] permissions but attached to a low level role
    let userWithLowLevelRole: User | null;
    let userWithLowLevelRoleToken: string | null;
    let lowLevelRole: Role | null;
    let userAdminPermission: Permission | null;

    let targetUser: User | null; // Use this ID for parameter user_id

    beforeAll(async () => {
        userWithNoPermissions = await User.create(await generateUserPayload());
        if(!userWithNoPermissions) throw new AppError('userWithNoPermissions is null');
        userWithNoPermissionsToken = await generateToken(userWithNoPermissions.email, defaultPassword);

        targetUser = await User.create(await generateUserPayload());
        if(!targetUser) throw new AppError('targetUser is null');

        userWithLowLevelRole = await User.create(await generateUserPayload());
        if(!userWithLowLevelRole) throw new AppError('userWithLowLevelRole is null');
        userWithLowLevelRoleToken = await generateToken(userWithLowLevelRole.email, defaultPassword);

        lowLevelRole = await Role.create({
            name: 'test role',
            ref_name: 'test_role',
            level: 5,
            scope: 'global'
        });

        userAdminPermission = await Permission.findOne({where : {ref_name: 'admin:user', scope: 'global'}});
        if(!userAdminPermission) throw new AppError(`Permission with ref_name:'admin_user' and scope:'global' is null`);
        await lowLevelRole.addPermissions([userAdminPermission]);

        userWithLowLevelRole.addRoles([lowLevelRole]);
    })

    it("should return 200 with newly updated user data", async () => {
        const payload = await generateUserPayload();

        const response = await request(app)
            .put(`/api/users/${targetUser!.id}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .send(payload)
            .expect("Content-Type", /json/)
            .expect(200)

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toEqual(1);

            expect(response.body).toHaveProperty('data');

            expect(response.body.data).toHaveProperty('username');
            expect(response.body.data.username).toEqual(payload.username);

            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data.email).toEqual(payload.email);

            expect(response.body.data).toHaveProperty('first_name');
            expect(response.body.data.first_name).toEqual(payload.first_name);

            expect(response.body.data).toHaveProperty('last_name');
            expect(response.body.data.last_name).toEqual(payload.last_name);

            expect(response.body.data).toHaveProperty('status');
            expect(response.body.data.status).toEqual(payload.status);
    });

    it("should return 404 with non-existent target user", async () => {
        const response = await request(app)
            .put(`/api/users/${nonExistentUserId}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .send(await generateUserPayload())
            .expect("Content-Type", /json/)
            .expect(404)

            expect(response.body).toEqual({
                message: 'User not found'
            });
    });

    it("should return 403 with authorized user without permissions", async () => {
        const response = await request(app)
            .put(`/api/users/${targetUser!.id}`)
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .send(await generateUserPayload())
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({
            "message": "You do not have the required permissions to perform this action"
        });
    });

    it("should return 403 with authorized user having low level role compared to the target user", async () => {
        const payload = await generateUserPayload();
        
        const response = await request(app)
            .put(`/api/users/${superadminUser!.id}`)
            .set({
                'Authorization': `Bearer ${userWithLowLevelRoleToken}`,
                'x-api-key': 'global'
            })
            .send(payload)
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({
            message: "You can't update a user with the same or higher privilege / role level than you"
        });
    });


    afterAll(async () => {
        await userWithNoPermissions?.destroy({ force: true});
        await targetUser?.destroy({ force: true});
        await lowLevelRole?.destroy({ force: true});
    });

});

describe("DELETE /api/users/:user_id", () => {
    let userWithNoPermissions: User | null; 
    let userWithNoPermissionsToken: string | null;

    // This user has ['update:user', 'admin:user] permissions but attached to a low level role
    let userWithLowLevelRole: User | null;
    let userWithLowLevelRoleToken: string | null;
    let lowLevelRole: Role | null;
    let userAdminPermission: Permission | null;

    let targetUser: User | null; // Use this ID for parameter user_id

    beforeEach(async () => {
        targetUser = await User.create(await generateUserPayload());
        if(!targetUser) throw new AppError('targetUser is null');
    });

    beforeAll(async () => {
        userWithNoPermissions = await User.create(await generateUserPayload());
        if(!userWithNoPermissions) throw new AppError('userWithNoPermissions is null');
        userWithNoPermissionsToken = await generateToken(userWithNoPermissions.email, defaultPassword);

        userWithLowLevelRole = await User.create(await generateUserPayload());
        if(!userWithLowLevelRole) throw new AppError('userWithLowLevelRole is null');
        userWithLowLevelRoleToken = await generateToken(userWithLowLevelRole.email, defaultPassword);

        lowLevelRole = await Role.create({
            name: 'test role',
            ref_name: 'test_role',
            level: 5,
            scope: 'global'
        });

        userAdminPermission = await Permission.findOne({where : {ref_name: 'admin:user', scope: 'global'}});
        if(!userAdminPermission) throw new AppError(`Permission with ref_name:'admin_user' and scope:'global' is null`);
        await lowLevelRole.addPermissions([userAdminPermission]);

        userWithLowLevelRole.addRoles([lowLevelRole]);
    })

    it("should return 200 with the deleted user data", async () => {
        const response = await request(app)
            .delete(`/api/users/${targetUser!.id}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(200)

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toEqual(1);
            expect(response.body.message).toEqual('User successfully soft-deleted');
    });

    it("should return 404 with non-existent user ID", async () => {
        const response = await request(app)
            .delete(`/api/users/${nonExistentUserId}`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(404)

        expect(response.body).toEqual({message: 'User not found'});
    });

    it("should return 403 when authorized user doesn't have required permission", async () => {
        const response = await request(app)
            .delete(`/api/users/1`) // Deleting the main superadmin
            .set({
                'Authorization': `Bearer ${userWithNoPermissionsToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({message: 'You do not have the required permissions to perform this action'});
    });


    it("should return 403 when deleting the main superadmin", async () => {
        const response = await request(app)
            .delete(`/api/users/1`) // Deleting the main superadmin
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({message: 'Cannot delete superadmin user'});
    });

    it("should return 403 when deleting a user with higher privilege than you", async () => {
        const response = await request(app)
            .delete(`/api/users/${superadminUser!.id}`)
            .set({
                'Authorization': `Bearer ${userWithLowLevelRoleToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({message: "You can't delete a user with the same or higher privilege / role level than you"});
    });

    it("should return 200 when force deleting a user", async () => {
        const response = await request(app)
            .delete(`/api/users/${targetUser!.id}?force=true`)
            .set({
                'Authorization': `Bearer ${superadminToken}`,
                'x-api-key': 'global'
            })
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toEqual(1);
        expect(response.body.message).toEqual('User successfully deleted permanently');
    });

    afterAll(async () => {
        await userWithNoPermissions?.destroy({ force: true});
        await targetUser?.destroy({ force: true});
        await lowLevelRole?.destroy({ force: true});
    });

});


afterAll(async () => {
    await superadminUser?.destroy({ force: true});
})