import { Text } from '@/i18n/LocalizedText';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { publications } from '@/mocks/publications';
import { useApp } from '@/context/AppContext';
import { publicationPath } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';
export function Prayers() {
  const theme = useAppTheme();
  const { prayerIds, togglePrayer, prayerRepetitions, setPrayerRepetition } = useApp();
  const items = publications.filter(p => prayerIds.includes(p.id));
  return (
    <View style={{gap:6}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}>Les personnes et les intentions que je porte dans la prière.</Text>
        {!items.length ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10}}>
            <Ionicons name="heart-outline" size={26} color={theme.muted}/>
            <View style={{flex:1,gap:4}}>
              <Text style={{color:theme.foreground,fontWeight:'600',fontSize:13}}>Un espace pour prendre soin des autres.</Text>
              <Text style={{color:theme.muted,fontSize:12,lineHeight:18}}>Les sujets de prière que tu enregistres dans Découvrir apparaîtront ici.</Text>
            </View>
            <Pressable onPress={()=>router.push('/discover')} accessibilityRole="button" accessibilityLabel="Découvrir">
              <Ionicons name="arrow-forward-outline" size={20} color={theme.foreground}/>
            </Pressable>
          </View>
        ) : (
          items.map(p => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                gap: 11,
                alignItems: 'center',
                padding: 10,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor:theme.surface,
                marginBottom: 6,
              }}
            >
              <Pressable onPress={() => router.push(publicationPath(p) as any)}>
                <Image
                  source={{ uri: p.image }}
                  style={{ width: 67, height: 67, borderRadius: 8 }}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color:theme.foreground, fontWeight: '700', fontSize: 13 }}>{p.title}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {[
                    { id: 'once' as const, label: 'Une fois' },
                    { id: 'daily' as const, label: 'Chaque jour' },
                    { id: 'weekly' as const, label: 'Chaque semaine' },
                  ].map(o => (
                    <Pressable
                      key={o.id}
                      onPress={() => setPrayerRepetition(p.id, o.id)}
                      style={{
                        borderWidth: 1,
                        borderColor:
                          (prayerRepetitions[p.id] || 'daily') === o.id ? theme.accent : theme.border,
                        paddingHorizontal: 6,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 9, color: theme.foreground }}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable
                onPress={() => togglePrayer(p.id)}
                accessibilityLabel="Remove from today's prayers"
              >
                <Ionicons name="checkmark-circle" color="#698b6d" size={26} />
              </Pressable>
            </View>
          ))
        )}
        {items.length?<Text style={{fontSize:11,color:theme.muted,marginTop:4}}>Mes rythmes de prière sont synchronisés avec mon agenda local.</Text>:null}
    </View>
  );
}
