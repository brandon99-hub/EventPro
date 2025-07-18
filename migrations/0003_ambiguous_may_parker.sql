CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"ticket_number" integer NOT NULL,
	"qr_code" text NOT NULL,
	"is_scanned" boolean DEFAULT false NOT NULL,
	"scanned_at" timestamp,
	"scanned_by" integer,
	"attendance_status" text DEFAULT 'not_attended' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_qr_code_unique";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "qr_code";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "is_scanned";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "scanned_at";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "scanned_by";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "attendance_status";