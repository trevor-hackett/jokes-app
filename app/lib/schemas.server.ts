import { InferModel, relations } from "drizzle-orm";
import {
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
  customType,
} from "drizzle-orm/mysql-core";

const uBigint = customType<{ data: number }>({
  dataType() {
    return "bigint unsigned";
  },
});

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 128 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userJokeRelations = relations(users, ({ many }) => ({
  jokes: many(jokes),
}));

export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

export const jokes = mysqlTable("jokes", {
  id: serial("id").primaryKey(),
  jokesterId: uBigint("jokesterId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const jokeUserRelations = relations(jokes, ({ one }) => ({
  jokester: one(users, {
    fields: [jokes.jokesterId],
    references: [users.id],
  }),
}));

export type Joke = InferModel<typeof jokes>;
export type NewJoke = InferModel<typeof jokes, "insert">;
