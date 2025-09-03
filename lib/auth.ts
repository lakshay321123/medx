import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const baseUrl =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = baseUrl;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),

    CredentialsProvider({
      id: 'emailpass',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        return ok ? user : null;
      },
    }),

    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {
        name: { label: 'Name (optional)', type: 'text' },
      },
      async authorize(creds) {
        const name = creds?.name?.toString().trim() || 'Guest';
        const user = await prisma.user.create({
          data: { name, guest: true, role: 'GUEST' },
        });
        return user;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).role = (user as any).role;
        (session.user as any).guest = (user as any).guest;
      }
      return session;
    },
  },
};

