import { ScrollView, View } from "react-native";
import { Chip, Text } from "react-native-paper";
import { INITIAL_FILTER_SORT } from "../../storemanagement/filtersort/FilterSortSlice";
import { THEME } from "../../theme";

export default function AddedFilterInfo({ filters }) {
  const appliedFilters = Object.entries(filters).filter(([_, value]) => value !== null);

  if (appliedFilters.length === 0) {
    return null;
  }

  if (appliedFilters.length === 1) {
    const [key] = appliedFilters[0];
    const label = INITIAL_FILTER_SORT[key]?.callback(filters)?.label ?? key;
    return (
      <View style={{ paddingHorizontal: THEME.SPACING.MD, paddingVertical: THEME.SPACING.SM, backgroundColor: THEME.COLOR.WARNING_BACKGROUND }}>
        <Text
          variant="titleMedium"
          style={{ color: THEME.COLOR.PRIMARY, fontWeight: THEME.FONT_WEIGHT.BOLD, textAlign: 'center' }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: THEME.SPACING.SM, backgroundColor: THEME.COLOR.WARNING_BACKGROUND }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: THEME.SPACING.MD, gap: THEME.SPACING.SM }}
      >
        {appliedFilters.map(([key]) => {
          const label = INITIAL_FILTER_SORT[key]?.callback(filters)?.label ?? key;
          return (
            <Chip
              key={key}
              compact
              style={{ backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND }}
              textStyle={{ color: THEME.COLOR.PRIMARY, fontSize: THEME.FONT_SIZE.XS }}
            >
              {label}
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}
