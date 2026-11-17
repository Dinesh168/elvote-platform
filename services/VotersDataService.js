import AppDataService from './AppDataService';

const COMMON_BASE = 'voters';

export default class VotersDataService {
  
  static async getVotersList({ filters, pageNum, isLiveVoting=false }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_list`, {
      filters,
      page_num: pageNum,
      is_live_voting: isLiveVoting
    });
  }

  static async getSearchedVoter({ filters }) {
    return await AppDataService.post(`${COMMON_BASE}/search_voter`, {
      filters
    });
  }
  
  static async getVotersApproachedList({ filters, pageNum }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_approached_list`, {
      filters,
      page_num: pageNum
    });
  }

  static async getVotersApproachedCount({ filters = {} }) {
    console.log("getVotersApproachedCount", { filters });
    return await AppDataService.post(`${COMMON_BASE}/voters_approached_count`, {
      filters
    });
  }

  static async getVotersVotedCount({ filters = {} }) {
    console.log("getVotersVotedCount", { filters });
    return await AppDataService.post(`${COMMON_BASE}/voters_voted_count`, {
      filters
    });
  }
  
  static async getTotalVotersCount({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_count`, {
      filters
    });
  }

  static async getTotalVotersCountByAddress({ filters = {}, pageNum }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_count_by_address`, {
      filters,
      page_num: pageNum
    });
  }

  static async getTotalAddressCount({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_address_count`, {
      filters
    });
  }
  
  static async getVotersApproachedCountPerDay({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_approached_count_daywise`, {
      filters
    });
  }
  
  static async getVotersOpinion({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_opinion`, {
      filters
    });
  }
  
  static async getVotersAgeCountPerGroup({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_age_count_group`, {
      filters
    });
  }

  static async getVotersReligionCountPerGroup({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_religion_count_group`, {
      filters
    });
  }

  static async getVotersCasteCountPerGroup({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_caste_count_group`, {
      filters
    });
  }

  static async getVotersGenderCountPerGroup({ filters = {} }) {
    return await AppDataService.post(`${COMMON_BASE}/voters_gender_count_group`, {
      filters
    });
  }

  static async getVotersMobileCount({filters = {}}) {
    return await AppDataService.post(`${COMMON_BASE}/voters_mobile_count`, {filters});
  }

  static async getVotersMigratedCount({filters = {}}) {
    return await AppDataService.post(`${COMMON_BASE}/voters_migratory_count`, {filters});
  }

  static async setVoterApproached({ voter_id }) {
    return await AppDataService.post(`${COMMON_BASE}/set_voter_approached`, {
      voter_id
    });
  }

  static async setVoterVoted({ voter_id }) {
    return await AppDataService.post(`${COMMON_BASE}/set_voter_voted`, {
      voter_id
    });
  }
  
  static async setVoterMobileNumber({ voter_id, mobile_number }) {
    return await AppDataService.post(`${COMMON_BASE}/set_voter_mobile`, {
      voter_id,
      mobile_number
    });
  }

  static async setVoterMigratoryStatus({ voter_id, is_voter_migrated }) {
    return await AppDataService.post(`${COMMON_BASE}/set_voter_migratory_status`, {
      voter_id,
      is_voter_migrated
    });
  }

  static async setVoterOpinion({ voter_id, opinion }) {
    return await AppDataService.post(`${COMMON_BASE}/set_voter_opinion`, {
      voter_id,
      opinion
    });
  }

  static async getVotersCastesList() {
    return await AppDataService.get(`${COMMON_BASE}/castes_list`);
  }

  static async getVotersReligionsList() {
    return await AppDataService.get(`${COMMON_BASE}/religions_list`);
  }

}
