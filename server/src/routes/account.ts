import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';

const router = Router();

// Permanently delete the authenticated user's account and all their data.
// Foreign keys cascade from auth.users, so subscriptions, notification_prefs,
// and price_history are removed automatically. (Required by App Store
// Guideline 5.1.1(v): in-app account deletion.)
router.delete('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err: any) {
    Sentry.captureException(err, { tags: { route: 'account/delete' } });
    console.error('[account] delete failed');
    res.status(500).json({ error: 'Could not delete your account. Please try again.' });
  }
});

export default router;
