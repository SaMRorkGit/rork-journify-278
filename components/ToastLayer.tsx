import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import { ToastMessage, useToast } from '../contexts/ToastContext';

export default function ToastLayer() {
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visibleToast, setVisibleToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (toast) {
      console.log('[ToastLayer] Showing toast layer');
      setVisibleToast(toast);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 180,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!toast && visibleToast) {
      console.log('[ToastLayer] Hiding toast layer');
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 40,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleToast(null);
      });
    }
  }, [toast, visibleToast, opacity, translateY]);

  const bottomOffset = useMemo(() => Math.max(insets.bottom + 14, 18), [insets.bottom]);

  if (!visibleToast) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.host]}>
      <Animated.View
        style={[
          styles.toast,
          {
            bottom: bottomOffset,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.toastInner} testID="global-toast">
          <Text style={styles.toastText}>{visibleToast.message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastInner: {
    backgroundColor: 'rgba(5, 20, 29, 0.9)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
      },
    }),
  },
  toastText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
