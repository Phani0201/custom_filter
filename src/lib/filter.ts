import type {FieldSchema, FieldType, Operator} from "./types";
import any = jasmine.any;
import e from "express";
import {QueryBuilder} from "./queryBuilder";

//filter types
export type Condition = {
    field: string;
    operator: Operator;
    value?: any;
};

export type Group = {
    and?: Array<Condition | Group>;
    or?: Array<Condition | Group>;
};

export type FilterInput = Group | Condition | null | undefined;

export type ValidationError = {path: string, message: string};

//Filter Library
export class FilterLibrary {
    private schemaMap: Map<string, FieldSchema>;
    private builder: Map<string, QueryBuilder<any>> = new Map();

    private defaultOperators : Record<string, Operator[]> = {
        string: ['eq','neq','contains','starts_with','ends_with','in','is_null','is_not_null'],
        number: ['eq','neq','gt','lt','gte','lte','between','in','is_null','is_not_null'],
        boolean: ['eq','neq','is_null','is_not_null'],
        date: ['eq','neq','gt','lt','gte','lte','between','is_null','is_not_null'],
        enum: ['eq','neq','in','is_null','is_not_null'],
        uuid: ['eq','neq','in','is_null','is_not_null']
    };

    constructor(private schema : FieldSchema[]) {
        this.schemaMap = new Map(schema.map(s => [s.name,s]));
    }

    //Register a custom builder
    registerBuilder(name: string, builder: QueryBuilder<any>){
        this.builder.set(name, builder);
    }

    //builder usage
    buildQuery(name: string, filter: FilterInput): any {
        const builder = this.builder.get(name);
        if(!builder){
            throw new Error(`Query builder "${name}" is not registered`);
        }
        return builder.build(filter);
    }

    //Validate filter input and return array of errors
    validate(filter: FilterInput): ValidationError[] {
        if(!filter) return [];
        return this.validateNode(filter, '<root>');
    }

    private validateNode(
        node: Condition | Group,
        path: string
    ): ValidationError[] {
        if ("field" in node) {
            return this.validateCondition(node, path);
        } else {
            return this.validateGroup(node, path);
        }
    }

    private validateGroup(group: Group, path:string): ValidationError[]{
        let errors: ValidationError[] = [];
        if (group.and !== undefined) {
            if(!Array.isArray(group.and)){
                errors.push({path, message:`"and" must be an array`});
            } else {
                group.and.forEach((c, i)=>{
                    errors.push(...this.validateNode(c,`${path}.and[${i}]`));
                });
            }
        }
        if (group.or !== undefined){
            if (!Array.isArray(group.or)){
                errors.push({path, message:`"or" must be an array`});
            } else {
                group.or.forEach((c, i) => {
                    errors.push(...this.validateNode(c, `${path}.or[${i}]`));
                });
            }
        }
        return errors;
    }

    private validateCondition(cond: Condition, path:string): ValidationError[] {
        const errors: ValidationError[] =[];
        const schema  = this.schemaMap.get(cond.field);

        if (!schema){
            errors.push({
                path, message:`Field "${cond.field}" is not allowed for filtering`,
            });
            return errors;
        }
        if (!schema.filterable){
            errors.push({
                path, message:`Field "${cond.field}" is not filterable`,
            });
            return errors;
        }

        const allowedOps: Operator[] = schema.allowedOperators ?? (this.defaultOperators[schema.type] || []);
        if (!allowedOps.includes(cond.operator)) {
            errors.push({
                path,
                message: `Operator "${cond.operator}" is not allowed for field "${cond.field}"`,
            });
        }

        errors.push(...this.validateValue(cond, schema.type, path, schema));
        return errors;
    }

    private validateValue(
        cond: Condition,
        type: FieldType,
        path: string,
        schema: FieldSchema
    ): ValidationError[] {
        const { operator, value } = cond;
        const errors: ValidationError[] = [];

        if (operator === "is_null" || operator === "is_not_null") {
            if (value !== undefined) {
                errors.push({
                    path,
                    message: `Operator "${operator}" does not take a value`,
                });
            }
            return errors;
        }

        if (operator === "between") {
            if (!Array.isArray(value) || value.length !== 2) {
                errors.push({
                    path,
                    message: `"between" operator requires exactly 2 values`,
                });
            } else {
                value.forEach((v, i) =>
                    errors.push(...this.checkType(v, type, `${path}.value[${i}]`, schema))
                );
            }
            return errors;
        }

        if (operator === "in") {
            if (!Array.isArray(value)) {
                errors.push({ path, message: `"in" operator requires an array` });
            } else {
                value.forEach((v, i) =>
                    errors.push(...this.checkType(v, type, `${path}.value[${i}]`, schema))
                );
            }
            return errors;
        }

        if (value === undefined) {
            errors.push({ path, message: `Field requires a value` });
        } else {
            errors.push(...this.checkType(value, type, `${path}.value`, schema));
        }

        return errors;
    }

