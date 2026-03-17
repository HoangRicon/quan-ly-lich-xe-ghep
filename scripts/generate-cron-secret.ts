import { randomBytes } from "crypto";

/**
 * Generate a strong CRON_SECRET value.
 * - 32 bytes => 256-bit secret
 * - base64url => safe for env files / headers (no + / =)
 */
const secret = randomBytes(32).toString("base64url");

// Print in .env format for easy copy/paste
process.stdout.write(`CRON_SECRET=${secret}\n`);

