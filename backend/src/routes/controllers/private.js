var express = require('express');
const { successResponsePrtWrapper, prtWrapper } = require('../routeWrappers');
const { LOCAL_INFO_KEY } = require('../middleware/schemaConstants');
const { DB_TABLE, getReligionForDb, FILTERS_LIST } = require('../../models/libs/dbConstants');
const AccessPermissionError = require('../../errorhandlers/AccessPermissionError');
var router = express.Router({ mergeParams: true });
const xlsx = require('node-xlsx');
const InvalidInputError = require('../../errorhandlers/InvalidInputError');
const ConstituencyManager = require('../../businesslogic/ConstituencyManager');
const UnexpectedLogicalError = require('../../errorhandlers/UnexpectedLogicalError');
const Utility = require('../../businesslogic/Utility');
const AccountManager = require('../../businesslogic/AccountManager');
const UserManager = require('../../businesslogic/UserManager');
const DataCollectionManager = require('../../businesslogic/DataCollectionManager');
const VoterManager = require('../../businesslogic/VoterManager');
const fs = require('fs');
const path = require('path');

const validatePrivateUser = (userId) => {
  if (userId !== "2mQI4u0vulVAbzF8TkaSJdax4ol1") {
    throw new AccessPermissionError();
  }
}

router.post('/create_admin_user', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, filters } = res.locals[LOCAL_INFO_KEY];
  
  validatePrivateUser(userId);

  const { email, pass_key } = req.body;

  const accounts = await AccountManager.getAccountsByFilter({ 
    filters: { 
      [FILTERS_LIST.pass_keys]: pass_key ? [pass_key] : [] 
    } 
  });

  if (!accounts || accounts.length === 0) {
    throw new InvalidInputError("Pass Key is invalid");
  }

  await UserManager.upsertUser({
    email,
    role: DB_TABLE.USERS.COLUMNS.ROLE.VALUES.ADMIN,
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY],
    account_approved_status: DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.APPROVED
  });

}, []));

router.post('/create_account', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name } = res.locals[LOCAL_INFO_KEY];
  
  validatePrivateUser(userId);

  const { account_name, constituency_number_id, pass_key } = req.body;

  await AccountManager.addAccountAttachConstituency({
    name: account_name,
    constituency_number_id,
    passKey: pass_key
  });

}, []));

router.post('/create_constituency', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name } = res.locals[LOCAL_INFO_KEY];
  
  validatePrivateUser(userId);

  const { constituency_name, constituency_number } = req.body;

  await ConstituencyManager.upsertConstituency({
    name: Utility.capitalizeWords(constituency_name),
    constituency_number
  });

}, []));

router.post('/clear_voters_data', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name } = res.locals[LOCAL_INFO_KEY];

  validatePrivateUser(userId);

  const { pass_key } = req.body;

  const accounts = await AccountManager.getAccountsByFilter({ 
    filters: { 
      [FILTERS_LIST.pass_keys]: [pass_key]
    } 
  });

  if (!accounts || accounts.length === 0) {
    throw new InvalidInputError("Pass Key is invalid");
  }

  const constituencies = await ConstituencyManager.getConstituencyList({
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]
  });

  const alreadyAddedData = await DataCollectionManager.getDataCollectionsAll({
    constituency_number_id: constituencies[0][DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY],
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]
  });

  const voterIdsEpicList = await VoterManager.getVotersEPICList({
    constituency_number_id: constituencies[0][DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY],
    voterIds: alreadyAddedData.map(data => data[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY])
  });

  const sheetData = alreadyAddedData.map(data => {
    return [
      voterIdsEpicList.find(epic => epic[DB_TABLE.VOTERS.COLUMNS.ID.KEY] === data[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY])[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY],
      true,
      data[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY],
      data[DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY],
      data[DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY]
    ]
  })

  var buffer = xlsx.build([{name: 'mySheetName', data: sheetData}]);

  const fileName = `data_collection_${constituencies[0][DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY]}_${accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]}.xlsx`;

  fs.writeFileSync(path.join(__dirname, 'sheets', fileName), buffer);

  if (!fs.existsSync(path.join(__dirname, 'sheets', fileName))) {
    throw new InvalidInputError("Error in saving collected data");
  }

  await VoterManager.truncateVotersAndDataCollection({
    constituency_number_id: constituencies[0][DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY],
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]
  });

}, []));

