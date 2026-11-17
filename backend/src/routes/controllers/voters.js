var express = require('express');
const { successResponsePrtWrapper, prtWrapper } = require('../routeWrappers');
const { LOCAL_INFO_KEY } = require('../middleware/schemaConstants');
const { DB_TABLE, FILTERS_LIST } = require('../../models/libs/dbConstants');
const VoterManager = require('../../businesslogic/VoterManager');
const DataCollectionManager = require('../../businesslogic/DataCollectionManager');
const ConstituencyManager = require('../../businesslogic/ConstituencyManager');
const UserManager = require('../../businesslogic/UserManager');
var router = express.Router({ mergeParams: true });

router.get('/castes_list', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

    
  res.json({castes_list: Object.values(DB_TABLE.VOTERS.COLUMNS.CASTE.VALUES)});
}, []));

router.get('/religions_list', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

    
  res.json({religions_list: Object.values(DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES)});
}, []));

router.post('/voters_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id, polling_station_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  console.log("/voters_count");
  
  let votersCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersCount = await VoterManager.getVotersCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id,
      account_id
    })
  } else {
    votersCount = await VoterManager.getVotersCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
    
  } 

  const pollingStations = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: votersCount.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })
  
  res.json({voters_count: votersCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStations.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY],
  }))});
}, []));

router.post('/voters_count_by_address', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id, polling_station_id } = res.locals[LOCAL_INFO_KEY];

  const { filters, page_num } = req.body;

  console.log("/voters_count_by_address");

  let votersCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersCount = await VoterManager.getVotersCountByAddress({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id,
      account_id,
      page_no: page_num
    })
  } else {
    votersCount = await VoterManager.getVotersCountByAddress({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id,
      page_no: page_num
    })
  } 

  res.json({voters_count: votersCount});
}, []));

router.post('/voters_address_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id, polling_station_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  console.log("/voters_address_count");

  let addressCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    addressCount = await VoterManager.getAddressCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id,
      account_id
    })
  } else {
    addressCount = await VoterManager.getAddressCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
  } 

  const pollingStations = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: addressCount.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })

  res.json({address_count: addressCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStations.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY],
  }))});
}, []));

router.post('/voters_voted_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  console.log("/voters_voted_count");
  
  let votersCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.ADMIN) {
    console.log("admin");
    votersCount = await DataCollectionManager.getLiveVotingCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
    
  }
  
  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersCount.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })
  
  res.json({voters_count: votersCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]
  }))});
  
}, []));

router.post('/voters_approached_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  console.log("/voters_approached_count");
  
  let votersCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    console.log("volunteer");
    votersCount = await DataCollectionManager.getDataCollectionsCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        [FILTERS_LIST.volunteer_ids]: [id]
      },
      constituency_number_id,
      account_id
    })
  } else {
    console.log("admin");
    votersCount = await DataCollectionManager.getDataCollectionsCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch,
        // [FILTERS_LIST.to_epoch]: to_epoch,
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
    
  }
  
  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersCount.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })
  
  res.json({voters_count: votersCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]
  }))});
  
}, []));

router.post('/voters_approached_count_daywise', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersCount = await DataCollectionManager.getDataCollectionsPerDayCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id
    })
  } else {
    votersCount = await DataCollectionManager.getDataCollectionsPerDayCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
    
  } 

  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersCount.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })
  
  res.json({voters_count_daywise: votersCount.reduce((acc, curr) => { 
    const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === curr[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY];
    if (!acc?.[curr.day]) {
      acc[curr.day] = {}
    }
    if (!acc[curr.day]?.[pollingStationId]) {
      acc[curr.day][pollingStationId] = 0
    }
    acc[curr.day][pollingStationId] += parseInt(curr.count);
    return acc;
  }, {})});
}, []));

