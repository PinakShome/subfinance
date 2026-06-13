import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Missing token' }); return; }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid token' }); return; }

  (req as any).userId = user.id;
  next();
}
