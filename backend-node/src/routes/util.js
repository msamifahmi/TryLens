export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (res, msg, status = 400) => res.status(status).json({ error: msg });
export const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
