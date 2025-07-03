// Airwallex configuration
export interface AirwallexConfig {
  clientId: string;
  apiKey: string;
  environment: 'demo' | 'staging' | 'prod';
  apiUrl: string;
}

// Default configuration - can be overridden via environment variables
export const airwallexConfig: AirwallexConfig = {
  clientId: process.env.AIRWALLEX_CLIENT_ID || 'FgTDjfg9SEGV4vsliPYZzQ',
  apiKey: process.env.AIRWALLEX_API_KEY || '3e865751b89d8fd0da82e564f7397da915e6c1beb0a54256d2ed55475220318eda7cc1c2290eb49a86ab74bb623c2406',
  environment: (process.env.AIRWALLEX_ENV as 'demo' | 'staging' | 'prod') || 'demo',
  apiUrl: process.env.AIRWALLEX_API_URL || 'https://api-demo.airwallex.com'
};

// Frontend configuration (no sensitive data)
export const frontendAirwallexConfig = {
  environment: airwallexConfig.environment,
  sdkUrl: 'https://static.airwallex.com/components/sdk/v1/index.js'
};