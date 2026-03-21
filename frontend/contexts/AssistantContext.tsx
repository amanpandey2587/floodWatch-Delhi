"use client";

// contexts/AssistantContext.tsx
// Lightweight global store so the floating bot can pass data into any page

import { createContext, useContext, useState, ReactNode } from "react";

export interface RouteIntent {
  origin?: string;
  destination?: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
}

export interface ComplaintIntent {
  location?: string;
  ward?: string;
  wardNumber?: number;
  priority?: string;
  description?: string;
}

export interface MapIntent {
  location?: string;
  coords?: { lat: number; lng: number };
  zoom?: number;
}

export interface AssistantIntent {
  action:
    | "navigate"
    | "route"
    | "complaint"
    | "map"
    | "ward_risk"
    | "track_complaint"
    | "idle";
  route?: RouteIntent;
  complaint?: ComplaintIntent;
  map?: MapIntent;
  ward?: string;
  complaintId?: string;
  targetPath?: string;
}

interface AssistantContextType {
  intent: AssistantIntent | null;
  setIntent: (intent: AssistantIntent | null) => void;
  clearIntent: () => void;
}

const AssistantContext = createContext<AssistantContextType>({
  intent: null,
  setIntent: () => {},
  clearIntent: () => {},
});

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState<AssistantIntent | null>(null);

  const clearIntent = () => setIntent(null);

  return (
    <AssistantContext.Provider value={{ intent, setIntent, clearIntent }}>
      {children}
    </AssistantContext.Provider>
  );
}

export const useAssistant = () => useContext(AssistantContext);