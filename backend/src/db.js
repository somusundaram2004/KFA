import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const dbConfig = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
}

console.log('[DB] MySQL config loaded', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  passwordSet: Boolean(dbConfig.password),
})

export const pool = mysql.createPool(dbConfig)

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
