import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("API Integration", () => {
    it("GET /health should return ok", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it("POST /users/filter should return filtered users", async () => {
        const res = await request(app)
            .post("/users/filter")
            .send({ field: "isActive", operator: "eq", value: true });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.every((u: any) => u.isActive)).toBe(true);
    });

    it("POST /users/filter with invalid filter should fail", async () => {
        const res = await request(app)
            .post("/users/filter")
            .send({ field: "nonexistent", operator: "eq", value: "x" });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Validation failed/);
    });

    it("POST /users/filter should filter by role=admin", async () => {
        const res = await request(app)
            .post("/users/filter")
            .send({ field: "role", operator: "eq", value: "admin" });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        for (const user of res.body.data) {
            expect(user.role).toBe("admin");
        }
    });

    it('POST /users/filter with non filterable field createdAt ', async () => {
        const res = await request(app)
            .post("/users/filter")
            .send({ field: "createdAt", operator: "eq", value: "2023-01-01"});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/not filterable/);

    });

    it("POST /users/filter with null filter should return all users", async () => {
        const res = await request(app).post("/users/filter").send({});

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // should return all 3 from users.ts
        expect(res.body.data).toHaveLength(3);
    });
});
