import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

export interface TabBarIconMap {
  [routeName: string]: { active: IconName; inactive: IconName; badge?: number };
}

/** Minimal structural shape of expo-router's bottom-tab `tabBar` render props; the
 * concrete `BottomTabBarProps` type is not re-exported from the public expo-router entry points. */
export interface CustomTabBarProps {
  state: {
    routes: { key: string; name: string }[];
    index: number;
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string) => void;
  };
}

function TabBarButton({
  focused,
  label,
  icon,
  badge,
  onPress,
  color,
  inactiveColor,
}: {
  focused: boolean;
  label: string;
  icon: IconName;
  badge?: number;
  onPress: () => void;
  color: string;
  inactiveColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(focused ? 1 : 0.94, { duration: 150 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tabButton}>
      <Animated.View style={[styles.tabInner, animatedStyle]}>
        <View>
          <Icon name={icon} size={23} color={focused ? color : inactiveColor} />
          {badge ? (
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            styles.label,
            { color: focused ? color : inactiveColor, fontWeight: focused ? '700' : '500' },
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** expo-router's js-tabs `tabBar` render prop is invoked as a plain function call inside a
 * Context.Consumer, which does not set up the hooks dispatcher. Keep the returned function
 * hook-free and defer all hook usage to a JSX-rendered inner component instead. */
export function createCustomTabBar(iconMap: TabBarIconMap, options?: { notificationsAudience?: 'reporter' | 'admin' }) {
  return function CustomTabBar(props: CustomTabBarProps) {
    return <CustomTabBarInner {...props} iconMap={iconMap} notificationsAudience={options?.notificationsAudience} />;
  };
}

function CustomTabBarInner({
  state,
  descriptors,
  navigation,
  iconMap,
  notificationsAudience,
}: CustomTabBarProps & { iconMap: TabBarIconMap; notificationsAudience?: 'reporter' | 'admin' }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getReporterByEmail } = useReporters();
  const { unreadCount, unreadCountForReporter } = useNotifications();
  const reporterId = user?.role === 'reporter' && user.email
    ? getReporterByEmail(user.email)?.id
    : undefined;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
          ...theme.shadow('md'),
        },
      ]}>
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const focused = state.index === index;
        const config = iconMap[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
        const badge =
          route.name === 'notifications' && notificationsAudience
            ? notificationsAudience === 'reporter'
              ? unreadCountForReporter(reporterId)
              : unreadCount(notificationsAudience)
            : config.badge;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabBarButton
            key={route.key}
            focused={focused}
            label={label}
            icon={focused ? config.active : config.inactive}
            badge={badge}
            onPress={onPress}
            color={theme.colors.primary}
            inactiveColor={theme.colors.tabBarInactive}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
