import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWide } from '../layout';
import { colors, fonts, type as T, typeWeb } from '../tokens';

export type TextVariant = keyof typeof T;
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  weight?: Weight;
  color?: string;
  tabular?: boolean;
  align?: TextStyle['textAlign'];
}

const PA: Record<Weight, string> = { regular: fonts.paRegular, medium: fonts.paRegular, semibold: fonts.paSemibold, bold: fonts.paBold };
const EN: Record<Weight, string> = { regular: fonts.regular, medium: fonts.medium, semibold: fonts.semibold, bold: fonts.bold };

const weightOf = (family: string): Weight =>
  family === fonts.bold ? 'bold' : family === fonts.semibold ? 'semibold' : family === fonts.medium ? 'medium' : 'regular';

/** Text with design-token typography; switches to Noto Sans Gurmukhi (and taller lines) for Punjabi. */
export function AppText({ variant = 'body', weight, color = colors.text, tabular, align, style, ...rest }: AppTextProps) {
  const { i18n } = useTranslation();
  const wide = useWide();
  const base = (wide ? typeWeb : T)[variant];
  const w = weight ?? weightOf(base.fontFamily);
  const pa = i18n.language === 'pa';
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        base,
        {
          fontFamily: pa ? PA[w] : EN[w],
          color,
          lineHeight: pa ? Math.round(base.lineHeight * 1.18) : base.lineHeight,
          textAlign: align,
          fontVariant: tabular ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    />
  );
}
