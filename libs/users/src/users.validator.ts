import { User } from './user.entity';

export interface UserPublicData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function convertToUserPublicData(user: User): UserPublicData {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
