import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize } from '../../src/theme';
import { useEmergency } from '../../src/context/EmergencyContext';
type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ITEMS: {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}[] = [
  { name: 'index',    title: 'Home',   icon: 'home-outline',    iconFocused: 'home'    },
  { name: 'map',      title: 'Map',    icon: 'map-outline',     iconFocused: 'map'     },
  { name: 'tools',    title: 'Tools',  icon: 'construct-outline', iconFocused: 'construct' },
  { name: 'sos',      title: 'SOS',    icon: 'call-outline',    iconFocused: 'call'    },
  { name: 'guides',   title: 'Guides', icon: 'book-outline',    iconFocused: 'book'    },
];

// Screens that exist as routes but are hidden from the tab bar
const HIDDEN_SCREENS = ['compass', 'checklist'];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { emergencyMode } = useEmergency();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: emergencyMode
          ? { display: 'none' }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: 1,
              height: 60 + insets.bottom,
              paddingBottom: 8 + insets.bottom,
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

      {HIDDEN_SCREENS.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}
