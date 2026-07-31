import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ArticleCard } from '@/components/ui/ArticleCard';
import { EmptyState } from '@/components/ui/StateViews';
import { FAB } from '@/components/ui/FAB';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SearchBar } from '@/components/ui/SearchBar';
import { mockArticles } from '@/mocks/data';
import { useAppTheme } from '@/theme';
import type { ArticleStatus } from '@/types/models';

const tabs: { key: ArticleStatus; label: string }[] = [
  { key: 'draft', label: 'Drafts' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ReporterArticlesScreen() {
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<ArticleStatus>('pending');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return mockArticles.filter(
      (a) => a.status === activeTab && a.title.toLowerCase().includes(query.toLowerCase()),
    );
  }, [activeTab, query]);

  return (
    <ScreenContainer>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: theme.colors.text }]}>My Articles</Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search your articles" />

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Text
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabItem,
                  {
                    color: active ? theme.colors.primary : theme.colors.textMuted,
                    borderBottomColor: active ? theme.colors.primary : 'transparent',
                  },
                ]}>
                {tab.label}
              </Text>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
            <ArticleCard
              article={item}
              showStatus={false}
              onPress={() =>
                router.push(
                  item.status === 'draft'
                    ? { pathname: '/(reporter)/create-article', params: { id: item.id } }
                    : `/(reporter)/article/${item.id}`,
                )
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nothing here yet"
            message={`You don't have any ${activeTab} articles at the moment.`}
          />
        }
      />
      <FAB onPress={() => router.push('/(reporter)/create-article')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 20,
  },
  tabItem: {
    fontSize: 13.5,
    fontWeight: '700',
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
});
