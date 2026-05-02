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

  return `tasks:v1:org=${o}:role=${r}:user=${u}:page=${p}:limit=${l}:project=${pid}:status=${st}`;
};

const getCachedTasksPage = (key) => tasksCache.get(key);

const setCachedTasksPage = (key, value, { orgId, ttlMs } = {}) => {
  const tag = tasksTagForOrg(orgId);
  tasksCache.set(key, value, { ttlMs, tags: [tag] });
};

const invalidateTasksForOrg = (orgId) => {
  tasksCache.invalidateTag(tasksTagForOrg(orgId));
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
  getOrgProjectIdsCached,
  invalidateOrgProjectIds,
};