import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import useLanguage from '../hooks/useLanguage';
import { LANGUAGES } from '../strings';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';

const LanguageScreen = ({ navigation }) => {
  const { language, setLanguage } = useLanguage();
  const { responsiveValue } = useResponsive();

  const LanguageButtons = () => {
    return Object.entries(LANGUAGES).map(([key, val]) => (
      <Button 
        key={val}
        mode={language === val ? 'contained' : 'outlined'}
        buttonColor={language === val ? THEME.COLOR.PRIMARY : undefined}
        textColor={language === val ? THEME.COLOR.PRIMARY_FOREGROUND : THEME.COLOR.PRIMARY}
        onPress={() => setLanguage(val)}
        labelStyle={styles.buttonLabel}
        style={styles.button}
      >
        { key.toLowerCase() }
      </Button>
    ))
  }
  
  return (
    <View style={styles.container}>
      <Card style={[styles.card, { maxWidth: responsiveValue('100%', 400, 440) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Language</Text>
          <Text style={styles.headerSubtitle}>(भाषा चुनें)</Text>
        </View>
        <Card.Content style={styles.cardContent}>
          <View style={styles.buttonContainer}>
            <LanguageButtons />
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.SPACING.LG,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  card: {
    width: '100%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.LG,
    ...THEME.SHADOW.MEDIUM,
  },
  header: {
    padding: THEME.SPACING.XL,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    borderTopLeftRadius: THEME.BORDER_RADIUS.LG,
    borderTopRightRadius: THEME.BORDER_RADIUS.LG,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.PRIMARY,
  },
  headerSubtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginTop: THEME.SPACING.XS,
  },
  cardContent: {
    padding: THEME.SPACING.LG,
    paddingTop: THEME.SPACING.XL,
  },
  buttonContainer: {
    gap: THEME.SPACING.MD,
  },
  button: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderColor: THEME.COLOR.PRIMARY,
    borderWidth: 1,
  },
  buttonLabel: {
    textTransform: 'capitalize',
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    paddingVertical: THEME.SPACING.XS,
  }
});

export default LanguageScreen;
