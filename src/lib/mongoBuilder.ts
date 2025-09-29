import { FilterInput, FilterLibrary } from "./filter";
import { QueryBuilder } from "./queryBuilder";

export class MongoBuilder implements QueryBuilder<any> {
    constructor(private lib: FilterLibrary) {}

    build(filter: FilterInput) {
        return this.lib["toMongoQuery"](filter); // reuse existing logic
    }
}