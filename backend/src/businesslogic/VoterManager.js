const VotersModel = require("../models/VotersModel");
const { usingTxn } = require("../models/libs/dbWrappers");

class VoterManager {

  static _getVoterModel() {
      return new VotersModel();
  }   

  static async upsertVoter({ 
    id,
    name,
    relative_name,
    relative_relation,
    epic,
    address,
    part_no,
    constituency_number_id,
    mobile_number,
    caste,
    religion,
    sno,
    age,
    gender,  
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const voterId = await voterModel.upsertVoter({
        id,
        name,
        relative_name,
        relative_relation,
        epic,
        address,
        part_no,
        constituency_number_id,
        mobile_number,
        caste,
        religion,
        sno,
        age,
        gender,
      }, trxProvider);
      
      return voterId;
    }, trxProvider);
  }

  static async insertVoters({votersList, constituency_number_id}, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const success = await voterModel.insertVoters({votersList, constituency_number_id}, trxProvider);
      
      return success;
    }, trxProvider);
  }

  static async getVotersCount({ filters = {}, constituency_number_id, account_id, sno, epic }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const votersCount = await voterModel.getVotersCount({ filters, constituency_number_id, account_id, sno, epic }, trxProvider);
      return votersCount;
    }, trxProvider);
  }

  static async getAddressCount({ filters = {}, constituency_number_id, account_id, sno, epic }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const addressCount = await voterModel.getAddressCount({ filters, constituency_number_id, account_id, sno, epic }, trxProvider);
      return addressCount;
    }, trxProvider);
  }

  static async getVotersCountByAddress({ filters = {}, constituency_number_id, account_id, sno, epic, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const votersCount = await voterModel.getVotersCountByAddress({ filters, constituency_number_id, account_id, sno, epic, page_no, limit }, trxProvider);
      return votersCount;
    }, trxProvider);
  }

  static async getVotersCountPerGroup({ filters = {}, constituency_number_id, sno, epic, column_name, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const votersCount = await voterModel.getVotersCountPerGroup({ filters, constituency_number_id, sno, epic, column_name, account_id }, trxProvider);
      return votersCount;
    }, trxProvider);
  }

  static async getVotersEPICList({ constituency_number_id, voterIds }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const voters = await voterModel.getVotersEPICList({ constituency_number_id, voterIds }, trxProvider);
      return voters;
    }, trxProvider);
  }

  static async getVotersByFilter({ filters = {}, constituency_number_id, account_id, sno, epic, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const voters = await voterModel.getVotersByFilter({ filters, constituency_number_id, account_id, sno, epic, page_no, limit }, trxProvider);
      return voters;
    }, trxProvider);
  }

  static async getVotersAddressListByFilter({ filters = {}, constituency_number_id, account_id, sno, epic, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const voters = await voterModel.getVotersAddressListByFilter({ filters, constituency_number_id, account_id, sno, epic, page_no, limit }, trxProvider);
      return voters;
    }, trxProvider);
  }

  static async truncateVotersAndDataCollection({ constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const voterModel = this._getVoterModel();
      const isTruncated = await voterModel.truncateVotersAndDataCollection({ constituency_number_id, account_id }, trxProvider);
      return isTruncated;
    }, trxProvider);
  }

}

module.exports = VoterManager;
