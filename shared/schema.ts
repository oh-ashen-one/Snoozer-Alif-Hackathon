import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Firebase-authenticated users
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey(), // Firebase UID
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invite codes for buddy pairing
export const invites = pgTable("invites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostUserId: varchar("host_user_id").notNull().references(() => appUsers.id),
  guestUserId: varchar("guest_user_id").references(() => appUsers.id),
  mode: varchar("mode", { length: 20 }).notNull(), // '1v1', 'group', 'survivor', 'accountability', 'charity'
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => [
  index("invites_code_idx").on(table.code),
  index("invites_host_user_idx").on(table.hostUserId),
  index("invites_status_idx").on(table.status),
]);

// Established buddy pairs
export const buddyPairs = pgTable("buddy_pairs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => appUsers.id),
  user2Id: varchar("user2_id").notNull().references(() => appUsers.id),
  mode: varchar("mode", { length: 20 }).notNull(),
  inviteId: varchar("invite_id").references(() => invites.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("buddy_pairs_user1_idx").on(table.user1Id),
  index("buddy_pairs_user2_idx").on(table.user2Id),
]);

// Zod schemas for validation
export const insertAppUserSchema = createInsertSchema(appUsers).pick({
  id: true,
  email: true,
  displayName: true,
});

export const insertInviteSchema = createInsertSchema(invites).pick({
  hostUserId: true,
  mode: true,
});

export const joinInviteSchema = z.object({
  code: z.string().length(6).regex(/^[A-Z0-9]+$/),
});

// Shame videos - store one video per user
export const shameVideos = pgTable("shame_videos", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().unique(), // Unique device identifier
  videoData: text("video_data").notNull(), // Base64 encoded video
  mimeType: varchar("mime_type", { length: 50 }).notNull().default('video/mp4'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("shame_videos_device_idx").on(table.deviceId),
]);

export const insertShameVideoSchema = createInsertSchema(shameVideos).pick({
  deviceId: true,
  videoData: true,
  mimeType: true,
});

// Punishment contacts - store contact info for punishment recipients
export const punishmentContacts = pgTable("punishment_contacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().unique(),
  bossEmail: text("boss_email"),
  bossName: text("boss_name"),
  exPhoneNumber: text("ex_phone_number"),
  exName: text("ex_name"),
  wifesDadPhoneNumber: text("wifes_dad_phone_number"),
  wifesDadName: text("wifes_dad_name"),
  momPhoneNumber: text("mom_phone_number"),
  momName: text("mom_name"),
  grandmaPhoneNumber: text("grandma_phone_number"),
  grandmaName: text("grandma_name"),
  buddyPhoneNumber: text("buddy_phone_number"),
  buddyName: text("buddy_name"),
  groupChatId: text("group_chat_id"),
  twitterHandle: text("twitter_handle"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("punishment_contacts_device_idx").on(table.deviceId),
]);

export const insertPunishmentContactsSchema = createInsertSchema(punishmentContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AppUser = typeof appUsers.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type BuddyPair = typeof buddyPairs.$inferSelect;
export type ShameVideo = typeof shameVideos.$inferSelect;
export type PunishmentContacts = typeof punishmentContacts.$inferSelect;
