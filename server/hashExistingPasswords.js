require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db/db");

async function hashAllPasswords() {
  try {
    console.log("Fetching all users...");

    // Get all users
    const result = await pool.query("SELECT user_id, password FROM users");
    const users = result.rows;

    if (users.length === 0) {
      console.log("No users found in database");
      return;
    }

    console.log(`Found ${users.length} users. Starting to hash passwords...`);

    let successCount = 0;
    let skipCount = 0;

    for (const user of users) {
      try {
        // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        if (user.password && user.password.startsWith("$2")) {
          console.log(`User ${user.user_id}: Password already hashed, skipping...`);
          skipCount++;
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Update the database
        await pool.query(
          "UPDATE users SET password=$1 WHERE user_id=$2",
          [hashedPassword, user.user_id]
        );

        console.log(`User ${user.user_id}: Password hashed and updated successfully`);
        successCount++;
      } catch (err) {
        console.error(`Error hashing password for user ${user.user_id}:`, err.message);
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Hashed: ${successCount} users`);
    console.log(`   Skipped (already hashed): ${skipCount} users`);
    console.log(`   Total: ${successCount + skipCount} users`);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

hashAllPasswords();
