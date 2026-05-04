import mysql from 'mysql2/promise'
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: String('5225'),
  database: 'kfa',
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