router.post('/voters_age_count_group', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersGroup;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.AGE.KEY
    })
  } else {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.AGE.KEY
    })
    
  } 

  const pollingStationsIds = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: votersGroup.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })
  
  res.json({voters_age_count_group: votersGroup.reduce((acc, curr) => { 
    if (curr[DB_TABLE.VOTERS.COLUMNS.AGE.KEY] !== null) {
      const age = curr[DB_TABLE.VOTERS.COLUMNS.AGE.KEY];
      const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === curr[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY];
      
      let ageRange = '';
      if (age >= 18 && age <= 35) {
        ageRange = '18 - 35';
      } else if (age >= 36 && age <= 55) {
        ageRange = '36 - 55';
      } else if (age >= 56) {
        ageRange = '56+';
      }

      if (!acc?.[ageRange]) {
        acc[ageRange] = {}
      }
      if (!acc[ageRange]?.[pollingStationId]) {
        acc[ageRange][pollingStationId] = 0
      }
      acc[ageRange][pollingStationId] += parseInt(curr.count);
    }
    return acc;
  }, {
    '18 - 35': {"0": 0},
    '36 - 55': {"0": 0},
    '56+': {"0": 0}
  })});
  
}, []));

router.post('/voters_religion_count_group', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersGroup;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY
    })
  } else {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY
    })
    
  } 

  const pollingStationsIds = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: votersGroup.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })
  
  res.json({voters_religion_count_group: votersGroup.reduce((acc, curr) => { 
    if (curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY] !== null) {
      const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === curr[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY];
      if (!acc?.[curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]] = {}
      }
      if (!acc[curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]]?.[pollingStationId]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]][pollingStationId] = 0
      }
      acc[curr[DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]][pollingStationId] += parseInt(curr.count);
    }
    return acc;
  }, Object.values(DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES).reduce((acc, curr) => {
    acc[curr] = {"0": 0};
    return acc;
  }, {}))});

}, []));

router.post('/voters_caste_count_group', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersGroup;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.CASTE.KEY
    })
  } else {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.CASTE.KEY
    })
    
  } 

  const pollingStationsIds = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: votersGroup.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })
  
  res.json({voters_caste_count_group: votersGroup.reduce((acc, curr) => { 
    if (curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY] !== null) {
      const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === curr[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY];
      if (!acc?.[curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]] = {}
      }
      if (!acc[curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]]?.[pollingStationId]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]][pollingStationId] = 0
      }
      acc[curr[DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]][pollingStationId] += parseInt(curr.count);
    }
    return acc;
  }, {'Others': {"0": 0}})});
  
}, []));

router.post('/voters_gender_count_group', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersGroup;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.GENDER.KEY
    })
  } else {
    votersGroup = await VoterManager.getVotersCountPerGroup({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id,
      column_name: DB_TABLE.VOTERS.COLUMNS.GENDER.KEY
    })
    
  } 

  const pollingStationsIds = await ConstituencyManager.getPollingStationsMinimalList({
    filters: {
      [FILTERS_LIST.part_nos]: votersGroup.map(vc => vc[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id,
  })
  
  res.json({voters_gender_count_group: votersGroup.reduce((acc, curr) => { 
    if (curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY] !== null) {
      const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === curr[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY];
      if (!acc?.[curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]] = {}
      }
      if (!acc[curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]]?.[pollingStationId]) {
        acc[curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]][pollingStationId] = 0
      }
      acc[curr[DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]][pollingStationId] += parseInt(curr.count);
    }
    return acc;
  }, Object.values(DB_TABLE.VOTERS.COLUMNS.GENDER.VALUES).reduce((acc, curr) => {
    acc[curr] = {"0": 0};
    return acc;
  }, {}))});
  
}, []));

router.post('/voters_opinion', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;
  
  let votersOpinions;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersOpinions = await DataCollectionManager.getDataCollectionsPerOpinionCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id
    })
  } else {
    votersOpinions = await DataCollectionManager.getDataCollectionsPerOpinionCount({
      filters: { 
        ...filters,
        // [FILTERS_LIST.from_epoch]: from_epoch, 
        // [FILTERS_LIST.to_epoch]: to_epoch, 
        // [FILTERS_LIST.volunteer_ids]: volunteer_ids
      },
      constituency_number_id,
      account_id
    })
    
  } 

  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersOpinions.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })
  
  res.json({voters_opinion: votersOpinions.reduce((acc, curr) => { 
    if (curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY] !== DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES.OTHER) {
      const pollingStationId = pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === curr[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY];
      if (!acc?.[curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]]) {
        acc[curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]] = {}
      }
      if (!acc[curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]]?.[pollingStationId]) {
        acc[curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]][pollingStationId] = 0
      }
      acc[curr[DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]][pollingStationId] += parseInt(curr.count);
    }
    return acc;
  }, Object.values(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES).reduce((acc, curr) => {
    if (curr !== DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES.OTHER) {
      acc[curr] = {"0": 0};
    }
    return acc;
  }, {}))});
}, []));

