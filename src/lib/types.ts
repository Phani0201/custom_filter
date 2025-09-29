export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'uuid';

export type Operator = | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'
    | 'in' | 'between'
    | 'contains' | 'starts_with' | 'ends_with'
    | 'is_null' | 'is_not_null';

export interface FieldSchema {
    name: string;
    type: FieldType;
    filterable: boolean;
    allowedOperators?: Operator[];
    enumValues?: string[];
}