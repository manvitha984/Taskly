const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");

const createProject = async (req, res, next) => {
  try {
    if (!["admin", "leader"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admin/leader can create projects" });
    }

    const { name, status, leaderId } = req.body;
    if (!name) return res.status(400).json({ message: "Project name is required" });

    let finalLeaderId = req.user.userId;

    if (req.user.role === "leader") {
      finalLeaderId = req.user.userId;
    } else if (req.user.role === "admin" && leaderId) {
      const leader = await User.findOne({
        _id: leaderId,
        organizationId: req.user.organizationId,
      }).select("_id");

      if (!leader) return res.status(400).json({ message: "leaderId must be a user in the same organization" });
      finalLeaderId = leader._id;
    }

    const project = await Project.create({
      name,
      status: status || "active",
      organizationId: req.user.organizationId,
      leaderId: finalLeaderId,
      tasks: [],
    });

    return res.status(201).json(project);
  } catch (err) {
    return next(err);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const filter = { organizationId: req.user.organizationId };

    const projects = await Project.find(filter).populate("tasks");
    return res.json(projects);
  } catch (err) {
    return next(err);
  }
};

const getProjectStats = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    // Leaders should see org-level stats (same as admin).
    const projectFilter = { organizationId: orgId };

    const projects = await Project.find(projectFilter).select("_id");
    const projectIds = projects.map((p) => p._id);

    const [projectCount, memberCount, tasksThisWeek, completedCount, totalCount] = await Promise.all([
      Project.countDocuments(projectFilter),
      User.countDocuments({ organizationId: orgId }),
      Task.countDocuments({
        projectId: { $in: projectIds },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Task.countDocuments({ projectId: { $in: projectIds }, status: { $in: ["done", "completed"] } }),
      Task.countDocuments({ projectId: { $in: projectIds } }),
    ]);

    const completionRate = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return res.json({
      totalProjects: projectCount,
      activeTeam: memberCount,
      totalTasks: tasksThisWeek,
      completionRate,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createProject, getProjects, getProjectStats };