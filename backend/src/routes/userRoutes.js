const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { getUsers, createUser, updateUserRole } = require("../controllers/userController");

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin only" });
  return next();
};

router.use(protect);

router.get("/", getUsers);

router.post("/", adminOnly, createUser);
router.patch("/:id/role", adminOnly, updateUserRole);

module.exports = router;