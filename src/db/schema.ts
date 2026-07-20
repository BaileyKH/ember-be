import { pgTable, timestamp, varchar, uuid, text } from "drizzle-orm/pg-core";

export type NewUser = typeof users.$inferInsert;
export type ExistingUser = typeof users.$inferSelect;

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
})