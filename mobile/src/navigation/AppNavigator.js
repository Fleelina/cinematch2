import React, { memo, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Pressable, View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import DrawerMenu from '../components/DrawerMenu';
import { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { DrawerProvider, openAppDrawer, registerDrawerOpenHandler } from '../context/DrawerContext';

import LoginScreen from '../screens/LoginScreen';
import Step1Username from '../screens/onboarding/Step1Username';
import Step2Account from '../screens/onboarding/Step2Account';
import Step3Profile from '../screens/onboarding/Step3Profile';
import Step4Photo from '../screens/onboarding/Step4Photo';
import Step5Movies from '../screens/onboarding/Step5Movies';

import MatchmakingScreen from '../screens/MatchmakingScreen';
import MessagesScreen from '../screens/MessagesScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import PersonScreen from '../screens/PersonScreen';
import SimilarMoviesScreen from '../screens/SimilarMoviesScreen';
import SwipeScreen from '../screens/SwipeScreen';
import GamesScreen from '../screens/GamesScreen';
import MovieGuessScreen from '../screens/MovieGuessScreen';
import PosterGuessScreen from '../screens/PosterGuessScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import MatchesScreen from '../screens/MatchesScreen';
import LikesScreen from '../screens/LikesScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import StatsScreen from '../screens/StatsScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import UserMoviesScreen from '../screens/UserMoviesScreen';
import MyMoviesScreen from '../screens/MyMoviesScreen';
import AllMoviesScreen from '../screens/AllMoviesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ITEMS = {
  Filmlerim: { icon: 'compass', label: 'Keşfet', themeIcon: 'discover' },
  Swipe: { icon: 'film', label: 'Filmler', themeIcon: 'collections' },
  Eslesmeler: { icon: 'layers', label: 'Eşleşme', themeIcon: 'match' },
  Begeniler: { icon: 'heart', label: 'Beğeni', themeIcon: 'like' },
  Mesajlar: { icon: 'message-circle', label: 'Mesaj', themeIcon: 'profile' },
};

function CardsIcon({ focused, activeColor, inactiveColor }) {
  const color = focused ? activeColor : inactiveColor;

  return (
    <View style={styles.cardsIcon}>
      <View style={{
        position: 'absolute', top: 5, left: 6,
        width: 18, height: 22, borderRadius: 4,
        backgroundColor: focused ? activeColor : 'transparent',
        borderWidth: 1.5,
        borderColor: color,
        opacity: 0.6,
      }} />
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: 18, height: 22, borderRadius: 4,
        backgroundColor: focused ? activeColor : 'transparent',
        borderWidth: 1.5,
        borderColor: color,
      }} />
    </View>
  );
}

const TAB_PRESS_LOCK_MS = 280;

function DebouncedTabBarButton({ onPress, ...props }) {
  const lockedRef = useRef(false);

  const handlePress = (event) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    onPress?.(event);
    setTimeout(() => {
      lockedRef.current = false;
    }, TAB_PRESS_LOCK_MS);
  };

  return <Pressable {...props} onPress={handlePress} />;
}

const TabIcon = memo(function TabIcon({ name, focused, activeColor, inactiveColor, nav, themeColors, movieTheme }) {
  const meta = TAB_ITEMS[name] || TAB_ITEMS.Filmlerim;
  const glow = nav.glow || activeColor;
  const activePill = nav.activePill || themeColors.primarySoft || themeColors.purpleSoft || 'rgba(255,255,255,0.12)';
  const activeBorder = nav.activeBorder || nav.border || themeColors.border || 'rgba(255,255,255,0.12)';
  const themeGlyph = movieTheme?.icons?.[meta.themeIcon];
  const useThemeGlyph = Boolean(themeGlyph);

  return (
    <View
      style={[
        styles.tabIconWrap,
        focused && [
          styles.tabIconWrapActive,
          {
            backgroundColor: activePill,
            borderColor: activeBorder,
            shadowColor: glow,
          },
        ],
      ]}
    >
      <View style={[styles.iconPlate, focused && styles.iconPlateActive]}>
        {useThemeGlyph ? (
          <Text
            style={[
              styles.themeGlyph,
              { color: focused ? activeColor : inactiveColor, opacity: focused ? 1 : 0.72 },
            ]}
          >
            {themeGlyph}
          </Text>
        ) : name === 'Eslesmeler' ? (
          <CardsIcon focused={focused} activeColor={activeColor} inactiveColor={inactiveColor} />
        ) : (
          <Feather name={meta.icon} size={focused ? 17 : 16} color={focused ? activeColor : inactiveColor} />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabIconLabel,
          { color: focused ? activeColor : inactiveColor, opacity: focused ? 1 : 0.68 },
        ]}
      >
        {meta.label}
      </Text>
      {focused ? <View style={[styles.activeUnderline, { backgroundColor: nav.activeDot?.color || activeColor }]} /> : null}
    </View>
  );
});
function HamburgerButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4, gap: 5 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {[22, 16, 22].map((w, i) => (
        <View key={i} style={{ width: w, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
      ))}
    </Pressable>
  );
}

function GlobalDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => registerDrawerOpenHandler(() => setDrawerOpen(true)), []);

  return <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />;
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { theme: themeColors, movieTheme } = useTheme();
  const tabBarBottomPadding = insets.bottom > 0 ? Math.max(2, insets.bottom - 12) : 0;
  const nav = movieTheme?.navbar || {};
  const isMovieTheme = Boolean(movieTheme);
  const bgColor = nav.background || (isMovieTheme ? 'rgba(8,8,12,0.88)' : themeColors.bgSoft || themeColors.bg || Colors.bg);
  const borderColor = nav.border || themeColors.border || Colors.border;
  const activeColor = nav.active || themeColors.red || Colors.red;
  const inactiveColor = nav.inactive || themeColors.textMuted || 'rgba(255,255,255,0.45)';
  const barGradient = nav.gradient || [
    isMovieTheme ? 'rgba(16,16,24,0.94)' : bgColor,
    isMovieTheme ? 'rgba(7,7,12,0.96)' : themeColors.bg || bgColor,
  ];

  const screenOptions = ({ route }) => ({
    headerShown: true,
    headerStyle: {
      backgroundColor: bgColor,
      shadowColor: 'transparent',
      elevation: 0,
      borderBottomWidth: 0.5,
      borderBottomColor: borderColor,
    },
    headerTintColor: themeColors.textPrimary || '#fff',
    headerTitleStyle: { fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
    headerLeft: () => <HamburgerButton onPress={openAppDrawer} />,
    tabBarStyle: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: Platform.OS === 'android' ? -14 : -12,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 66 + tabBarBottomPadding,
      paddingBottom: tabBarBottomPadding,
      paddingTop: 8,
      paddingHorizontal: 8,
      borderRadius: 28,
      elevation: 20,
      shadowColor: nav.glow || '#000',
      shadowOpacity: movieTheme ? 0.32 : 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    tabBarItemStyle: { flex: 1 },
    tabBarButton: (props) => <DebouncedTabBarButton {...props} />,
    tabBarBackground: () => (
      <View style={[styles.tabBarBackground, { borderColor }]}>
        <LinearGradient
          colors={barGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.tabBarSheen, { backgroundColor: nav.glow || activeColor }]} />
        <View style={styles.tabBarGlass} />
      </View>
    ),
    tabBarActiveTintColor: activeColor,
    tabBarInactiveTintColor: inactiveColor,
    lazy: true,
    freezeOnBlur: true,
    tabBarShowLabel: false,
    tabBarIcon: ({ focused }) => (
      <TabIcon
        name={route.name}
        focused={focused}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
        nav={nav}
        themeColors={themeColors}
        movieTheme={movieTheme}
      />
    ),
  });

  return (
    <DrawerProvider>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen name="Filmlerim" component={DiscoverScreen} options={{ title: 'Keşfet' }} />
        <Tab.Screen name="Swipe" component={SwipeScreen} options={{ title: 'Filmler' }} />
        <Tab.Screen name="Eslesmeler" component={MatchmakingScreen} options={{ title: 'Eşleşmeler', headerShown: false }} />
        <Tab.Screen name="Begeniler" component={LikesScreen} options={{ title: 'Beğeniler' }} />
        <Tab.Screen name="Mesajlar" component={MessagesScreen} options={{ title: 'Mesajlar', headerShown: false }} />
      </Tab.Navigator>
      <GlobalDrawer />
    </DrawerProvider>
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
      <Stack.Screen name="Games" component={GamesScreen} />
      <Stack.Screen name="MovieGuess" component={MovieGuessScreen} />
      <Stack.Screen name="PosterGuess" component={PosterGuessScreen} />
      <Stack.Screen name="Likes" component={LikesScreen} />
      <Stack.Screen name="MyProfile" component={ProfileScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="UserMovies" component={UserMoviesScreen} />
      <Stack.Screen name="MyMovies" component={MyMoviesScreen} />
      <Stack.Screen name="AllMovies" component={AllMoviesScreen} options={{ headerShown: true }} />
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

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabBarSheen: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 0,
    height: 1,
    opacity: 0.72,
  },
  tabBarGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  tabIconWrap: {
    minWidth: 56,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tabIconWrapActive: {
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  iconPlate: {
    width: 26,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlateActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  themeGlyph: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  tabIconLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  cardsIcon: {
    width: 24,
    height: 22,
    position: 'relative',
  },
});

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
