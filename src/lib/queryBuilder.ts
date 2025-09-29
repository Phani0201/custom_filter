import {FilterInput} from "./filter";


export interface QueryBuilder<T = any> {
    build(filter: FilterInput): T;
}