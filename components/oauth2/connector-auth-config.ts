import type {
  TokenScope,
  ToolExecutionAuth,
  ToolExecutionConfig,
} from "@/lib/hooks/oauth2-types";

export type ConnectorAuthType = "none" | "oauth2" | "bearer" | "api_key";

export interface ConnectorAuthState {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  redirectUri: string;
  tokenScope: TokenScope;
  discovery: boolean;
  bearerToken: string;
  apiKeyHeader: string;
  apiKeyValue: string;
}

export const createDefaultConnectorAuthState = (): ConnectorAuthState => ({
  clientId: "",
  clientSecret: "",
  authorizeUrl: "",
  tokenUrl: "",
  scopes: "",
  redirectUri: "",
  tokenScope: "shared",
  discovery: false,
  bearerToken: "",
  apiKeyHeader: "",
  apiKeyValue: "",
});

const parseScopes = (scopes: string): string[] | undefined => {
  const values = scopes
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
};

const isValidUrl = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) return false;

  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
};

export const getAuthFormStateFromExecutionConfig = (
  executionConfig?: ToolExecutionConfig
): { authType: ConnectorAuthType; authState: ConnectorAuthState } => {
  const auth = executionConfig?.auth;
  const defaultState = createDefaultConnectorAuthState();

  if (!auth) {
    return { authType: "none", authState: defaultState };
  }

  switch (auth.type) {
    case "oauth2":
      return {
        authType: "oauth2",
        authState: {
          ...defaultState,
          clientId: auth.client_id || "",
          clientSecret: auth.client_secret || "",
          authorizeUrl: auth.authorize_url || "",
          tokenUrl: auth.token_url || "",
          scopes: auth.scopes?.join(", ") || "",
          redirectUri: auth.redirect_uri || "",
          tokenScope: auth.token_scope || "shared",
          discovery: auth.discovery ?? false,
        },
      };
    case "bearer":
      return {
        authType: "bearer",
        authState: {
          ...defaultState,
          bearerToken: auth.token || "",
        },
      };
    case "api_key":
      return {
        authType: "api_key",
        authState: {
          ...defaultState,
          apiKeyHeader: auth.header || "",
          apiKeyValue: auth.key || "",
        },
      };
    default:
      console.warn("Unsupported connector auth type in form:", auth);
      return {
        authType: "none",
        authState: defaultState,
      };
  }
};

export const buildExecutionAuthConfig = (
  authType: ConnectorAuthType,
  authState: ConnectorAuthState
): ToolExecutionAuth | undefined => {
  if (authType === "none") return undefined;

  if (authType === "bearer") {
    return {
      type: "bearer",
      token: authState.bearerToken.trim(),
    };
  }

  if (authType === "api_key") {
    return {
      type: "api_key",
      header: authState.apiKeyHeader.trim(),
      key: authState.apiKeyValue.trim(),
    };
  }

  const clientId = authState.clientId.trim();
  const clientSecret = authState.clientSecret.trim();
  const authorizeUrl = authState.authorizeUrl.trim();
  const tokenUrl = authState.tokenUrl.trim();
  const redirectUri = authState.redirectUri.trim();

  return {
    type: "oauth2",
    client_id: clientId || undefined,
    client_secret: clientSecret || undefined,
    authorize_url: authorizeUrl || undefined,
    token_url: tokenUrl || undefined,
    scopes: parseScopes(authState.scopes),
    redirect_uri: redirectUri || undefined,
    token_scope: authState.tokenScope,
    discovery: authState.discovery,
  };
};

export const validateConnectorAuth = (
  authType: ConnectorAuthType,
  authState: ConnectorAuthState
): Record<string, string> => {
  if (authType === "none") return {};

  if (authType === "bearer") {
    return authState.bearerToken.trim()
      ? {}
      : { bearerToken: "El bearer token es requerido" };
  }

  if (authType === "api_key") {
    const errors: Record<string, string> = {};

    if (!authState.apiKeyHeader.trim()) {
      errors.apiKeyHeader = "El nombre del header es requerido";
    }

    if (!authState.apiKeyValue.trim()) {
      errors.apiKeyValue = "El valor de la API key es requerido";
    }

    return errors;
  }

  const errors: Record<string, string> = {};
  const redirectUri = authState.redirectUri.trim();
  const clientId = authState.clientId.trim();
  const authorizeUrl = authState.authorizeUrl.trim();
  const tokenUrl = authState.tokenUrl.trim();

  if (redirectUri && !isValidUrl(redirectUri)) {
    errors.redirectUri = "Redirect URI inválida";
  }

  if (!authState.discovery) {
    if (!clientId) {
      errors.clientId = "El Client ID es requerido";
    }

    if (!authorizeUrl) {
      errors.authorizeUrl = "Authorize URL es requerida";
    } else if (!isValidUrl(authorizeUrl)) {
      errors.authorizeUrl = "Authorize URL inválida";
    }

    if (!tokenUrl) {
      errors.tokenUrl = "Token URL es requerida";
    } else if (!isValidUrl(tokenUrl)) {
      errors.tokenUrl = "Token URL inválida";
    }
  }

  return errors;
};
