import {userSchema} from "../src/data/userSchema";
import {Condition, FilterInput, FilterLibrary} from "../src/lib/filter";
import {createApp} from "../src/app";
import {UserRepository} from "../src/repo/userRepository";
import request from "supertest";


const filterLib = new FilterLibrary(userSchema);
const  app = createApp();
const repo = new UserRepository();

describe("FilterLib - Validation", () =>{
    it("should reject unknown fields", () => {
        const errors = filterLib.validate({ field: "unknown", operator: "eq", value: 10 });
        expect(errors).toHaveLength(1);
        expect(errors[0]!.message).toMatch(/not allowed/);
    });

    it("should reject disallowed operators", () => {
        const errors = filterLib.validate({ field: "age", operator: "contains" as any, value: 30 });
        expect(errors).toHaveLength(1);
        expect(errors[0]!.message).toMatch(/not allowed/);
    });

    it("should pass valid filter", () => {
        const errors = filterLib.validate({ field: "age", operator: "gt", value: 18 });
        expect(errors).toHaveLength(0);
    });

    it("should reject filters on non-filterable fields", () => {
        const errors = filterLib.validate({
            field: "createdAt",
            operator: "eq",
            value: "2023-01-01",
        });

        expect(errors).toHaveLength(1);
        expect(errors[0]!.message).toMatch(/not filterable/);
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

describe("FilterLibrary - Builders", () => {
    it("should filter users (mongo builder)", async () => {
        const filter = {
            field: "age",
            operator: "gt",
            value: 30,
        };

        const res = await request(app)
            .post("/users/filter")
            .send(filter)
            .expect(200);

        expect(res.body.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "Alice" }),
                expect.objectContaining({ name: "Charlie" }),
            ])
        );
    });

    it("should build correct SQL (sql builder)", () => {
        const filter: FilterInput = {
            and: [
                { field: "age", operator: "gt", value: 30 },
                {
                    or: [
                        { field: "role", operator: "eq", value: "admin" },
                        { field: "isActive", operator: "eq", value: true },
                    ],
                },
            ],
        };

        const { sql, params } = repo.getSqlWhere(filter);

        // SQL should look like (age > ? AND (role = ? OR isActive = ?))
        expect(sql).toContain("age > ?");
        expect(sql).toContain("role = ?");
        expect(sql).toContain("isActive = ?");
        expect(params).toEqual([30, "admin", true]);
    });

    it("should reject invalid field", async () => {
        const filter = {
            field: "password",
            operator: "eq",
            value: "secret",
        };

        const res = await request(app)
            .post("/users/filter")
            .send(filter)
            .expect(400);

        expect(res.body.error).toMatch(/not allowed/);
    });

    it("should reject invalid operator", async () => {
        const filter = {
            field: "age",
            operator: "unknown",
            value: 25,
        };

        const res = await request(app)
            .post("/users/filter")
            .send(filter)
            .expect(400);

        expect(res.body.error).toMatch(/not allowed/);
    });

    it("should reject wrong value type", async () => {
        const filter = {
            field: "age",
            operator: "eq",
            value: "thirty",
        };

        const res = await request(app)
            .post("/users/filter")
            .send(filter)
            .expect(400);

        expect(res.body.error).toMatch(/must be a number/);
    });

    it("should handle 'in' operator correctly (mongo builder)", async () => {
        const filter = {
            field: "role",
            operator: "in",
            value: ["admin", "manager"],
        };

        const res = await request(app)
            .post("/users/filter")
            .send(filter)
            .expect(200);

        expect(res.body.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "Alice" }),
                expect.objectContaining({ name: "Charlie" }),
            ])
        );
    });

    it("should build correct SQL for 'between'", () => {
        const filter: Condition = {
            field: "age",
            operator: "between",
            value: [25, 40],
        };

        const { sql, params } = repo.getSqlWhere(filter);

        expect(sql).toContain("age BETWEEN ? AND ?");
        expect(params).toEqual([25, 40]);
    });
})