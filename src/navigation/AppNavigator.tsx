import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, AppTabParamList, SettingsStackParamList } from './types';
import SubscriptionListScreen from '../screens/subscriptions/SubscriptionListScreen';
import SubscriptionDetailScreen from '../screens/subscriptions/SubscriptionDetailScreen';
import SubscriptionFormScreen from '../screens/subscriptions/SubscriptionFormScreen';
import AlternativesScreen from '../screens/subscriptions/AlternativesScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BankImportScreen from '../screens/import/BankImportScreen';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const NAV_OPTS = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '700' as const },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={NAV_OPTS}>
      <HomeStack.Screen name="SubscriptionList" component={SubscriptionListScreen} options={{ title: 'My Subscriptions' }} />
      <HomeStack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} options={{ title: 'Details' }} />
      <HomeStack.Screen name="AddSubscription" component={SubscriptionFormScreen} options={{ title: 'Add Subscription' }} />
      <HomeStack.Screen name="EditSubscription" component={SubscriptionFormScreen} options={{ title: 'Edit Subscription' }} />
      <HomeStack.Screen name="Alternatives" component={AlternativesScreen} options={{ title: 'Cheaper Alternatives' }} />
    </HomeStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={NAV_OPTS}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="BankImport" component={BankImportScreen} options={{ title: 'Import from Bank' }} />
    </SettingsStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#475569',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'card-outline',
            Analytics: 'bar-chart-outline',
            Settings: 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Subscriptions' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, ...NAV_OPTS, title: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsStackNavigator} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
