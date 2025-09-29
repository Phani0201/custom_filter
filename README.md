# Custom Filter Library & API

A reusable **filter library** with validation, query conversion, and integration into an Express.js API.
It supports **Mongo-style** and **SQL-style** query builders, enforces **field exposure restrictions**, and provides **unit + integration tests**.

---

## Goal

* Design and implement a Node.js backend that:

    1. Exposes an HTTP endpoint to accept nested filter definitions with and / or groups.
    2. Implements a reusable filter library that:
       * Defines filters, groups, and operators in a type‐safe way.
       * Validates incoming filter definitions.
       * Restricts filtering to only explicitly allowed fields (via decorators or configuration).
       * Converts filter definitions into database query objects (SQL, MongoDB, MikroORM, Prisma, etc.).
    3. Exposes a service/repository layer that uses the library to query a dataset.
       
## Features

* ✅ **Reusable Filter Library**

  * Field schema with type, operators, filterable flag.
  * Validation for fields, operators, and values.
  * Special rules: `between`, `in`, `is_null`, `is_not_null`.
* ✅ **Query Builders**

  * `MongoBuilder` → Mongo-style query objects.
  * `SqlBuilder` → SQL `WHERE` clauses with parameters.
* ✅ **Repository Layer**

  * Executes validated filters against an in-memory dataset.
* ✅ **Express API**

  * `POST /users/filter` → accepts filter JSON in body.
  * `GET /users/filter?filter=<encoded>` → accepts URL-encoded filter JSON.
* ✅ **Testing**

  * Unit tests for validation, field restrictions, query conversion.
  * Integration tests for API behavior.

---

## 📂 Project Structure

```
custom_filter/
├─ src/
│  ├─ app.ts               # Express app + routes
│  ├─ data/
│  │  ├─ users.ts          # Example dataset
│  │  └─ userSchema.ts     # Schema definition
│  ├─ lib/
│  │  ├─ filter.ts         # Core filter library
│  │  ├─ queryBuilder.ts   # QueryBuilder interface
│  │  ├─ mongoBuilder.ts   # Mongo-style query builder
│  │  └─ sqlBuilder.ts     # SQL query builder
│  └─ repo/
│     └─ userRepository.ts # Repository with filtering logic
├─ tests/
│  ├─ app.test.ts          # Integration tests
│  ├─ filter.test.ts       # Unit tests (validation + conversion)
│  └─ userRepository.test.ts # Repository tests
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## ⚙️ Setup Instructions

### 1. Clone Repo

```bash
git clone https://github.com/<your-username>/custom_filter.git
cd custom_filter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
npm test
```

### 4. Start API (Dev Mode)

```bash
npm run dev
```

API will start at `http://localhost:3000`.

---

## Example Requests

### Health Check

```http
GET /health
```

**Response**

```json
{ "ok": true }
```

### Example Dataset

```http
GET /users/filter
```

**Response**

```json
{
    "data": [
        {
            "id": "1",
            "name": "Alice",
            "age": 35,
            "role": "admin",
            "isActive": true,
            "createdAt": "2021-01-01T00:00:00.000Z"
        },
        {
            "id": "2",
            "name": "Bob",
            "age": 28,
            "role": "user",
            "isActive": false,
            "createdAt": "2022-01-01T00:00:00.000Z"
        },
        {
            "id": "3",
            "name": "Charlie",
            "age": 40,
            "role": "manager",
            "isActive": true,
            "createdAt": "2023-01-01T00:00:00.000Z"
        }
    ]
}
```


### Filter Active Users

```http
POST /users/filter
Content-Type: application/json

{
  "field": "isActive",
  "operator": "eq",
  "value": true
}
```

**Response**

```json
{
    "data": [
        {
            "id": "1",
            "name": "Alice",
            "age": 35,
            "role": "admin",
            "isActive": true,
            "createdAt": "2021-01-01T00:00:00.000Z"
        },
        {
            "id": "3",
            "name": "Charlie",
            "age": 40,
            "role": "manager",
            "isActive": true,
            "createdAt": "2023-01-01T00:00:00.000Z"
        }
    ]
}
```

