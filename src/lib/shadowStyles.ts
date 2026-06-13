import { Platform } from 'react-native';

/**
 * Cross-platform shadow helper
 * Returns native shadow props for iOS/Android, boxShadow for web
 */
export function createShadow(color: string, offsetX: number, offsetY: number, opacity: number, radius: number) {
  if (Platform.OS === 'web') {
    // Web: use CSS box-shadow
    const rgb = hexToRgb(color);
    const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${rgbaColor}`,
    };
  }

  // Native: use React Native shadow props
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: radius, // Android
  };
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
