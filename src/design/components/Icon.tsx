import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** SF-Symbols-like line icons (Ionicons). Decorative by default: hidden from screen readers. */
export function Icon({ name, size = 22, color }: { name: string; size?: number; color: string }) {
  return <Ionicons name={name as IonName} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}
