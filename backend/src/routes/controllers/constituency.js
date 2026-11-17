var express = require('express');
const { prtWrapper } = require('../routeWrappers');
const { LOCAL_INFO_KEY } = require('../middleware/schemaConstants');
const { DB_TABLE, FILTERS_LIST } = require('../../models/libs/dbConstants');
const ConstituencyManager = require('../../businesslogic/ConstituencyManager');
var router = express.Router({ mergeParams: true });

router.get('/', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id, filters } = res.locals[LOCAL_INFO_KEY];

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    const pollingStation = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
    })
  
    const constituencyNumberId = pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY];

    const constituency = await ConstituencyManager.getConstituency({
      constituency_number: constituencyNumberId
    })

    res.json({constituency_list: [constituency]});
  } else {
    const constituencyList = await ConstituencyManager.getConstituencyList({ account_id })

    res.json({constituency_list: constituencyList});
  }  
}, []));

router.get('/partydata', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id, constituency_number_id, filters } = res.locals[LOCAL_INFO_KEY];

  let partyData = {
    "ballotNo": 0,
    "leaderName": '',
    "image": ''
  }

  try {
    const _partyData = require(`../../../partydata/account_${account_id}_${constituency_number_id}.json`);
    partyData = {..._partyData};
  } catch (e) {}

  res.json(partyData); 
}, []));

router.get('/polling_stations_minimal_list', prtWrapper(async (req, res, next) => {
  const { userId, email, name, role, account_id, polling_station_id, constituency_number_id, filters } = res.locals[LOCAL_INFO_KEY];

  if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {
    const pollingStation = await ConstituencyManager.getPollingStationsByFilter({
      filters: {
        [FILTERS_LIST.polling_station_ids]: [polling_station_id]
      },
    })

    const pollingStationParty = await ConstituencyManager.getPollingStationsPartyList({
      part_ids: [pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]],
      constituency_number_id,
      account_id
    })
  
    res.json({polling_stations_list: [{
      [DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY]: polling_station_id,
      [DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY]: pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY],
      [DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]: pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY],
      [DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY]: pollingStationParty.find(ps => ps[DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY] === pollingStation[0][DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY])?.[DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY]
    }]});
  } else {
    const pollingStationsList = await ConstituencyManager.getPollingStationsMinimalList({ constituency_number_id })

    const pollingStationParty = await ConstituencyManager.getPollingStationsPartyList({
      part_ids: pollingStationsList.map(ps => ps[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]),
      constituency_number_id,
      account_id
    })

    res.json({
      polling_stations_list: pollingStationsList.map(psl => {
        return {
          ...psl,
          [DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY]: pollingStationParty.find(ps => ps[DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY] === psl[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY])?.[DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY] ?? 'O'
        }
      }),
    });
  }  
}, []));

module.exports = router;
