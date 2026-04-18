import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import DrawerMenu from '../components/DrawerMenu';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MessagesScreen from '../screens/MessagesScreen';
import MoviesScreen from '../screens/MoviesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import PersonScreen from '../screens/PersonScreen';
import SimilarMoviesScreen from '../screens/SimilarMoviesScreen';
import SwipeScreen from '../screens/SwipeScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import MatchesScreen from '../screens/MatchesScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HamburgerButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}>
      <View style={{ gap: 5 }}>
        <View style={{ width: 22, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
        <View style={{ width: 22, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
        <View style={{ width: 22, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabScreenOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: '#0f0f0f',
      shadowColor: 'transparent',
      elevation: 0,
      borderBottomWidth: 0,
    },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700', fontSize: 20 },
    headerLeft: () => <HamburgerButton onPress={() => setDrawerOpen(true)} />,
    tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1a1a1a' },
    tabBarActiveTintColor: '#E50914',
    tabBarInactiveTintColor: '#555',
    tabBarShowLabel: false,
  };

  return (
    <>
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen
          name="Kesfet"
          component={DiscoverScreen}
          options={{ title: 'Keşfet', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text> }}
        />
        <Tab.Screen
          name="Swipe"
          component={SwipeScreen}
          options={{ title: 'Filmler', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎥</Text> }}
        />
        <Tab.Screen
          name="Filmlerim"
          component={MoviesScreen}
          options={{ title: 'Filmlerim', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎬</Text> }}
        />
        <Tab.Screen
          name="Mesajlar"
          component={MessagesScreen}
          options={{
            title: 'Mesajlar',
            headerShown: false,
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💬</Text>,
          }}
        />
      </Tab.Navigator>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      <Stack.Screen name="Person" component={PersonScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="SimilarMovies" component={SimilarMoviesScreen} />
      <Stack.Screen name="Watchlist" component={WatchlistScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Matches" component={MatchesScreen} />
      <Stack.Screen name="MyProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
