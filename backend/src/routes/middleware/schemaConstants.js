const BASE_ROUTE='/api'

const USERS_ROUTE='/users';
const PRIVATE_ROUTE='/private';
const VOTERS_ROUTE='/voters';
const CONSTITUENCY_ROUTE='/constituency';

const ID_TOKEN_HEADER = 'idtoken';
const USER_INFO_KEY = 'userInformation';
const SESSION_INFO_COOKIE = 'px_session_info';
const LOCAL_INFO_KEY = 'localInfoKey';

const RESPONSE_STATUS = {
	KEY: "status",
	VALUES: {
			SUCCESS: {
					KEY: "success",
					CODE: 200
			}
	}
} 


module.exports = {
  BASE_ROUTE,
  USERS_ROUTE,
  PRIVATE_ROUTE,
  VOTERS_ROUTE,
  CONSTITUENCY_ROUTE,
  ID_TOKEN_HEADER,
  USER_INFO_KEY,
  SESSION_INFO_COOKIE,
  LOCAL_INFO_KEY,
  RESPONSE_STATUS
};
