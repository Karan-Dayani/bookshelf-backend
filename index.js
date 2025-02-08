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
  const search = req.query.search === "" ? null : req.query.search;
  const role = req.query.role === "All" ? null : req.query.role;
  try {
    const client = await pool.connect();
    let result;

    if (table === "users") {
      if (role && !search) {
        result = await client.query(
          `SELECT COUNT(*) FROM users WHERE role='${role}'`
        );
      } else if (search && !role) {
        result = await client.query(
          `SELECT COUNT(*) FROM users WHERE name ~* '${search}'`
        );
      } else if (search && role) {
        result = await client.query(
          `SELECT COUNT(*) FROM users WHERE name ~* '${search}' AND role='${role}'`
        );
      } else {
        result = await client.query(`SELECT COUNT(*) FROM users`);
      }
    } else if (table === "books") {
      if (genre && !search) {
        result = await client.query(
          `SELECT COUNT(*) FROM books WHERE genre='${genre}'`
        );
      } else if (search && !genre) {
        result = await client.query(
          `SELECT COUNT(*) FROM books WHERE title ~* '${search}'`
        );
      } else if (search && genre) {
        result = await client.query(
          `SELECT COUNT(*) FROM books WHERE title ~* '${search}' AND genre='${genre}'`
        );
      } else {
        result = await client.query(`SELECT COUNT(*) FROM books`);
      }
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

app.get("/getAllUsers", async (req, res) => {
  const search = req.query.search === "" ? null : req.query.search;
  const role = req.query.role === "All" ? null : req.query.role;
  const limit = req.query.limit || 10;
  const page = req.query.page || 1;
  const offset = (page - 1) * limit;
  try {
    const client = await pool.connect();
    let result;
    if (search && !role) {
      result = await client.query(
        `SELECT * FROM users WHERE name ~* $1 ORDER BY id LIMIT $2 OFFSET $3`,
        [search, limit, offset]
      );
    } else if (role && !search) {
      result = await client.query(
        `SELECT * FROM users WHERE role = $1 ORDER BY id LIMIT $2 OFFSET $3`,
        [role, limit, offset]
      );
    } else if (role && search) {
      result = await client.query(
        `SELECT * FROM users WHERE role = $1 AND name ~* $2 ORDER BY id LIMIT $3 OFFSET $4`,
        [role, search, limit, offset]
      );
    } else {
      result = await client.query(
        `SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2`,
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

app.get("/getBooks", async (req, res) => {
  const limit = req.query.limit || 9;
  const page = req.query.page || 1;
  const genre = req.query.genre === "Filter" ? null : req.query.genre;
  const search = req.query.search === "" ? null : req.query.search;
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();
    let result;
    if (genre && !search) {
      result = await client.query(
        `SELECT * FROM books WHERE genre=$3 ORDER BY published_year DESC LIMIT $1 OFFSET $2`,
        [limit, offset, genre]
      );
    } else if (search && !genre) {
      result = await client.query(
        `SELECT * FROM books WHERE title ~* $3 OR author ~* $3 ORDER BY published_year DESC LIMIT $1 OFFSET $2`,
        [limit, offset, search]
      );
    } else if (genre && search) {
      result = await client.query(
        `SELECT * FROM books WHERE title ~* $3 AND genre=$4 ORDER BY published_year DESC LIMIT $1 OFFSET $2`,
        [limit, offset, search, genre]
      );
    } else {
      result = await client.query(
        `SELECT * FROM books ORDER BY published_year DESC LIMIT $1 OFFSET $2`,
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

app.get("/usersBooks/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT 
        b.*, 
        to_jsonb(bo) AS book_details
      FROM Borrowing b
      JOIN Books bo ON b.book_id = bo.id
      WHERE b.user_id = $1`,
      [userId]
    );
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

app.post("/updateBook", async (req, res) => {
  const { data } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query(
      `UPDATE books SET copies=$2, is_available=$3 WHERE id=$1;`,
      [data.id, data.copies, data.availability]
    );
    client.release();
    res.json({ updateStatus: "Success" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/updateUser", async (req, res) => {
  const { data } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query(`UPDATE users SET role=$2 WHERE id=$1;`, [
      data.id,
      data.role,
    ]);
    client.release();
    res.json({ updateStatus: "Success" });
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

app.post("/addBook", async (req, res) => {
  const { data } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO books (title, description, author, genre, isbn, published_year, copies, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        data.title,
        data.description,
        data.author,
        data.genre,
        data.isbn,
        data.published_year,
        data.copies,
        data.is_available,
      ]
    );
    client.release();
    res.json({ addStatus: "Success" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/removeBook/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const client = await pool.connect();
    const result = await client.query(`DELETE FROM books WHERE id = $1`, [id]);
    client.release();
    res.json({ removeStatus: "Success" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/requestBook", async (req, res) => {
  const { data } = req.body;
  try {
    const client = await pool.connect();

    const borrowCountResult = await client.query(
      `SELECT COUNT(*) AS active_borrowings 
       FROM Borrowing 
       WHERE user_id = $1 AND return_date IS NULL;`,
      [data.userId]
    );

    const activeBorrowings = parseInt(
      borrowCountResult.rows[0].active_borrowings,
      10
    );

    if (activeBorrowings >= 3) {
      client.release();
      return res
        .status(400)
        .json({ error: "User cannot borrow more than 3 books at a time." });
    }

    const result = await client.query(
      `INSERT INTO Borrowing (user_id, book_id, status) 
      SELECT $1, $2, 'requested'
      FROM Books 
      WHERE id = $2 AND is_available = TRUE
      RETURNING *;
`,
      [data.userId, data.bookId]
    );
    client.release();
    res.json({ reqStatus: "Success" });
  } catch (error) {
    console.error("Database error:", error);
    if (error.code === "23505") {
      res.status(409).json({ error: "Book already requested" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

app.listen(port, () => {
  console.log("Server started at", port);
});