// Blank or non-numeric age cells come through as "" which Postgres rejects for smallint; store NULL instead
const parseAge = (age) => {
  const value = String(age ?? '').trim();
  return /^\d+$/.test(value) && Number(value) <= 32767 ? Number(value) : null;
}

router.post('/upload_voters_data', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name } = res.locals[LOCAL_INFO_KEY];
  
  validatePrivateUser(userId);

  const { pass_key } = req.body;

  const { file } = req.files;

  const accounts = await AccountManager.getAccountsByFilter({ 
    filters: { 
      [FILTERS_LIST.pass_keys]: [pass_key]
    } 
  });

  if (!accounts || accounts.length === 0) {
    throw new InvalidInputError("Pass Key is invalid");
  }
  
  const workSheetsFromFile = xlsx.parse(file.data);

  const sheetData = workSheetsFromFile?.[0]?.data;

  if (!Array.isArray(sheetData)) {
    throw new InvalidInputError();
  }

  const partsList = {};
  const votersList = {};
  const boothStrengthList = {};
  const approachedList = {};
  let constituencyId;

  sheetData.forEach((data, index) => {
    if (index > 0) {
      const [
        constituency_number_id,
        part_no,
        sno,
        voters_name,
        relatives_name,
        relatives_relation,
        age,
        gender,
        house_no,
        epic,
        section,
        polling_station_name,
        polling_station_address,
        mobile,
        religion,
        caste,
        booth_strength,
        approached,
        opinion,
        collected_mobile
      ] = data;

      constituencyId = constituency_number_id;

      partsList[`${constituency_number_id}_${part_no}`] = {
        constituency_number_id,
        part_no,
        name: polling_station_name,
        address: polling_station_address,
      }

      boothStrengthList[`${constituency_number_id}_${part_no}`] = {
        part_no,
        booth_strength: booth_strength?.toUpperCase() === "STRONG" || booth_strength?.toUpperCase() === "S" ? "S" : (booth_strength?.toUpperCase() === "WEAK" || booth_strength?.toUpperCase() === "W" ? "W" : "M"),
      }

      if (approached === true || approached?.toLowerCase() === "true") {
        approachedList[epic] = {
          part_no,
          approached: true,
          opinion,
          collected_mobile
        }
      }

      if (!votersList?.[constituency_number_id]) {
        votersList[constituency_number_id] = [];
      }

      votersList[constituency_number_id].push({
        name: Utility.capitalizeWords(voters_name),
        relative_name: Utility.capitalizeWords(relatives_name),
        relative_relation: Utility.capitalizeWords(relatives_relation),
        epic,
        address: `${house_no ?? ''}, ${section}`,
        part_no,
        constituency_number_id,
        mobile_number: mobile,
        caste,
        religion: getReligionForDb(religion),
        sno,
        age: parseAge(age),
        gender: gender?.toUpperCase() === 'MALE' || gender?.toUpperCase() === 'M' ? 'M' : (gender?.toUpperCase() === 'FEMALE' || gender?.toUpperCase() === 'F'? 'F' : 'O'),
      })
    }
  });

  const success = await ConstituencyManager.insertPollingStationsAndVoters({
    pollingStationsList: Object.values(partsList),
    boothStrengthList: Object.values(boothStrengthList),
    votersList: votersList[constituencyId],
    constituency_number_id: constituencyId,
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY],
    approachedList
  })

  if (!success) {
    throw new UnexpectedLogicalError("Stylesheet insertion failed");
  }

}, []));


module.exports = router;
