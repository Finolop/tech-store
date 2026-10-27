import crypto from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authMiddleware, type AuthenticatedRequest } from '../auth.middleware';
import { generateTokens, saveRefreshToken } from '../auth.service';

const router = Router();
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'arcshop_dev_refresh_secret_30d';
const uuidv4 = () => crypto.randomUUID();

function sanitizeUser(user: any) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    nickname: user.nickname ?? user.login,
    avatarUrl: user.avatarUrl ?? null,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, remember = true) {
  const maxAge = remember ? 7 * 24 * 3600 * 1000 : undefined;
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: remember ? 24 * 3600 * 1000 : undefined,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge,
  });
}

// POST /register
router.post('/register', async (req: Request, res: Response) => {
  const { firstName, lastName, phone, login, nickname, email, password, password2 } = req.body || {};

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.required',
      message: 'Пожалуйста, заполните все обязательные поля',
    });
  }

  const userLogin = String(login || nickname || email.split('@')[0]).trim();
  if (userLogin.length < 2) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.loginShort',
      message: 'Логин должен быть не короче 2 символов',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.emailInvalid',
      message: 'Некорректный формат Email',
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.passwordShort',
      message: 'Пароль должен содержать минимум 6 символов',
    });
  }

  if (password2 !== undefined && password !== password2) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.passwordMismatch',
      message: 'Пароли не совпадают',
    });
  }

  const emailTaken = db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (emailTaken) {
    return res.status(409).json({
      success: false,
      ok: false,
      error: 'err.emailTaken',
      message: 'Пользователь с таким Email уже зарегистрирован',
    });
  }

  const loginTaken = db.users.some((u) => u.login.toLowerCase() === userLogin.toLowerCase());
  if (loginTaken) {
    return res.status(409).json({
      success: false,
      ok: false,
      error: 'err.loginTaken',
      message: 'Этот логин уже занят',
    });
  }

  const now = new Date().toISOString();
  const hashedPassword = await bcrypt.hash(String(password), 10);

  const newUser = {
    id: uuidv4(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    login: userLogin,
    nickname: String(nickname || userLogin).trim(),
    avatarUrl: null,
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : '',
    password: hashedPassword,
    role: 'CUSTOMER' as const,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);

  const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.role);
  saveRefreshToken(newUser.id, refreshToken);

  setAuthCookies(res, accessToken, refreshToken, true);

  return res.status(201).json({
    success: true,
    ok: true,
    user: sanitizeUser(newUser),
    accessToken,
    refreshToken,
  });
});

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  const { identifier, email, login, password, remember = true } = req.body || {};
  const idStr = String(identifier || email || login || '').trim().toLowerCase();

  if (!idStr || !password) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.required',
      message: 'Введите логин/email и пароль',
    });
  }

  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === idStr ||
      u.login.toLowerCase() === idStr ||
      (u.nickname && u.nickname.toLowerCase() === idStr),
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.invalidCredentials',
      message: 'Неверный логин или пароль',
    });
  }

  const match = await bcrypt.compare(String(password), user.password);
  if (!match) {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.invalidCredentials',
      message: 'Неверный логин или пароль',
    });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  saveRefreshToken(user.id, refreshToken);

  setAuthCookies(res, accessToken, refreshToken, Boolean(remember));

  return res.json({
    success: true,
    ok: true,
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
});

// POST /refresh
router.post('/refresh', (req: Request, res: Response) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Refresh token не предоставлен',
    });
  }

  const stored = db.refreshTokens.find((rt) => rt.token === token);
  if (!stored) {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Недействительный Refresh token',
    });
  }

  let verified: { userId?: string; id?: string } | null = null;
  try {
    verified = jwt.verify(token, REFRESH_SECRET) as { userId?: string; id?: string };
  } catch {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Срок действия Refresh token истёк',
    });
  }

  const targetUserId = verified?.userId || verified?.id || stored.userId;
  const user = db.users.find((u) => u.id === targetUserId);
  if (!user) {
    return res.status(401).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);

  stored.token = newRefreshToken;
  stored.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.save();

  setAuthCookies(res, newAccessToken, newRefreshToken, true);

  return res.json({
    success: true,
    ok: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// POST /logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (token) {
    const idx = db.refreshTokens.findIndex((rt) => rt.token === token);
    if (idx !== -1) {
      db.refreshTokens.splice(idx, 1);
      db.save();
    }
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({
    success: true,
    ok: true,
    message: 'Выход выполнен успешно',
  });
});

// GET /me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }
  return res.json({
    success: true,
    ok: true,
    user: sanitizeUser(user),
  });
});

