class MemoryCache {
  constructor({ defaultTtlMs = 60_000, maxEntries = 5_000, now = () => Date.now() } = {}) {
    this.defaultTtlMs = Number.isFinite(defaultTtlMs) ? defaultTtlMs : 60_000;
    this.maxEntries = Number.isFinite(maxEntries) ? maxEntries : 5_000;
    this.now = now;

    /** @type {Map<string, { value: any, expiresAt: number, tags: Set<string> }>} */
    this.store = new Map();

    /** @type {Map<string, Set<string>>} */
    this.tagIndex = new Map();
  }

  _isExpired(entry) {
    return !entry || entry.expiresAt <= this.now();
  }

  _detachKeyFromTags(key, tags) {
    if (!tags || tags.size === 0) return;
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      keys.delete(key);
      if (keys.size === 0) this.tagIndex.delete(tag);
    }
  }

  _attachKeyToTags(key, tags) {
    if (!tags || tags.size === 0) return;
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag).add(key);
    }
  }

  pruneExpired({ maxToScan = 500 } = {}) {
    let scanned = 0;
    for (const [key, entry] of this.store) {
      if (scanned >= maxToScan) break;
      scanned += 1;
      if (this._isExpired(entry)) this.delete(key);
    }
  }

  _enforceMaxEntries() {
    if (this.store.size <= this.maxEntries) return;

    const overflow = this.store.size - this.maxEntries;
    if (overflow <= 0) return;

    this.pruneExpired({ maxToScan: Math.min(this.store.size, 1_000) });
    if (this.store.size <= this.maxEntries) return;

    let removed = 0;
    for (const key of this.store.keys()) {
      this.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }

  get(key) {
    const k = String(key || "");
    if (!k) return undefined;

    const entry = this.store.get(k);
    if (!entry) {
      console.log("[CACHE MISS]", k);
      return undefined;
    }

    if (this._isExpired(entry)) {
      this.delete(k);
      console.log("[CACHE MISS]", k);
      return undefined;
    }

    console.log("[CACHE HIT]", k);
    return entry.value;
  }

  set(key, value, { ttlMs, tags } = {}) {
    const k = String(key || "");
    if (!k) return;

    const ttl = Number.isFinite(ttlMs) ? ttlMs : this.defaultTtlMs;
    const expiresAt = this.now() + Math.max(0, ttl);

    console.log("[CACHE SET]", k, "TTL:", ttl);

    const nextTags = new Set(Array.isArray(tags) ? tags.map(String) : []);
    const prev = this.store.get(k);

    if (prev) this._detachKeyFromTags(k, prev.tags);

    this.store.set(k, { value, expiresAt, tags: nextTags });
    this._attachKeyToTags(k, nextTags);

    this._enforceMaxEntries();
  }

  delete(key) {
    const k = String(key || "");
    if (!k) return false;

    const entry = this.store.get(k);
    if (!entry) return false;

    this._detachKeyFromTags(k, entry.tags);
    this.store.delete(k);

    console.log("[CACHE INVALIDATED]", k);
    return true;
  }

  invalidateTag(tag) {
    const t = String(tag || "");
    if (!t) return 0;

    const keys = this.tagIndex.get(t);
    if (!keys || keys.size === 0) {
      this.tagIndex.delete(t);
      console.log("[CACHE INVALIDATED]", t);
      return 0;
    }

    const keysToDelete = Array.from(keys);
    let removed = 0;
    for (const key of keysToDelete) {
      if (this.delete(key)) removed += 1;
    }

    this.tagIndex.delete(t);
    console.log("[CACHE INVALIDATED]", t);
    return removed;
  }

  invalidateByPrefix(prefix) {
    const p = String(prefix || "");
    if (!p) return 0;

    const keysToDelete = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(p)) keysToDelete.push(key);
    }

    let removed = 0;
    for (const key of keysToDelete) {
      if (this.delete(key)) removed += 1;
    }

    console.log("[CACHE INVALIDATED]", p);
    return removed;
  }

  clear() {
    this.store.clear();
    this.tagIndex.clear();
    console.log("[CACHE INVALIDATED]", "CLEAR_ALL");
  }
}

module.exports = { MemoryCache };