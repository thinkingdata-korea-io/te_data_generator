import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware';
import { findUserById, getAllUsers, createUser, updateUser, deleteUser } from '../auth';
import { updateUser as updateUserRepo } from '../../db/repositories/user-repository';

const router = Router();

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await createUser({ username, email, password, fullName, role });
    res.status(201).json({ user });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    const user = await updateUser(userId, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (req.user?.userId === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const success = deleteUser(userId);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile (authenticated users)
 */
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { email, fullName, profileImage } = req.body;

    const updates: any = {};
    if (email !== undefined) updates.email = email;
    if (fullName !== undefined) updates.fullName = fullName;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const updatedUser = await updateUserRepo(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
