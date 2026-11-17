import AppDataService from './AppDataService';

const COMMON_BASE = 'constituency';

export default class ConstituencyDataService {
  static async getConstituencyList() {
    return await AppDataService.get(`${COMMON_BASE}`);
  }

  static async getPartyData() {
    return await AppDataService.get(`${COMMON_BASE}/partydata`);
  }

  static async getPollingStationsIdNameList() {
    return await AppDataService.get(`${COMMON_BASE}/polling_stations_minimal_list`);
  }
}
