// TypeScript types for Safe Parking API responses

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface BasicParkingLocation {
  id?: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  type?: string;
  capacity?: number;
  elevation_m?: number;
  ward_number?: number;
}

export interface NearbyParkingLocation extends BasicParkingLocation {
  distance_m: number;
  distance_km: number;
}

export interface RecommendedParkingLocation {
  name: string;
  lat: number;
  lon: number;
  risk?: string;
  distance_m: number;
  final_score: number;
  route: Coordinate[];
}

export interface SearchParams {
  lat: number;
  lon: number;
  radius_m: number;
}

export interface NearbyParkingResponse {
  count: number;
  locations: NearbyParkingLocation[];
  search_params: SearchParams;
}

export interface AllParkingResponse {
  count: number;
  locations: BasicParkingLocation[];
}

export interface RecommendedParkingResponse {
  count: number;
  locations: RecommendedParkingLocation[];
}

// Union type for all parking location types
export type ParkingLocation = 
  | BasicParkingLocation 
  | NearbyParkingLocation 
  | RecommendedParkingLocation;

// Type guards
export function isNearbyLocation(loc: ParkingLocation): loc is NearbyParkingLocation {
  return 'distance_m' in loc && 'distance_km' in loc && !('route' in loc);
}

export function isRecommendedLocation(loc: ParkingLocation): loc is RecommendedParkingLocation {
  return 'route' in loc && 'final_score' in loc;
}

export function isBasicLocation(loc: ParkingLocation): loc is BasicParkingLocation {
  return !isNearbyLocation(loc) && !isRecommendedLocation(loc);
}