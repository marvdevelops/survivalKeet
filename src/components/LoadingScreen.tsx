import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Platform } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

export function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.iconWrap}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/icon.png')}
            style={styles.icon}
            resizeMode="cover"
          />
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.nameBold}>Survival</Text>
          <Text style={styles.nameLight}>Kit</Text>
        </View>
        <Text style={styles.tagline}>OFFLINE EMERGENCY COMPANION</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.poweredByLabel}>Powered By</Text>
        <Text style={styles.poweredByBrand}>HighBeam Digital</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: Platform.OS === 'ios' ? 28 : 20,
    overflow: 'hidden',
  },
  icon: {
    width: 120,
    height: 120,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  nameBold: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  nameLight: {
    color: colors.textSecondary,
    fontSize: 38,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
    gap: 2,
  },
  poweredByLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  poweredByBrand: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
