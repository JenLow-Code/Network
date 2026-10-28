import React from 'react';
import {Text as NativeText,TextInput as NativeTextInput,type TextProps,type TextInputProps} from 'react-native';
import {useLocale} from './locale';
import {translateStatic} from './uiCopy';

/** Localizes only explicit UI strings. Member-written content is never translated. */
export function Text({children,...props}:TextProps){
 const {language}=useLocale();
 return <NativeText {...props}>{React.Children.map(children,child=>typeof child==='string'?translateStatic(child,language):child)}</NativeText>;
}
export function TextInput({placeholder,...props}:TextInputProps){
 const {language}=useLocale();
 return <NativeTextInput {...props} placeholder={placeholder?translateStatic(placeholder,language):undefined}/>;
}
