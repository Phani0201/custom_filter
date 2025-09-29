"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userSchema_1 = require("../src/data/userSchema");
const filter_1 = require("../src/lib/filter");
const filterLib = new filter_1.FilterLibrary(userSchema_1.userSchema);
describe("FilterLib - Validation", () => {
    it("should reject unknown fields", () => {
        const errors = filterLib.validate({ field: "unknown", operator: "eq", value: 10 });
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toMatch(/not allowed/);
    });
    it("should reject disallowed operators", () => {
        const errors = filterLib.validate({ field: "age", operator: "contains", value: 30 });
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toMatch(/not allowed/);
    });
    it("should pass valid filter", () => {
        const errors = filterLib.validate({ field: "age", operator: "gt", value: 18 });
        expect(errors).toHaveLength(0);
    });
});
describe("FilterLibrary - Query Conversion", () => {
    it("should convert eq to Mongo query", () => {
        const query = filterLib.toMongoQuery({ field: "age", operator: "eq", value: 25 });
        expect(query).toEqual({ age: 25 });
    });
    it("should convert between to SQL", () => {
        const { sql, params } = filterLib.toSqlWhere({
            field: "age",
            operator: "between",
            value: [20, 30],
        });
        expect(sql).toBe("age BETWEEN ? AND ?");
        expect(params).toEqual([20, 30]);
    });
});
//# sourceMappingURL=filter.test.js.map