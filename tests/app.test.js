"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const app = (0, app_1.createApp)();
describe("API Integration", () => {
    it("GET /health should return ok", async () => {
        const res = await (0, supertest_1.default)(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });
    it("POST /users/filter should return filtered users", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/users/filter")
            .send({ field: "isActive", operator: "eq", value: true });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.every((u) => u.isActive)).toBe(true);
    });
    it("POST /users/filter with invalid filter should fail", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/users/filter")
            .send({ field: "nonexistent", operator: "eq", value: "x" });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Validation failed/);
    });
    it("POST /users/filter should filter by role=admin", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/users/filter")
            .send({ field: "role", operator: "eq", value: "admin" });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        for (const user of res.body.data) {
            expect(user.role).toBe("admin");
        }
    });
    it("POST /users/filter with null filter should return all users", async () => {
        const res = await (0, supertest_1.default)(app).post("/users/filter").send({});
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // should return all 3 from users.ts
        expect(res.body.data).toHaveLength(3);
    });
});
//# sourceMappingURL=app.test.js.map