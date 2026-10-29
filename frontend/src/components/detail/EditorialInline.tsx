import React from 'react';
import { View } from 'react-native';

/**
 * Shared quiet inset for non-collapsible detail content:
 * player / synchronized lyrics / biographical introductions.
 * Accordion headings remain flush and retain their own separators.
 */
export function EditorialInline({
  children,
  bottomSpace = 16,
}: {
  children: React.ReactNode;
  bottomSpace?: number;
}) {
  return (
    <View style={{ paddingLeft: 10, paddingRight: 3, paddingTop: 5, paddingBottom: bottomSpace }}>
      {children}
    </View>
  );
}
