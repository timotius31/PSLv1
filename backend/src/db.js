import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}