    private checkType(value: unknown, type: FieldType, path: string, schema: FieldSchema): ValidationError[] {
        switch (type) {
            case "string":
                if (typeof value !== "string") {
                    return [{ path, message: `must be a string` }];
                }
                break;
            case "number":
                if (typeof value !== "number") {
                    return [{ path, message: `must be a number` }];
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    return [{ path, message: `must be a boolean` }];
                }
                break;
            case "date":
                if (isNaN(Date.parse(String(value)))) {
                    return [{ path, message: `must be a valid date` }];
                }
                break;
            case "uuid":
                if (
                    typeof value !== "string" ||
                    !/^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
                        value
                    )
                ) {
                    return [{ path, message: `must be a valid UUID` }];
                }
                break;
            case "enum":
                if (typeof value !== "string") {
                    return [{ path, message: `must be a valid enum value` }];
                }
                if (schema.enumValues && !schema.enumValues.includes(value)) {
                    return [{ path, message: `must be one of: ${schema.enumValues.join(", ")}` }];
                }
                break;
        }
        return [];
    }

    toMongoQuery(filter: FilterInput): any {
        if(!filter) return {};
        if("field" in filter) {
            return  this.conditionToMongo(filter);
        } else {
            return this.groupToMongo(filter);
        }
    }
    private groupToMongo(group: Group) {
        const outputs: any = {};
        if(group.and) {
            outputs["$and"] = group.and.map((c) => "field" in c ? this.conditionToMongo(c) : this.groupToMongo(c));
        }
        if (group.or) {
            outputs["$or"] = group.or.map((c) => "field" in c ? this.conditionToMongo(c) : this.groupToMongo(c));
        }
        return outputs;
    }

    private conditionToMongo(cond: Condition): any {
        const {field, operator, value } = cond;
        switch (operator) {
            case "eq":
                return{ [field]: value};
            case "neq":
                return{ [field]: { $ne: value}};
            case "gt":
                return{ [field]: { $gt: value}};
            case "lt":
                return{ [field]: { $lt: value}};
            case "gte":
                return{ [field]: { $gte: value}};
            case "lte":
                return{ [field]: { $lte: value}};
            case "in":
                return{ [field]: { $in: value}};
            case "between":
                return { [field]: { $gte: value[0], $lte: value[1] } };
            case "contains":
                return { [field]: { $regex: value, $options: "i" } };
            case "starts_with":
                return { [field]: { $regex: `^${value}`, $options: "i" } };
            case "ends_with":
                return { [field]: { $regex: `${value}$`, $options: "i" } };
            case "is_null":
                return { [field]: null };
            case "is_not_null":
                return { [field]: { $ne: null } };
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }


    toSqlWhere(filter: FilterInput): {sql:string, params: any[]} {
        if (!filter) return { sql: "1=1", params: [] };

        if ("field" in filter) {
            return this.conditionToSql(filter);
        } else {
            return this.groupToSql(filter);
        }
    }

    private groupToSql(group: Group): { sql:string; params: any[]} {
        let clauses: string[] = [];
        let params: any[] =[];

        if(group.and) {
            const sub = group.and.map((c) => "field" in c ? this.conditionToSql(c) : this.groupToSql(c));
            clauses.push(sub.map((s) => s.sql).join(" AND "));
            params.push(...sub.flatMap((s) => s.params));
        }
        if(group.or) {
            const sub = group.or.map((c) => "field" in c ? this.conditionToSql(c) : this.groupToSql(c));
            clauses.push(sub.map((s) => s.sql).join(" OR "));
            params.push(...sub.flatMap((s) => s.params));
        }
        return { sql:`(${clauses.join(" AND ")})`, params };
    }

    private conditionToSql(cond: Condition): {sql: string; params: any[]} {
        const {field,operator, value } = cond;
        switch (operator) {
            case "eq":
                return { sql: `${field} = ?`, params: [value] };
            case "neq":
                return { sql: `${field} <> ?`, params: [value] };
            case "gt":
                return { sql: `${field} > ?`, params: [value] };
            case "lt":
                return { sql: `${field} < ?`, params: [value] };
            case "gte":
                return { sql: `${field} >= ?`, params: [value] };
            case "lte":
                return { sql: `${field} <= ?`, params: [value] };
            case "in":
                return {
                    sql: `${field} IN (${value.map(() => "?").join(", ")})`,
                    params: value,
                };
            case "between":
                return { sql: `${field} BETWEEN ? AND ?`, params: value };
            case "contains":
                return { sql: `${field} LIKE ?`, params: [`%${value}%`] };
            case "starts_with":
                return { sql: `${field} LIKE ?`, params: [`${value}%`] };
            case "ends_with":
                return { sql: `${field} LIKE ?`, params: [`%${value}`] };
            case "is_null":
                return { sql: `${field} IS NULL`, params: [] };
            case "is_not_null":
                return { sql: `${field} IS NOT NULL`, params: [] };
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }


};