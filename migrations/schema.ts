import { pgTable, serial, text, timestamp, doublePrecision, integer, boolean, unique, index, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	color: text().notNull(),
});

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text("image_url").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	location: text().notNull(),
	venue: text().notNull(),
	price: doublePrecision().notNull(),
	maxPrice: doublePrecision("max_price"),
	totalSeats: integer("total_seats").notNull(),
	availableSeats: integer("available_seats").notNull(),
	categoryId: integer("category_id").notNull(),
	createdBy: integer("created_by").notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
});

export const seats = pgTable("seats", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	row: text().notNull(),
	number: integer().notNull(),
	price: doublePrecision().notNull(),
	isBooked: boolean("is_booked").default(false).notNull(),
});

export const bookings = pgTable("bookings", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	totalPrice: doublePrecision("total_price").notNull(),
	bookingDate: timestamp("booking_date", { mode: 'string' }).notNull(),
	buyerName: text("buyer_name").notNull(),
	buyerEmail: text("buyer_email").notNull(),
	ticketQuantity: integer("ticket_quantity").notNull(),
	buyerPhone: text("buyer_phone").notNull(),
	paymentStatus: text("payment_status").default('pending').notNull(),
	paymentMethod: text("payment_method"),
	paymentReference: text("payment_reference"),
	mpesaPhone: text("mpesa_phone"),
	paymentDate: timestamp("payment_date", { mode: 'string' }),
	commissionAmount: doublePrecision("commission_amount").default(0),
	organizerAmount: doublePrecision("organizer_amount").default(0),
	platformFee: doublePrecision("platform_fee").default(0),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text().notNull(),
	fullName: text("full_name").notNull(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	mpesaPhone: text("mpesa_phone"),
	bankAccount: text("bank_account"),
	payoutMethod: text("payout_method").default('mpesa'),
	isVerified: boolean("is_verified").default(false).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const commissionSettings = pgTable("commission_settings", {
	id: serial().primaryKey().notNull(),
	platformFeePercentage: doublePrecision("platform_fee_percentage").default(0.1).notNull(),
	minimumFee: doublePrecision("minimum_fee").default(0).notNull(),
	maximumFee: doublePrecision("maximum_fee").default(1000).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);
