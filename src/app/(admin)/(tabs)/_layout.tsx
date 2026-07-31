import { Tabs } from 'expo-router/js-tabs';

import { createCustomTabBar } from '@/navigation/CustomTabBar';

const tabBar = createCustomTabBar({
  index: { active: 'grid', inactive: 'grid-outline' },
  reporters: { active: 'people', inactive: 'people-outline' },
  articles: { active: 'document-text', inactive: 'document-text-outline' },
  payments: { active: 'wallet', inactive: 'wallet-outline' },
  more: { active: 'menu', inactive: 'menu-outline' },
});

export default function AdminTabsLayout() {
  return (
    <Tabs tabBar={tabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="reporters" options={{ title: 'Reporters' }} />
      <Tabs.Screen name="articles" options={{ title: 'Articles' }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
