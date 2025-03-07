import { Prisma, User } from '@prisma/client';

export const userProfile = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
});

export type UserPublicData = Prisma.UserGetPayload<typeof userProfile>;

export function convertToUserPublicData(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  } satisfies UserPublicData;
}
