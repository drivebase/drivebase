import { Prisma } from '@prisma/client';

export const userProfile = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
});

export type UserPublicData = Prisma.UserGetPayload<typeof userProfile>;
