import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';

type Props = {
  nextStage: string;
  primaryLabel: string;
  primaryColor: string;
  primaryTextColor?: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel: string;
  secondaryColor: string;
  onSecondary: () => void;
  secondaryDisabled?: boolean;
  destructiveLabel: string;
  onDestructive: () => void;
};

/**
 * A destination for each stage's work, not a floating row of equally weighted
 * controls. The progress indicator already lives in the phase header; the
 * forward action ends the desktop row and leads the mobile stack.
 * This is an in-flow footer: it never covers talent/resource editing.
 */
export default function DreamMilestoneActions({
  nextStage, primaryLabel, primaryColor, primaryTextColor = '#FFFFFF',
  onPrimary, primaryDisabled = false,
  secondaryLabel, secondaryColor, onSecondary, secondaryDisabled = false,
  destructiveLabel, onDestructive,
}: Props) {
  const theme = useAppTheme();
  const {width} = useWindowDimensions();
  const desktop = workspaceLayout(width).desktop;

  const primary = (
    <Pressable accessibilityRole="button"
      accessibilityLabel={primaryLabel + ' — vers ' + nextStage}
      accessibilityState={{disabled:primaryDisabled}}
      disabled={primaryDisabled}
      onPress={onPrimary}
      style={({pressed})=>({
        minHeight:desktop?48:50,
        minWidth:desktop?194:undefined,
        width:desktop?undefined:'100%',
        paddingHorizontal:desktop?24:19,
        borderRadius:12,
        backgroundColor:primaryDisabled ? (theme.dark?'#555B59':'#A8ABA6') : primaryColor,
        opacity:pressed && !primaryDisabled ? .87 : 1,
        flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10,
      })}>
      <Text style={{color:primaryDisabled?'#FFFFFF':primaryTextColor,
        fontWeight:'700',fontSize:14}}>{primaryLabel}</Text>
      <Ionicons name="arrow-forward" size={17}
        color={primaryDisabled?'#FFFFFF':primaryTextColor}/>
    </Pressable>
  );

  const secondary = (
    <Pressable accessibilityRole="button" accessibilityLabel={secondaryLabel}
      accessibilityState={{disabled:secondaryDisabled}}
      disabled={secondaryDisabled} onPress={onSecondary}
      style={({pressed})=>({
        minHeight:desktop?44:46,
        minWidth:desktop?94:undefined,
        flex:desktop?undefined:1,
        paddingHorizontal:desktop?17:12,borderRadius:11,
        borderWidth:1,borderColor:secondaryColor,
        backgroundColor:pressed?(theme.dark?'#272B30':'#F6F5F0'):'transparent',
        justifyContent:'center',alignItems:'center',
        opacity:secondaryDisabled ? .5 : 1,
      })}>
      <Text style={{color:secondaryColor,fontSize:12,fontWeight:'700'}}>
        {secondaryLabel}
      </Text>
    </Pressable>
  );

  const destructive = (
    <Pressable accessibilityRole="button" accessibilityLabel={destructiveLabel}
      onPress={onDestructive}
      style={({pressed})=>({
        minHeight:desktop?44:46,
        minWidth:desktop?102:undefined,
        flex:desktop?undefined:1,
        paddingHorizontal:desktop?15:12,borderRadius:11,
        justifyContent:'center',alignItems:'center',
        backgroundColor:pressed?'#292929':'#151515',
        borderWidth:theme.dark?1:0,
        borderColor:theme.dark?'#515151':'transparent',
      })}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.82}
        style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>
        {destructiveLabel}
      </Text>
    </Pressable>
  );

  return (
    <View style={{width:'100%',marginTop:desktop?30:22,
      marginBottom:desktop?34:26}}>
      {/* Progress belongs in the phase navigation; the footer only contains
          the already-approved action hierarchy, without a repeated heading. */}
      {desktop ?
        <View style={{flexDirection:'row',alignItems:'center',
          justifyContent:'flex-end',gap:10}}>
          {destructive}
          {secondary}
          <View style={{marginLeft:14}}>{primary}</View>
        </View> :
        <View style={{gap:10}}>
          {primary}
          <View style={{flexDirection:'row',gap:10}}>
            {destructive}
            {secondary}
          </View>
        </View>}
    </View>
  );
}
