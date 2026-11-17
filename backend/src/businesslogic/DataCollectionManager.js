const DataCollectionModel = require("../models/DataCollectionModel");
const { usingTxn } = require("../models/libs/dbWrappers");

class DataCollectionManager {

  static _getDataCollectionModel() {
      return new DataCollectionModel();
  }   

  static async upsertDataCollection({ 
    id,
    volunteer_id,
    voter_id,
    opinion,
    constituency_number_id,
    mobile_number,
    account_id,
    is_deleted,  
    is_voter_migrated
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionId = await dataCollectionModel.upsertDataCollection({
        id,
        volunteer_id,
        voter_id,
        opinion,
        constituency_number_id,
        mobile_number,
        account_id,
        is_deleted, 
        is_voter_migrated
      }, trxProvider);
      
      return dataCollectionId;
    }, trxProvider);
  }

  static async upsertLiveVoting({ 
    id,
    volunteer_id,
    voter_id,
    constituency_number_id,
    account_id,
    is_deleted,  
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const liveVotingId = await dataCollectionModel.upsertLiveVoting({
        id,
        volunteer_id,
        voter_id,
        constituency_number_id,
        account_id,
        is_deleted, 
      }, trxProvider);
      
      return liveVotingId;
    }, trxProvider);
  }

  static async getDataCollectionsAll({ constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollections = await dataCollectionModel.getDataCollectionsAll({ constituency_number_id, account_id }, trxProvider);
      return dataCollections;
    }, trxProvider);
  }

  static async getDataCollectionsByFilter({ filters = {}, constituency_number_id, account_id, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollections = await dataCollectionModel.getDataCollectionsByFilter({ filters, constituency_number_id, account_id, page_no, limit }, trxProvider);
      return dataCollections;
    }, trxProvider);
  }

  static async getLiveVotingByFilter({ filters = {}, constituency_number_id, account_id, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const liveVotings = await dataCollectionModel.getLiveVotingByFilter({ filters, constituency_number_id, account_id, page_no, limit }, trxProvider);
      return liveVotings;
    }, trxProvider);
  }

  static async getLiveVotingCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const liveVotingCount = await dataCollectionModel.getLiveVotingCount({ filters, constituency_number_id, account_id }, trxProvider);
      return liveVotingCount;
    }, trxProvider);
  }

  static async getDataCollectionsCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionCount = await dataCollectionModel.getDataCollectionsCount({ filters, constituency_number_id, account_id }, trxProvider);
      return dataCollectionCount;
    }, trxProvider);
  }

  static async getDataCollectionsPerDayCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionCount = await dataCollectionModel.getDataCollectionsPerDayCount({ filters, constituency_number_id, account_id }, trxProvider);
      return dataCollectionCount;
    }, trxProvider);
  }

  static async getDataCollectionsPerOpinionCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionCount = await dataCollectionModel.getDataCollectionsPerOpinionCount({ filters, constituency_number_id, account_id }, trxProvider);
      return dataCollectionCount;
    }, trxProvider);
  }

  static async getDataCollectionsMobileNumberCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionCount = await dataCollectionModel.getDataCollectionsMobileNumberCount({ filters, constituency_number_id, account_id }, trxProvider);
      return dataCollectionCount;
    }, trxProvider);
  }

  static async getDataCollectionsMigratoryCount({ filters = {}, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const dataCollectionModel = this._getDataCollectionModel();
      const dataCollectionCount = await dataCollectionModel.getDataCollectionsMigratoryCount({ filters, constituency_number_id, account_id }, trxProvider);
      return dataCollectionCount;
    }, trxProvider);
  }


}

module.exports = DataCollectionManager;
