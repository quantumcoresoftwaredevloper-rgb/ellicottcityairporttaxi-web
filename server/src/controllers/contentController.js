import { asyncHandler } from '../middleware/error.js';
import { getContent, updateContent } from '../services/contentService.js';

// GET /api/content — public website content (hero copy, contact, testimonials…)
// Served without auth so marketing pages render before a visitor signs in.
export const publicContent = asyncHandler(async (req, res) => {
  res.json({ content: await getContent() });
});

// GET /api/admin/content
export const adminContent = asyncHandler(async (req, res) => {
  res.json({ content: await getContent() });
});

// PATCH /api/admin/content — merges a partial update into the stored content.
export const adminUpdateContent = asyncHandler(async (req, res) => {
  res.json({ content: await updateContent(req.body) });
});
