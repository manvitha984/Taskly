const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIo } = require("../socket");

const normalizeStatus = (value) => {
  if (!value) return "todo";
  if (value === "pending") return "todo";
  if (value === "completed") return "done";
  return value;
};

const isAllowedNewStatus = (value) => ["todo", "in-progress", "done"].includes(value);

const priorityRank = (value) => {
  const v = value == null ? "medium" : String(value);
  if (v === "high") return 0;
  if (v === "medium") return 1;
  if (v === "low") return 2;
  return 1;
};

const toStringId = (v) => (v == null ? "" : String(v));

const taskAssigneeMatchesUser = (task, userId) => {
  const uid = String(userId);
  if (task.assigneeId && String(task.assigneeId) === uid) return true;

  const legacy = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
  const legacyIds = legacy.map((x) => (typeof x === "string" ? x : String(x?._id || x)));
  return legacyIds.includes(uid);
};

const getOrgProjectIds = async (organizationId) => {
  const projects = await Project.find({ organizationId }).select("_id");
  return projects.map((p) => p._id);
};

const emitToOrg = (organizationId, eventName, payload) => {
  const room = `org_${organizationId}`;

  try {
    const io = getIo();
    io.to(room).emit(eventName, payload);

    const taskId =
      payload?.taskId ||
      payload?._id ||
      payload?.task?._id ||
      payload?.task?.id ||
      payload?.id ||
      null;

    console.log("[socket] emit", { eventName, room, taskId: taskId ? String(taskId) : null });
  } catch (err) {
    console.log("[socket] emit failed (io not ready?)", {
      eventName,
      room,
      message: err?.message,
    });
  }
};

const createTask = async (req, res, next) => {
  try {
    if (!["admin", "leader"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admin/leader can create tasks" });
    }

    console.log("REQ BODY:", req.body);
    const { title, projectId, assigneeId, priority } = req.body;
    console.log("Incoming priority:", priority);

    const { description, assigneeIds, dueDate } = req.body;

    const trimmedTitle = typeof title === "string" ? title.trim() : title;
    const trimmedDescription = typeof description === "string" ? description.trim() : description;

    const resolvedAssigneeId =
      assigneeId || (Array.isArray(assigneeIds) && assigneeIds.length > 0 ? assigneeIds[0] : null) || null;

    if (!trimmedTitle || !trimmedDescription || !projectId || !resolvedAssigneeId || !dueDate) {
      return res.status(400).json({
        message: "All fields are required: title, description, projectId, assigneeId, dueDate",
      });
    }

    if (priority != null && priority !== "") {
      const allowed = ["low", "medium", "high"];
      if (!allowed.includes(String(priority))) {
        return res.status(400).json({ message: 'Invalid priority. Use: "low", "medium", "high"' });
      }
    }

    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.user.organizationId,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const validatedAssignee = await User.findOne({
      _id: resolvedAssigneeId,
      organizationId: req.user.organizationId,
    }).select("_id role");

    if (!validatedAssignee) {
      return res.status(400).json({ message: "Assignee must be a user in the same organization" });
    }

    if (validatedAssignee.role === "admin") {
      return res.status(400).json({ message: "Tasks cannot be assigned to an admin" });
    }

    const created = await Task.create({
      title: trimmedTitle,
      description: trimmedDescription,
      projectId,
      dueDate,

      status: "todo",
      priority: priority || "medium",

      assigneeId: validatedAssignee._id,
      assignedBy: req.user.userId,

      
      assigneeIds: [validatedAssignee._id],
    });

    project.tasks.push(created._id);
    await project.save();

    const task = await Task.findById(created._id)
      .populate("assigneeId", "name email role")
      .populate("assignedBy", "name email role")
      .populate("assigneeIds", "name email role")
      .populate("projectId", "name");

    const payload = task?.toJSON ? task.toJSON() : task;

    emitToOrg(req.user.organizationId, "task-created", payload);
    emitToOrg(req.user.organizationId, "task-updated", payload);

    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    const allowedProjectIds = await getOrgProjectIds(orgId);
    if (allowedProjectIds.length === 0) return res.json([]);

    let query = { projectId: { $in: allowedProjectIds } };

    if (req.user.role === "user") {
      query = {
        ...query,
        $or: [{ assigneeId: req.user.userId }, { assigneeIds: req.user.userId }],
      };
    }

    const tasks = await Task.find(query)
      .populate("assigneeId", "name email role")
      .populate("assignedBy", "name email role")
      .populate("assigneeIds", "name email role")
      .populate("projectId", "name");

    const normalized = tasks
      .map((t) => {
        const json = t.toJSON();
        json.status = normalizeStatus(json.status);

        if (!json.assigneeId && Array.isArray(json.assigneeIds) && json.assigneeIds.length > 0) {
          json.assigneeId = json.assigneeIds[0];
        }

        return json;
      })
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;

        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    return res.json(normalized);
  } catch (err) {
    return next(err);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const rawStatus = req.body?.status;
    const status = normalizeStatus(rawStatus);

    if (!isAllowedNewStatus(status)) {
      return res.status(400).json({ message: "Invalid status. Use: todo, in-progress, done" });
    }

    const task = await Task.findById(req.params.id).populate("projectId", "organizationId leaderId name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!task.projectId) return res.status(400).json({ message: "Task project is missing" });

    if (toStringId(task.projectId.organizationId) !== toStringId(req.user.organizationId)) {
      return res.status(403).json({ message: "Not allowed (different organization)" });
    }

    const isAssignee = taskAssigneeMatchesUser(task, req.user.userId);
    if (!isAssignee) {
      return res.status(403).json({ message: "Only the assignee can update task status" });
    }

    const previousNormalized = normalizeStatus(task.status);
    task.status = status;
    await task.save();

    const assignedById = task.assignedBy ? String(task.assignedBy) : "";
    if (assignedById && assignedById !== String(req.user.userId) && previousNormalized !== status) {
      await Notification.create({
        userId: assignedById,
        message: `Task "${task.title}" status changed to "${status}" by ${req.user.email || "assignee"}.`,
        read: false,
      });
    }

    const updated = await Task.findById(task._id)
      .populate("assigneeId", "name email role")
      .populate("assignedBy", "name email role")
      .populate("assigneeIds", "name email role")
      .populate("projectId", "name");

    const json = updated.toJSON();
    json.status = normalizeStatus(json.status);

    if (!json.assigneeId && Array.isArray(json.assigneeIds) && json.assigneeIds.length > 0) {
      json.assigneeId = json.assigneeIds[0];
    }

    emitToOrg(req.user.organizationId, "task-updated", json);
    emitToOrg(req.user.organizationId, "task-status-changed", {
      taskId: String(json._id || req.params.id),
      previousStatus: previousNormalized,
      status: json.status,
      task: json,
    });

    return res.json(json);
  } catch (err) {
    return next(err);
  }
};

const markDone = async (req, res, next) => {
  req.body = { ...(req.body || {}), status: "done" };
  return updateTaskStatus(req, res, next);
};

module.exports = { createTask, getTasks, updateTaskStatus, markDone };