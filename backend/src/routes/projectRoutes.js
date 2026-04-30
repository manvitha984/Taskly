const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { createProject, getProjects, getProjectStats } = require("../controllers/projectController");

router.use(protect);
router.get("/stats", getProjectStats);
router.route("/").get(getProjects).post(createProject);

module.exports = router;