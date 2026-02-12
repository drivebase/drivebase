import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@drivebase/core";
import { hashPassword, validatePassword } from "../utils/password";

export class UserService {
  constructor(private db: Database) {}

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  /**
   * Find all users
   */
  async findAll(limit: number = 50, offset: number = 0) {
    return this.db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt);
  }

  /**
   * Create a new user
   */
  async create(data: { email: string; password: string; role: any; name?: string }) {
    // Validate password
    const validation = validatePassword(data.password);
    if (!validation.valid) {
      throw new ValidationError(validation.message!);
    }

    // Check if email already exists
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("Email already in use");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    const defaultName = data.name?.trim() || data.email.split("@")[0] || "User";

    // Create user
    const [user] = await this.db
      .insert(users)
      .values({
        name: defaultName,
        email: data.email,
        passwordHash,
        role: data.role as any,
        isActive: true,
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, data: { role?: any; isActive?: boolean }) {
    const [user] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  /**
   * Delete user
   */
  async delete(id: string) {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError("User");
    }
  }
}
