import React from 'react';
import { Redirect } from 'expo-router';
// The personal dream gallery now lives in Mon espace.
export default function MyDreams() {
  return <Redirect href="/my-space" />;
}