### Invalid Field

```http
POST /users/filter
Content-Type: application/json

{
  "field": "nonexistent",
  "operator": "eq",
  "value": "x"
}
```

**Response**

```json
{
    "error": "Validation failed: [{\"path\":\"<root>\",\"message\":\"Field \\\"nonexistent\\\" is not allowed for filtering\"}]"
}
```

---

## Design Decisions

While building this filter library and API, a few conscious choices were made:

1. **Schema-driven validation**
   Instead of hardcoding allowed fields or operators, the library uses a schema (`userSchema.ts`). Each field declares its type, allowed operators, and whether it’s filterable. This makes the system flexible — adding a new filterable field doesn’t require touching the core logic.

2. **Field exposure restriction in the library (not the API)**
   To keep things secure and reusable, the restriction on which fields can be filtered is enforced inside the filter library itself, not just at the endpoint layer. This way, the same validation works no matter if the filter is used via API, repository, or another service.

3. **Operator flexibility**
   Operators are defined per field type, so the same system works for numbers (`gt`, `lt`, `between`), strings (`regex`, `eq`), and enums (`in`). This also makes it easy to add custom operators later.

4. **Extensibility with query builders**
   The library doesn’t tie itself to one database. Instead, we added a `QueryBuilder` interface and implemented two adapters:

   * `MongoBuilder` for Mongo-style JSON queries
   * `SqlBuilder` for SQL `WHERE` clauses
     This separation means you can plug in an ORM or another backend without rewriting validation logic.

5. **Repository pattern**
   The `UserRepository` class demonstrates how filters can be applied consistently against an in-memory dataset. This could easily be swapped with a real DB implementation.

6. **Error handling is explicit**
   Invalid filters (wrong field, wrong type, disallowed operator, malformed structure) always return clear validation errors. This was important to prevent silent failures and to give API consumers immediate feedback.

7. **Testing first mindset**
   Unit tests cover validation rules and query conversions. Integration tests verify the end-to-end API behavior with sample requests. This ensures the library behaves the same way in isolation and when wired into the Express app.


---

## How to Extend the Filter Library

The filter library was designed with extensibility in mind. Here are some common ways to extend it:

### 1. Add a Custom Operator

You can extend the `defaultOperators` or allow per-field operators in the schema.

```ts
// In your schema
{
  name: "salary",
  type: "number",
  filterable: true,
  allowedOperators: ["eq", "gt", "lt", "range"] // add custom operator
}
```

Then implement its validation and query conversion in `FilterLibrary`:

```ts
private conditionToSql(cond: Condition) {
  switch (cond.operator) {
    case "range":
      return { sql: `${cond.field} BETWEEN ? AND ?`, params: cond.value };
    // ... existing operators
  }
}
```

### 2. Plug in a New Query Builder

The `QueryBuilder` interface makes it easy to add a new backend.
For example, a **PrismaBuilder** could look like this:

```ts
import { FilterInput, FilterLibrary } from "./filter";
import { QueryBuilder } from "./queryBuilder";

export class PrismaBuilder implements QueryBuilder<any> {
  constructor(private lib: FilterLibrary) {}

  build(filter: FilterInput) {
    const mongoLike = this.lib["toMongoQuery"](filter);
    return this.translateToPrisma(mongoLike);
  }

  private translateToPrisma(query: any) {
    // map Mongo-style query into Prisma format
  }
}
```

### 3. Extend Validation Rules

If your project has domain-specific constraints (e.g., `age` must be non-negative, `createdAt` cannot be in the future),
you can add them inside `validateValue` or `checkType`.

### 4. Reuse Across Entities

Define schemas for multiple entities (e.g., `User`, `Product`, `Order`).
Each schema can be passed into a new `FilterLibrary` instance, making the same validation and query logic reusable across your app.
