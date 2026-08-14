import type { AuthConfig } from 'convex/server';

export default {
  providers: [
    {
      type: 'customJwt',
      applicationID: 'education-news-7f9bf',
      issuer: 'https://securetoken.google.com/education-news-7f9bf',
      jwks: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
      algorithm: 'RS256',
    },
  ],
} satisfies AuthConfig;