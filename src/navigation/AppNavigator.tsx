import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, AppTabParamList, SettingsStackParamList } from './types';
import SubscriptionListScreen from '../screens/subscriptions/SubscriptionListScreen';
import SubscriptionDetailScreen from '../screens/subscriptions/SubscriptionDetailScreen';
import SubscriptionFormScreen from '../screens/subscriptions/SubscriptionFormScreen';
import AlternativesScreen from '../screens/subscriptions/AlternativesScreen';
import RenewalCalendarScreen from '../screens/subscriptions/RenewalCalendarScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CurrencyPickerScreen from '../screens/CurrencyPickerScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const NAV_OPTS = {
  headerStyle: { backgroundColor: '#ffffff' },
  headerTintColor: '#1b1830',
  headerTitleStyle: { fontWeight: '700' as const },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={NAV_OPTS}>
      <HomeStack.Screen
        name="SubscriptionList"
        component={SubscriptionListScreen}
        options={({ navigation }) => ({
          title: 'My Subscriptions',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('RenewalCalendar')}
              accessibilityRole="button"
              accessibilityLabel="Renewal calendar"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="calendar-outline" size={22} color="#6366f1" />
            </TouchableOpacity>
          ),
        })}
      />
      <HomeStack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} options={{ title: 'Details' }} />
      <HomeStack.Screen name="AddSubscription" component={SubscriptionFormScreen} options={{ title: 'Add Subscription' }} />
      <HomeStack.Screen name="EditSubscription" component={SubscriptionFormScreen} options={{ title: 'Edit Subscription' }} />
      <HomeStack.Screen name="Alternatives" component={AlternativesScreen} options={{ title: 'Cheaper Alternatives' }} />
      <HomeStack.Screen name="RenewalCalendar" component={RenewalCalendarScreen} options={{ title: 'Renewal Calendar' }} />
    </HomeStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={NAV_OPTS}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="DefaultCurrency" component={CurrencyPickerScreen} options={{ title: 'Default Currency' }} />
      <SettingsStack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: 'Help & Support' }} />
    </SettingsStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#f1eff9' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#8a8698',
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
