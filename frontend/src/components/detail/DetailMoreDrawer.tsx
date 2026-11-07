import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * Consistent "En savoir plus" side panel for public publication details.
 * It does not fetch data and never changes the discovery/API contract.
 */
export function DetailMoreDrawer({
  heading,
  subtitle,
  children,
  label = 'En savoir plus',
}: {
  heading: string;
  subtitle?: string;
  children: React.ReactNode;
  label?: string;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const offset = useRef(new Animated.Value(440)).current;
  useEffect(() => {
    if (open) Animated.timing(offset, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    else offset.setValue(440);
  }, [open, offset]);

  return (
    <>
      {/* The reaction rail occupies 40px plus a 10px gap beside the main buttons. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 42, paddingRight: 50 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => setOpen(true)}
          style={styles.infoLink}
        >
          <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600' }}>{label}</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.foreground} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Fermer les informations"
            onPress={() => setOpen(false)}
          />
          <Animated.View
            style={[styles.panel, { backgroundColor: theme.surface, width: Math.min(420, width * 0.94), transform: [{ translateX: offset }] }]}
          >
            <ScrollView contentContainerStyle={{ paddingBottom: 50, gap: 20 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour à la publication"
                onPress={() => setOpen(false)}
                style={styles.back}
              >
                <Ionicons name="chevron-back" size={19} color={theme.foreground} />
                <Text style={{ color: theme.foreground, fontSize: 13 }}>Retour à la publication</Text>
              </Pressable>
              <View style={{ gap: 7 }}>
                {!!subtitle && <Text style={{ color: theme.muted, fontSize: 10, letterSpacing: 1.2 }}>{subtitle.toUpperCase()}</Text>}
                <Text style={{ color: theme.foreground, fontFamily: 'serif', fontSize: 27, lineHeight: 34 }}>{heading}</Text>
              </View>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export function DetailInfoSection({title,text,children}:{
  title:string;text?:string;children?:React.ReactNode;
}) {
 const theme=useAppTheme();
 if(!text?.trim()&&!children)return null;
 return (
  <View style={{
    paddingVertical:18,borderTopWidth:1,borderColor:theme.border,
    gap:10,
  }}>
    <Text style={{fontSize:10,letterSpacing:1.25,fontWeight:'700',color:theme.muted}}>
      {title.toUpperCase()}
    </Text>
    {text?.trim()?<Text style={{fontSize:14,lineHeight:23,color:theme.foreground}}>{text}</Text>:null}
    {children}
  </View>
 );
}

const styles = StyleSheet.create({
  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
  panel: { height: '100%', paddingHorizontal: 23, paddingTop: 30 },
  back: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start', alignItems: 'center', paddingVertical: 9 },
});
