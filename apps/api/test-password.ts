import { getDb, users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./utils/password";

async function testPassword() {
  const db = getDb();

  // Get admin user
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@drivebase.local"));

  if (!admin) {
    console.log("❌ Admin user not found");
    return;
  }

  console.log("✅ Admin user found:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    passwordHash: admin.passwordHash.substring(0, 20) + "...",
  });

  // Test password verification
  const password = "admin123";
  console.log("\nTesting password:", password);

  const isValid = await verifyPassword(password, admin.passwordHash);
  console.log("Password valid:", isValid);

  if (!isValid) {
    console.log("\n❌ Password doesn't match!");
    console.log("Let's hash the password and compare:");
    const newHash = await hashPassword(password);
    console.log("New hash:", newHash.substring(0, 20) + "...");
    console.log("DB hash:", admin.passwordHash.substring(0, 20) + "...");

    // Update with correct hash
    console.log("\nUpdating password hash in database...");
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, admin.id));
    console.log("✅ Password updated! Try logging in again.");
  } else {
    console.log("\n✅ Password is correct!");
  }
}

testPassword().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
