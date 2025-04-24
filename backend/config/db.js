const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promise wrapper
const promisePool = pool.promise();

module.exports = {
  pool,
  promisePool,
  query: (sql, params) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (error, results) => {
        if (error) {
          return reject(error);
        }
        return resolve(results);
      });
    });
  },
  close: () => {
    return new Promise((resolve, reject) => {
      pool.end(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
};