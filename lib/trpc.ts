import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback for development - prevents app crash if env var is not set
  // tRPC is not actively used in the app, so this is safe
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    console.warn(
      "[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL not set, using localhost fallback. Set the environment variable for production."
    );
    return "http://localhost:3000";
  }

  // In production, still provide a fallback to prevent crashes
  // Users should set the env var, but we won't break the app if they don't
  console.error(
    "[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL not set in production. Using fallback URL. Please set the environment variable."
  );
  return "http://localhost:3000";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
