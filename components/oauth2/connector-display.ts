import type { AuthStatus } from "@/lib/hooks";

const AUTH_TYPE_LABELS: Record<string, string> = {
  oauth2: "OAuth 2",
  bearer: "Bearer",
  api_key: "API Key",
};

export const getConnectorAuthTypeLabel = (authType: string | null): string => {
  if (!authType) return "Abierto";

  const normalized = authType.toLowerCase();
  return AUTH_TYPE_LABELS[normalized] || authType;
};

export const isConnectedAuthStatus = (status: AuthStatus): boolean =>
  status === "connected" || status === "not_required";
