import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Colors from '../constants/colors';

type ConfirmationTone = 'default' | 'success' | 'destructive' | 'warning';

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: ConfirmationTone;
  testIDPrefix?: string;
};

const toneStyles: Record<ConfirmationTone, { background: string; text: string; border?: string }> = {
  default: { background: Colors.primary, text: Colors.background },
  success: { background: Colors.mint, text: Colors.background },
  destructive: { background: Colors.error, text: Colors.background },
  warning: { background: Colors.warning, text: Colors.background, border: Colors.warning + '33' },
};

export default function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'default',
  testIDPrefix,
}: ConfirmationModalProps) {
  const palette = toneStyles[tone];
  const confirmTestID = testIDPrefix ? `${testIDPrefix}-confirm` : undefined;
  const cancelTestID = testIDPrefix ? `${testIDPrefix}-cancel` : undefined;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} testID={testIDPrefix ? `${testIDPrefix}-backdrop` : undefined} />
        <View style={styles.card}>
          <View style={styles.pill}>
            <View style={[styles.pillAccent, { backgroundColor: palette.background }]} />
            <Text style={styles.pillLabel}>Confirm</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: palette.background, borderColor: palette.border ?? palette.background }]}
              onPress={onConfirm}
              activeOpacity={0.85}
              testID={confirmTestID}
            >
              <Text style={[styles.confirmText, { color: palette.text }]}>{confirmLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.85}
              testID={cancelTestID}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 18, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bgMid,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 8,
  },
  pillAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonStack: {
    gap: 12,
  },
  confirmButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancelButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
