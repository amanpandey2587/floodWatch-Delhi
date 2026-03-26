export const GOOGLE_MAPS_CONFIG = {
  id:               'google-map-script',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries:        ['places', 'visualization'] as ('places' | 'visualization')[],
  language:         'en',
  region:           'IN',
} as const;