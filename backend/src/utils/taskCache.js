const { MemoryCache } = require("./cache");

const TASKS_CACHE_TTL_MS = Number(process.env.TASKS_CACHE_TTL_MS || 30_000);
const ORG_PROJECT_IDS_TTL_MS = Number(process.env.ORG_PROJECT_IDS_TTL_MS || 5 * 60_000);

const tasksCache = new MemoryCache({
  defaultTtlMs: TASKS_CACHE_TTL_MS,
  maxEntries: Number(process.env.TASKS_CACHE_MAX_ENTRIES || 2_000),
});

const auxCache = new MemoryCache({
  defaultTtlMs: ORG_PROJECT_IDS_TTL_MS,
  maxEntries: Number(process.env.AUX_CACHE_MAX_ENTRIES || 1_000),
});

const tasksTagForOrg = (orgId) => `tasks:org:${String(orgId || "")}`;
const tasksTagForProject = (projectId) => `tasks:project:${String(projectId || "")}`;
const tasksTagForUser = (userId) => `tasks:user:${String(userId || "")}`;
const orgProjectsTagForOrg = (orgId) => `org-project-ids:org:${String(orgId || "")}`;

const orgProjectIdsKey = (orgId) => `orgProjectIds:${String(orgId || "")}`;

const safeKeyPart = (v) => {
  const s = v == null ? "" : String(v);
  return s.replace(/\s+/g, "").slice(0, 200);
};

const buildTasksCacheKey = ({
  orgId,
  role,
  userId,
  page,
  limit,
  projectId = "",
  status = "",
}) => {
  const o = safeKeyPart(orgId);
  const r = safeKeyPart(role);
  const u = safeKeyPart(userId);

  const p = Number.isFinite(page) ? page : 1;
  const l = Number.isFinite(limit) ? limit : 25;

  const pid = safeKeyPart(projectId);
  const st = safeKeyPart(status);

  return `tasks:v2:org=${o}:project=${pid}:role=${r}:user=${u}:page=${p}:limit=${l}:status=${st}`;
};

const getCachedTasksPage = (key) => tasksCache.get(key);

const setCachedTasksPage = (key, value, { orgId, projectId, userId, role, ttlMs } = {}) => {
  const tags = [tasksTagForOrg(orgId)];
  if (projectId) tags.push(tasksTagForProject(projectId));
  if (role === "user" && userId) tags.push(tasksTagForUser(userId));

  if (!projectId) {
    const items = Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];
    if (items.length > 0) {
      const projectIds = new Set();
      for (const task of items) {
        const pid = typeof task?.projectId === "string" ? task.projectId : task?.projectId?._id;
        if (pid) projectIds.add(String(pid));
      }
      for (const pid of projectIds) {
        tags.push(tasksTagForProject(pid));
      }
    }
  }

  tasksCache.set(key, value, { ttlMs, tags });
};

const invalidateTasksForOrg = (orgId) => {
  tasksCache.invalidateTag(tasksTagForOrg(orgId));
};

const invalidateTasksForProject = (projectId) => {
  if (!projectId) return 0;
  console.log("[CACHE INVALIDATED - PROJECT] project:", String(projectId));
  return tasksCache.invalidateTag(tasksTagForProject(projectId));
};

const invalidateTasksForUser = (userId) => {
  if (!userId) return 0;
  console.log("[CACHE INVALIDATED - USER] user:", String(userId));
  return tasksCache.invalidateTag(tasksTagForUser(userId));
};

const getOrgProjectIdsCached = async (orgId, fetcher) => {
  const key = orgProjectIdsKey(orgId);
  const cached = auxCache.get(key);
  if (Array.isArray(cached)) return cached;

  const ids = await fetcher();
  auxCache.set(key, ids, { ttlMs: ORG_PROJECT_IDS_TTL_MS, tags: [orgProjectsTagForOrg(orgId)] });
  return ids;
};

const invalidateOrgProjectIds = (orgId) => {
  auxCache.invalidateTag(orgProjectsTagForOrg(orgId));
  auxCache.delete(orgProjectIdsKey(orgId));
};

module.exports = {
  buildTasksCacheKey,
  getCachedTasksPage,
  setCachedTasksPage,
  invalidateTasksForOrg,
  invalidateTasksForProject,
  invalidateTasksForUser,
  getOrgProjectIdsCached,
  invalidateOrgProjectIds,
};