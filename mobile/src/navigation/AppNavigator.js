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

import { Colors } from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab ikonları — ince çizgi tarzı, renk ile aktif/pasif ayrımı
const TAB_ICONS = {
  Kesfet: { active: '🔍', inactive: '🔍' },
  Swipe: { active: '🎥', inactive: '🎥' },
  Filmlerim: { active: '🎬', inactive: '🎬' },
  Mesajlar: { active: '💬', inactive: '💬' },
  Profilim: { active: '👤', inactive: '👤' },
};

function TabIcon({ name, focused }) {
  const icons = TAB_ICONS[name];
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.4 }}>
        {focused ? icons.active : icons.inactive}
      </Text>
      {focused && (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.red }} />
      )}
    </View>
  );
}

function HamburgerButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4, gap: 5 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: i === 2 ? 16 : 22,
            height: 2,
            backgroundColor: '#fff',
            borderRadius: 1,
          }}
        />
      ))}
    </TouchableOpacity>
  );
}

function MainTabs() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const screenOptions = ({ route }) => ({
    headerShown: true,
    headerStyle: {
      backgroundColor: Colors.bg,
      shadowColor: 'transparent',
      elevation: 0,
      borderBottomWidth: 0.5,
      borderBottomColor: Colors.border,
    },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
    headerLeft: () => <HamburgerButton onPress={() => setDrawerOpen(true)} />,
    tabBarStyle: {
      backgroundColor: Colors.bg,
      borderTopColor: Colors.border,
      borderTopWidth: 0.5,
      height: 60,
      paddingBottom: 6,
      paddingTop: 6,
    },
    tabBarActiveTintColor: Colors.red,
    tabBarInactiveTintColor: '#555',
    tabBarShowLabel: false,
    tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
  });

  return (
    <>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Kesfet"
          component={DiscoverScreen}
          options={{ title: 'Keşfet' }}
        />
        <Tab.Screen
          name="Swipe"
          component={SwipeScreen}
          options={{ title: 'Filmler' }}
        />
        <Tab.Screen
          name="Filmlerim"
          component={MoviesScreen}
          options={{ title: 'Filmlerim' }}
        />
        <Tab.Screen
          name="Mesajlar"
          component={MessagesScreen}
          options={{ title: 'Mesajlar', headerShown: false }}
        />
        {/* Profil artık drawer yerine doğrudan tab'da */}
        <Tab.Screen
          name="Profilim"
          component={ProfileScreen}
          options={{ title: 'Profil', headerShown: false }}
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
      {/* MyProfile artık drawer'dan da ulaşılabilir, ama artık Profilim tab'ı ana erişim */}
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
