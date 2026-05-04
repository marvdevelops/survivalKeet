import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../../src/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ITEMS: {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'map', title: 'Map', icon: 'map-outline', iconFocused: 'map' },
  { name: 'compass', title: 'Compass', icon: 'compass-outline', iconFocused: 'compass' },
  { name: 'sos', title: 'SOS', icon: 'call-outline', iconFocused: 'call' },
  { name: 'guides', title: 'Guides', icon: 'book-outline', iconFocused: 'book' },
  { name: 'checklist', title: 'Checklist', icon: 'checkbox-outline', iconFocused: 'checkbox' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
