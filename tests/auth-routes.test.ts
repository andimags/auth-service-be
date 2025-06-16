import request from "supertest";
import app from '../src/app';
import sequelize from '../src/database/sequelize';

beforeAll(async () => {
  await sequelize.sync(); // or authenticate() if DB is already ready
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

    it("should return 200 with valid credentials", async () => {
        const response = await request(app)
            .post("/api/auth/verify-token")
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