import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { listActiveUploadSessions } from "~/services/uploads/sessions.ts";

export const uploadSessions: QueryResolvers["uploadSessions"] = async (
  _parent,
  _args,
  ctx,
) => {
  const user = requireUser(ctx);
  return listActiveUploadSessions({ db: ctx.db, userId: user.id });
};
