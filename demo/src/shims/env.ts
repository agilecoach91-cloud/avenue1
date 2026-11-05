import { APP_ORIGIN } from "../demo/router-core";

export const APP_NAME = "Bookd";
export function appUrl(): string {
  return APP_ORIGIN;
}
export function supabaseUrl(): string {
  return "https://demo.supabase.co";
}
export function supabasePublishableKey(): string {
  return "sb_publishable_demo";
}
export function supabaseSecretKey(): string {
  return "sb_secret_demo";
}
