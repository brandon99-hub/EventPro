ALTER TABLE "users" ADD COLUMN "mpesa_phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payout_method" text DEFAULT 'mpesa';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;