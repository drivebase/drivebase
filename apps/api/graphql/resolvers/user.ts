import type { MutationResolvers, QueryResolvers, UserResolvers } from "../generated/types";
import { requireRole } from "./auth-helpers";
import { UserService } from "../../services/user";

export const userQueries: QueryResolvers = {
  users: async (_parent, args, context) => {
    requireRole(context, ["admin", "owner"]);
    const userService = new UserService(context.db);
    return userService.findAll(args.limit ?? undefined, args.offset ?? undefined);
  },

  user: async (_parent, args, context) => {
    requireRole(context, ["admin", "owner"]);
    const userService = new UserService(context.db);
    return userService.findById(args.id);
  },
};

export const userMutations: MutationResolvers = {
  createUser: async (_parent, args, context) => {
    requireRole(context, ["admin", "owner"]);
    const userService = new UserService(context.db);

    return userService.create({
      email: args.input.email,
      password: args.input.password,
      role: args.input.role.toLowerCase(),
    });
  },

  updateUser: async (_parent, args, context) => {
    requireRole(context, ["admin", "owner"]);
    const userService = new UserService(context.db);

    const updateData: { role?: any; isActive?: boolean } = {};
    if (args.input.role !== null && args.input.role !== undefined) {
      updateData.role = args.input.role.toLowerCase();
    }
    if (args.input.isActive !== null && args.input.isActive !== undefined) {
      updateData.isActive = args.input.isActive;
    }

    return userService.update(args.id, updateData);
  },

  deleteUser: async (_parent, args, context) => {
    requireRole(context, ["owner"]);
    const userService = new UserService(context.db);
    await userService.delete(args.id);
    return true;
  },
};

/**
 * User field resolvers - convert database values to GraphQL types
 */
export const userResolvers: UserResolvers = {
  id: (parent) => parent.id,
  name: (parent) => parent.name,
  email: (parent) => parent.email,
  role: (parent) => parent.role.toUpperCase() as any,
  isActive: (parent) => parent.isActive,
  lastLoginAt: (parent) => parent.lastLoginAt ?? null,
  createdAt: (parent) => parent.createdAt,
  updatedAt: (parent) => parent.updatedAt,
};
