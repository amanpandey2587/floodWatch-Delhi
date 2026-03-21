"use client";

// hooks/useAssistantPrefill.ts
// Call this in any page/component to read URL params injected by the floating assistant
// Works alongside the AssistantContext for complex cross-page data

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAssistant } from "@/contexts/AssistantContext";

// ── Route prefill ─────────────────────────────────────────────────────────────
// Usage in RouteCalculator.tsx:
//
//   const { origin, destination } = useRoutePrefill();
//   useEffect(() => {
//     if (origin) setOrigin(origin);
//     if (destination) setDestination(destination);
//   }, [origin, destination]);

export function useRoutePrefill() {
  const params = useSearchParams();
  const { intent, clearIntent } = useAssistant();

  const origin =
    params.get("from") ||
    intent?.route?.origin ||
    null;

  const destination =
    params.get("to") ||
    intent?.route?.destination ||
    null;

  // driving | walking | cycling — detected from speech by the assistant
  const mode =
    params.get("mode") ||
    intent?.route?.mode ||
    null;

  useEffect(() => {
    if (intent?.action === "route") clearIntent();
  }, []); // eslint-disable-line

  return { origin, destination, mode };
}

// ── Complaint prefill ─────────────────────────────────────────────────────────
// Usage in FileComplaint.tsx / NewFileComplaint.tsx:
//
//   const prefill = useComplaintPrefill();
//   useEffect(() => {
//     if (prefill.location) setFormData(p => ({ ...p, description: prefill.location }));
//     if (prefill.wardNumber) setFormData(p => ({ ...p, ward_number: prefill.wardNumber }));
//     if (prefill.priority)  setFormData(p => ({ ...p, priority: prefill.priority }));
//   }, []);

export function useComplaintPrefill() {
  const params = useSearchParams();
  const { intent, clearIntent } = useAssistant();

  const prefill = {
    location: params.get("location") || intent?.complaint?.location || null,
    ward: params.get("ward") || intent?.complaint?.ward || null,
    wardNumber: params.get("wardNumber")
      ? parseInt(params.get("wardNumber")!)
      : intent?.complaint?.wardNumber || null,
    priority: params.get("priority") || intent?.complaint?.priority || null,
    description: params.get("desc") || intent?.complaint?.description || null,
  };

  useEffect(() => {
    if (intent?.action === "complaint") clearIntent();
  }, []); // eslint-disable-line

  return prefill;
}

// ── Map prefill ───────────────────────────────────────────────────────────────
// Usage in EnhancedMap.tsx / GoogleMapEnhanced.tsx:
//
//   const { flyTo, ward } = useMapPrefill();
//   useEffect(() => {
//     if (flyTo) geocodeAndFlyTo(flyTo);
//     if (ward) highlightWard(ward);
//   }, []);

export function useMapPrefill() {
  const params = useSearchParams();
  const { intent, clearIntent } = useAssistant();

  const flyTo = params.get("flyTo") || intent?.map?.location || null;
  const ward = params.get("ward") || intent?.ward || null;
  const section = params.get("section") || null; // e.g. #route

  useEffect(() => {
    if (intent?.action === "map" || intent?.action === "ward_risk") clearIntent();
  }, []); // eslint-disable-line

  return { flyTo, ward, section };
}