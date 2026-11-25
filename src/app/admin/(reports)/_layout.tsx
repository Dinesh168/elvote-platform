import { AdminRoutesCtx, REPORT_ROUTES } from '@/features/easy/admin/scope';
import { TabStack } from '@/features/shell/TabStack';

/** Reports tab page stack (spec easy-redesign A4); pages opened here stay in this tab. */
export const unstable_settings = { initialRouteName: 'reports' };

export default function ReportsLayout() {
  return (
    <AdminRoutesCtx.Provider value={REPORT_ROUTES}>
      <TabStack />
    </AdminRoutesCtx.Provider>
  );
}
