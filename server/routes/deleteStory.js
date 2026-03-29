const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // We only delete if both story_id and user_id match to ensure security
      const result = await pool.query(
        "DELETE FROM stories WHERE story_id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          status: "fail",
          message: "Story not found or you do not have permission to delete it",
        });
      }

      res.status(200).json({
        status: "success",
        message: "Story deleted successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error deleting story:", error.message);
      res.status(500).json({
        status: "error",
        message: "An error occurred while deleting the story. " + error.message,
      });
    }
  }
];
