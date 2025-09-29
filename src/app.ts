import type {FieldSchema} from "./lib/types";
import * as bodyParser from "body-parser";
import express from 'express';
import {UserRepository} from "./repo/userRepository";
import e from "express";
import {userSchema} from "./data/userSchema";

export function createApp(){
    const app = express();
    app.use(bodyParser.json());

    //Router level schema
    const schemas: FieldSchema[] = userSchema;

    const repo = new UserRepository();

    app.get('/health', (_req, res) => res.json({ ok: true}));

    app.post("/users/filter", (req, res) =>{
        try {
            const filter = req.body;
            const results = repo.filterUsers(filter);
            res.json({ data: results });
        } catch (err: any) {
            res.status(400).json({ error: err.message});
        }
    });

    //get with url encoded filter
    app.get("/users/filter", (req, res) => {
        const raw = req.query.filter as string | undefined;
        let filter = undefined;
        if (raw) {
            try {
                filter = JSON.parse(decodeURIComponent(raw));
            } catch (e) {
                return res.status(400).json({ error: "Invalid filter JSON in query parameter" });
            }
        }
        try {
            const results = repo.filterUsers(filter);
            res.json({ data: results });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });
    return app;
}