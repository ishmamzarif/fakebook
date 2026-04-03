require("dotenv").config();
const pool = require("./db/db");
const fs = require("fs");
const path = require("path");

async function applySql() {
    console.log("--- Applying Database Procedures and Functions ---");
    try {
        const sqlPath = path.join(__dirname, "..", "database", "procedures_and_functions.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        
        await pool.query(sql);
        console.log("✅ SQL script applied successfully.");
    } catch (err) {
        console.error("❌ Failed to apply SQL script:", err.message);
    } finally {
        process.exit();
    }
}

applySql();
