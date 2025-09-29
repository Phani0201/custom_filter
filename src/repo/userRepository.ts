import {type FilterInput, FilterLibrary} from "../lib/filter";
import {userSchema} from "../data/userSchema";
import {type User, users} from "../data/users";
import {MongoBuilder} from "../lib/mongoBuilder";
import {SqlBuilder} from "../lib/sqlBuilder";


export class UserRepository{
    private filterLib = new FilterLibrary(userSchema);

    constructor() {
        this.filterLib.registerBuilder("mongo", new MongoBuilder(this.filterLib));
        this.filterLib.registerBuilder("sql", new SqlBuilder(this.filterLib));
    }

    filterUsers(filter: FilterInput): User[] {
        //validating the filter first
        const errors = this.filterLib.validate(filter);
        if (errors.length > 0) {
            throw new Error("Validation failed: "+ JSON.stringify(errors));
        }

        //convert filter to mongo
        //const query = this.filterLib.toMongoQuery(filter);

        const  query = this.filterLib.buildQuery("mongo", filter);

        return users.filter((user) => this.matchesQuery(user, query));
    }

    getSqlWhere(filter: FilterInput) {
        const errors = this.filterLib.validate(filter);
        if (errors.length > 0) {
            throw new Error("Validation failed: " + JSON.stringify(errors));
        }

        return this.filterLib.buildQuery("sql", filter);
    }

    private matchesQuery(user: any, query: any): boolean {
        if (!query || Object.keys(query).length ===0) return true;;

        if(query.$and) {
            return query.$and.every((q: any) => this.matchesQuery(user, q));
        }
        if (query.$or){
            return query.$or.some((q:any) => this.matchesQuery(user, q));
        }

        for (const field of Object.keys(query)) {
            const condition = query[field];
            const value = user[field];
            if (typeof condition !== "object" || condition instanceof Date) {
                if (value !== condition) return false;
            } else {
                for (const op in condition) {
                    switch (op) {
                        case "$ne":
                            if (value === condition[op]) return false;
                            break;
                        case "$gt":
                            if (!(value > condition[op])) return false;
                            break;
                        case "$lt":
                            if (!(value < condition[op])) return false;
                            break;
                        case "$gte":
                            if (!(value >= condition[op])) return false;
                            break;
                        case "$lte":
                            if (!(value <= condition[op])) return false;
                            break;
                        case "$in":
                            if (!condition[op].includes(value)) return false;
                            break;
                        case "$regex":
                            if (!new RegExp(condition[op], condition.$options || "").test(value))
                                return false;
                            break;
                        default:
                            return false;
                    }
                }
            }
        }
        return  true;
    }
}