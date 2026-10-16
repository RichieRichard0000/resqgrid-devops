import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { loginSchema, registerSchema } from '../config/schemas.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.email, input.password);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/register
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(
      input.email,
      input.password,
      input.full_name,
      input.role
    );

    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 */
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

export default authRouter;
