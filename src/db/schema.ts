import { pgTable, timestamp, varchar, uuid, text, uniqueIndex } from "drizzle-orm/pg-core";
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