// The Supabase client, backed by the in-browser demo database.
import { currentUser, requestSignInLink, signOutDemo } from "../demo/auth";
import { Query } from "../demo/db";
import { bucket } from "../demo/storage";

export function makeClient(admin: boolean) {
  return {
    from: (table: string) => new Query(table, admin),
    storage: { from: (name: string) => bucket(name) },
    auth: {
      async getUser() {
        return { data: { user: currentUser() }, error: null };
      },
      async getSession() {
        const user = currentUser();
        return { data: { session: user ? { user } : null }, error: null };
      },
      async signInWithOtp({ email, options }: { email: string; options?: { emailRedirectTo?: string } }) {
        requestSignInLink(email, options?.emailRedirectTo);
        return { data: {}, error: null };
      },
      async signOut() {
        signOutDemo();
        return { error: null };
      },
      async exchangeCodeForSession() {
        return { data: {}, error: null };
      },
      async verifyOtp() {
        return { data: {}, error: null };
      },
    },
  };
}
