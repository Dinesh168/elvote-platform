# Glossary

Domain terms from Indian elections and campaign work, as used in the code and UI.

| Term | Meaning | In code |
|---|---|---|
| **AC (Assembly Constituency)** | State-legislature electoral district; the unit a campaign manages | `constituency`, `constituency_number`, header `x-constituency`, `ACOverview` |
| **Polling station / Booth** | Place where a group of voters votes. Each covers one roll *part* | `polling_station_id`, `PollingStation*` |
| **Part / Part No.** | Section of the electoral roll mapped to one polling station | `part_no`, `part_nos` |
| **S.No.** | Voter's serial number within a part | `sno` |
| **EPIC** | Electors Photo Identity Card number (voter ID) | `epic`, `voter_epic` |
| **Electoral roll** | Official voter list, imported here as XLSX | `private/upload_voters_data` |
| **Relative name / relation** | Father's or husband's name printed on the roll | `relative_name`, `relative_relation` |
| **Approached** | A volunteer has contacted the voter (door-to-door) | `data_collection_id`, `is_voter_approached` |
| **Opinion: our / opposition / swing** | Voter's leaning: positive / negative / undecided | `VOTER_OPINION` `P`/`N`/`U` |
| **Migrated** | Voter no longer lives at the roll address | `is_voter_migrated` |
| **Booth strength** | Party's assessed strength at a booth | `BOOTH_STRENGTH` `S/M/W` |
| **Category (General / OBC / SC / ST)** | Constitutional social categories | `CATEGORIES`, `caste` |
| **Voter slip** | Printed slip handed to a voter with booth, S.No. and party symbol or ballot no. | `PrintVoterSlip`, `partydata` |
| **Ballot no.** | Candidate's position on the EVM ballot | `ballotNo` |
| **Polling day / Live voting** | Election day: marking who has voted, to chase our non-voters | `set_voter_voted`, `live_voting_id`, `LIST_TYPE.LIVE_VOTING` |
| **Prachar kit** | Campaign publicity material (Hindi *prachar* = campaign) | `PracharKitScreen` |
| **Account** | A party / campaign tenant inside the system | `account_id`, `create_account` |
| **Pass key** | Shared code for an account; volunteers use it to join, admins for privileged ops | `pass_key`, `passKey` |
| **Volunteer** | Field worker (karyakarta), scoped to one polling station | `USER_ROLE.VOLUNTEER` |
