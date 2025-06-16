import request from "supertest";

// Create an Express app instance
import app from '../src/app';

// Jest test case
describe("GET /", () => {
    it("should respond with status 200", async () => {
        await request(app)
            .get("/")
            .expect("Content-Type", "text/html; charset=utf-8")
            .expect(200)
            .expect('Welcome to Auth BE');
    });
});
