import React from 'react';
import { Redirect } from 'expo-router';
/** Legacy link: the personal section now lives in Mon profil. */
export default function LegacyProfileSection(){return <Redirect href={{pathname:'/profile',params:{section:'prayers'}}}/>;}
