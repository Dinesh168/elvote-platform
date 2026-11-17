const AccountsModel = require("../models/AccountsModel");
const UsersModel = require("../models/UsersModel");
const { usingTxn } = require("../models/libs/dbWrappers");

class AccountManager {

  static _getAccountsModel() {
      return new AccountsModel();
  }   

  static async getAccountsByFilter({ filters = {}, page_no = 1, limit = 50 }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const accountsModel = this._getAccountsModel();
      const accounts = await accountsModel.getAccountsByFilter({ filters, page_no, limit }, trxProvider);
      return accounts;
    }, trxProvider);
  }

  static async addAccountAttachConstituency({ name, passKey, constituency_number_id }, trxProvider) {
    return await usingTxn(async (trxProvider) => {
      const accountsModel = this._getAccountsModel();
      const account = await accountsModel.upsertAccount({name, passKey, constituency_number_id}, trxProvider);
      return account;
    }, trxProvider);
  }

}

module.exports = AccountManager;
