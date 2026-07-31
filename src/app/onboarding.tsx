import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 's1',
    title: 'Report Education News That Matters',
    description: 'Write and publish education stories that reach students, parents and institutions nationwide.',
    image: 'https://picsum.photos/seed/onboard-1/900/900',
  },
  {
    key: 's2',
    title: 'Rich Editor, Beautiful Articles',
    description: 'Craft polished stories with our rich text editor, banners and image galleries.',
    image: 'https://picsum.photos/seed/onboard-2/900/900',
  },
  {
    key: 's3',
    title: 'Track Approvals & Get Paid',
    description: 'Monitor your drafts, approvals and payouts all from one clean dashboard.',
    image: 'https://picsum.photos/seed/onboard-3/900/900',
  },
];

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const isLast = activeIndex === slides.length - 1;

  const goNext = () => {
    if (isLast) {
      router.replace('/(auth)/login');
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.skipRow}>
        <Text
          onPress={() => router.replace('/(auth)/login')}
          style={[styles.skip, { color: theme.colors.textMuted }]}>
          Skip
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" transition={200} />
            <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? theme.colors.primary : theme.colors.border,
                  width: i === activeIndex ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Button label={isLast ? 'Get Started' : 'Next'} onPress={goNext} fullWidth size="lg" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skip: {
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  image: {
    width: '100%',
    height: width * 0.75,
    borderRadius: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 28,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
