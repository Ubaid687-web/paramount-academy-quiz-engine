export { COOKIE_NAME } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const url = new URL("/api/oauth/start", window.location.origin);
  url.searchParams.set("returnPath", `${window.location.pathname}${window.location.search}`);
  return url.toString();
};
