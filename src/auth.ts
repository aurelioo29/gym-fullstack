import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeAdminLogin } from "@/lib/auth/admin-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Credentials",

      credentials: {
        identifier: {
          label: "Email or Phone",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        return authorizeAdminLogin({
          identifier: String(credentials.identifier),
          password: String(credentials.password),
        });
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.role = user.role;
        token.permissions = user.permissions;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = typeof token.id === "string" ? token.id : "";
      session.user.roleId =
        typeof token.roleId === "string" ? token.roleId : "";
      session.user.role = typeof token.role === "string" ? token.role : "";
      session.user.permissions = Array.isArray(token.permissions)
        ? token.permissions
        : [];

      return session;
    },
  },
});
