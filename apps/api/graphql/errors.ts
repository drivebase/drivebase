import { GraphQLError } from "graphql";
import type { GraphQLContext } from "./context.ts";

/** Throw in every resolver that requires a signed-in user. */
export function requireUser(ctx: GraphQLContext): GraphQLContext["user"] & {} {
  if (!ctx.user) {
    throw new GraphQLError("not authenticated", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  return ctx.user;
}

export function badInput(message: string, detail?: unknown): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", detail },
  });
}

export function notFound(resource: string): GraphQLError {
  return new GraphQLError(`${resource} not found`, {
    extensions: { code: "NOT_FOUND", http: { status: 404 } },
  });
}
