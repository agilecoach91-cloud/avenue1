import { makeClient } from "./supabase";

export function createAdminClient() {
  return makeClient(true);
}
