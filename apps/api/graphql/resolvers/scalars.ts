import { GraphQLScalarType, Kind } from "graphql";
import type { Resolvers } from "../generated/types";

/**
 * DateTime scalar - ISO 8601 date string
 */
const DateTimeScalar = new GraphQLScalarType({
	name: "DateTime",
	description: "ISO 8601 date-time string",
	serialize(value: unknown): string {
		if (value instanceof Date) {
			return value.toISOString();
		}
		if (typeof value === "string") {
			return value;
		}
		throw new Error("DateTime must be a Date instance or ISO string");
	},
	parseValue(value: unknown): Date {
		if (typeof value === "string") {
			return new Date(value);
		}
		if (value instanceof Date) {
			return value;
		}
		throw new Error("DateTime must be a string or Date");
	},
	parseLiteral(ast): Date {
		if (ast.kind === Kind.STRING) {
			return new Date(ast.value);
		}
		throw new Error("DateTime must be a string");
	},
});

/**
 * JSON scalar - any valid JSON value
 */
const JSONScalar = new GraphQLScalarType({
	name: "JSON",
	description: "Arbitrary JSON value",
	serialize(value: unknown): unknown {
		return value;
	},
	parseValue(value: unknown): unknown {
		return value;
	},
	parseLiteral(ast): unknown {
		switch (ast.kind) {
			case Kind.STRING:
			case Kind.BOOLEAN:
				return ast.value;
			case Kind.INT:
			case Kind.FLOAT:
				return parseFloat(ast.value);
			case Kind.OBJECT: {
				const obj: Record<string, unknown> = {};
				for (const field of ast.fields) {
					obj[field.name.value] = JSONScalar.parseLiteral(field.value);
				}
				return obj;
			}
			case Kind.LIST:
				return ast.values.map((value) => JSONScalar.parseLiteral(value));
			case Kind.NULL:
				return null;
			default:
				throw new Error(`Unexpected kind in JSON literal: ${ast.kind}`);
		}
	},
});

export const scalarResolvers: Pick<Resolvers, "DateTime" | "JSON"> = {
	DateTime: DateTimeScalar,
	JSON: JSONScalar,
};
