// scripts/seed-remote.ts
import { execSync } from "child_process";

const dbUrl = process.argv[2] || process.env.REMOTE_DATABASE_URL;

if (!dbUrl) {
  console.error("Usage: pnpm tsx scripts/seed-remote.ts <DATABASE_URL>");
  console.error("Or set REMOTE_DATABASE_URL in your environment.");
  process.exit(1);
}

// Mask the password in logs for security
const maskedUrl = dbUrl.replace(/:[^:]*@/, ':*****@');
console.log(`🌱 Setting up remote database: ${maskedUrl}`);

try {
  // First, push the schema to create/update tables
  console.log("📋 Pushing database schema...");
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db push`, { stdio: "inherit" });
  
  // Then run the seed
  console.log("🌱 Seeding database...");
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db seed`, { stdio: "inherit" });
  
  console.log("✅ Remote database setup and seeded successfully!");
} catch {
  console.error("❌ Failed to setup remote database.");
  process.exit(1);
} 