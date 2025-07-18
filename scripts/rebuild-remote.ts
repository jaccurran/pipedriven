// scripts/rebuild-remote.ts
import { execSync } from "child_process";

const dbUrl = process.argv[2] || process.env.REMOTE_DATABASE_URL;

if (!dbUrl) {
  console.error("Usage: pnpm tsx scripts/rebuild-remote.ts <DATABASE_URL>");
  console.error("Or set REMOTE_DATABASE_URL in your environment.");
  process.exit(1);
}

// Mask the password in logs for security
const maskedUrl = dbUrl.replace(/:[^:]*@/, ':*****@');
console.log(`🔄 Rebuilding remote database: ${maskedUrl}`);

try {
  // First, reset the database (this will drop all tables and recreate them)
  console.log("🗑️  Resetting database (dropping all tables)...");
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma migrate reset --force`, { stdio: "inherit" });
  
  // Then run the seed
  console.log("🌱 Seeding database...");
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db seed`, { stdio: "inherit" });
  
  console.log("✅ Remote database rebuilt and seeded successfully!");
} catch (error) {
  console.error("❌ Failed to rebuild remote database:", error);
  process.exit(1);
} 