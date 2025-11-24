/**
 * User Repository
 * @brief: Database operations for users table
 */

import { query, isDatabaseConfigured } from '../connection';
import { User, UserRole } from '../../api/auth';

export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
}

export interface UpdateUserData {
  email?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  passwordHash?: string;
  profileImage?: string;
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  if (!isDatabaseConfigured()) {
    return null; // Fallback to mock data
  }

  try {
    const result = await query<User>(
      'SELECT id, username, email, password_hash as "passwordHash", full_name as "fullName", profile_image as "profileImage", role, is_active as "isActive", created_at as "createdAt", last_login_at as "lastLoginAt" FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const result = await query<User>(
      'SELECT id, username, email, password_hash as "passwordHash", full_name as "fullName", profile_image as "profileImage", role, is_active as "isActive", created_at as "createdAt", last_login_at as "lastLoginAt" FROM users WHERE id = $1 AND is_active = true',
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const result = await query(
      'SELECT id, username, email, full_name as "fullName", profile_image as "profileImage", role, is_active as "isActive", created_at as "createdAt", last_login_at as "lastLoginAt" FROM users ORDER BY id ASC'
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Create new user
 */
export async function createUser(data: CreateUserData): Promise<Omit<User, 'passwordHash'>> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  try {
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"`,
      [data.username, data.email, data.passwordHash, data.fullName, data.role]
    );

    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique violation
      throw new Error('Username or email already exists');
    }
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(
  id: number,
  data: UpdateUserData
): Promise<Omit<User, 'passwordHash'> | null> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(data.fullName);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramCount++}`);
      values.push(data.passwordHash);
    }
    if (data.profileImage !== undefined) {
      updates.push(`profile_image = $${paramCount++}`);
      values.push(data.profileImage);
    }

    if (updates.length === 0) {
      // No updates, just return current user
      const result = await query(
        'SELECT id, username, email, full_name as "fullName", profile_image as "profileImage", role, is_active as "isActive", created_at as "createdAt", last_login_at as "lastLoginAt" FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    }

    values.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, username, email, full_name as "fullName", profile_image as "profileImage", role, is_active as "isActive", created_at as "createdAt", last_login_at as "lastLoginAt"`;

    const result = await query(sql, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(id: number): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  try {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Update last login time
 */
export async function updateLastLogin(userId: number): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
  } catch (error) {
    console.error('Error updating last login:', error);
    // Non-critical error, don't throw
  }
}
