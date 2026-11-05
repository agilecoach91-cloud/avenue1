import { makeClient } from "./supabase";

export async function createClient() {
  return makeClient(false);
}
