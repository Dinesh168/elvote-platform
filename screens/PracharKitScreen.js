import React from 'react';
import { useNavigation } from '@react-navigation/native';
import ComingSoonView from '../components/ui/ComingSoonView';
import { THEME } from '../theme';

const PracharKitScreen = () => {
  const navigation = useNavigation();

  return (
    <ComingSoonView
      title="Prachar Kit"
      description="We are putting together high-quality digital campaign assets, posters, social media banners, and print-ready templates to power your campaign."
      icon="📢"
      color="#8B5CF6" /* Purple color for kit/campaign brand */
      onBack={() => navigation.goBack()}
    />
  );
};

export default PracharKitScreen;
