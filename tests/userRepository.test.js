"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userRepository_1 = require("../src/repo/userRepository");
const repo = new userRepository_1.UserRepository();
describe("UserRepository", () => {
    it("should filter users by role", () => {
        const results = repo.filterUsers({ field: "role", operator: "eq", value: "admin" });
        expect(results.every(u => u.role === "admin")).toBe(true);
    });
    it("should filter users by AND condition", () => {
        const results = repo.filterUsers({
            and: [
                { field: "isActive", operator: "eq", value: true },
                { field: "age", operator: "gt", value: 30 },
            ],
        });
        expect(results.every(u => u.isActive && u.age > 30)).toBe(true);
    });
});
//# sourceMappingURL=userRepository.test.js.map