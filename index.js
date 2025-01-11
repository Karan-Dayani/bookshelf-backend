const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const port = process.env.PORT || 6969;

dotenv.config();
app.use(cors());
app.use(express.json());

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get("/count/:table", async (req, res) => {
  const table = req.params.table;
  const genre = req.query.genre === "Filter" ? null : req.query.genre;
  try {
    const client = await pool.connect();
    let result;
    if (genre) {
      result = await client.query(
        `SELECT COUNT(*) FROM ${table} WHERE genre='${genre}'`
      );
    } else {
      result = await client.query(`SELECT COUNT(*) FROM ${table}`);
    }
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/genres", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`SELECT DISTINCT genre FROM books`);
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/getBooks", async (req, res) => {
  const limit = req.query.limit || 9;
  const page = req.query.page || 1;
  const genre = req.query.genre === "Filter" ? null : req.query.genre;
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();
    let result;
    if (genre) {
      result = await client.query(
        `SELECT * FROM books WHERE genre=$3 LIMIT $1 OFFSET $2`,
        [limit, offset, genre]
      );
    } else {
      result = await client.query(
        `SELECT * FROM books ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/getUser/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const client = await pool.connect();
    const result = await client.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    client.release();
    if (result.rows.length === 0) {
      res.json(null);
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/createUser", async (req, res) => {
  const { data } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO users (name, email, role) VALUES ($1,$2,$3)`,
      [data.name, data.email, data.role]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log("Server started at", port);
});
