import AuditLog from '../models/AuditLog.js';

export const audit = (action, opts = {}) => async (req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Pick the most specific identifier available: an explicit route param,
    // then any _id the handler echoed back (create/update responses), then a
    // natural key for catalog rows.
    const firstId = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 2) return undefined;
      if (obj._id) return String(obj._id);
      for (const v of Object.values(obj)) {
        const found = firstId(v, depth + 1);
        if (found) return found;
      }
      return undefined;
    };
    const targetId = req.params?.id
      || firstId(body)
      || body?.key
      || body?.slug
      || undefined;

    // fire-and-forget audit write (don't block the response)
    AuditLog.create({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action,
      targetType: opts.targetType,
      targetId: targetId ? String(targetId) : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 300),
      meta: { statusCode: res.statusCode, durationMs: Date.now() - start, path: req.originalUrl },
    }).catch(() => {});
    return originalJson(body);
  };
  next();
};
