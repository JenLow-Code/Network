import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/theme/AppTheme';

/** Language direction is explicit: being fluent in one language does not imply the reverse translation skill. */
export function TranslatorLanguageFields({
  sourceLanguage, targetLanguage, onChangeSource, onChangeTarget, disabled = false,
}: {
  sourceLanguage: string;
  targetLanguage: string;
  onChangeSource: (value: string) => void;
  onChangeTarget: (value: string) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const fieldStyle = {
    flex: 1, minWidth: 0, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
    backgroundColor: theme.background, color: theme.foreground,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
  } as const;
  return (
    <View style={{gap:9}}>
      <Text style={{fontSize:12,color:theme.muted}}>Langues de traduction</Text>
      <View style={{flexDirection:'row',gap:10}}>
        <View style={{flex:1,gap:5}}>
          <Text style={{fontSize:12,color:theme.foreground}}>De (langue source)</Text>
          {disabled ? <Text style={{fontSize:13,color:theme.foreground}}>{sourceLanguage || 'Non précisée'}</Text> :
            <TextInput accessibilityLabel="Langue source" value={sourceLanguage}
              onChangeText={onChangeSource} placeholder="Ex. Français"
              placeholderTextColor={theme.muted} maxLength={40} style={fieldStyle}/>}
        </View>
        <View style={{flex:1,gap:5}}>
          <Text style={{fontSize:12,color:theme.foreground}}>Vers (langue cible)</Text>
          {disabled ? <Text style={{fontSize:13,color:theme.foreground}}>{targetLanguage || 'Non précisée'}</Text> :
            <TextInput accessibilityLabel="Langue cible" value={targetLanguage}
              onChangeText={onChangeTarget} placeholder="Ex. Allemand"
              placeholderTextColor={theme.muted} maxLength={40} style={fieldStyle}/>}
        </View>
      </View>
    </View>
  );
}
