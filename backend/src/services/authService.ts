import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { config } from '../config/index.js';
import { User, SafeUser, UserRole } from '../types/index.js';
import { UnauthorizedError, ConflictError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

export class AuthService {
  /**
   * Authenticate a user by email and password, returning a signed JWT token
   */
  async login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
    const res = await query<User>(
      'SELECT id, email, password_hash, full_name, role, is_active, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = res.rows[0];
    if (!user) {
      logger.warn({ email }, 'Login failed: user not found');
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.is_active) {
      logger.warn({ email }, 'Login failed: account is disabled');
      throw new UnauthorizedError('Account is disabled. Contact system administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.warn({ email }, 'Login failed: invalid password');
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    logger.info({ userId: user.id, role: user.role }, 'User authenticated successfully');
    return { token, user: safeUser };
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'viewer'
  ): Promise<SafeUser> {
    const existing = await query<User>('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim()
    ]);

    if (existing.rows.length > 0) {
      throw new ConflictError(`User with email ${email} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const res = await query<User>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [email.toLowerCase().trim(), passwordHash, fullName, role]
    );

    const row = res.rows[0];
    const safeUser: SafeUser = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    logger.info({ userId: safeUser.id, email: safeUser.email, role }, 'User registered successfully');
    return safeUser;
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }
}

export const authService = new AuthService();
export default authService;
