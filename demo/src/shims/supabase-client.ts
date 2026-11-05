import { makeClient } from "./supabase";

export function createClient() {
  return makeClient(false);
}
