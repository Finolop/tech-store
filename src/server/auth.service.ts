import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, type UserEntity } from './db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'arcshop_dev_access_secret_15m';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'arcshop_dev_refresh_secret_30d';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, ACCESS_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

export const saveRefreshToken = (userId: string, token: string) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const existingIndex = db.refreshTokens.findIndex((t) => t.token === token);
  if (existingIndex >= 0) {
    db.refreshTokens[existingIndex].expiresAt = expiresAt.toISOString();
  } else {
    db.refreshTokens.push({
      id: 'rt-' + Math.random().toString(36).slice(2, 10),
      token,
      userId,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
  db.save();
};

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  login?: string;
  password: string;
  password2?: string;
}

export const register = async ({
  firstName,
  lastName,
  email,
  phone,
  login,
  password,
  password2,
}: RegisterDto) => {
  if (password2 && password !== password2) {
    throw new Error('err.passwordMismatch');
  }

  if (password.length < 8) {
    throw new Error('err.passwordShort');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  const cleanLogin = (login || cleanEmail.split('@')[0]).trim().toLowerCase();

  const existingEmail = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    throw new Error('err.emailTaken');
  }

  const existingPhone = db.users.find((u) => u.phone === cleanPhone);
  if (existingPhone) {
    throw new Error('err.phone');
  }

  const existingLogin = db.users.find((u) => u.login.toLowerCase() === cleanLogin);
  if (existingLogin) {
    throw new Error('err.loginTaken');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const newUser: UserEntity = {
    id: 'user-' + Math.random().toString(36).slice(2, 11),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    login: cleanLogin,
    email: cleanEmail,
    phone: cleanPhone,
    password: hashedPassword,
    role: 'CUSTOMER',
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);
  db.save();

  const tokens = generateTokens(newUser.id, newUser.role);
  saveRefreshToken(newUser.id, tokens.refreshToken);

  const safeUser = {
    id: newUser.id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    login: newUser.login,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
  };

  return { user: safeUser, ...tokens };
};

export const login = async ({
  login: identifier,
  password,
}: {
  login: string;
  password: string;
}) => {
  const cleanId = identifier.trim().toLowerCase();

  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.login.toLowerCase() === cleanId ||
      u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''),
  );

  if (!user) {
    throw new Error('err.invalidCredentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('err.invalidCredentials');
  }

  const tokens = generateTokens(user.id, user.role);
  saveRefreshToken(user.id, tokens.refreshToken);

  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return { user: safeUser, ...tokens };
};

export const refresh = async (oldRefreshToken: string) => {
  if (!oldRefreshToken) throw new Error('Refresh токен не передан');

  try {
    jwt.verify(oldRefreshToken, REFRESH_SECRET);
  } catch {
    throw new Error('Недействительный или просроченный refresh токен');
  }

  const tokenIndex = db.refreshTokens.findIndex((t) => t.token === oldRefreshToken);
  if (tokenIndex < 0) {
    throw new Error('Сессия завершена');
  }

  const record = db.refreshTokens[tokenIndex];
  if (new Date(record.expiresAt) < new Date()) {
    db.refreshTokens.splice(tokenIndex, 1);
    db.save();
    throw new Error('Сессия завершена');
  }

  const user = db.users.find((u) => u.id === record.userId);
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  // Remove old token and issue new
  db.refreshTokens.splice(tokenIndex, 1);
  const tokens = generateTokens(user.id, user.role);
  saveRefreshToken(user.id, tokens.refreshToken);

  return tokens;
};

export const logout = (refreshToken?: string) => {
  if (!refreshToken) return;
  const idx = db.refreshTokens.findIndex((t) => t.token === refreshToken);
  if (idx >= 0) {
    db.refreshTokens.splice(idx, 1);
    db.save();
  }
};

export const logoutAll = (userId: string) => {
  const remaining = db.refreshTokens.filter((t) => t.userId !== userId);
  db.refreshTokens.length = 0;
  db.refreshTokens.push(...remaining);
  db.save();
};

export const getMe = (userId: string) => {
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('err.notFound');
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
};

export const updateProfile = (
  userId: string,
  updates: { firstName?: string; lastName?: string; phone?: string; email?: string; login?: string },
) => {
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('err.notFound');
  }

  if (updates.email) {
    const cleanEmail = updates.email.trim().toLowerCase();
    const conflict = db.users.find((u) => u.id !== userId && u.email.toLowerCase() === cleanEmail);
    if (conflict) throw new Error('err.emailTaken');
    user.email = cleanEmail;
  }

  if (updates.login) {
    const cleanLogin = updates.login.trim().toLowerCase();
    const conflict = db.users.find((u) => u.id !== userId && u.login.toLowerCase() === cleanLogin);
    if (conflict) throw new Error('err.loginTaken');
    user.login = cleanLogin;
  }

  if (updates.phone) {
    const cleanPhone = updates.phone.trim();
    const conflict = db.users.find((u) => u.id !== userId && u.phone === cleanPhone);
    if (conflict) throw new Error('err.phone');
    user.phone = cleanPhone;
  }

  if (updates.firstName !== undefined && updates.firstName.trim()) {
    user.firstName = updates.firstName.trim();
  }
  if (updates.lastName !== undefined && updates.lastName.trim()) {
    user.lastName = updates.lastName.trim();
  }

  user.updatedAt = new Date().toISOString();
  db.save();

  return getMe(userId);
};

export const changePassword = async (
  userId: string,
  currentPass: string,
  nextPass: string,
  next2Pass?: string,
) => {
  if (!currentPass || !nextPass) {
    throw new Error('err.required');
  }

  if (next2Pass && nextPass !== next2Pass) {
    throw new Error('err.passwordMismatch');
  }

  if (nextPass.length < 8) {
    throw new Error('err.passwordShort');
  }

  if (currentPass === nextPass) {
    throw new Error('err.samePassword');
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('err.notFound');
  }

  const isValid = await bcrypt.compare(currentPass, user.password);
  if (!isValid) {
    throw new Error('err.wrongPassword');
  }

  user.password = await bcrypt.hash(nextPass, 10);
  user.updatedAt = new Date().toISOString();

  // Invalidate all active sessions for security
  logoutAll(userId);
  db.save();
};
