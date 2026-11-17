import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import ComingSoonView from '../components/ui/ComingSoonView';
import { ROUTES } from '../constant';

export default function IssuesScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  if (route.name === ROUTES.RECENTLY_ADDED_VOTERS_SCREEN) {
    return (
      <ComingSoonView
        title="Recently Added Voters"
        description="A dynamic log of newly registered voters, showing their polling station allocations, registration dates, and volunteer assignments will be visible here."
        icon="➕"
        color="#10B981" /* Green for added/positive action */
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (route.name === ROUTES.RECENTLY_DELETED_VOTERS_SCREEN) {
    return (
      <ComingSoonView
        title="Recently Deleted Voters"
        description="A secure ledger of voters removed from the electoral roll (due to migration, duplication, or death) will be listed here with audit details."
        icon="🗑️"
        color="#EF4444" /* Red for deleted/negative action */
        onBack={() => navigation.goBack()}
      />
    );
  }

  // Default fallback for Issues or other screens
  return (
    <ComingSoonView
      title="Issues Tracker"
      description="Track, resolve, and manage booth-level reports, ticketing complaints, and volunteer assistance requests in real-time."
      icon="🛠️"
      color="#F59E0B" /* Amber for issues/warning */
      onBack={() => navigation.goBack()}
    />
  );
}
