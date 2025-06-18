import request from "supertest";
import app from '../src/app';
import sequelize from '../src/database/sequelize';

let token: string;
const agent = request.agent(app); // preserves cookies

beforeAll(async () => {
    await sequelize.sync(); // or authenticate() if DB is already ready

    const res = await agent
        .post('/api/auth/generate-token').send({
            email: 'superadmin@gmail.com',
            password: 'abcd1234'
        });

    token = res.body.token;

    console.log('token', token)
});

describe("POST /api/auth/generate-token", () => {

    it("should return 200 with valid credentials", async () => {
        const response = await request(app)
            .post("/api/auth/generate-token")
            .send({
                "email": "superadmin@gmail.com",
                "password": "abcd1234"
            })
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty("status");
        expect(response.body.status).toBe(1);
        expect(response.body).toHaveProperty("token");
    });

    it("should return 401 with invalid credentials (user not existing)", async () => {
        await request(app)
            .post("/api/auth/generate-token")
            .send({
                "email": "superadmin123@gmail.com",
                "password": "abcd12345"
            })
            .expect("Content-Type", /json/)
            .expect(401)
            .expect({
                "message": "User not found"
            })
    });

    it("should return 401 with invalid credentials (incorrect email or password)", async () => {
        await request(app)
            .post("/api/auth/generate-token")
            .send({
                "email": "superadmin@gmail.com",
                "password": "abcd12345"
            })
            .expect("Content-Type", /json/)
            .expect(401)
            .expect({
                "message": "Invalid email or password"
            })
    });

});


describe("GET /api/auth/verify-token", () => {

    it("should return 200 with valid token", async () => {
        const response = await request(app)
            .get("/api/auth/verify-token")
            .set('Authorization', `Bearer ${token}`)
            .expect("Content-Type", /json/)
            .expect(200)

        console.log('GET /api/auth/verify-token', response)    

        expect(response.body).toHaveProperty("status");
        expect(response.body.status).toBe(1);
        expect(response.body).toHaveProperty("decoded");
    });

    it("should return 403 with invalid token", async () => {
        const response = await request(app)
            .get("/api/auth/verify-token")
            .set('Authorization', `Bearer ${token}xxx`)
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual({
        message: "Invalid or expired token"
        });
    });

});


describe("GET /api/auth/refresh-token", () => {

    it("should return 200 with refreshed token", async () => {
        const response = await agent
            .get("/api/auth/refresh-token")
            .expect("Content-Type", /json/)
            .expect(200)

        expect(response.body).toHaveProperty("status");
        expect(response.body.status).toBe(1);
        expect(response.body).toHaveProperty("token");
    });

    it("should return 403 refreshed token", async () => {
        const response = await request(app)
            .get("/api/auth/refresh-token")
            .expect("Content-Type", /json/)
            .expect(403)

        expect(response.body).toEqual(
            {"message": "Token not found"}
        );

        console.log(response)
    });

});