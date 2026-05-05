const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIo } = require("../socket");
const {
  buildTasksCacheKey,
  getCachedTasksPage,
  setCachedTasksPage,
  invalidateTasksForOrg,
  getOrgProjectIdsCached,
} = require("../utils/taskCache");

const normalizeStatus = (value) => {
  if (!value) return "todo";
  if (value === "pending") return "todo";
  if (value === "completed") return "done";
  return value;
};

const isAllowedNewStatus = (value) => ["todo", "in-progress", "done"].includes(value);

const toStringId = (v) => (v == null ? "" : String(v));

const taskAssigneeMatchesUser = (task, userId) => {
  const uid = String(userId);
  if (task.assigneeId && String(task.assigneeId) === uid) return true;

  const legacy = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
  const legacyIds = legacy.map((x) => (typeof x === "string" ? x : String(x?._id || x)));
  return legacyIds.includes(uid);
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

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const normalizeTaskJson = (t) => {
  const json = t?.toJSON ? t.toJSON() : t;

  if (json && typeof json === "object") {
    json.status = normalizeStatus(json.status);

    if (!json.assigneeId && Array.isArray(json.assigneeIds) && json.assigneeIds.length > 0) {
      json.assigneeId = json.assigneeIds[0];
    }
  }

  return json;
};

const createTask = async (req, res, next) => {
  try {
    console.log("REQ.USER:", req.user);

    if (!["admin", "leader"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admin/leader can create tasks" });
    }

    const { title, projectId, assigneeId, priority } = req.body;
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
    }).select("_id organizationId tasks");

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
      organizationId: req.user.organizationId,

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

    console.log("[CACHE CLEAR TRIGGERED] for org:", req.user.organizationId);
    invalidateTasksForOrg(req.user.organizationId);

    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
};

const getTasks = async (req, res, next) => {
  try {
    console.log("[TASK API] Request received");

    const orgId = toStringId(req.user.organizationId);
    const role = toStringId(req.user.role);
    const userId = toStringId(req.user.userId);

    const page = parsePositiveInt(req.query?.page, 1);
    const limit = clamp(parsePositiveInt(req.query?.limit, 25), 1, 100);
    const skip = (page - 1) * limit;

    console.log("[PAGINATION]", { page, limit });

    const statusParam = req.query?.status ? normalizeStatus(String(req.query.status)) : "";
    if (statusParam && !isAllowedNewStatus(statusParam)) {
      return res.status(400).json({ message: "Invalid status filter. Use: todo, in-progress, done" });
    }

    const projectIdParam = req.query?.projectId ? String(req.query.projectId) : "";

    const cacheKey = buildTasksCacheKey({
      orgId,
      role,
      userId,
      page,
      limit,
      projectId: projectIdParam,
      status: statusParam,
    });

    const cached = getCachedTasksPage(cacheKey);
    if (cached) {
      console.log("[TASK API] Serving from cache");
      const cachedLen = Array.isArray(cached?.items) ? cached.items.length : Array.isArray(cached) ? cached.length : 0;
      console.log("[TASKS RETURNED]", cachedLen);
      return res.json(cached);
    }

    console.log("[TASK API] Fetching from DB");

    /** @type {any[]} */
    const filters = [];

    // Org membership + optional project filter
    if (projectIdParam) {
      const project = await Project.findOne({ _id: projectIdParam, organizationId: orgId }).select("_id").lean();
      if (!project) return res.status(404).json({ message: "Project not found" });
      filters.push({ projectId: projectIdParam });
    } else {
      const allowedProjectIds = await getOrgProjectIdsCached(orgId, async () => {
        const projects = await Project.find({ organizationId: orgId }).select("_id").lean();
        return projects.map((p) => p._id);
      });

      if (allowedProjectIds.length === 0) {
        const empty = { items: [], page, limit, total: 0, hasNext: false };
        setCachedTasksPage(cacheKey, empty, { orgId });
        console.log("[TASKS RETURNED]", 0);
        return res.json(empty);
      }

      filters.push({
        $or: [{ organizationId: orgId }, { projectId: { $in: allowedProjectIds } }],
      });
    }

    // Optional status filter (include legacy stored values for safety)
    if (statusParam) {
      const legacy =
        statusParam === "todo" ? ["todo", "pending"] : statusParam === "done" ? ["done", "completed"] : [statusParam];

      filters.push({ status: { $in: legacy } });
    }

    // Role scoping
    if (req.user.role === "user") {
      filters.push({
        $or: [{ assigneeId: req.user.userId }, { assigneeIds: req.user.userId }],
      });
    }

    const query = filters.length === 1 ? filters[0] : { $and: filters };

    try {
      const explainData = await Task.find(query).limit(1).explain("executionStats");

      console.log("[MONGO EXPLAIN]", {
        stage: explainData?.executionStats?.executionStages?.stage,
        totalDocsExamined: explainData?.executionStats?.totalDocsExamined,
        totalKeysExamined: explainData?.executionStats?.totalKeysExamined,
      });
    } catch (err) {
      console.log("[MONGO EXPLAIN]", { error: err?.message || String(err) });
    }

    const start = Date.now();

    const [total, tasks] = await Promise.all([
      Task.countDocuments(query),
      Task.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assigneeId", "name email role")
        .populate("assignedBy", "name email role")
        .populate("assigneeIds", "name email role")
        .populate("projectId", "name")
        .lean(),
    ]);

    const end = Date.now();
    console.log("[DB QUERY TIME]", end - start, "ms");

    console.log("[TASKS RETURNED]", Array.isArray(tasks) ? tasks.length : 0);

    const items = Array.isArray(tasks) ? tasks.map(normalizeTaskJson) : [];

    const response = {
      items,
      page,
      limit,
      total,
      hasNext: skip + items.length < total,
    };

    setCachedTasksPage(cacheKey, response, { orgId });

    return res.json(response);
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

    const json = normalizeTaskJson(updated);

    emitToOrg(req.user.organizationId, "task-updated", json);
    emitToOrg(req.user.organizationId, "task-status-changed", {
      taskId: String(json._id || req.params.id),
      previousStatus: previousNormalized,
      status: json.status,
      task: json,
    });

    console.log("[CACHE CLEAR TRIGGERED] for org:", req.user.organizationId);
    invalidateTasksForOrg(req.user.organizationId);

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