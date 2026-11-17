var express = require('express');
const { successResponsePrtWrapper, prtWrapper } = require('../routeWrappers');
const { LOCAL_INFO_KEY } = require('../middleware/schemaConstants');
const UserManager = require('../../businesslogic/UserManager');
const { DB_TABLE, FILTERS_LIST } = require('../../models/libs/dbConstants');
const AccountManager = require('../../businesslogic/AccountManager');
const InvalidInputError = require('../../errorhandlers/InvalidInputError');
const ConstituencyManager = require('../../businesslogic/ConstituencyManager');
const InvalidRequestError = require('../../errorhandlers/InvalidRequestError');
var router = express.Router({ mergeParams: true });

router.post('/users_count', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    res.json({users_count: [{count: 1, polling_station_id }]});
  } else {
    const count = await UserManager.getUsersCount({
      filters: {
        ...filters,
        [FILTERS_LIST.account_approved_statuses]: [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.APPROVED],
        [FILTERS_LIST.account_ids]: [account_id],
        [FILTERS_LIST.volunteer_roles]: [DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER]
      }
    });

    res.json({users_count: count});
  }  
}, []));

router.post('/users_list', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, mobile, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters, page_num } = req.body;

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    const pollingStation = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id
    });
    res.json({users_list: [
      {
        [DB_TABLE.USERS.COLUMNS.ID.KEY]: id,
        [DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: userId,
        [DB_TABLE.USERS.COLUMNS.ROLE.KEY]: role,
        [DB_TABLE.USERS.COLUMNS.NAME.KEY]: name,
        [DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email,
        [DB_TABLE.USERS.COLUMNS.MOBILE.KEY]: mobile,
        [DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id,
        [DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]: polling_station_id,
        [DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY],
        [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY],
        [DB_TABLE.USERS.COLUMNS.PHOTO.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.PHOTO.KEY],
        polling_station_name: pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY],
        polling_station_part_no: pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]
      }
    ]});
  } else {
    const users = await UserManager.getUsersByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.volunteer_roles]: [DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER],
        [FILTERS_LIST.account_approved_statuses]: [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.APPROVED],
        [FILTERS_LIST.account_ids]: [account_id]
      },
      page_no: page_num
    });

    const pollingStations = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        [FILTERS_LIST.polling_station_ids]: users.map(user => user[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY])
      },
      constituency_number_id
    });

    res.json({users_list: users.map(user => ({
      ...user,
      ...Object.fromEntries(Object.entries((pollingStations.find(pollingStation => pollingStation[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY] === user[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]) ?? {})).map(([key, value]) => [`polling_station_${key}`, value]))
    }))});
  }  
}, []));

router.get('/volunteers_list', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, mobile, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    res.json({volunteers_list: [
      {
        [DB_TABLE.USERS.COLUMNS.ID.KEY]: id,
        [DB_TABLE.USERS.COLUMNS.NAME.KEY]: name,
        [DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email,
        [DB_TABLE.USERS.COLUMNS.MOBILE.KEY]: mobile,
        [DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: userId
      }
    ]});
  } else {
    const users = await UserManager.getVolunteersIdNameEmailList({
      account_id,
    });

    res.json({volunteers_list: users });
  }  
}, []));

router.get('/volunteers_list_to_approve', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    throw new InvalidRequestError();
  } else {
    const users = await UserManager.getVolunteersIdNameEmailList({
      account_id,
      accountApproveStatus: DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.PENDING,
    });

    res.json({volunteers_list: users });
  }  
}, []));

router.get('/volunteers_list_rejected', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    throw new InvalidRequestError();
  } else {
    const users = await UserManager.getVolunteersIdNameEmailList({
      accountApproveStatus: DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.REJECTED,
    });

    res.json({volunteers_list: users });
  }  
}, []));

router.get('/mine', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, mobile, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  res.json({
    [DB_TABLE.USERS.COLUMNS.ID.KEY]: id,
    [DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: userId,
    [DB_TABLE.USERS.COLUMNS.ROLE.KEY]: role,
    [DB_TABLE.USERS.COLUMNS.NAME.KEY]: name,
    [DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email,
    [DB_TABLE.USERS.COLUMNS.MOBILE.KEY]: mobile,
    [DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id,
    [DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]: polling_station_id,
    [DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY],
    [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY],
    [DB_TABLE.USERS.COLUMNS.PHOTO.KEY]: res.locals[LOCAL_INFO_KEY][DB_TABLE.USERS.COLUMNS.PHOTO.KEY],
  });
}, []));

router.post('/mine', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name, filters } = res.locals[LOCAL_INFO_KEY];

  const { name: updatedName, passKey, mobile } = req.body;


  const accounts = passKey && passKey.length > 0 
                  ? await AccountManager.getAccountsByFilter({ filters: { [FILTERS_LIST.pass_keys]: passKey ? [passKey] : [] } })
                  : null;

  if (!updatedName || updatedName.length === 0 
      || !mobile || mobile.length < 10 
      || !passKey || passKey.length === 0 
      || !accounts || accounts.length === 0
    ) {
    throw new InvalidInputError(new Error(), null, {
      ...(!updatedName || updatedName.length === 0 ? {name: 'Name field is required'} : {}),
      ...(!passKey || passKey.length === 0 ? {passKey: 'Pass Key field is required'} : {}),
      ...(!accounts || accounts.length === 0 ? {passKey: 'Pass Key is wrong'} : {}),
      ...(!mobile || mobile.length < 10 ? {mobile: 'Mobile is wrong'} : {})
    })
  }

  await UserManager.upsertUser({
    uniqueUserId: userId,
    name: updatedName,
    mobile,
    email,
    role: DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER,
    permissions_list: {"1": "1"},
    account_id: accounts[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY],
  })
}, []));

router.post('/update_user_approve_status', successResponsePrtWrapper(async (req, res, next) => {
  const { userId, email, name, role, filters } = res.locals[LOCAL_INFO_KEY];

  const { uniqueId, pollingStationId } = req.body;

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    throw new InvalidRequestError();
  }

  await UserManager.upsertUser({
    uniqueUserId: uniqueId,
    account_approved_status: pollingStationId ? DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.APPROVED : DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.REJECTED,
    polling_station_id: pollingStationId
  })
}, []));

module.exports = router;
