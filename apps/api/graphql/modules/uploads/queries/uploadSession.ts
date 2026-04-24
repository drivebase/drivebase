import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { getUploadSession } from "~/services/uploads/sessions.ts";

export const uploadSession: QueryResolvers["uploadSession"] = async (
  _parent,
  { id },
  ctx,
) => {
  const user = requireUser(ctx);
  return getUploadSession({ db: ctx.db, userId: user.id, id });
};
