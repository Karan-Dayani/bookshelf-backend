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

app.get("/", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM books ORDER BY id LIMIT 10 OFFSET 0"
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
