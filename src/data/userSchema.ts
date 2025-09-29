import type { FieldSchema } from "../lib/types";

export const userSchema: FieldSchema[] = [
    { name: "id", type: "uuid", filterable: true },
    { name: "name", type: "string", filterable: true },
    { name: "age", type: "number", filterable: true },
    { name: "role", type: "enum", filterable: true, enumValues: ["admin", "user", "manager"] },
    { name: "isActive", type: "boolean", filterable: true },
    { name: "createdAt", type: "date", filterable: false },
];