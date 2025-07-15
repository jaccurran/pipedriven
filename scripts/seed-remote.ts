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
console.log(`🌱 Seeding remote database: ${maskedUrl}`);

try {
  // Run the seed with the provided DATABASE_URL
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db seed`, { stdio: "inherit" });
  console.log("✅ Remote database seeded successfully!");
} catch (err) {
  console.error("❌ Failed to seed remote database.");
  process.exit(1);
} 