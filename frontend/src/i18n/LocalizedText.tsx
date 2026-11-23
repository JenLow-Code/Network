import React from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { useLocale } from './locale';
import { translateStatic } from './uiCopy';
import { useAppTheme } from '@/theme/AppTheme';

/** Localizes only explicit UI strings. Member-written content is never translated. */
export function Text({ children, style, ...props }: TextProps) {
  const { language } = useLocale();
  const theme=useAppTheme();
  return (
    <NativeText {...props} style={[{color:theme.foreground},style]}>
      {React.Children.map(children, child =>
        typeof child === 'string' ? translateStatic(child, language) : child,
      )}
    </NativeText>
  );
}
export function TextInput({ placeholder, style, placeholderTextColor, ...props }: TextInputProps) {
  const { language } = useLocale();
  const theme=useAppTheme();
  return (
    <NativeTextInput
      {...props}
      style={[{color:theme.foreground},style]}
      placeholderTextColor={placeholderTextColor ?? theme.muted}
      placeholder={placeholder ? translateStatic(placeholder, language) : undefined}
    />
  );
}
