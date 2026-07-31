import { Tabs } from 'expo-router/js-tabs';

import { createCustomTabBar } from '@/navigation/CustomTabBar';

const tabBar = createCustomTabBar({
  index: { active: 'grid', inactive: 'grid-outline' },
  articles: { active: 'document-text', inactive: 'document-text-outline' },
  notifications: { active: 'notifications', inactive: 'notifications-outline', badge: 2 },
  profile: { active: 'person', inactive: 'person-outline' },
});

export default function ReporterTabsLayout() {
  return (
    <Tabs tabBar={tabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="articles" options={{ title: 'Articles' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
