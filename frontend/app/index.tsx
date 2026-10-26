import React from 'react';
import {Redirect} from 'expo-router';
import {ActivityIndicator,View} from 'react-native';
import {useAuth} from '@/auth/AuthProvider';
export default function Index(){const {user,initialized}=useAuth();return !initialized?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/></View>:<Redirect href={user?'/discover':'/login'}/>}
