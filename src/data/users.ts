export interface User {
    id: string;
    name: string;
    age: number;
    role: "admin" | "user" | "manager";
    isActive: boolean;
    createdAt: Date;
}

export const users: User[] = [
    {
        id: "1",
        name: "Alice",
        age: 35,
        role: "admin",
        isActive: true,
        createdAt: new Date("2021-01-01"),
    },
    {
        id: "2",
        name: "Bob",
        age: 28,
        role: "user",
        isActive: false,
        createdAt: new Date("2022-01-01"),
    },
    {
        id: "3",
        name: "Charlie",
        age: 40,
        role: "manager",
        isActive: true,
        createdAt: new Date("2023-01-01"),
    },
];
