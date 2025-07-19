// scripts/seed-remote.ts
import { execSync } from "child_process";

// Parse command line arguments
const args = process.argv.slice(2);
const dbUrl = args.find(arg => !arg.startsWith('--')) || process.env.REMOTE_DATABASE_URL;
const schemaOnly = args.includes('--schema-only');

if (!dbUrl) {
  console.error("Usage: pnpm tsx scripts/seed-remote.ts <DATABASE_URL> [--schema-only]");
  console.error("Or set REMOTE_DATABASE_URL in your environment.");
  console.error("");
  console.error("Options:");
  console.error("  --schema-only    Apply database schema changes without seeding data");
  process.exit(1);
}

// Mask the password in logs for security
const maskedUrl = dbUrl.replace(/:[^:]*@/, ':*****@');
console.log(`🌱 Setting up remote database: ${maskedUrl}`);

if (schemaOnly) {
  console.log("📋 Schema-only mode: Will apply database changes without seeding data");
}

try {
  // First, push the schema to create/update tables
  console.log("📋 Pushing database schema...");
  execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db push`, { stdio: "inherit" });
  
  if (!schemaOnly) {
    // Then run the seed (only if not in schema-only mode)
    console.log("🌱 Seeding database...");
    execSync(`DATABASE_URL="${dbUrl}" pnpm prisma db seed`, { stdio: "inherit" });
    console.log("✅ Remote database setup and seeded successfully!");
  } else {
    console.log("✅ Database schema applied successfully (no data seeded)!");
  }
} catch {
  console.error("❌ Failed to setup remote database.");
  process.exit(1);
} 