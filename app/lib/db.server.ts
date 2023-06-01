// import {
//   drizzle,
//   PlanetScaleDatabase,
// } from "drizzle-orm/planetscale-serverless";
// import { connect } from "@planetscale/database";
// import { env } from "~/env.mjs";

// let db: PlanetScaleDatabase;

// declare global {
//   var __db__: PlanetScaleDatabase | undefined;
// }

// // This is needed because in development we don't want to restart
// // the server with every change, but we want to make sure we don't
// // create a new connection to the DB with every change either.
// // In production, we'll have a single connection to the DB.
// if (process.env.NODE_ENV === "production") {
//   const connection = connect({
//     host: env.DATABASE_HOST,
//     username: env.DATABASE_USERNAME,
//     password: env.DATABASE_PASSWORD,
//   });

//   db = drizzle(connection);
// } else {
//   if (!global.__db__) {
//     const connection = connect({
//       host: env.DATABASE_HOST,
//       username: env.DATABASE_USERNAME,
//       password: env.DATABASE_PASSWORD,
//     });

//     global.__db__ = drizzle(connection);
//   }
//   db = global.__db__;
// }

import mysql from "mysql2";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { env } from "~/env.mjs";
import { PoolOptions } from "mysql2";
import * as schema from "./schemas.server";
import { desc, eq, placeholder, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

let db: MySql2Database<typeof schema>;

declare global {
  var __db__: MySql2Database<typeof schema>;
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll have a single connection to the DB.
if (process.env.NODE_ENV === "production") {
  const connection = mysql.createPool(env.DATABASE_URL as any as PoolOptions);

  db = drizzle(connection, { schema });
} else {
  if (!global.__db__) {
    const connection = mysql.createPool(env.DATABASE_URL as any as PoolOptions);

    global.__db__ = drizzle(connection, { schema });
  }
  db = global.__db__;
}

export { db };
export * from "./schemas.server";

const jokes = schema.jokes;
const users = schema.users;

export const latest5Jokes = db
  .select({
    id: jokes.id,
    name: jokes.name,
  })
  .from(jokes)
  .orderBy(desc(jokes.createdAt))
  .limit(5)
  .prepare();

export const getJoke = db
  .select({
    id: jokes.id,
    name: jokes.name,
    content: jokes.content,
  })
  .from(jokes)
  .where(eq(jokes.id, placeholder("id")))
  .prepare();

export const randomJoke = db
  .select({ id: jokes.id, name: jokes.name, content: jokes.content })
  .from(jokes)
  .orderBy(sql`rand()`)
  .limit(1)
  .prepare();

export const createJoke = async (newJoke: schema.NewJoke) => {
  const result = await db.insert(jokes).values(newJoke);
  return { id: result[0].insertId };
};

type RegisterResult =
  | { success: false; error: string }
  | { success: true; user: { id: number; username: string } };

export const findUserById = db
  .select({ id: users.id, username: users.username })
  .from(users)
  .where(eq(users.id, placeholder("userId")))
  .limit(1)
  .prepare();

export const findUserByLogin = async (loginUser: {
  username: string;
  password: string;
}) => {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.username, loginUser.username))
    .limit(1);

  if (!user) {
    return null;
  }

  const isCorrectPassword = await bcrypt.compare(
    loginUser.password,
    user.passwordHash
  );

  if (!isCorrectPassword) {
    return null;
  }

  return { id: user.id, username: user.username };
};

export const registerUser = async (newUser: {
  username: string;
  password: string;
}): Promise<RegisterResult> => {
  const [existingUser] = await db
    .select({
      userExists: sql<number>`1`,
    })
    .from(users)
    .where(eq(users.username, newUser.username))
    .limit(1);

  if (existingUser) {
    return {
      success: false,
      error: `User with username ${newUser.username} already exists`,
    };
  }

  const passwordHash = await bcrypt.hash(newUser.password, 10);

  const result = await db
    .insert(users)
    .values({ username: newUser.username, passwordHash });

  if (result[0].insertId < 1) {
    return { success: false, error: "Failed to create user record" };
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, result[0].insertId));

  return { success: true, user };
};
