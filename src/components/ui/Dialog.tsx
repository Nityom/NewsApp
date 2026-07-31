import { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { Button, ButtonVariant } from './Button';

interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  actions: DialogAction[];
  onRequestClose?: () => void;
}

export function Dialog({ visible, title, message, children, actions, onRequestClose }: DialogProps) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.radius.xl, ...theme.shadow('lg') },
          ]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            {actions.map((action) => (
              <View key={action.label} style={styles.actionItem}>
                <Button label={action.label} variant={action.variant ?? 'outline'} onPress={action.onPress} fullWidth />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  actionItem: {
    width: '100%',
  },
});
