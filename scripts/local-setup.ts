const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


// === CONFIGURATION ===
const DATA_DIR = path.resolve("./local");
const DB_PATH = path.join(DATA_DIR, "opencharacter.sqlite");
const ENV_PATH = path.resolve(".env");

// === Ensure data directory exists ===
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
}

// === Initialize SQLite Database ===
const db = new Database(DB_PATH);

console.log(`\nUsing SQLite database at: ${DB_PATH}\n`);

// === Example Table Creation (Expand for Your Schema) ===
db.exec(`
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	PRIMARY KEY("provider", "providerAccountId"),
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" integer NOT NULL,
	"transports" text,
	PRIMARY KEY("userId", "credentialID"),
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" integer,
	"image" text
);

CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" integer NOT NULL,
	PRIMARY KEY("identifier", "token")
);

CREATE UNIQUE INDEX "authenticator_credentialID_unique" ON "authenticator" ("credentialID");
CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");

CREATE TABLE "character" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"greeting" text NOT NULL,
	"visibility" text NOT NULL,
	"userId" text NOT NULL,
	"interactionCount" integer DEFAULT 0 NOT NULL,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "character" ADD "avatar_image_url" text;

CREATE TABLE "chat_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"messages" text NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_message_timestamp" integer NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("character_id") REFERENCES "character"("id") ON UPDATE no action ON DELETE cascade
);

CREATE INDEX "user_character_idx" ON "chat_session" ("user_id","character_id");

ALTER TABLE "character" ADD "banner_image_url" text;

ALTER TABLE "character" ADD "temperature" real;
ALTER TABLE "character" ADD "top_p" real;
ALTER TABLE "character" ADD "top_k" integer;
ALTER TABLE "character" ADD "frequency_penalty" real;
ALTER TABLE "character" ADD "presence_penalty" real;
ALTER TABLE "character" ADD "repetition_penalty" real;
ALTER TABLE "character" ADD "min_p" real;
ALTER TABLE "character" ADD "top_a" real;
ALTER TABLE "character" ADD "max_tokens" integer;

CREATE TABLE "group_chat_session_characters" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"characterId" text NOT NULL,
	"createdAt" integer NOT NULL,
	FOREIGN KEY ("sessionId") REFERENCES "group_chat_sessions"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("characterId") REFERENCES "character"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "group_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"roomId" text NOT NULL,
	"userId" text NOT NULL,
	"messages" text DEFAULT '[]' NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("roomId") REFERENCES "room"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "room_characters" (
	"id" text PRIMARY KEY NOT NULL,
	"roomId" text NOT NULL,
	"characterId" text NOT NULL,
	"createdAt" integer NOT NULL,
	FOREIGN KEY ("roomId") REFERENCES "room"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("characterId") REFERENCES "character"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"topic" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"userId" text NOT NULL,
	"interactionCount" integer DEFAULT 0 NOT NULL,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "persona" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"displayName" text NOT NULL,
	"background" text NOT NULL,
	"isDefault" integer DEFAULT false NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "user" ADD "bio" text;

ALTER TABLE "persona" ADD "image" text;

ALTER TABLE "chat_session" ADD "summary" text;

ALTER TABLE "chat_session" ADD "share" integer;

CREATE TABLE "social_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"text" text NOT NULL,
	"message" text,
	"createdAt" integer NOT NULL
);

CREATE TABLE "stripe_customer_id" (
	"userId" text PRIMARY KEY NOT NULL,
	"stripeCustomerId" text NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"stripeCustomerId" text NOT NULL,
	"stripeSubscriptionId" text NOT NULL,
	"stripePriceId" text NOT NULL,
	"stripeCurrentPeriodStart" integer NOT NULL,
	"stripeCurrentPeriodEnd" integer NOT NULL,
	"status" text NOT NULL,
	"planType" text NOT NULL,
	"cancelAtPeriodEnd" integer DEFAULT false NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX "stripe_customer_id_stripeCustomerId_unique" ON "stripe_customer_id" ("stripeCustomerId");
CREATE INDEX "subscription_user_id_idx" ON "subscription" ("userId");
CREATE INDEX "subscription_stripe_customer_id_idx" ON "subscription" ("stripeCustomerId");
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" ("stripeSubscriptionId");

CREATE UNIQUE INDEX "subscription_userId_unique" ON "subscription" ("userId");

CREATE TABLE "user_daily_requests" (
	"id" text PRIMARY KEY DEFAULT (uuid()) NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "twitter_roast" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"roastContent" text NOT NULL,
	"userId" text,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"createdAt" integer NOT NULL,
	"updatedAt" integer NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE INDEX "twitter_roast_username_idx" ON "twitter_roast" ("username");
CREATE INDEX "twitter_roast_user_id_idx" ON "twitter_roast" ("userId");

ALTER TABLE "user" ADD "pay_as_you_go" integer DEFAULT false NOT NULL;

CREATE TABLE "user_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" real DEFAULT 0 NOT NULL,
	"last_updated" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "chat_session" ADD "title" text;

CREATE TABLE "referral" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_id" text NOT NULL,
	"signup_date" integer NOT NULL,
	"attribution_expires" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pro_conversion_date" integer,
	"total_earnings" real DEFAULT 0 NOT NULL,
	"last_payment_date" integer,
	"last_payment_amount" real,
	"last_payment_status" text,
	"payment_history" text DEFAULT '[]' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	FOREIGN KEY ("referrer_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("referred_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "user" ADD "referral_link" text;
ALTER TABLE "user" ADD "paypal_email" text;
CREATE INDEX "referral_referrer_idx" ON "referral" ("referrer_id");
CREATE INDEX "referral_referred_idx" ON "referral" ("referred_id");
CREATE INDEX "unique_referral_idx" ON "referral" ("referrer_id","referred_id");

`);

console.log("✅ Database initialized and core tables created.");

// === Generate NEXTAUTH_SECRET if missing ===
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
}

let envContent = "";
if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, "utf-8");
}

if (!/NEXTAUTH_SECRET\s*=/.test(envContent)) {
    const secret = generateSecret(32);
    fs.appendFileSync(ENV_PATH, `\nNEXTAUTH_SECRET=${secret}\n`);
    console.log("✅ NEXTAUTH_SECRET generated and added to .env");
} else {
    console.log("✅ NEXTAUTH_SECRET already exists in .env");
}

console.log("\n🎉 Local setup complete! You can now run: bun run dev\n");
