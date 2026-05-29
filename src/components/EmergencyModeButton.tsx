import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isActive:      boolean;
  activatedAt:   string | null;
  dmsActive:     boolean;
  onPress:       () => void;
  onImOkayPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Small 44×44 circle button — lives in the home screen header row.
// Inactive: subtle scale pulse (1→1.08, 1500 ms).
// Active: faster pulse (800 ms) + red badge dot in top-right corner.

export function EmergencyModeButton({
  isActive,
  onPress,
}: Props) {

  const scale = useSharedValue(1);

  useEffect(() => {
    const duration = isActive ? 400 : 750;
    const easing   = Easing.inOut(Easing.ease);

    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration, easing }),
        withTiming(1.0,  { duration, easing }),
      ),
      -1,
      false
    );

    return () => cancelAnimation(scale);
  }, [isActive, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="warning" size={20} color="#FFFFFF" />

        {/* Active badge — red dot with dark border to pop against the button */}
        {isActive && <View style={styles.badge} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: '#FF3B30',
    alignItems:      'center',
    justifyContent:  'center',
  },
  // Active-state notification dot — positioned at top-right of the circle
  badge: {
    position:        'absolute',
    top:             1,
    right:           1,
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: '#FFFFFF',
    borderWidth:     2,
    borderColor:     colors.background, // dark border separates from red button
  },
});