router.post('/voters_mobile_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  let votersMobileCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersMobileCount = await DataCollectionManager.getDataCollectionsMobileNumberCount({
      filters: { 
        ...filters,
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id
    })
  } else {
    votersMobileCount = await DataCollectionManager.getDataCollectionsMobileNumberCount({
      filters: { 
        ...filters
      },
      constituency_number_id,
      account_id
    })
    
  }
  
  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersMobileCount.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })
  
  res.json({mobile_count: votersMobileCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]
  }))});
  
}, []));

router.post('/voters_migratory_count', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  let votersMigratoryCount;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    votersMigratoryCount = await DataCollectionManager.getDataCollectionsMigratoryCount({
      filters: { 
        ...filters,
        [FILTERS_LIST.volunteer_ids]: [id] 
      },
      constituency_number_id,
      account_id
    })
  } else {
    votersMigratoryCount = await DataCollectionManager.getDataCollectionsMigratoryCount({
      filters: { 
        ...filters
      },
      constituency_number_id,
      account_id
    })
    
  }
  
  const pollingStationsIds = await UserManager.getPollingStationsByUserFilter({
    filters: {
      [FILTERS_LIST.volunteer_ids]: votersMigratoryCount.map(vc => vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])
    },
    constituency_number_id
  })

  res.json({migratory_count: votersMigratoryCount.map(vc => ({
    count: vc.count,
    polling_station_id: pollingStationsIds.find(ps => ps[DB_TABLE.USERS.COLUMNS.ID.KEY] === vc[DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY])[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]
  }))});
  
}, []));

router.post('/set_voter_approached', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { voter_id } = req.body;

  const dataCollectionId = await DataCollectionManager.upsertDataCollection({
    volunteer_id: id,
    voter_id,
    constituency_number_id,
    account_id
  })

  res.json({data_collection_id: dataCollectionId})
}, []));

router.post('/set_voter_voted', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { voter_id } = req.body;

  const liveVotingId = await DataCollectionManager.upsertLiveVoting({
    volunteer_id: id,
    voter_id,
    constituency_number_id,
    account_id
  })

  res.json({live_voting_id: liveVotingId})
}, []));

router.post('/set_voter_mobile', successResponsePrtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { voter_id, mobile_number } = req.body;

  const dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
    filters: {
      [FILTERS_LIST.voter_ids]: [voter_id]
    },
    constituency_number_id,
    account_id
  });

  if (dataCollection?.[0]) {
    await DataCollectionManager.upsertDataCollection({
      id: dataCollection[0][DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY],
      mobile_number,
      constituency_number_id,
      account_id
    })
  }
  
}, []));

router.post('/set_voter_migratory_status', successResponsePrtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { voter_id, is_voter_migrated } = req.body;

  const dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
    filters: {
      [FILTERS_LIST.voter_ids]: [voter_id]
    },
    constituency_number_id,
    account_id
  });

  if (dataCollection?.[0]) {
    await DataCollectionManager.upsertDataCollection({
      id: dataCollection[0][DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY],
      is_voter_migrated,
      constituency_number_id,
      account_id
    })
  }
  
}, []));

router.post('/set_voter_opinion', successResponsePrtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { voter_id, opinion } = req.body;

  const dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
    filters: {
      [FILTERS_LIST.voter_ids]: [voter_id]
    },
    constituency_number_id,
    account_id
  });

  if (dataCollection?.[0]) {
    await DataCollectionManager.upsertDataCollection({
      id: dataCollection[0][DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY],
      opinion,
      constituency_number_id,
      account_id
    })
  }
  
}, []));

router.post('/search_voter', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters } = req.body;

  let votersList;
  
  votersList = await VoterManager.getVotersByFilter({
    filters: {
      ...filters
    },
    constituency_number_id,
    account_id,
  })

  const pollingStationData = await ConstituencyManager.getPollingStationsByFilter({
    filters: {
      [FILTERS_LIST.part_nos]: votersList.map(voter => voter[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY])
    },
    constituency_number_id
  });
  
  const dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
    filters: {
      [FILTERS_LIST.voter_ids]: votersList.map(voter => voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY])
    },
    constituency_number_id: constituency_number_id,
    account_id
  })

  res.json({voters_list: votersList.map(voter => ({
    ...voter,
    ...Object.fromEntries(Object.entries((pollingStationData.find(psd => psd[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY]) ?? {})).map(([key, value]) => [`polling_station_${key}`, value])),
    "data_collection_id": null,
    "data_collection_opinion": null,
    "data_collection_mobile_number": null,
    ...Object.fromEntries(Object.entries((dataCollection.find(dC => dC[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY]) ?? {})).map(([key, value]) => [`data_collection_${key}`, value]))
  }))});

}, []));


