import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { uploadSession } from "./queries/uploadSession.ts";
import { uploadSessions } from "./queries/uploadSessions.ts";
import { initiateUploadSession } from "./mutations/initiateUploadSession.ts";
import { completeUploadSession } from "./mutations/completeUploadSession.ts";
import { cancelUploadSession } from "./mutations/cancelUploadSession.ts";

export const resolvers: Resolvers = {
  Query: { uploadSession, uploadSessions },
  Mutation: {
    initiateUploadSession,
    completeUploadSession,
    cancelUploadSession,
  },
};
