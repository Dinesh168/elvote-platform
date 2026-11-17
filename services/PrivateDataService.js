import AppDataService from './AppDataService';

const COMMON_BASE = 'private';

export default class PrivateDataService {
  static async uploadVotersXLSX({ formData, uploadProgressCb = () => {} }) {
    return await AppDataService.post(`${COMMON_BASE}/upload_voters_data`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: ({ total, loaded }) => uploadProgressCb(total ? loaded / total : 0)
    });
  }

  static async clearVotersListDownloadData({ pass_key }) {
    return await AppDataService.post(`${COMMON_BASE}/clear_voters_data`, {
      pass_key
    });
  }

  static async createConstituency({ name, constituencyNumber }) {
    return await AppDataService.post(`${COMMON_BASE}/create_constituency`, {
      constituency_name: name, 
      constituency_number: constituencyNumber
    });
  }

  static async createAccount({ name, constituencyNumberId, passKey }) {
    return await AppDataService.post(`${COMMON_BASE}/create_account`, {
      account_name: name, 
      constituency_number_id: constituencyNumberId, 
      pass_key: passKey
    });
  }
  
  static async createAdminUser({ email, passKey }) {
    return await AppDataService.post(`${COMMON_BASE}/create_admin_user`, {
      email, 
      pass_key: passKey
    });
  }

}
