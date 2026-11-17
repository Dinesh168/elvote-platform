import * as Print from 'expo-print';
import { useState } from 'react';
import { Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { STRINGS } from '../../strings';

export default function PrintVoterSlip({html}) {
  const [selectedPrinter, setSelectedPrinter] = useState();

  const print = async () => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    } else {
      await Print.printAsync({
        html,
        printerUrl: selectedPrinter?.url,
      });
    }
  };

  return (
    <Button mode={'contained'} onPress={print}>{STRINGS.PRINT_BUTTON}</Button>
  );
}