// PATCH /me
router.patch('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }

  const { firstName, lastName, phone, email, login, nickname, avatarUrl } = req.body || {};

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.emailInvalid',
        message: 'Некорректный формат Email',
      });
    }
    const taken = db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === cleanEmail);
    if (taken) {
      return res.status(409).json({
        success: false,
        ok: false,
        error: 'err.emailTaken',
        message: 'Этот Email уже используется другим пользователем',
      });
    }
    user.email = cleanEmail;
  }

  if (login !== undefined) {
    const cleanLogin = String(login).trim();
    if (cleanLogin.length < 2) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.loginShort',
        message: 'Логин должен быть не короче 2 символов',
      });
    }
    const taken = db.users.some((u) => u.id !== user.id && u.login.toLowerCase() === cleanLogin.toLowerCase());
    if (taken) {
      return res.status(409).json({
        success: false,
        ok: false,
        error: 'err.loginTaken',
        message: 'Этот логин уже занят',
      });
    }
    user.login = cleanLogin;
  }

  if (nickname !== undefined) {
    const cleanNick = String(nickname).trim();
    if (cleanNick.length < 2 || cleanNick.length > 30) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.loginShort',
        message: 'Никнейм должен содержать от 2 до 30 символов',
      });
    }
    user.nickname = cleanNick;
  }

  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
  }

  if (firstName !== undefined) user.firstName = String(firstName).trim();
  if (lastName !== undefined) user.lastName = String(lastName).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  user.updatedAt = new Date().toISOString();

  db.save();

  return res.json({
    success: true,
    ok: true,
    user: sanitizeUser(user),
  });
});

// PATCH /avatar — Установка или обновление аватара и/или никнейма пользователя
router.patch('/avatar', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }

  const { avatarUrl, nickname } = req.body || {};

  if (avatarUrl === undefined && nickname === undefined) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.required',
      message: 'Укажите avatarUrl или nickname для обновления',
    });
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl === null || avatarUrl === '') {
      user.avatarUrl = null;
    } else {
      const cleanUrl = String(avatarUrl).trim();
      const isValidUrl =
        cleanUrl.startsWith('http://') ||
        cleanUrl.startsWith('https://') ||
        cleanUrl.startsWith('data:image/') ||
        cleanUrl.startsWith('/');
      if (!isValidUrl) {
        return res.status(400).json({
          success: false,
          ok: false,
          message: 'Некорректный URL аватарки (допускается http/https, относительный путь или data:image)',
        });
      }
      user.avatarUrl = cleanUrl;
    }
  }

  if (nickname !== undefined) {
    const cleanNick = String(nickname).trim();
    if (cleanNick.length < 2 || cleanNick.length > 30) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.loginShort',
        message: 'Никнейм должен содержать от 2 до 30 символов',
      });
    }
    const taken = db.users.some(
      (u) =>
        u.id !== user.id &&
        ((u.nickname && u.nickname.toLowerCase() === cleanNick.toLowerCase()) ||
          u.login.toLowerCase() === cleanNick.toLowerCase()),
    );
    if (taken) {
      return res.status(409).json({
        success: false,
        ok: false,
        error: 'err.loginTaken',
        message: 'Этот никнейм уже занят другим пользователем',
      });
    }
    user.nickname = cleanNick;
    user.login = cleanNick;
  }

  user.updatedAt = new Date().toISOString();
  db.save();

  return res.json({
    success: true,
    ok: true,
    message: 'Профиль (аватар / никнейм) успешно обновлён',
    user: sanitizeUser(user),
  });
});

// PATCH /nickname — Изменение никнейма (и опционально аватарки) пользователя
router.patch('/nickname', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }

  const { nickname, avatarUrl } = req.body || {};
  if (!nickname || String(nickname).trim().length < 2 || String(nickname).trim().length > 30) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.loginShort',
      message: 'Никнейм должен содержать от 2 до 30 символов',
    });
  }

  const cleanNick = String(nickname).trim();
  const taken = db.users.some(
    (u) =>
      u.id !== user.id &&
      ((u.nickname && u.nickname.toLowerCase() === cleanNick.toLowerCase()) ||
        u.login.toLowerCase() === cleanNick.toLowerCase()),
  );
  if (taken) {
    return res.status(409).json({
      success: false,
      ok: false,
      error: 'err.loginTaken',
      message: 'Этот никнейм уже занят другим пользователем',
    });
  }

  user.nickname = cleanNick;
  user.login = cleanNick;

  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
  }

  user.updatedAt = new Date().toISOString();
  db.save();

  return res.json({
    success: true,
    ok: true,
    message: 'Никнейм успешно изменён',
    user: sanitizeUser(user),
  });
});

// POST /change-password
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      ok: false,
      error: 'err.unauthorized',
      message: 'Пользователь не найден',
    });
  }

  const { current, currentPassword, next, newPassword, next2 } = req.body || {};
  const curr = current ?? currentPassword;
  const nxt = next ?? newPassword;

  if (!curr || !nxt) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.required',
      message: 'Введите текущий и новый пароль',
    });
  }

  if (String(nxt).length < 6) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.passwordShort',
      message: 'Новый пароль должен содержать минимум 6 символов',
    });
  }

  if (next2 !== undefined && nxt !== next2) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.passwordMismatch',
      message: 'Новые пароли не совпадают',
    });
  }

  const match = await bcrypt.compare(String(curr), user.password);
  if (!match) {
    return res.status(400).json({
      success: false,
      ok: false,
      error: 'err.wrongPassword',
      message: 'Текущий пароль введён неверно',
    });
  }

  user.password = await bcrypt.hash(String(nxt), 10);
  user.updatedAt = new Date().toISOString();
  db.save();

  return res.json({
    success: true,
    ok: true,
    message: 'Пароль успешно изменён',
  });
});

export default router;
