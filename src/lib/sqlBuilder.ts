import { FilterInput, FilterLibrary } from "./filter";
import { QueryBuilder } from "./queryBuilder";

export class SqlBuilder implements QueryBuilder<{ sql: string; params: any[] }> {
    constructor(private lib: FilterLibrary) {}

    build(filter: FilterInput) {
        return this.lib["toSqlWhere"](filter); // reuse existing logic
    }
}