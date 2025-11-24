/**
 * Authentication utilities
 * @brief: User authentication with JWT and bcrypt
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'te_platform_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  profileImage?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
}

// Mock user database (replace with actual database in production)
let mockUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@te-platform.com',
    passwordHash: '', // Will be set on first run
    fullName: 'System Administrator',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'user',
    email: 'user@te-platform.com',
    passwordHash: '', // Will be set on first run
    fullName: 'Test User',
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'viewer',
    email: 'viewer@te-platform.com',
    passwordHash: '', // Will be set on first run
    fullName: 'Read-only User',
    role: 'viewer',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// Initialize default passwords
async function initializeMockUsers() {
  for (const user of mockUsers) {
    if (!user.passwordHash) {
      // Default password is same as username
      user.passwordHash = await hashPassword(user.username);
    }
  }
}

// Call initialization
initializeMockUsers().catch(console.error);

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | undefined> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    const user = await userRepo.findUserByUsername(username);
    return user || undefined;
  }

  return mockUsers.find(u => u.username === username && u.isActive);
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | undefined> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    const user = await userRepo.findUserById(id);
    return user || undefined;
  }

  return mockUsers.find(u => u.id === id && u.isActive);
}

/**
 * Update user's last login
 */
export async function updateLastLogin(userId: number): Promise<void> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    await userRepo.updateLastLogin(userId);
    return;
  }

  const user = await findUserById(userId);
  if (user) {
    user.lastLoginAt = new Date().toISOString();
  }
}

/**
 * Authenticate user
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByUsername(username);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Update last login
  await updateLastLogin(user.id);

  // Generate token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return { user, token };
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    return await userRepo.getAllUsers();
  }

  return mockUsers.map(({ passwordHash, ...user }) => user);
}

/**
 * Create new user (for admin)
 */
export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<Omit<User, 'passwordHash'>> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    const passwordHash = await hashPassword(data.password);
    return await userRepo.createUser({
      ...data,
      passwordHash,
    });
  }

  const existingUser = await findUserByUsername(data.username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const newUser: User = {
    id: Math.max(...mockUsers.map(u => u.id)) + 1,
    username: data.username,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    fullName: data.fullName,
    role: data.role,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);

  const { passwordHash, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Update user (for admin)
 */
export async function updateUser(
  id: number,
  data: Partial<{
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    password: string;
  }>
): Promise<Omit<User, 'passwordHash'> | null> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
      delete updateData.password;
    }
    return await userRepo.updateUser(id, updateData);
  }

  const user = await findUserById(id);
  if (!user) {
    return null;
  }

  if (data.email !== undefined) user.email = data.email;
  if (data.fullName !== undefined) user.fullName = data.fullName;
  if (data.role !== undefined) user.role = data.role;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  if (data.password !== undefined) {
    user.passwordHash = await hashPassword(data.password);
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Delete user (for admin)
 */
export async function deleteUser(id: number): Promise<boolean> {
  const { isDatabaseConfigured } = await import('../db/connection');

  if (isDatabaseConfigured()) {
    const userRepo = await import('../db/repositories/user-repository');
    return await userRepo.deleteUser(id);
  }

  const index = mockUsers.findIndex(u => u.id === id);
  if (index === -1) {
    return false;
  }

  mockUsers.splice(index, 1);
  return true;
}
