const PUBLIC_SCHEMA = "public";

const FIELD_TYPE = {
    STRING: "string",
    INTEGER: "integer",
    DOUBLE: "double",
    BOOLEAN: "boolean",
    JSONB: "jsonb",
    DATE: "date",
    DATETIME: "date-time"
}

const getVotersTableName = ({ constituency_number_id }) => {
    return `${DB_TABLE.VOTERS.TABLE_NAME}_${constituency_number_id}`;
}

const getDataCollectionTableName = ({ constituency_number_id, account_id }) => {
    return `${DB_TABLE.DATA_COLLECTION.TABLE_NAME}_${constituency_number_id}_${account_id}`;
}

const getLiveVotingTableName = ({ constituency_number_id, account_id }) => {
    return `${DB_TABLE.LIVE_VOTING.TABLE_NAME}_${constituency_number_id}_${account_id}`;
}

const getPollingStationPartyTableName = ({ constituency_number_id, account_id }) => {
    return `${DB_TABLE.POLLING_STATION_FOR_PARTY.TABLE_NAME}_${constituency_number_id}_${account_id}`;
}

const getReligionForDb = (religion) => {
    if (!religion || religion.length === 0) return undefined;

    switch(religion.toLowerCase()) {
        case 'hindu':
            return DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES.HINDU;
        case 'muslim':
            return DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES.MUSLIM;
        case 'sikh':
            return DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES.SIKH;
        case 'christian':
            return DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES.CHRISTIAN;
        default:
            return DB_TABLE.VOTERS.COLUMNS.RELIGION.VALUES.OTHERS;
    }
}

const FILTERS_LIST = {
    sno: 'sno',
    from_epoch: 'from_epoch',
    to_epoch: 'to_epoch',
    polling_station_ids: 'polling_station_ids',
    account_approved_statuses: 'account_approved_statuses',
    voter_ids: 'voter_ids',
    voter_name: 'voter_name',
    voter_epic: 'voter_epic',
    voter_address: 'voter_address',
    from_voter_age: 'from_voter_age',
    to_voter_age: 'to_voter_age',
    voter_genders: 'voter_genders',
    is_voter_voted: 'is_voter_voted',
    is_voter_mobile_number: 'is_voter_mobile_number',
    voter_castes: 'voter_castes',
    voter_religions: 'voter_religions',
    volunteer_ids: 'volunteer_ids',
    volunteer_name: 'volunteer_name',
    volunteer_roles: 'volunteer_roles',
    voter_opinions: 'voter_opinions',
    part_nos: 'part_nos',
    polling_station_name: 'polling_station_name',
    account_ids: 'account_ids',
    pass_keys: 'pass_keys',
    account_name: 'account_name',
    data_collection_ids: 'data_collection_ids',
    list_type: 'list_type',
    is_voter_migrated: 'is_voter_migrated',
    is_voter_approached: 'is_voter_approached',
}

const LIST_TYPE = {
    TOTAL_VOTERS: 'TOTAL_VOTERS',
    APPROACHED_VOTERS: 'APPROACHED_VOTERS'
}

