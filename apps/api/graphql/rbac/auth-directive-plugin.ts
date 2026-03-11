import { AuthenticationError, AuthorizationError } from "@drivebase/core";
import {
	type GraphQLField,
	GraphQLObjectType,
	type GraphQLSchema,
	Kind,
	defaultFieldResolver,
} from "graphql";
import { requireWorkspaceRole } from "../../service/workspace";
import type { GraphQLContext } from "../context";

/**
 * Parsed @auth directive metadata attached to a field.
 */
interface AuthDirective {
	/** Global user roles required (e.g. ["ADMIN", "OWNER"]) */
	roles: string[] | null;
	/** Workspace-level roles required (e.g. ["OWNER", "ADMIN"]) */
	workspaceRoles: string[] | null;
}

function parseAuthDirective(
	field: GraphQLField<unknown, unknown>,
): AuthDirective | null {
	const astNode = field.astNode;
	if (!astNode?.directives) return null;

	const authDir = astNode.directives.find((d) => d.name.value === "auth");
	if (!authDir) return null;

	let roles: string[] | null = null;
	let workspaceRoles: string[] | null = null;

	for (const arg of authDir.arguments ?? []) {
		if (arg.name.value === "role" && arg.value.kind === Kind.LIST) {
			roles = arg.value.values
				.filter((v) => v.kind === Kind.ENUM)
				.map((v) => (v as { value: string }).value);
		}
		if (arg.name.value === "workspaceRole" && arg.value.kind === Kind.LIST) {
			workspaceRoles = arg.value.values
				.filter((v) => v.kind === Kind.ENUM)
				.map((v) => (v as { value: string }).value);
		}
	}

	return { roles, workspaceRoles };
}

/**
 * Extract workspaceId from resolver arguments.
 * Checks (in order):
 *   1. args.workspaceId
 *   2. args.input.workspaceId
 *   3. x-workspace-id header
 */
function extractWorkspaceId(
	args: Record<string, unknown>,
	context: GraphQLContext,
): string | null {
	if (typeof args.workspaceId === "string") return args.workspaceId;

	const input = args.input as Record<string, unknown> | undefined;
	if (input && typeof input.workspaceId === "string") return input.workspaceId;

	return context.headers?.get("x-workspace-id") ?? null;
}

/**
 * Transform the schema by wrapping root field resolvers with @auth checks.
 *
 * For every root field (Query/Mutation/Subscription) with @auth:
 * - Ensures the user is authenticated
 * - If `role` is specified, checks the user's global role
 * - If `workspaceRole` is specified, checks the user's workspace membership
 *
 * This mutates the schema in-place (safe — called once at build time).
 */
export function applyAuthDirectives(schema: GraphQLSchema): GraphQLSchema {
	for (const typeName of ["Query", "Mutation", "Subscription"]) {
		const type = schema.getType(typeName);
		if (!type || !(type instanceof GraphQLObjectType)) continue;

		const fields = type.getFields();
		for (const field of Object.values(fields)) {
			const directive = parseAuthDirective(field);
			if (!directive) continue;

			const original = field.resolve ?? defaultFieldResolver;

			field.resolve = async (parent, args, context: GraphQLContext, info) => {
				// Require authentication
				if (!context.user) {
					throw new AuthenticationError("Authentication required");
				}

				// Check global roles
				if (directive.roles && directive.roles.length > 0) {
					const userRole = context.user.role.toUpperCase();
					if (!directive.roles.includes(userRole)) {
						throw new AuthorizationError("Insufficient permissions");
					}
				}

				// Check workspace roles
				if (directive.workspaceRoles && directive.workspaceRoles.length > 0) {
					const workspaceId = extractWorkspaceId(
						args as Record<string, unknown>,
						context,
					);
					if (!workspaceId) {
						throw new AuthorizationError(
							"Workspace ID is required for this operation",
						);
					}

					const allowed = directive.workspaceRoles.map((r) =>
						r.toLowerCase(),
					) as ("viewer" | "editor" | "admin" | "owner")[];

					await requireWorkspaceRole(
						context.db,
						workspaceId,
						context.user.userId,
						allowed,
					);
				}

				return original(parent, args, context, info);
			};
		}
	}

	return schema;
}
