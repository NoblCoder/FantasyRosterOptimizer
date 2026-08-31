import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

export function ScreenEntrance({ children, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 440,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function ScalePressable({ children, style, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue) {
    Animated.spring(scale, {
      toValue,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animate(0.975);
          props.onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          props.onPressOut?.(event);
        }}
        style={({ pressed }) => [styles.pressable, typeof style === "function" ? style({ pressed }) : style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    opacity: 1,
  },
});