const DB_TABLE = {
    USERS: {
        TABLE_NAME: "users",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            UNIQUE_ID: {
                KEY: "unique_id",
                TYPE: FIELD_TYPE.STRING,
                IS_UNIQUE: true
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            EMAIL: {
                KEY: "email",
                TYPE: FIELD_TYPE.STRING,
                IS_UNIQUE: true
            },
            MOBILE: {
                KEY: "mobile",
                TYPE: FIELD_TYPE.STRING,
                IS_UNIQUE: true
            },
            PHOTO: {
                KEY: "photo",
                TYPE: FIELD_TYPE.STRING
            },
            ROLE: {
                KEY: "role",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    DEFAULT: "volunteer",
                    VOLUNTEER: "volunteer",
                    ADMIN: "admin",
                }
            },
            PERMISSIONS_LIST: {
                KEY: "permissions_list",
                TYPE: FIELD_TYPE.JSONB
            },
            OTHER_DATA: {
                KEY: "other_data",
                TYPE: FIELD_TYPE.JSONB
            },
            ACCOUNT_ID: {
                KEY: "account_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            POLLING_STATION_ID: {
                KEY: "polling_station_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ACCOUNT_APPROVED_STATUS: {
                KEY: "account_approved_status",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    DEFAULT: 'pending',
                    PENDING: 'pending',
                    APPROVED: 'approved',
                    REJECTED: 'rejected'
                }
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        },
    },
    ACCOUNTS: {
        TABLE_NAME: "accounts",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            OTHER_DATA: {
                KEY: "other_data",
                TYPE: FIELD_TYPE.JSONB
            },
            PASS_KEY: {
                KEY: "pass_key",
                TYPE: FIELD_TYPE.STRING,
                IS_UNIQUE: true,
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    DISTRICT: {
        TABLE_NAME: "district",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            STATE_CODE: {
                KEY: "state_code",
                TYPE: FIELD_TYPE.STRING
            },
            DISTRICT_CODE: {
                KEY: "district_code",
                TYPE: FIELD_TYPE.STRING
            },
            OTHER_DATA: {
                KEY: "other_data",
                TYPE: FIELD_TYPE.JSONB
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    ZONES: {
        TABLE_NAME: "zones",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            OTHER_DATA: {
                KEY: "other_data",
                TYPE: FIELD_TYPE.JSONB
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ACCOUNT_ID: {
                KEY: "account_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    CONSTITUENCY: {
        TABLE_NAME: "constituency",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            CONSTITUENCY_NUMBER: {
                KEY: "constituency_number",
                TYPE: FIELD_TYPE.INTEGER,
            },
            DISTRICT_CODE: {
                KEY: "district_code",
                TYPE: FIELD_TYPE.STRING,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            OTHER_DATA: {
                KEY: "other_data",
                TYPE: FIELD_TYPE.JSONB
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    CONSTITUENCY_ACCOUNT_MAPPING: {
        TABLE_NAME: "constituency_account_mapping",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ACCOUNT_ID: {
                KEY: "account_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    POLLING_STATION_ZONE_MAPPING: {
        TABLE_NAME: "polling_station_zone_mapping",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            POLLING_STATION_ID: {
                KEY: "polling_station_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ZONE_ID: {
                KEY: "zone_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    PERMISSIONS: {
        TABLE_NAME: "permissions",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING
            },
            TYPE: {
                KEY: "type",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    DEFAULT: "normal",
                    NORMAL: "normal",
                    PRIVATE: "private"
                }
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    PERMISSIONS_TEMPLATE: {
        TABLE_NAME: "permissions_template",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    DEFAULT: "volunteer",
                    VOLUNTEER: "volunteer",
                    ADMIN: "admin",
                }
            },
            PERMISSIONS_LIST: {
                KEY: "permissions_list",
                TYPE: FIELD_TYPE.JSONB
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    POLLING_STATION: {
        TABLE_NAME: "polling_station",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING,
            },
            PART_NO: {
                KEY: "part_no",
                TYPE: FIELD_TYPE.INTEGER
            },
            ADDRESS: {
                KEY: "address",
                TYPE: FIELD_TYPE.STRING
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    VOTERS: {
        TABLE_NAME: "voters",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            SNO: {
                KEY: "sno",
                TYPE: FIELD_TYPE.INTEGER,
            },
            NAME: {
                KEY: "name",
                TYPE: FIELD_TYPE.STRING,
            },
            AGE: {
                KEY: "age",
                TYPE: FIELD_TYPE.INTEGER,
            },
            GENDER: {
                KEY: "gender",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    MALE: "M",
                    FEMALE: "F",
                    OTHERS: "O"
                }
            },
            RELATIVE_NAME: {
                KEY: "relative_name",
                TYPE: FIELD_TYPE.STRING,
            },
            RELATIVE_RELATION: {
                KEY: "relative_relation",
                TYPE: FIELD_TYPE.STRING,
            },
            EPIC: {
                KEY: "epic",
                TYPE: FIELD_TYPE.STRING,
                IS_UNIQUE: true
            },
            ADDRESS: {
                KEY: "address",
                TYPE: FIELD_TYPE.STRING
            },
            PART_NO: {
                KEY: "part_no",
                TYPE: FIELD_TYPE.INTEGER
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            MOBILE_NUMBER: {
                KEY: "mobile_number",
                TYPE: FIELD_TYPE.STRING
            },
            CASTE: {
                KEY: "caste",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    GENERAL: 'General', 
                    OBC: 'OBC', 
                    SC_ST: 'SC/ST'
                }
            },
            RELIGION: {
                KEY: "religion",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    HINDU: "H",
                    MUSLIM: "M",
                    SIKH: "S",
                    CHRISTIAN: "C",
                    OTHERS: "O"
                }
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    DATA_COLLECTION: {
        TABLE_NAME: "data_collection",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            VOLUNTEER_ID: {
                KEY: "volunteer_id",
                TYPE: FIELD_TYPE.INTEGER,
            },
            VOTER_ID: {
                KEY: "voter_id",
                TYPE: FIELD_TYPE.INTEGER,
            },
            OPINION: {
                KEY: "opinion",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    POSITIVE: 'P',
                    NEGATIVE: 'N',
                    UNDECIDED: 'U',
                    OTHER: 'O'
                }
            },
            MOBILE_NUMBER: {
                KEY: "mobile_number",
                TYPE: FIELD_TYPE.STRING
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ACCOUNT_ID: {
                KEY: "account_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_VOTER_MIGRATED: {
                KEY: "is_voter_migrated",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    LIVE_VOTING: {
        TABLE_NAME: "live_voting",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            VOLUNTEER_ID: {
                KEY: "volunteer_id",
                TYPE: FIELD_TYPE.INTEGER,
            },
            VOTER_ID: {
                KEY: "voter_id",
                TYPE: FIELD_TYPE.INTEGER,
            },
            CONSTITUENCY_NUMBER_ID: {
                KEY: "constituency_number_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            ACCOUNT_ID: {
                KEY: "account_id",
                TYPE: FIELD_TYPE.INTEGER
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
    POLLING_STATION_FOR_PARTY: {
        TABLE_NAME: "polling_station_for_party",
        COLUMNS: {
            ID: {
                KEY: "id",
                TYPE: FIELD_TYPE.INTEGER,
                IS_PRIMARY: true,
            },
            PART_NO: {
                KEY: "part_no",
                TYPE: FIELD_TYPE.INTEGER
            },
            BOOTH_STRENGTH: {
                KEY: "booth_strength",
                TYPE: FIELD_TYPE.STRING,
                VALUES: {
                    STRONG: 'S',
                    MODERATE: 'M',
                    WEAK: 'W'
                }
            },
            IS_DELETED: {
                KEY: "is_deleted",
                TYPE: FIELD_TYPE.BOOLEAN,
                DEFAULT: false,
            },
            CREATED_AT: {
                KEY: "created_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
            UPDATED_AT: {
                KEY: "updated_at",
                TYPE: FIELD_TYPE.DATETIME,
            },
        }
    },
};

module.exports = {
    PUBLIC_SCHEMA,
    DB_TABLE,
    FILTERS_LIST,
    LIST_TYPE,
    getVotersTableName,
    getReligionForDb,
    getDataCollectionTableName,
    getLiveVotingTableName,
    getPollingStationPartyTableName,
};
