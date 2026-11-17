import { useDispatch, useSelector } from "react-redux";
import { componentKey as initSliceComponentKey } from "../../storemanagement/initscreen/InitSlice";
import { componentKey as filterSortSliceComponentKey } from "../../storemanagement/filtersort/FilterSortSlice";
import { getPollingStations } from "../../storemanagement/filtersort/FilterSortSaga";
import { useEffect, useRef } from "react";

export function useGetPollingStations() {
  const dispatch = useDispatch();
  const { selectedConstituency } = useSelector(state => state[initSliceComponentKey]);
  const { pollingStationsList } = useSelector(state => state[filterSortSliceComponentKey]);
  
  useEffect(() => {
    if (selectedConstituency && pollingStationsList.length === 0) {
      dispatch(getPollingStations());
    }
  }, [selectedConstituency])

  return pollingStationsList;
}
