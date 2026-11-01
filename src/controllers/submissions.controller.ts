import * as service from '../services/submissions.service';
import asyncHandler from '../utils/asyncHandler';
import HttpError from '../utils/httpError';

export const list = asyncHandler(async (req, res) => {
  res.json({ data: await service.listSubmissions(req.query.status) });
});
export const get = asyncHandler(async (req, res) => {
  const item = await service.getSubmissionById(req.params.id);
  if (!item) throw new HttpError(404, 'Submission not found');
  res.json({ data: item });
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.createSubmission(req.body) });
});
export const update = asyncHandler(async (req, res) => {
  const item = await service.updateSubmission(req.params.id, req.body);
  if (!item) throw new HttpError(404, 'Submission not found');
  res.json({ data: item });
});
export const remove = asyncHandler(async (req, res) => {
  const item = await service.deleteSubmission(req.params.id);
  if (!item) throw new HttpError(404, 'Submission not found');
  res.status(204).send();
});
