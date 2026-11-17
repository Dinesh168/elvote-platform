import { componentKey as votersApproachedSliceComponentKey } from "../../storemanagement/votersapproached/VotersApproachedSlice";
import useGarbageCollector from "./garbageCollectorHooks";
import { componentKey as stagingSliceComponentKey } from './../../storemanagement/stagingscreen/StagingSlice';
import { componentKey as uploadvoterSliceComponentKey } from './../../storemanagement/uploadvotersscreen/UploadVotersSlice';
import { componentKey as usersManagementSliceComponentKey } from './../../storemanagement/usersmanagement/UsersManagementSlice';
import { componentKey as homeSliceComponentKey } from './../../storemanagement/homescreen/HomeSlice';
import { componentKey as privateSliceComponentKey } from './../../storemanagement/privatescreen/PrivateSlice';
import { componentKey as initSliceComponentKey } from './../../storemanagement/initscreen/InitSlice';
import { componentKey as filterSortSliceComponentKey } from './../../storemanagement/filtersort/FilterSortSlice';

export function useCleanAllSliceSaga() {
  useGarbageCollector(votersApproachedSliceComponentKey)
  useGarbageCollector(stagingSliceComponentKey)
  useGarbageCollector(uploadvoterSliceComponentKey)
  useGarbageCollector(usersManagementSliceComponentKey)
  useGarbageCollector(homeSliceComponentKey)
  useGarbageCollector(privateSliceComponentKey)
  useGarbageCollector(initSliceComponentKey)
  useGarbageCollector(filterSortSliceComponentKey)
}
