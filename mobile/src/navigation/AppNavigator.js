import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Pressable, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import DrawerMenu from '../components/DrawerMenu';
import { Colors } from '../theme';

// Auth
import LoginScreen from '../screens/LoginScreen';

// Onboarding
import Step1Username from '../screens/onboarding/Step1Username';
import Step2Account from '../screens/onboarding/Step2Account';
import Step3Profile from '../screens/onboarding/Step3Profile';
import Step4Photo from '../screens/onboarding/Step4Photo';
import Step5Movies from '../screens/onboarding/Step5Movies';

// App
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

const TAB_ICONS = {
  Kesfet: '🔍',
  Swipe: '🎥',
  Filmlerim: '🎬',
  Mesajlar: '💬',
  Profilim: '👤',
};

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.4 }}>{TAB_ICONS[name]}</Text>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.red }} />}
    </View>
  );
}

function HamburgerButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4, gap: 5 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {[22, 16, 22].map((w, i) => (
        <View key={i} style={{ width: w, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
      ))}
    </Pressable>
  );
}

function MainTabs() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const screenOptions = ({ route }) => ({
    headerShown: true,
    headerStyle: { backgroundColor: Colors.bg, shadowColor: 'transparent', elevation: 0, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
    headerLeft: () => <HamburgerButton onPress={() => setDrawerOpen(true)} />,
    tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border, borderTopWidth: 0.5, height: 60, paddingBottom: 6, paddingTop: 6 },
    tabBarActiveTintColor: Colors.red,
    tabBarInactiveTintColor: '#555',
    tabBarShowLabel: false,
    tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
  });

  return (
    <>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen name="Kesfet" component={DiscoverScreen} options={{ title: 'Keşfet' }} />
        <Tab.Screen name="Swipe" component={SwipeScreen} options={{ title: 'Filmler' }} />
        <Tab.Screen name="Filmlerim" component={MoviesScreen} options={{ title: 'Filmlerim' }} />
        <Tab.Screen name="Mesajlar" component={MessagesScreen} options={{ title: 'Mesajlar', headerShown: false }} />
        <Tab.Screen name="Profilim" component={ProfileScreen} options={{ title: 'Profil', headerShown: false }} />
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

function OnboardingStack() {
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
        <Stack.Screen name="Step1Username" component={Step1Username} />
        <Stack.Screen name="Step2Account" component={Step2Account} />
        <Stack.Screen name="Step3Profile" component={Step3Profile} />
        <Stack.Screen name="Step4Photo" component={Step4Photo} />
        <Stack.Screen name="Step5Movies" component={Step5Movies} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
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
