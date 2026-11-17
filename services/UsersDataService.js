import AppDataService from './AppDataService';

const COMMON_BASE = 'users';

export default class UsersDataService {
  static async getSelfUser() {
    return await AppDataService.get(`${COMMON_BASE}/mine`);
  }

  static async setSelfUser({ name, passKey, mobile }) {
    return await AppDataService.post(`${COMMON_BASE}/mine`, { name, passKey, mobile });
  }

  static async getUsersCount({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/users_count`, { filters });
  }

  static async getUsersList({ filters, pageNum }) {
    return await AppDataService.post(`${COMMON_BASE}/users_list`, {
      filters,
      page_num: pageNum
    });
  }
  
  static async getVolunteersList() {
    return await AppDataService.get(`${COMMON_BASE}/volunteers_list`);
  }
  
  static async getVolunteersListToApprove() {
    return await AppDataService.get(`${COMMON_BASE}/volunteers_list_to_approve`);
  }

  static async getVolunteersListRejected() {
    return await AppDataService.get(`${COMMON_BASE}/volunteers_list_rejected`);
  }
  
  static async updateUserApproveStatus({ uniqueId, pollingStationId }) {
    return await AppDataService.post(`${COMMON_BASE}/update_user_approve_status`, {
      uniqueId, 
      pollingStationId
    });
  }
}
