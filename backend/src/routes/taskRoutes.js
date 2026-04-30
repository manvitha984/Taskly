const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { createTask, getTasks, updateTaskStatus, markDone } = require("../controllers/taskController");

router.use(protect);

router.route("/").get(getTasks).post(createTask);

router.patch("/:id/status", updateTaskStatus);

router.patch("/:id/done", markDone);

module.exports = router;