import type { AuthUser } from "./types";

/** A generic provider union: either a credentials provider or an OAuth2 provider. */
export type Provider = CredentialsProvider | OAuth2ProviderConfig | GitHubProviderConfig;

/** A normalized provider: GitHub configs have been resolved to `OAuth2ProviderConfig`. */
export type ResolvedProvider = CredentialsProvider | OAuth2ProviderConfig;

/**
 * A username/password provider. Wire `authorize` to your user table, compare
 * the submitted password against the stored Argon2 hash with `verifyPassword`
 * (from this package), and return the matching user — or `null` to reject.
 */
export interface CredentialsProvider {
  id: string;
  name: string;
  type: "credentials";
  /**
   * Resolve a submitted credential form into a user. Return `null` (or throw)
   * to reject the sign-in.
   */
  authorize(params: Record<string, string>, ctx: { request: Request }): Promise<AuthUser | null>;
}

/** A generic OAuth2 (authorization code) provider. */
export interface OAuth2ProviderConfig {
  id: string;
  name: string;
  type: "oauth";
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  /** Extra query params appended to the authorization request. Default: `{ scope: "openid profile email" }`. */
  authorizationParams?: Record<string, string>;
  /** Extra body params for the token exchange. */
  tokenParams?: Record<string, string>;
  /** Build a normalized `AuthUser` from the userinfo endpoint response. */
  profile(profile: Record<string, unknown>): AuthUser;
}

/** A preconfigured GitHub OAuth2 provider (defaults applied via `toOAuth2`). */
export interface GitHubProviderConfig {
  id?: string;
  name?: string;
  type: "oauth";
  clientId: string;
  clientSecret: string;
  scope?: string;
  /** Build a normalized `AuthUser` from GitHub's `/user` response. */
  profile?: (profile: Record<string, unknown>) => AuthUser;
}

const GITHUB_AUTHORIZATION_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USERINFO_URL = "https://api.github.com/user";

/** Normalizes a GitHub provider config into a generic `OAuth2ProviderConfig`. */
export function toOAuth2(
  provider: GitHubProviderConfig | OAuth2ProviderConfig,
): OAuth2ProviderConfig {
  if (provider.type !== "oauth") {
    throw new Error(`Provider "${provider.id}" is not an OAuth provider`);
  }
  if ("authorizationUrl" in provider && "tokenUrl" in provider && "profile" in provider) {
    return provider as OAuth2ProviderConfig;
  }
  const github = provider as GitHubProviderConfig;
  const scope = github.scope ?? "read:user user:email";
  return {
    id: github.id ?? "github",
    name: github.name ?? "GitHub",
    type: "oauth",
    clientId: github.clientId,
    clientSecret: github.clientSecret,
    authorizationUrl: GITHUB_AUTHORIZATION_URL,
    tokenUrl: GITHUB_TOKEN_URL,
    userInfoUrl: GITHUB_USERINFO_URL,
    authorizationParams: { scope },
    tokenParams: { accept: "json" },
    profile:
      github.profile ??
      ((p) => {
        const user: AuthUser = { id: String(p.id ?? "") };
        const name = p.name as string | undefined;
        const email = p.email as string | undefined;
        if (name) user.name = name;
        if (email) user.email = email;
        return user;
      }),
  };
}

export interface OAuthTokens {
  access_token: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
}

/** Builds the authorization URL for a sign-in redirect. */
export function buildAuthorizationUrl(
  provider: OAuth2ProviderConfig,
  baseUrl: string,
  state: string,
): string {
  const url = new URL(provider.authorizationUrl);
  const params = provider.authorizationParams ?? { scope: "openid profile email" };
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", `${baseUrl}/api/auth/callback/${provider.id}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/** Exchanges an authorization code for access tokens. */
export async function exchangeCode(
  provider: OAuth2ProviderConfig,
  baseUrl: string,
  code: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${baseUrl}/api/auth/callback/${provider.id}`,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    ...provider.tokenParams,
  });
  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed with status ${res.status}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as OAuthTokens;
  } catch {
    // Some providers (e.g. GitHub without the `accept: json` param) answer
    // with a query-string-encoded body instead of JSON.
    const parsed = Object.fromEntries(new URLSearchParams(text));
    if (!parsed.access_token) throw new Error("Token exchange returned no access_token");
    return parsed as unknown as OAuthTokens;
  }
}

/** Fetches the user profile using the access token. */
export async function fetchUserInfo(
  provider: OAuth2ProviderConfig,
  accessToken: string,
): Promise<Record<string, unknown>> {
  if (!provider.userInfoUrl) {
    throw new Error(`Provider "${provider.id}" has no userInfoUrl configured`);
  }
  const res = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Userinfo request failed with status ${res.status}`);
  }
  return (await res.json()) as Record<string, unknown>;
}
