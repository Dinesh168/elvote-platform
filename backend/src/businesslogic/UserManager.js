const UsersModel = require("../models/UsersModel");
const { DB_TABLE } = require("../models/libs/dbConstants");
const { usingTxn } = require("../models/libs/dbWrappers");

class UserManager {

  static _getUsersModel() {
      return new UsersModel();
  }   

  static async upsertUser({ 
    uniqueUserId,
    name,
    mobile,
    email,
    photo,
    role,
    permissions_list,
    account_id,
    polling_station_id,
    account_approved_status,
    is_deleted  
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const user = await usersModel.upsertUser({
        uniqueUserId,
        name,
        mobile,
        email,
        photo,
        role,
        permissions_list,
        account_id,
        polling_station_id,
        account_approved_status,
        is_deleted
      }, trxProvider);
      
      return user;
    }, trxProvider);
  }

  static async getUsersCount({
    filters = {}, 
    uniqueUserId,
    email,
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const usersCount = await usersModel.getUsersCount({ 
        filters, 
        uniqueUserId,
        email,
      }, trxProvider);
      
      return usersCount;
    }, trxProvider);
  }

  static async getUsersByFilter({ 
    filters = {}, 
    uniqueUserId,
    email,
    page_no = 1, 
    limit = 50 
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const users = await usersModel.getUsersByFilter({ 
          filters, 
          uniqueUserId,
          email,
          page_no, 
          limit 
      }, trxProvider);
      
      return users;
    }, trxProvider);
  }

  static async getUsersIdsByFilter({ 
    filters = {}, 
    uniqueUserId,
    email,
    page_no = 1, 
    limit = 50 
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const users = await usersModel.getUsersIdsByFilter({ 
          filters, 
          uniqueUserId,
          email,
          page_no, 
          limit 
      }, trxProvider);
      
      return users;
    }, trxProvider);
  }

  static async getPollingStationsByUserFilter({ 
    filters = {}, 
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const users = await usersModel.getPollingStationsByUserFilter({ 
          filters, 
      }, trxProvider);
      
      return users;
    }, trxProvider);
  }

  static async getVolunteersIdNameEmailList({ 
    account_id,
    accountApproveStatus
  }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const usersModel = this._getUsersModel();
      const users = await usersModel.getVolunteersList({ 
          account_id, 
          accountApproveStatus
      }, trxProvider);
      
      return users;
    }, trxProvider);
  }

}



module.exports = UserManager;
