import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useAppTheme } from '@/theme/AppTheme';

/** Music tab is intentionally empty. Music publications, Discovery and references
 * remain independent and fully functional elsewhere in JenLow Network. */
export default function MusicHub() {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <PageHeader />
      <Nav />
    </SafeAreaView>
  );
}
