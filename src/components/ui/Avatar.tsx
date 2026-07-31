import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  online?: boolean;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ uri, name, size = 44, online }: AvatarProps) {
  const theme = useAppTheme();

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.primaryMuted,
            },
          ]}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: size / 2.6 }}>
            {initials(name)}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: theme.colors.success,
              borderColor: theme.colors.background,
              width: size / 3.2,
              height: size / 3.2,
              borderRadius: size / 6.4,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
