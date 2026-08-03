import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sql } from './db';

export const COOKIE = 'rm_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type User = { id: string; email: string; businessName: string | null };

export function newToken() {
  return randomBytes(32).toString('base64url');
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Constant-time compare so a token is never leaked by response timing. */
export function sameToken(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + THIRTY_DAYS * 1000);
  await sql`insert into roadmap.sessions (token, user_id, expires_at)
            values (${token}, ${userId}, ${expires.toISOString()})`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Secure everywhere except an explicit local http run. Safari refuses secure
    // cookies over http, so a production build tested on localhost would silently
    // drop the session. COOKIE_INSECURE is only ever set in .env.local.
    secure: process.env.COOKIE_INSECURE !== '1',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
  return token;
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = (await sql`
    select u.id, u.email, u.business_name
    from roadmap.sessions s
    join roadmap.users u on u.id = s.user_id
    where s.token = ${token} and s.expires_at > now()
    limit 1`) as { id: string; email: string; business_name: string | null }[];
  if (!rows.length) return null;
  return { id: rows[0].id, email: rows[0].email, businessName: rows[0].business_name };
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from roadmap.sessions where token = ${token}`;
  jar.delete(COOKIE);
}

/** Demo-grade validation. Real launch would add rate limiting and email verification. */
export function validateSignup(email: string, password: string) {
  const errors: string[] = [];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.push('That email address does not look right.');
  if (password.length < 8) errors.push('Use at least 8 characters for your password.');
  if (password.length > 200) errors.push('That password is too long.');
  return errors;
}
