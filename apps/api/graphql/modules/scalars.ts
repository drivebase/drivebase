import { GraphQLScalarType, Kind } from "graphql";

/** ISO-8601 string <-> Date. */
export const DateTimeScalar = new GraphQLScalarType<Date | null, string | null>({
  name: "DateTime",
  description: "ISO-8601 timestamp.",
  serialize(value) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return new Date(value).toISOString();
    throw new TypeError(`DateTime cannot serialize ${typeof value}`);
  },
  parseValue(value) {
    if (typeof value !== "string") throw new TypeError("DateTime must be an ISO-8601 string");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new TypeError("invalid DateTime");
    return d;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) throw new TypeError("DateTime must be a string");
    return new Date(ast.value);
  },
});

/** 64-bit integer serialized as string (BigInt-safe). */
export const BigIntScalar = new GraphQLScalarType<bigint | number | null, string | null>({
  name: "BigInt",
  description: "64-bit integer, serialized as a string to avoid JS number precision loss.",
  serialize(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    throw new TypeError(`BigInt cannot serialize ${typeof value}`);
  },
  parseValue(value) {
    if (typeof value === "string") return BigInt(value);
    if (typeof value === "number") return BigInt(value);
    throw new TypeError("BigInt must be a string or number");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) return BigInt(ast.value);
    throw new TypeError("BigInt must be a string or int");
  },
});

/** Opaque JSON payload — used for provider-specific credential shapes. */
export const JSONScalar = new GraphQLScalarType<unknown, unknown>({
  name: "JSON",
  description: "Opaque JSON payload.",
  serialize: (v) => v,
  parseValue: (v) => v,
  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return ast.values.map((v) =>
          JSONScalar.parseLiteral ? JSONScalar.parseLiteral(v, {}) : null,
        );
      case Kind.OBJECT: {
        const out: Record<string, unknown> = {};
        for (const f of ast.fields) {
          out[f.name.value] = JSONScalar.parseLiteral
            ? JSONScalar.parseLiteral(f.value, {})
            : null;
        }
        return out;
      }
      default:
        return null;
    }
  },
});

export const scalarsResolvers = {
  DateTime: DateTimeScalar,
  BigInt: BigIntScalar,
  JSON: JSONScalar,
};
