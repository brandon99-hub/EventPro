CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"ticket_quantity" integer NOT NULL,
	"total_price" double precision NOT NULL,
	"booking_date" timestamp NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"mpesa_phone" text,
	"payment_date" timestamp,
	"commission_amount" double precision DEFAULT 0,
	"organizer_amount" double precision DEFAULT 0,
	"platform_fee" double precision DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_fee_percentage" double precision DEFAULT 0.1 NOT NULL,
	"minimum_fee" double precision DEFAULT 0 NOT NULL,
	"maximum_fee" double precision DEFAULT 1000 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text NOT NULL,
	"venue" text NOT NULL,
	"price" double precision NOT NULL,
	"max_price" double precision,
	"total_seats" integer NOT NULL,
	"available_seats" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"row" text NOT NULL,
	"number" integer NOT NULL,
	"price" double precision NOT NULL,
	"is_booked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
