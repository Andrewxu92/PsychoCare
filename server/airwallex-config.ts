// Airwallex configuration
export interface AirwallexConfig {
  clientId: string;
  apiKey: string;
  environment: "demo" | "staging" | "prod";
  apiUrl: string;
}

// Default configuration - can be overridden via environment variables
export const airwallexConfig: AirwallexConfig = {
  clientId: process.env.AIRWALLEX_CLIENT_ID || "FgTDjfg9SEGV4vsliPYZzQ",
  apiKey:
    process.env.AIRWALLEX_API_KEY ||
    "3e865751b89d8fd0da82e564f7397da915e6c1beb0a54256d2ed55475220318eda7cc1c2290eb49a86ab74bb623c2406",
  environment:
    (process.env.AIRWALLEX_ENV as "demo" | "staging" | "prod") || "demo",
  apiUrl: process.env.AIRWALLEX_API_URL || "https://api-demo.airwallex.com",
};

// Frontend configuration (no sensitive data)
export const frontendAirwallexConfig = {
  environment: airwallexConfig.environment,
  sdkUrl: "https://static.airwallex.com/components/sdk/v1/index.js",
};

// Token cache to avoid repeated authentication
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Function to get Airwallex access token with caching
export async function getAirwallexAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now() / 1000;
  if (cachedToken && now < tokenExpiry - 60) { // Refresh 1 minute before expiry
    console.log('Using cached Airwallex token');
    return cachedToken;
  }

  // Get new token
  try {
    console.log("Attempting Airwallex authentication with:", {
      url: `${airwallexConfig.apiUrl}/api/v1/authentication/login`,
      clientId: airwallexConfig.clientId,
      apiKeyLength: airwallexConfig.apiKey.length,
    });

    const response = await fetch(
      `${airwallexConfig.apiUrl}/api/v1/authentication/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": airwallexConfig.clientId,
          "x-api-key": airwallexConfig.apiKey,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Airwallex authentication error:",
        response.status,
        errorText,
      );
      throw new Error(`Airwallex authentication failed: ${response.status}`);
    }

    const authResponse = await response.json();
    console.log("Airwallex authentication successful");
    
    // Cache the token and expiry time
    cachedToken = authResponse.token;
    
    // Parse expires_at (e.g., "2025-07-03T04:10:02+0000") to Unix timestamp
    if (authResponse.expires_at) {
      tokenExpiry = Math.floor(new Date(authResponse.expires_at).getTime() / 1000);
      console.log('Token will expire at:', new Date(authResponse.expires_at).toISOString());
    } else {
      // Default to 30 minutes if no expiry provided
      tokenExpiry = Math.floor(Date.now() / 1000) + 1800;
    }
    
    return authResponse.token;
  } catch (error) {
    console.error("Error getting Airwallex access token:", error);
    throw error;
  }
}