router.post('/voters_list', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters, page_num, is_live_voting=false } = req.body;

  let votersList;
  let pollingStations;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    pollingStations = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id,
    });

    votersList = await VoterManager.getVotersByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.part_nos]: [pollingStations[0][DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]]
      },
      constituency_number_id: constituency_number_id,
      account_id,
      page_no: page_num
    })
  } else {
    console.log({filters});
    pollingStations = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        ...filters,
      },
      constituency_number_id,
    });

    votersList = await VoterManager.getVotersByFilter({
      filters: {
        ...filters
      },
      constituency_number_id: constituency_number_id,
      account_id,
      page_no: page_num
    })
  }  

  const dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
    filters: {
      ...filters,
      [FILTERS_LIST.voter_ids]: votersList.map(voter => voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY])
    },
    constituency_number_id: constituency_number_id,
    account_id
  })

  let liveVotingUsers = [];

  if (is_live_voting) {
    liveVotingUsers = await DataCollectionManager.getLiveVotingByFilter({
      filters: {
        [FILTERS_LIST.voter_ids]: votersList.map(voter => voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY])
      },
      constituency_number_id: constituency_number_id,
      account_id
    })
  }

  res.json({voters_list: votersList.map(voter => ({
    ...voter,
    ...Object.fromEntries(Object.entries((pollingStations.find(psd => psd[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY]) ?? {})).map(([key, value]) => [`polling_station_${key}`, value])),
    "data_collection_id": null,
    "data_collection_opinion": null,
    "data_collection_mobile_number": null,
    "live_voting_id": null,
    ...Object.fromEntries(Object.entries((dataCollection.find(dC => dC[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY]) ?? {})).map(([key, value]) => [`data_collection_${key}`, value])),
    ...Object.fromEntries(Object.entries((liveVotingUsers.find(dC => dC[DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY]) ?? {})).map(([key, value]) => [`live_voting_${key}`, value]))
  }))});

}, []));

router.post('/voters_approached_list', prtWrapper(async (req, res, next) => {
  const { id, userId, email, name, role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];

  const { filters, page_num } = req.body;

  let dataCollection;
  let pollingStations;
  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    pollingStations = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
      constituency_number_id,
    });

    dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.volunteer_ids]: [id]
      },
      constituency_number_id: constituency_number_id,
      account_id,
      page_no: page_num
    })
  } else {
    const usersIdsList = await UserManager.getUsersIdsByFilter({
      filters: {
        ...filters
      }
    })

    pollingStations = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        ...filters,
      },
      constituency_number_id,
    });

    dataCollection = await DataCollectionManager.getDataCollectionsByFilter({
      filters: {
        ...filters,
        [FILTERS_LIST.volunteer_ids]: usersIdsList.map(uL => uL[DB_TABLE.USERS.COLUMNS.ID.KEY])
      },
      constituency_number_id: constituency_number_id,
      account_id,
      page_no: page_num
    })
  }  

  const dC = dataCollection.map(dC => dC[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY]);

  const votersList = await VoterManager.getVotersByFilter({
    filters: {
      ...filters,
      [FILTERS_LIST.voter_ids]: dC.length === 0 ? [0] : dC
    },
    constituency_number_id: constituency_number_id,
    account_id
  })

  res.json({voters_list: votersList.map(voter => ({
    ...voter,
    ...Object.fromEntries(Object.entries((pollingStations.find(psd => psd[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY]) ?? {})).map(([key, value]) => [`polling_station_${key}`, value])),
    ...Object.fromEntries(Object.entries((dataCollection.find(dC => dC[DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY] === voter[DB_TABLE.VOTERS.COLUMNS.ID.KEY]) ?? {})).map(([key, value]) => [`data_collection_${key}`, value]))
  }))});

}, []));

module.exports = router;
