const ConstituencyModel = require("../models/ConstituencyModel");
const { DB_TABLE } = require("../models/libs/dbConstants");
const { usingTxn } = require("../models/libs/dbWrappers");

class ConstituencyManager {

  static _getConstituencyModel() {
      return new ConstituencyModel();
  }   

  static async getConstituency({ constituency_number }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const constituency = await constituencyModel.getConstituency({constituency_number}, trxProvider);
      return constituency;
    }, trxProvider);
  }

  static async getConstituencyList({ account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const constituencyList = await constituencyModel.getConstituencyList({account_id}, trxProvider);
      return constituencyList;
    }, trxProvider);
  }

  static async getPollingStationsByFilter({ filters = {}, constituency_number_id, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const pollingStations = await constituencyModel.getPollingStationsByFilter({ filters, constituency_number_id, page_no, limit }, trxProvider);
      return pollingStations;
    }, trxProvider);
  }

  static async getPollingStationsMinimalList({ filters, constituency_number_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const pollingStations = await constituencyModel.getPollingStationsMinimalList({ filters, constituency_number_id }, trxProvider);
      return pollingStations;
    }, trxProvider);
  }

  static async getPollingStationsPartyList({ part_ids, constituency_number_id, account_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const pollingStationsParty = await constituencyModel.getPollingStationsPartyList({
        part_ids,
        constituency_number_id,
        account_id
      })
      return pollingStationsParty;
    }, trxProvider);
  }

  static async upsertPollingStation({ 
    id, 
    name, 
    part_no,
    address,
    constituency_number_id, 
    is_deleted  
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const pollingStationId = await constituencyModel.upsertPollingStation({
        id, 
        name, 
        part_no,
        address,
        constituency_number_id, 
        is_deleted  
      }, trxProvider);
      
      return pollingStationId;
    }, trxProvider);
  }

  static async upsertConstituency({ name, constituency_number, other_data, is_deleted }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const constituencyId = await constituencyModel.upsertConstituency({
        name, 
        constituency_number, 
        other_data, 
        is_deleted
      }, trxProvider);
      
      return constituencyId;
    }, trxProvider);
  }

  static async insertPollingStations(pollingStationsList, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const success = await constituencyModel.insertPollingStations(pollingStationsList, trxProvider);
      
      return success;
    }, trxProvider);
  }

  static async insertPollingStationsAndVoters({pollingStationsList, boothStrengthList, account_id, votersList, constituency_number_id, approachedList}, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const constituencyModel = this._getConstituencyModel();
      const success = await constituencyModel.insertPollingStationsAndVoters({pollingStationsList, boothStrengthList, account_id, votersList, constituency_number_id, approachedList}, trxProvider);
      
      return success;
    }, trxProvider);
  }

}

module.exports = ConstituencyManager;
