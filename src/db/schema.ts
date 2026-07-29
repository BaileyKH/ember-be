import { pgTable, timestamp, varchar, uuid, text, uniqueIndex, date, index, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type NewUser = typeof users.$inferInsert;
export type ExistingUser = typeof users.$inferSelect;
export type PublicUser = Omit<ExistingUser, "hashedPassword">

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    email: varchar("email", { length: 256 }).unique().notNull(),
    profileImg: text("profile_image"),
    username: varchar("username", { length: 30 }).notNull(),
    hashedPassword: varchar("hashed_password").notNull(),
}, (table) => [
  uniqueIndex("users_username_lower_unique").on(sql`lower(${table.username})`),
])

export const refreshTokens = pgTable("refresh_tokens", {
    token: text("token").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at")
})

export type NewTrip = typeof trips.$inferInsert
export type ExistingTrip = typeof trips.$inferSelect

export const trips = pgTable("trips", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: varchar("name", { length: 256 }).notNull(),
    location: varchar("location", { length: 256 }).notNull(),
    description: varchar("description", { length: 256 }),
    bannerImg: text("banner_image"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull()
})

export type NewTripMember = typeof tripMembers.$inferInsert
export type ExistingMember = typeof tripMembers.$inferSelect

export const tripMembers = pgTable("trip_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
    uniqueIndex("trip_members_trip_user_unique").on(table.tripId, table.userId),
    index("trip_members_user_id_idx").on(table.userId)
])

export type NewTripPhoto = typeof tripPhotos.$inferInsert
export type ExistingTripPhoto = typeof tripPhotos.$inferSelect

export const tripPhotos = pgTable("trip_photos", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
    uploadedById: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    imagePath: text("image_path").notNull().unique(),
    thumbnailPath: text("thumbnail_path").notNull().unique(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
}, (table) => [
    index("trip_photos_trip_created_idx").on(table.tripId, table.createdAt, table.id),
    index("trip_photos_uploaded_by_idx").on(table.uploadedById)
])
