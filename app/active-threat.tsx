// Active Threat Decision Guide
// Run-Hide-Fight interactive flow with optional quick DMS arming.
// Self-contained: local useState only, no new context, fully offline.
//
// Deviations from spec (see commit notes):
//   • activateDmsQuick() is parameterless and uses 1h / 30-min grace per the
//     schema decision; copy is updated to "1 HOUR CHECK-IN".
//   • Step 4 context wiring was reverted, so the safe screen does not call
//     setActiveThreatDmsActive(false). The existing Emergency Mode DMS card
//     already surfaces dmsActive globally.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { activateDmsQuick, deactivateDms } from '../src/services/dmsService';

// ─── Types & tokens ──────────────────────────────────────────────────────────

type ThreatStep =
  | 'entry'
  | 'run_assess'
  | 'run'
  | 'hide_assess'
  | 'hide'
  | 'fight'
  | 'safe';

const C = {
  bg:           '#0D1117',
  red:          '#E8452A',
  green:        '#2D6A4F',
  fightBg:      '#1A0000',
  fightHeader:  '#FF4444',
  fightSub:     '#FCA5A5',
  safeBg:       '#0D2B1A',
  dmsCardBg:    '#1C2333',
  safeDmsBg:    '#143D26',
  white:        '#FFFFFF',
  sub:          '#9CA3AF',
  dim:          '#6B7280',
  border:       '#4B5563',
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ActiveThreatScreen() {
  const router = useRouter();

  const [step,                 setStep]                 = useState<ThreatStep>('entry');
  const [dmsActivated,         setDmsActivated]         = useState(false);
  const [dmsPromptDismissed,   setDmsPromptDismissed]   = useState(false);

  // Run-assess pulsing dot — only animates while on that step.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (step !== 'run_assess') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [step, pulse]);

  // Background colour shifts on the fight and safe screens for visual emphasis.
  const bg =
    step === 'fight' ? C.fightBg :
    step === 'safe'  ? C.safeBg  :
                       C.bg;

  // "Start Over" is hidden on entry (already there) and safe (use Exit Tool instead).
  // Note: it intentionally does NOT call deactivateDms() — if the user armed
  // DMS earlier in the flow, resetting the guide shouldn't silently disarm a
  // safety net they chose to enable. The DMS is disarmed only via "I AM SAFE".
  const showStartOver = step !== 'entry' && step !== 'safe';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      {/* ── Header (always shown) ─────────────────────────────────────────── */}
      <View style={styles.header}>
        {showStartOver && (
          <TouchableOpacity
            style={styles.startOverBtn}
            onPress={() => setStep('entry')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.startOverText}>‹ Start Over</Text>
          </TouchableOpacity>
        )}

        <View style={styles.pill}>
          <Text style={styles.pillText}>ACTIVE THREAT GUIDE</Text>
        </View>

        {step === 'run_assess' && (
          <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
        )}
      </View>

      {/* ── Body per step ─────────────────────────────────────────────────── */}
      {step === 'entry'        && <EntryScreen        onYes={() => setStep('run_assess')} />}
      {step === 'run_assess'   && <RunAssessScreen    onYes={() => setStep('run')}        onNo={() => setStep('hide_assess')} />}
      {step === 'run'          && <RunScreen          onSafe={() => setStep('safe')} />}
      {step === 'hide_assess'  && <HideAssessScreen   onYes={() => setStep('hide')}       onNo={() => setStep('fight')} />}
      {step === 'hide'         && (
        <HideScreen
          dmsActivated={dmsActivated}
          dmsPromptDismissed={dmsPromptDismissed}
          onActivateDms={async () => {
            try {
              await activateDmsQuick();
              setDmsActivated(true);
            } catch (e) {
              Alert.alert(
                'Could not arm DMS',
                e instanceof Error ? e.message : 'Unknown error',
              );
            }
          }}
          onSkipDms={() => setDmsPromptDismissed(true)}
          onSafe={() => setStep('safe')}
        />
      )}
      {step === 'fight'        && <FightScreen onSafe={() => setStep('safe')} />}
      {step === 'safe'         && (
        <SafeScreen
          dmsActivated={dmsActivated}
          onCheckInSafe={async () => {
            try {
              await deactivateDms();
            } finally {
              setDmsActivated(false);
            }
          }}
          onExit={() => router.back()}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Screen bodies ───────────────────────────────────────────────────────────

function EntryScreen({ onYes }: { onYes: () => void }) {
  return (
    <View style={styles.body}>
      <View style={styles.bodyTop}>
        <Text style={styles.question}>Are you in immediate danger right now?</Text>
      </View>

      <View style={styles.buttonStack}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.red }]}
          onPress={onYes}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>YES — I NEED HELP NOW</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() =>
            Alert.alert(
              'Preparedness reading',
              'Open the Survival Guides section for preparedness reading.',
            )
          }
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>NO — I want to prepare</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RunAssessScreen({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <View style={styles.body}>
      <View style={styles.bodyTop}>
        <Text style={styles.question}>Can you safely run to an exit?</Text>
        <Text style={styles.subtext}>
          Clear path. No threat between you and the door. You can move fast.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={onYes}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>YES — I CAN RUN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.red }]}
          onPress={onNo}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>NO — I CANNOT RUN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RunScreen({ onSafe }: { onSafe: () => void }) {
  const items = [
    'Leave everything behind',
    'Move fast and low',
    'Use exits away from the noise',
    'Alert others as you move — do not stop',
    'Once outside, keep moving away from the building',
    'Call 911 / 117 when you are safe',
  ];
  return (
    <View style={styles.bodyCol}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.red }]}>RUN</Text>
        {items.map((text, i) => (
          <View key={i} style={styles.instructionRow}>
            <Text style={styles.instructionNumber}>{i + 1}.</Text>
            <Text style={styles.instructionText}>{text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={onSafe}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>I AM OUTSIDE AND SAFE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HideAssessScreen({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <View style={styles.body}>
      <View style={styles.bodyTop}>
        <Text style={styles.question}>Can you get into a room and secure the door?</Text>
        <Text style={styles.subtext}>
          Lock, barricade, or block the door. Away from windows.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={onYes}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>YES — I CAN HIDE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.red }]}
          onPress={onNo}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>NO — I CANNOT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HideScreen({
  dmsActivated,
  dmsPromptDismissed,
  onActivateDms,
  onSkipDms,
  onSafe,
}: {
  dmsActivated: boolean;
  dmsPromptDismissed: boolean;
  onActivateDms: () => void | Promise<void>;
  onSkipDms: () => void;
  onSafe: () => void;
}) {
  const items = [
    'Lock or barricade the door immediately',
    'Move everyone away from the door and windows',
    'Get low — stay against an interior wall',
    'Turn off the lights',
    'Silence all phones now',
    'Do NOT open the door for anyone — police use keys or force entry',
  ];

  return (
    <View style={styles.bodyCol}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.red }]}>HIDE</Text>
        {items.map((text, i) => (
          <View key={i} style={styles.instructionRow}>
            <Text style={styles.instructionNumber}>{i + 1}.</Text>
            <Text style={styles.instructionText}>{text}</Text>
          </View>
        ))}

        {/* DMS prompt card */}
        <View style={styles.dmsCard}>
          <Text style={styles.dmsCardTitle}>Let someone know where you are.</Text>
          <Text style={styles.dmsCardSub}>
            Dead Man&apos;s Switch will alert your emergency contact if you do not
            check in within 1 hour.
          </Text>

          {dmsActivated ? (
            <Text style={styles.dmsCardActive}>
              Dead Man&apos;s Switch is active. Check in when safe.
            </Text>
          ) : !dmsPromptDismissed ? (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.red }]}
                onPress={onActivateDms}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: C.white }]}>
                  ACTIVATE — 1 HOUR CHECK-IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSkipDms} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={onSafe}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>I AM SAFE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FightScreen({ onSafe }: { onSafe: () => void }) {
  const items = [
    'Wait until the threat is close — act with surprise',
    'Improvise a weapon — chair, fire extinguisher, laptop, bag',
    'Aim for eyes, throat, groin — commit fully',
    'Multiple people act together — do not hesitate',
    'Do not stop until the threat is neutralized',
  ];
  return (
    <View style={styles.bodyCol}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.fightHeader }]}>LAST RESORT</Text>
        <Text style={[styles.subtext, { color: C.fightSub, marginBottom: 24 }]}>
          You cannot run. You cannot hide. You must act.
        </Text>
        {items.map((text, i) => (
          <View key={i} style={styles.instructionRow}>
            <Text style={styles.instructionNumber}>{i + 1}.</Text>
            <Text style={styles.instructionText}>{text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={onSafe}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>I AM SAFE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SafeScreen({
  dmsActivated,
  onCheckInSafe,
  onExit,
}: {
  dmsActivated: boolean;
  onCheckInSafe: () => void | Promise<void>;
  onExit: () => void;
}) {
  return (
    <View style={styles.bodyCol}>
      <View style={styles.safeCenter}>
        <Text style={styles.safeHeadline}>You are safe.</Text>
        <Text style={styles.safeSub}>
          Take a breath.{'\n'}
          Call emergency services if you have not already.{'\n'}
          Stay with others until police give the all-clear.
        </Text>

        {dmsActivated && (
          <View style={styles.safeDmsCard}>
            <Text style={styles.dmsCardTitle}>Dead Man&apos;s Switch is active.</Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.green }]}
              onPress={onCheckInSafe}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { color: C.white }]}>CHECK IN — I AM SAFE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={onExit}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: C.white }]}>Exit Tool</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  startOverBtn: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  startOverText: {
    color: C.sub,
    fontSize: 14,
    fontWeight: '600',
  },
  pill: {
    backgroundColor: C.red,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pulseDot: {
    position: 'absolute',
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.red,
  },

  // Body layouts
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  bodyTop: { gap: 0 },
  bodyCol: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  // Decision text
  question: {
    color: C.white,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtext: {
    color: C.sub,
    fontSize: 17,
    lineHeight: 24,
  },

  // Section label (RUN / HIDE / LAST RESORT)
  sectionLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    letterSpacing: 1,
  },

  // Instruction list
  instructionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  instructionNumber: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 28,
  },
  instructionText: {
    flex: 1,
    color: C.white,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },

  // Buttons
  buttonStack: { gap: 12 },
  btn: {
    minHeight: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },

  // DMS prompt card (on hide screen)
  dmsCard: {
    backgroundColor: C.dmsCardBg,
    borderColor: C.red,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  dmsCardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  dmsCardSub: {
    color: C.sub,
    fontSize: 14,
    lineHeight: 20,
  },
  dmsCardActive: {
    color: C.green,
    fontSize: 14,
    fontWeight: '600',
  },
  skipText: {
    color: C.dim,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // Safe screen
  safeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  safeHeadline: {
    color: C.white,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  safeSub: {
    color: C.sub,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  safeDmsCard: {
    backgroundColor: C.safeDmsBg,
    borderColor: C.green,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
});
