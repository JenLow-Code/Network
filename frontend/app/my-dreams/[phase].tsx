import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Legacy phase-list route.
 * Keep old links/history valid, but always resolve to the canonical
 * Mes aspirations overview instead of rendering the deprecated page.
 */
export default function LegacyAspirationPhaseRoute() {
  return <Redirect href="/my-space" />;
}
