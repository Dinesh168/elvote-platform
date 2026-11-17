import React from 'react';
import { Linking, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import { IconButton,Button, Modal, Portal, Text } from "react-native-paper";
import { THEME } from "../theme";
import MapView, { Geojson, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function MapScreenInApp({ navigation }) {
  const [refresh, setRefresh] = useState(false);
  
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <IconButton
        icon="refresh"
        iconColor={THEME.COLOR.PRIMARY_FOREGROUND}
        size={20}
        onPress={() => {
          setRefresh(true);
          setTimeout(() => setRefresh(false), 60)
        }}
      />,
    });
  }, [navigation]);

  const [selectedMarker, setSelectedMarker] = React.useState(null);
  
  const markers = [
    {
      "lat": 26.3838173,
      "long": 90.6369969,
      "psName": "Tulungia L.P. School ( West)",
      "psNo": 99
    },
    {
      "lat": 26.3946678,
      "long": 90.640151,
      "psName": "Kakaijana High School",
      "psNo": 98
    },
    {
      "lat": 26.3958262,
      "long": 90.6410512,
      "psName": "Kakaijana M.V. School (South)",
      "psNo": 97
    },
    {
      "lat": 26.3957837,
      "long": 90.6409197,
      "psName": "Kakaijana M.V. School (North )",
      "psNo": 96
    },
    {
      "lat": 26.4087811,
      "long": 90.6694225,
      "psName": "Dewanpara L.P. School",
      "psNo": 95
    },
    {
      "lat": 26.4235711,
      "long": 90.6569092,
      "psName": "Kakoijana Laharapara L.P. School (west)",
      "psNo": 94
    },
    {
      "lat": 26.435824,
      "long": 90.6709461,
      "psName": "Sidalsati Prathamik Bidyalaya (Right)",
      "psNo": 93
    },
    {
      "lat": 26.437074,
      "long": 90.663995,
      "psName": "Sidalsati Prathamik Bidyalaya (Left)",
      "psNo": 92
    },
    {
      "lat": 26.4397074,
      "long": 90.6621298,
      "psName": "Sidalsati H.S. School (Right)",
      "psNo": 91
    },
    {
      "lat": 26.52083333,
      "long": 90.79985,
      "psName": "1043 No. Kurshamari L.P.School",
      "psNo": 9
    },
    {
      "lat": 26.4235711,
      "long": 90.6569092,
      "psName": "Kakoijana Laharapara L.P. School ( East)",
      "psNo": 89
    },
    {
      "lat": 26.422846,
      "long": 90.6697655,
      "psName": "Foujdarpara L.P. School (South)",
      "psNo": 88
    },
    {
      "lat": 26.4226703,
      "long": 90.6694171,
      "psName": "Foujdarpara L.P. School (North)",
      "psNo": 87
    },
    {
      "lat": 26.408447,
      "long": 90.689405,
      "psName": "Charipunia M.E. School",
      "psNo": 85
    },
    {
      "lat": 26.3687556,
      "long": 90.7018819,
      "psName": "G.M. Narikola M.V. School (East)",
      "psNo": 84
    },
    {
      "lat": 26.3693312,
      "long": 90.7013051,
      "psName": "G.M. Narikola M.V. School (West)",
      "psNo": 83
    },
    {
      "lat": 26.3798854,
      "long": 90.7058188,
      "psName": "251 No. Sri Sri Sankardev L.P. School",
      "psNo": 82
    },
    {
      "lat": 26.3936042,
      "long": 90.6802941,
      "psName": "267 No. Dohlapara L.P. School",
      "psNo": 81
    },
    {
      "lat": 26.3829741,
      "long": 90.6866784,
      "psName": "Kalbari L.P. School",
      "psNo": 80
    },
    {
      "lat": 26.3880614,
      "long": 90.6944397,
      "psName": "Sonakhuli M.V. School",
      "psNo": 79
    },
    {
      "lat": 26.3968718,
      "long": 90.6972488,
      "psName": "293 No. Chakrabhum L.P. School",
      "psNo": 78
    },
    {
      "lat": 26.3857893,
      "long": 90.7075117,
      "psName": "Srijangram Pakhiriguri M.V. School",
      "psNo": 77
    },
    {
      "lat": 26.3843511,
      "long": 90.7225544,
      "psName": "Srijangram United High School (West)",
      "psNo": 76
    },
    {
      "lat": 26.3845902,
      "long": 90.7228235,
      "psName": "Srijangram United High School (East)",
      "psNo": 75
    },
    {
      "lat": 26.3844702,
      "long": 90.7232326,
      "psName": "Srijangram  United High School ( South )",
      "psNo": 74
    },
    {
      "lat": 26.3844463,
      "long": 90.7229465,
      "psName": "Srijangram United High School ( North )",
      "psNo": 73
    },
    {
      "lat": 26.4040449,
      "long": 90.7092306,
      "psName": "Chukani High School (Right)",
      "psNo": 72
    },
    {
      "lat": 26.4251906,
      "long": 90.7343135,
      "psName": "3 No. Khamarpara L.P. School",
      "psNo": 71
    },
    {
      "lat": 26.4039454,
      "long": 90.7088774,
      "psName": "Chukani High School (Left)",
      "psNo": 70
    },
    {
      "lat": 26.51031667,
      "long": 90.78386667,
      "psName": "372 No. Kushlaiguri L.P.School (Room No.1)",
      "psNo": 7
    },
    {
      "lat": 26.4209106,
      "long": 90.6990344,
      "psName": "Braja Medhi M.V. School",
      "psNo": 69
    },
    {
      "lat": 26.45141,
      "long": 90.702363,
      "psName": "3 No. Jamdoha L.P. School (New buildg.)",
      "psNo": 67
    },
    {
      "lat": 26.441647,
      "long": 90.719708,
      "psName": "5 No. Jamdoha L.P. School",
      "psNo": 66
    },
    {
      "lat": 26.440023,
      "long": 90.730925,
      "psName": "735 Bhandara  LP School    (Left )",
      "psNo": 64
    },
    {
      "lat": 26.440148,
      "long": 90.730932,
      "psName": "735 No. Bhandara L.P. School (Right)",
      "psNo": 63
    },
    {
      "lat": 26.448477,
      "long": 90.751613,
      "psName": "416 No. Silghagari L.P. School (Left)",
      "psNo": 62
    },
    {
      "lat": 26.448627,
      "long": 90.751975,
      "psName": "416 No. Silghagari L.P. School (Right)",
      "psNo": 61
    },
    {
      "lat": 26.46261,
      "long": 90.747605,
      "psName": "Nagarjhar M.H.M.V School",
      "psNo": 60
    },
    {
      "lat": 26.472763,
      "long": 90.74741,
      "psName": "Nagarjhar Saradia Prathamik Bidyalaya",
      "psNo": 59
    },
    {
      "lat": 26.471622,
      "long": 90.730688,
      "psName": "574 No. Gossaigaon L.P. School (Left)",
      "psNo": 58
    },
    {
      "lat": 26.471622,
      "long": 90.730688,
      "psName": "574 No. Gossaigaon L.P. School (Right)",
      "psNo": 57
    },
    {
      "lat": 26.484818,
      "long": 90.733343,
      "psName": "2 No. Supariguri L.P. School",
      "psNo": 56
    },
    {
      "lat": 26.487203,
      "long": 90.752795,
      "psName": "Fagunagaon M.V. School (Left)",
      "psNo": 55
    },
    {
      "lat": 26.487203,
      "long": 90.752795,
      "psName": "Fagunagaon M.V. School (Left)",
      "psNo": 55
    },
    {
      "lat": 26.487547,
      "long": 90.777713,
      "psName": "490 No. Barbakhara L.P. School (Left)",
      "psNo": 53
    },
    {
      "lat": 26.487547,
      "long": 90.777713,
      "psName": "490 No. Barbakhara L.P. School (Middle)",
      "psNo": 52
    },
    {
      "lat": 26.487547,
      "long": 90.777713,
      "psName": "490 No. Barbakhara L.P. School (Right)",
      "psNo": 51
    },
    {
      "lat": 26.42949,
      "long": 90.845315,
      "psName": "52 No. Abadigaon L.P. School",
      "psNo": 50
    },
    {
      "lat": 26.51555,
      "long": 90.77553333,
      "psName": "Pachim Kushlaiguri L.P.School (Left Side)",
      "psNo": 5
    },
    {
      "lat": 26.43215,
      "long": 90.832107,
      "psName": "Jhawbari H.S. School (North)",
      "psNo": 49
    },
    {
      "lat": 26.432176,
      "long": 90.83212,
      "psName": "Jhawbari H.S. School (Middle)",
      "psNo": 48
    },
    {
      "lat": 26.431788,
      "long": 90.832072,
      "psName": "Jhawbari H.S. School (South)",
      "psNo": 47
    },
    {
      "lat": 26.426337,
      "long": 90.822107,
      "psName": "1 No. Jhawbari Gossaipara L.P. School",
      "psNo": 46
    },
    {
      "lat": 26.419887,
      "long": 90.839107,
      "psName": "Jhaubari  M.V. School",
      "psNo": 45
    },
    {
      "lat": 26.425398,
      "long": 90.811398,
      "psName": "Odlaguri M.V. School (North)",
      "psNo": 43
    },
    {
      "lat": 26.429209,
      "long": 90.789568,
      "psName": "1039 No. Bechimari L.P. School",
      "psNo": 42
    },
    {
      "lat": 26.478962,
      "long": 90.82978,
      "psName": "Pub Kahibari L.P. School",
      "psNo": 41
    },
    {
      "lat": 26.478962,
      "long": 90.82978,
      "psName": "Pub Kahibari L.P. School",
      "psNo": 41
    },
    {
      "lat": 26.5319547,
      "long": 90.7634152,
      "psName": "Sonaikhola High School",
      "psNo": 4
    },
    {
      "lat": 26.476384,
      "long": 90.814572,
      "psName": "39 No. Moukhowa L.P. School (Left)",
      "psNo": 39
    },
    {
      "lat": 26.476384,
      "long": 90.814572,
      "psName": "39 No. Moukhowa L.P. School (Right)",
      "psNo": 38
    },
    {
      "lat": 26.458885,
      "long": 90.792033,
      "psName": "292 No. Jhakuapara L.P. School",
      "psNo": 37
    },
    {
      "lat": 26.463589,
      "long": 90.803931,
      "psName": "Manikpur Baripara L.P. School (Left)",
      "psNo": 36
    },
    {
      "lat": 26.463551,
      "long": 90.803948,
      "psName": "Manikpur Baripara L.P. School (Right)",
      "psNo": 35
    },
    {
      "lat": 26.451243,
      "long": 90.778037,
      "psName": "16 No. Manikpur L.P. School (South)",
      "psNo": 34
    },
    {
      "lat": 26.451243,
      "long": 90.778037,
      "psName": "16 No. Manikpur L.P. School  (North)",
      "psNo": 33
    },
    {
      "lat": 26.436435,
      "long": 90.782467,
      "psName": "693 No. Samukamari L.P. School",
      "psNo": 32
    },
    {
      "lat": 26.471516,
      "long": 90.762074,
      "psName": "1045 No. Nowapara L.P. School",
      "psNo": 31
    },
    {
      "lat": 26.46979,
      "long": 90.775446,
      "psName": "19 No. Bhatipara Model L.P. School ( West)",
      "psNo": 30
    },
    {
      "lat": 26.53246667,
      "long": 90.77128333,
      "psName": "Sonaikhola Senior Basic School",
      "psNo": 3
    },
    {
      "lat": 26.46979,
      "long": 90.775446,
      "psName": "19 No. Bhatipara Model L.P. School ( East)",
      "psNo": 29
    },
    {
      "lat": 26.470417,
      "long": 90.782467,
      "psName": "Bhatipara Balika Bidyalaya",
      "psNo": 28
    },
    {
      "lat": 26.47964,
      "long": 90.800096,
      "psName": "148 No. Barbila  L.P. School",
      "psNo": 27
    },
    {
      "lat": 26.47964,
      "long": 90.800096,
      "psName": "148 No. Barbila  L.P. School",
      "psNo": 27
    },
    {
      "lat": 26.492254,
      "long": 90.789849,
      "psName": "734 No. Dhupuri L.P. School (Left)",
      "psNo": 25
    },
    {
      "lat": 26.492254,
      "long": 90.789849,
      "psName": "734 No. Dhupuri L.P. School (DPEP Building)",
      "psNo": 24
    },
    {
      "lat": 26.49797222,
      "long": 90.83380556,
      "psName": "911 No. Kalbari L. P. School (Left)",
      "psNo": 23
    },
    {
      "lat": 26.261133,
      "long": 90.590246,
      "psName": "Chalantapara Govt. M.V. School (East)",
      "psNo": 222
    },
    {
      "lat": 26.261299,
      "long": 90.590173,
      "psName": "Chalantapara Govt. M.V. School (Right)",
      "psNo": 221
    },
    {
      "lat": 26.261068,
      "long": 90.590386,
      "psName": "Chalantapara Govt. M.V. School (Left)",
      "psNo": 220
    },
    {
      "lat": 26.49797222,
      "long": 90.83380556,
      "psName": "911 No. Kalbari L. P. School (Right)",
      "psNo": 22
    },
    {
      "lat": 26.260742,
      "long": 90.588214,
      "psName": "Chalantapara H.S. School (Middle Side)",
      "psNo": 219
    },
    {
      "lat": 26.260805,
      "long": 90.588106,
      "psName": "Chalantapara H.S. School (South Side)",
      "psNo": 218
    },
    {
      "lat": 26.2752454,
      "long": 90.6460555,
      "psName": "990 No. Jitkibari L.P. School",
      "psNo": 217
    },
    {
      "lat": 26.243798,
      "long": 90.641705,
      "psName": "109 No. Malegarh L.P. School",
      "psNo": 215
    },
    {
      "lat": 26.2324501,
      "long": 90.6256782,
      "psName": "Pachania High School",
      "psNo": 214
    },
    {
      "lat": 26.27847,
      "long": 90.604875,
      "psName": "Besimari M.V. School",
      "psNo": 213
    },
    {
      "lat": 26.262164,
      "long": 90.620565,
      "psName": "Khoragaon L.P. School (Left)",
      "psNo": 212
    },
    {
      "lat": 26.263644,
      "long": 90.619676,
      "psName": "Khoragaon L.P. School (Right)",
      "psNo": 211
    },
    {
      "lat": 26.290921,
      "long": 90.627375,
      "psName": "Uttar Khoragaon L.P. School",
      "psNo": 210
    },
    {
      "lat": 26.50021667,
      "long": 90.78778333,
      "psName": "Bawbari L.P.School (Room No.2)",
      "psNo": 21
    },
    {
      "lat": 26.289875,
      "long": 90.613163,
      "psName": "Katashbari L.P. School",
      "psNo": 209
    },
    {
      "lat": 26.302447,
      "long": 90.631005,
      "psName": "Kerkhabari Ratanpur M.V. School (East)",
      "psNo": 208
    },
    {
      "lat": 26.299931,
      "long": 90.611231,
      "psName": "Nayagaon S.B. School (Middle)",
      "psNo": 207
    },
    {
      "lat": 26.299956,
      "long": 90.611183,
      "psName": "Nayagaon S.B. School (Right)",
      "psNo": 206
    },
    {
      "lat": 26.296872,
      "long": 90.616716,
      "psName": "Nayagaon S.B. School (Left)",
      "psNo": 205
    },
    {
      "lat": 26.302517,
      "long": 90.631008,
      "psName": "Kerkhabari Ratanpur M.V. School (West)",
      "psNo": 204
    },
    {
      "lat": 26.319962,
      "long": 90.626678,
      "psName": "Singimari High School",
      "psNo": 203
    },
    {
      "lat": 26.331003,
      "long": 90.636561,
      "psName": "Choutaki J.B. School",
      "psNo": 202
    },
    {
      "lat": 26.279818,
      "long": 90.546631,
      "psName": "Barpara Dhakiapara L.P School",
      "psNo": 201
    },
    {
      "lat": 26.50021667,
      "long": 90.78778333,
      "psName": "Bawbari L.P.School (Room No.1)",
      "psNo": 20
    },
    {
      "lat": 26.5418927,
      "long": 90.787588,
      "psName": "Deotari L.P.School (West)",
      "psNo": 2
    },
    {
      "lat": 26.2655,
      "long": 90.451477,
      "psName": "372 No. Purani Dhanirdanga L.P. School (Left Side)",
      "psNo": 199
    },
    {
      "lat": 26.26524,
      "long": 90.469397,
      "psName": "Kheluapara Senior Basic School",
      "psNo": 198
    },
    {
      "lat": 26.262998,
      "long": 90.49547,
      "psName": "Kachudola Higher Secondary School (Right Side)",
      "psNo": 196
    },
    {
      "lat": 26.262998,
      "long": 90.49547,
      "psName": "Kachudola Higher Secondary School (Left Side)",
      "psNo": 195
    },
    {
      "lat": 26.292654,
      "long": 90.565235,
      "psName": "125-Sankarghola L.P. School",
      "psNo": 194
    },
    {
      "lat": 26.312213,
      "long": 90.56494,
      "psName": "876 No. Nimagaon Bongaon L.P. School",
      "psNo": 193
    },
    {
      "lat": 26.284343,
      "long": 90.569552,
      "psName": "699 Borghola L.P. School",
      "psNo": 192
    },
    {
      "lat": 26.292654,
      "long": 90.565235,
      "psName": "Kumarkata M.E. School (Right)",
      "psNo": 191
    },
    {
      "lat": 26.292654,
      "long": 90.565235,
      "psName": "Kumarkata M.E. School (Left)",
      "psNo": 190
    },
    {
      "lat": 26.50163333,
      "long": 90.80416667,
      "psName": "Patiladoha High School",
      "psNo": 19
    },
    {
      "lat": 26.299947,
      "long": 90.587121,
      "psName": "64 No. Bishnupur L.P. School",
      "psNo": 188
    },
    {
      "lat": 26.308032,
      "long": 90.595405,
      "psName": "585 No.Ghilaguri Hirapara L.P. School (Left)",
      "psNo": 187
    },
    {
      "lat": 26.303235,
      "long": 90.595405,
      "psName": "585 No. Ghilaguri Hirapara L.P. School (Right)",
      "psNo": 186
    },
    {
      "lat": 26.333853,
      "long": 90.597477,
      "psName": "364 No. Ghilaguri Ravapara L.P. School",
      "psNo": 185
    },
    {
      "lat": 26.334587,
      "long": 90.598364,
      "psName": "Binapani High School (Right Side)",
      "psNo": 183
    },
    {
      "lat": 26.347131,
      "long": 90.598364,
      "psName": "983 No. Ghilaguri Ikrabari L.P. School",
      "psNo": 182
    },
    {
      "lat": 26.268959,
      "long": 90.584163,
      "psName": "203 No. Baripukhuri L.P. School (South)",
      "psNo": 181
    },
    {
      "lat": 26.335316,
      "long": 90.600434,
      "psName": "203 No. Baripukhuri L.P. School (North)",
      "psNo": 180
    },
    {
      "lat": 26.50163333,
      "long": 90.80416667,
      "psName": "Patiladoha Vivekananda M.V. School",
      "psNo": 18
    },
    {
      "lat": 26.3302573,
      "long": 90.4957446,
      "psName": "South Boitamari M.V. School",
      "psNo": 179
    },
    {
      "lat": 26.3302591,
      "long": 90.4957484,
      "psName": "27 No. Bechimari LP School",
      "psNo": 178
    },
    {
      "lat": 26.3320295,
      "long": 90.5035682,
      "psName": "Salbari Bakhrapara L.P. School (Right Side)",
      "psNo": 177
    },
    {
      "lat": 26.3323593,
      "long": 90.5036016,
      "psName": "Salbari Bakhrapara L.P. School (Left Side)",
      "psNo": 176
    },
    {
      "lat": 26.349555,
      "long": 90.518727,
      "psName": "25 NO.  Central Moligaon Kendriya L.P.  School (Left Side)",
      "psNo": 175
    },
    {
      "lat": 26.349555,
      "long": 90.518727,
      "psName": "25 NO.  Central Moligaon Kendriya L.P.  School (Right Side)",
      "psNo": 174
    },
    {
      "lat": 26.355498,
      "long": 90.5012564,
      "psName": "23 No. Raghunandanpur L.P. School (Left Side)",
      "psNo": 173
    },
    {
      "lat": 26.3553744,
      "long": 90.5013648,
      "psName": "23 No. Raghunandanpur L.P. School (Right Side)",
      "psNo": 172
    },
    {
      "lat": 26.360445,
      "long": 90.509645,
      "psName": "Central Boitamari M.V. School, Kacharpara",
      "psNo": 171
    },
    {
      "lat": 26.363402,
      "long": 90.513595,
      "psName": "1 No. Amguri L.P. School (Left)",
      "psNo": 170
    },
    {
      "lat": 26.50906667,
      "long": 90.80556667,
      "psName": "179 No.Patiladoha Girls'L.P. School (Room No.2)",
      "psNo": 17
    },
    {
      "lat": 26.363402,
      "long": 90.513595,
      "psName": "1 No. Amguri L.P. School (Right)",
      "psNo": 169
    },
    {
      "lat": 26.365712,
      "long": 90.537892,
      "psName": "Barbakhra Janajati M.E. School",
      "psNo": 168
    },
    {
      "lat": 26.369332,
      "long": 90.526345,
      "psName": "28 No. Barkhata L.P.  School",
      "psNo": 167
    },
    {
      "lat": 26.34977,
      "long": 90.584754,
      "psName": "10 No. Kharboza L.P. School",
      "psNo": 166
    },
    {
      "lat": 26.372259,
      "long": 90.5886,
      "psName": "Khagarpur Salbari M.E. School (South buildg.)",
      "psNo": 165
    },
    {
      "lat": 26.372262,
      "long": 90.588009,
      "psName": "743-Betbari L.P. School (West)",
      "psNo": 164
    },
    {
      "lat": 26.372269,
      "long": 90.586234,
      "psName": "Khagarpur Salbari M.E. School (East buildg.)",
      "psNo": 163
    },
    {
      "lat": 26.37569,
      "long": 90.5608,
      "psName": "869 No. Khagarpur Majpara L.P. School",
      "psNo": 161
    },
    {
      "lat": 26.373798,
      "long": 90.572923,
      "psName": "984 No. Khagarpur L.P. School",
      "psNo": 160
    },
    {
      "lat": 26.50906667,
      "long": 90.80556667,
      "psName": "179 No.Patiladoha Girls' L.P. School (Room No.1)",
      "psNo": 16
    },
    {
      "lat": 26.37527,
      "long": 90.573811,
      "psName": "Garo Baptist Union M.E. School",
      "psNo": 159
    },
    {
      "lat": 26.323022,
      "long": 90.654358,
      "psName": "Batabari Jr. Basic School (Left)",
      "psNo": 158
    },
    {
      "lat": 26.323022,
      "long": 90.654358,
      "psName": "Batabari Jr. Basic School (Right)",
      "psNo": 157
    },
    {
      "lat": 26.306498,
      "long": 90.658052,
      "psName": "827 No.Mowamari Duramari L.P. School (Left)",
      "psNo": 156
    },
    {
      "lat": 26.306498,
      "long": 90.658052,
      "psName": "827 No. Mowamari Duramari L.P. School (Right)",
      "psNo": 155
    },
    {
      "lat": 26.285857,
      "long": 90.646063,
      "psName": "Lalmati Bageswari L.P. School",
      "psNo": 154
    },
    {
      "lat": 26.292095,
      "long": 90.667836,
      "psName": "791-Pachim Amguri L.P. School",
      "psNo": 153
    },
    {
      "lat": 26.3058974,
      "long": 90.6737681,
      "psName": "Amguri M.V. School (Right)",
      "psNo": 152
    },
    {
      "lat": 26.306095,
      "long": 90.67391,
      "psName": "Amguri M.V. School (Left)",
      "psNo": 151
    },
    {
      "lat": 26.318,
      "long": 90.6628,
      "psName": "Kalbari G.P. Office",
      "psNo": 150
    },
    {
      "lat": 26.50906667,
      "long": 90.80556667,
      "psName": "563 No. Patiladoha J.B. School",
      "psNo": 15
    },
    {
      "lat": 26.321,
      "long": 90.669,
      "psName": "533 No. Haripur Boalimari L.P. School (Right)",
      "psNo": 149
    },
    {
      "lat": 26.31,
      "long": 90.667,
      "psName": "Haripur Naldoba M.V. School",
      "psNo": 148
    },
    {
      "lat": 26.32,
      "long": 90.669,
      "psName": "533 No. Haripur Boalimari L.P. School (Left)",
      "psNo": 147
    },
    {
      "lat": 26.329925,
      "long": 90.67642,
      "psName": "H.M.Chakrabortty Memorial Girls M.E.School",
      "psNo": 146
    },
    {
      "lat": 26.329463,
      "long": 90.672472,
      "psName": "448 Abhayapuri No.1 L.P. School (West)",
      "psNo": 145
    },
    {
      "lat": 26.330355,
      "long": 90.673345,
      "psName": "448 Abhayapuri No.1 L.P. School (Right)",
      "psNo": 144
    },
    {
      "lat": 26.330355,
      "long": 90.673345,
      "psName": "448 Abhayapuri No.1 L.P. School (Left)",
      "psNo": 143
    },
    {
      "lat": 26.32668,
      "long": 90.662475,
      "psName": "1035 No. Abhayapuri 4 No. L.P. School (Right)",
      "psNo": 142
    },
    {
      "lat": 26.32668,
      "long": 90.662475,
      "psName": "1035 No. Abhayapuri 4 No. L.P. School (Left)",
      "psNo": 141
    },
    {
      "lat": 26.33348,
      "long": 90.669517,
      "psName": "756 No. Abhayapuri 2 No. L.P. School (Left)",
      "psNo": 140
    },
    {
      "lat": 26.50128333,
      "long": 90.81076667,
      "psName": "209 No. Baripara Girls L.P.School",
      "psNo": 14
    },
    {
      "lat": 26.33348,
      "long": 90.669517,
      "psName": "756 No. Abhayapuri 2 No. L.P. School (Right)",
      "psNo": 139
    },
    {
      "lat": 26.339603,
      "long": 90.661768,
      "psName": "Abhayapuri College",
      "psNo": 138
    },
    {
      "lat": 26.3437548,
      "long": 90.6552306,
      "psName": "Abhayeswari H.S & M.P.School(Left)",
      "psNo": 137
    },
    {
      "lat": 26.346795,
      "long": 90.65984,
      "psName": "Shibpur M.E. School (Right)",
      "psNo": 136
    },
    {
      "lat": 26.346733,
      "long": 90.660062,
      "psName": "Shibpur M.E. School(Middle)",
      "psNo": 135
    },
    {
      "lat": 26.346828,
      "long": 90.659895,
      "psName": "Shibpur M.E. School (Left)",
      "psNo": 134
    },
    {
      "lat": 26.334027,
      "long": 90.66988,
      "psName": "J.N.Memorial Girls High School",
      "psNo": 133
    },
    {
      "lat": 26.338702,
      "long": 90.662792,
      "psName": "Abhayeswari H.S& M.P. School(Right)",
      "psNo": 132
    },
    {
      "lat": 26.340868,
      "long": 90.650648,
      "psName": "Dakshin Deohati Govt. Junior Basic School",
      "psNo": 131
    },
    {
      "lat": 26.50128333,
      "long": 90.81076667,
      "psName": "Boripara Chowtara M.V. School.",
      "psNo": 13
    },
    {
      "lat": 26.349819,
      "long": 90.632009,
      "psName": "Deohati No.2 L.P. School (Left)",
      "psNo": 129
    },
    {
      "lat": 26.349819,
      "long": 90.632009,
      "psName": "Deohati No.2 L.P. School (Left)",
      "psNo": 129
    },
    {
      "lat": 26.349792,
      "long": 90.632043,
      "psName": "Deohati No.2 L.P. School (Right)",
      "psNo": 128
    },
    {
      "lat": 26.340623,
      "long": 90.652851,
      "psName": "Deohati M.V. School",
      "psNo": 127
    },
    {
      "lat": 26.368758,
      "long": 90.631225,
      "psName": "Durga  Prasad Memorial H S School (East Side)",
      "psNo": 126
    },
    {
      "lat": 26.339634,
      "long": 90.62619,
      "psName": "Salmara Tilapara L.P. School",
      "psNo": 125
    },
    {
      "lat": 26.370604,
      "long": 90.630929,
      "psName": "Uttar Salmara Anchalik Girls M.E. School.",
      "psNo": 123
    },
    {
      "lat": 26.357276,
      "long": 90.587542,
      "psName": "Durgapur L.P. School",
      "psNo": 122
    },
    {
      "lat": 26.371741,
      "long": 90.59897,
      "psName": "Uttar Salmara Pt.-I New L.P. School",
      "psNo": 121
    },
    {
      "lat": 26.370687,
      "long": 90.611683,
      "psName": "Uttar Salmara Paschim Pranta L.P. School",
      "psNo": 120
    },
    {
      "lat": 26.51896667,
      "long": 90.82908333,
      "psName": "803 No. Patkata  L.P.School _x000D_\n(Room No.1)",
      "psNo": 12
    },
    {
      "lat": 26.393215,
      "long": 90.605763,
      "psName": "Pahartali L.P. School",
      "psNo": 119
    },
    {
      "lat": 26.382854,
      "long": 90.613459,
      "psName": "Bakhalgaon L.P. School",
      "psNo": 118
    },
    {
      "lat": 26.354914,
      "long": 90.748677,
      "psName": "Tupkarchar LP School",
      "psNo": 117
    },
    {
      "lat": 26.343065,
      "long": 90.767248,
      "psName": "Sarbajanin H.S. School",
      "psNo": 116
    },
    {
      "lat": 26.375245,
      "long": 90.751036,
      "psName": "Khutapara Paschim L.P. School",
      "psNo": 115
    },
    {
      "lat": 26.373167,
      "long": 90.747263,
      "psName": "Haldibari L.P. School",
      "psNo": 114
    },
    {
      "lat": 26.358081,
      "long": 90.749672,
      "psName": "Sri Sankardev L.P. School",
      "psNo": 113
    },
    {
      "lat": 26.366605,
      "long": 90.770895,
      "psName": "Balarchar Pt.-I L.P. School",
      "psNo": 112
    },
    {
      "lat": 26.365596,
      "long": 90.761425,
      "psName": "Kirtanpara Pt.-I L.P. School",
      "psNo": 111
    },
    {
      "lat": 26.375163,
      "long": 90.765224,
      "psName": "Kirtanpara  M.V.School (Left)",
      "psNo": 110
    },
    {
      "lat": 26.53093333,
      "long": 90.82758333,
      "psName": "Bogoriguri M.V. School, Palengbari.",
      "psNo": 11
    },
    {
      "lat": 26.375281,
      "long": 90.765248,
      "psName": "Kirtanpara M.V.School (Right Side)",
      "psNo": 109
    },
    {
      "lat": 26.3449,
      "long": 90.695,
      "psName": "Khudra Narikola L.P. School",
      "psNo": 108
    },
    {
      "lat": 26.3359,
      "long": 90.69,
      "psName": "134-No. Pahartoli L.P. School (Left)",
      "psNo": 107
    },
    {
      "lat": 26.336,
      "long": 90.69,
      "psName": "134-No. Pahartoli L.P. School (Right)",
      "psNo": 106
    },
    {
      "lat": 26.3486239,
      "long": 90.6719339,
      "psName": "744 No. Bamungaon L.P. School (Right)",
      "psNo": 105
    },
    {
      "lat": 26.359053,
      "long": 90.643993,
      "psName": "Deohati L.P. School",
      "psNo": 102
    },
    {
      "lat": 26.371994,
      "long": 90.650184,
      "psName": "Amtola L.P. School",
      "psNo": 101
    },
    {
      "lat": 26.3841481,
      "long": 90.6368009,
      "psName": "Tulungia L.P. School ( East)",
      "psNo": 100
    },
    {
      "lat": 26.51896667,
      "long": 90.82908333,
      "psName": "803 No. Patkata  L.P.School _x000D_\n(Room No.2)",
      "psNo": 10
    },
    {
      "lat": 26.54252778,
      "long": 90.77403959,
      "psName": "Deotari L.P. School (East)",
      "psNo": 1
    }
  ];

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_GOOGLE} 
        region={{
          latitude: 26.2006,
          longitude: 92.9376,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
      >
        <Geojson
          strokeColor="#FF0000"
          strokeWidth={3}
          geojson={{
            "type": "FeatureCollection",                                                                          
            "features": [
              { "type": "Feature", "properties": { "name": "assam" }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [[ 89.69, 26.2 ], [ 89.675, 26.22 ], [ 89.685, 26.235 ], [ 89.695, 26.235 ], [ 89.68, 26.265 ], [ 89.7, 26.285 ], [ 89.7, 26.315 ], [ 89.72, 26.33 ], [ 89.73, 26.325 ], [ 89.74, 26.34 ], [ 89.76, 26.34 ], [ 89.76, 26.355 ], [ 89.775, 26.375 ], [ 89.81, 26.39 ], [ 89.805, 26.395 ], [ 89.815, 26.425 ], [ 89.835, 26.43 ], [ 89.84, 26.45 ], [ 89.85, 26.455 ], [ 89.835, 26.475 ], [ 89.84, 26.58 ], [ 89.855, 26.595 ], [ 89.835, 26.62 ], [ 89.84, 26.645 ], [ 89.85, 26.65 ], [ 89.84, 26.745 ], [ 89.85, 26.755 ], [ 89.87, 26.755 ], [ 89.965, 26.74 ], [ 89.99, 26.75 ], [ 90.07, 26.755 ], [ 90.165, 26.78 ], [ 90.165, 26.81 ], [ 90.185, 26.85 ], [ 90.24, 26.88 ], [ 90.3, 26.87 ], [ 90.33, 26.89 ], [ 90.345, 26.92 ], [ 90.425, 26.925 ], [ 90.55, 26.835 ], [ 90.64, 26.815 ], [ 90.655, 26.8 ], [ 90.69, 26.805 ], [ 90.705, 26.79 ], [ 90.72, 26.79 ], [ 90.96, 26.81 ], [ 91.05, 26.805 ], [ 91.095, 26.845 ], [ 91.15, 26.835 ], [ 91.245, 26.835 ], [ 91.305, 26.81 ], [ 91.34, 26.805 ], [ 91.37, 26.81 ], [ 91.405, 26.86 ], [ 91.425, 26.86 ], [ 91.475, 26.825 ], [ 91.505, 26.815 ], [ 91.585, 26.825 ], [ 91.63, 26.845 ], [ 91.695, 26.83 ], [ 91.72, 26.835 ], [ 91.81, 26.88 ], [ 91.845, 26.93 ], [ 91.89, 26.94 ], [ 91.985, 26.9 ], [ 91.995, 26.88 ], [ 92.055, 26.87 ], [ 92.085, 26.885 ], [ 92.085, 26.895 ], [ 92.11, 26.915 ], [ 92.19, 26.91 ], [ 92.25, 26.93 ], [ 92.285, 26.925 ], [ 92.285, 26.935 ], [ 92.3, 26.945 ], [ 92.35, 26.955 ], [ 92.39, 26.95 ], [ 92.405, 26.965 ], [ 92.42, 26.965 ], [ 92.435, 26.98 ], [ 92.455, 26.985 ], [ 92.58, 26.98 ], [ 92.625, 27 ], [ 92.625, 27.035 ], [ 92.655, 27.06 ], [ 92.705, 27.05 ], [ 92.77, 27.055 ], [ 92.88, 27.025 ], [ 92.925, 27.005 ], [ 92.935, 26.995 ], [ 92.935, 26.975 ], [ 93.02, 26.94 ], [ 93.09, 26.94 ], [ 93.345, 26.985 ], [ 93.455, 26.975 ], [ 93.475, 26.96 ], [ 93.495, 26.96 ], [ 93.665, 26.99 ], [ 93.705, 27.035 ], [ 93.75, 27.055 ], [ 93.76, 27.08 ], [ 93.81, 27.09 ], [ 93.81, 27.105 ], [ 93.78, 27.125 ], [ 93.79, 27.165 ], [ 93.855, 27.215 ], [ 93.885, 27.255 ], [ 93.99, 27.355 ], [ 94.045, 27.38 ], [ 94.07, 27.42 ], [ 94.14, 27.475 ], [ 94.135, 27.48 ], [ 94.145, 27.495 ], [ 94.24, 27.535 ], [ 94.24, 27.545 ], [ 94.21, 27.565 ], [ 94.19, 27.605 ], [ 94.19, 27.62 ], [ 94.21, 27.63 ], [ 94.22, 27.65 ], [ 94.26, 27.66 ], [ 94.285, 27.645 ], [ 94.285, 27.62 ], [ 94.305, 27.625 ], [ 94.32, 27.61 ], [ 94.355, 27.6 ], [ 94.395, 27.605 ], [ 94.435, 27.625 ], [ 94.445, 27.62 ], [ 94.46, 27.59 ], [ 94.495, 27.595 ], [ 94.52, 27.615 ], [ 94.565, 27.625 ], [ 94.58, 27.64 ], [ 94.63, 27.65 ], [ 94.66, 27.67 ], [ 94.695, 27.67 ], [ 94.715, 27.69 ], [ 94.745, 27.685 ], [ 94.755, 27.7 ], [ 94.79, 27.715 ], [ 94.815, 27.715 ], [ 94.855, 27.76 ], [ 94.995, 27.795 ], [ 95.025, 27.795 ], [ 95.045, 27.81 ], [ 95.31, 27.89 ], [ 95.385, 27.865 ], [ 95.505, 27.9 ], [ 95.53, 27.93 ], [ 95.55, 27.935 ], [ 95.55, 27.95 ], [ 95.56, 27.96 ], [ 95.58, 27.96 ], [ 95.595, 27.975 ], [ 95.825, 27.995 ], [ 95.985, 27.99 ], [ 96, 27.97 ], [ 95.975, 27.94 ], [ 95.975, 27.92 ], [ 95.945, 27.885 ], [ 95.945, 27.875 ], [ 95.925, 27.855 ], [ 95.905, 27.85 ], [ 95.89, 27.825 ], [ 95.86, 27.815 ], [ 95.84, 27.795 ], [ 95.805, 27.755 ], [ 95.81, 27.74 ], [ 95.79, 27.72 ], [ 95.79, 27.71 ], [ 95.815, 27.7 ], [ 95.815, 27.68 ], [ 95.805, 27.67 ], [ 95.82, 27.66 ], [ 95.815, 27.625 ], [ 95.84, 27.62 ], [ 95.85, 27.585 ], [ 95.885, 27.575 ], [ 95.9, 27.56 ], [ 95.9, 27.525 ], [ 95.91, 27.515 ], [ 95.91, 27.5 ], [ 95.9, 27.49 ], [ 95.895, 27.46 ], [ 95.955, 27.465 ], [ 95.965, 27.455 ], [ 95.995, 27.45 ], [ 96.04, 27.37 ], [ 96.035, 27.355 ], [ 96.01, 27.345 ], [ 96.005, 27.325 ], [ 95.985, 27.315 ], [ 95.975, 27.3 ], [ 95.925, 27.275 ], [ 95.91, 27.245 ], [ 95.865, 27.245 ], [ 95.845, 27.27 ], [ 95.815, 27.26 ], [ 95.8, 27.265 ], [ 95.64, 27.215 ], [ 95.595, 27.21 ], [ 95.58, 27.21 ], [ 95.565, 27.235 ], [ 95.525, 27.245 ], [ 95.485, 27.205 ], [ 95.49, 27.165 ], [ 95.47, 27.115 ], [ 95.43, 27.11 ], [ 95.385, 27.08 ], [ 95.365, 27.085 ], [ 95.325, 27.07 ], [ 95.255, 27.01 ], [ 95.24, 27.01 ], [ 95.23, 27.02 ], [ 95.2, 27.02 ], [ 95.16, 26.98 ], [ 95.135, 26.97 ], [ 95.12, 26.95 ], [ 95.045, 26.92 ], [ 95.03, 26.905 ], [ 94.975, 26.9 ], [ 94.95, 26.92 ], [ 94.92, 26.925 ], [ 94.9, 26.915 ], [ 94.87, 26.87 ], [ 94.84, 26.845 ], [ 94.825, 26.805 ], [ 94.805, 26.785 ], [ 94.785, 26.78 ], [ 94.77, 26.755 ], [ 94.75, 26.755 ], [ 94.7, 26.715 ], [ 94.61, 26.7 ], [ 94.61, 26.69 ], [ 94.58, 26.67 ], [ 94.555, 26.67 ], [ 94.545, 26.685 ], [ 94.535, 26.685 ], [ 94.535, 26.675 ], [ 94.51, 26.655 ], [ 94.48, 26.65 ], [ 94.485, 26.635 ], [ 94.47, 26.615 ], [ 94.43, 26.605 ], [ 94.43, 26.545 ], [ 94.415, 26.52 ], [ 94.395, 26.51 ], [ 94.39, 26.495 ], [ 94.37, 26.49 ], [ 94.34, 26.465 ], [ 94.33, 26.445 ], [ 94.285, 26.455 ], [ 94.27, 26.515 ], [ 94.205, 26.45 ], [ 94.195, 26.43 ], [ 94.195, 26.335 ], [ 94.175, 26.32 ], [ 94.12, 26.305 ], [ 94.12, 26.295 ], [ 94.095, 26.275 ], [ 94.09, 26.25 ], [ 94.065, 26.235 ], [ 94.055, 26.195 ], [ 94.02, 26.16 ], [ 94.025, 26.135 ], [ 94.01, 26.065 ], [ 93.975, 26.01 ], [ 93.99, 25.95 ], [ 94.005, 25.925 ], [ 94, 25.915 ], [ 93.975, 25.89 ], [ 93.93, 25.87 ], [ 93.89, 25.825 ], [ 93.845, 25.84 ], [ 93.84, 25.82 ], [ 93.805, 25.795 ], [ 93.785, 25.795 ], [ 93.76, 25.835 ], [ 93.775, 25.91 ], [ 93.77, 25.935 ], [ 93.76, 25.92 ], [ 93.715, 25.905 ], [ 93.715, 25.875 ], [ 93.725, 25.855 ], [ 93.72, 25.835 ], [ 93.67, 25.8 ], [ 93.655, 25.8 ], [ 93.63, 25.76 ], [ 93.595, 25.745 ], [ 93.58, 25.725 ], [ 93.57, 25.725 ], [ 93.56, 25.69 ], [ 93.535, 25.675 ], [ 93.5, 25.63 ], [ 93.48, 25.625 ], [ 93.475, 25.615 ], [ 93.44, 25.615 ], [ 93.425, 25.6 ], [ 93.425, 25.585 ], [ 93.37, 25.54 ], [ 93.38, 25.52 ], [ 93.405, 25.505 ], [ 93.41, 25.485 ], [ 93.475, 25.455 ], [ 93.495, 25.395 ], [ 93.495, 25.375 ], [ 93.48, 25.35 ], [ 93.48, 25.33 ], [ 93.495, 25.315 ], [ 93.495, 25.3 ], [ 93.47, 25.275 ], [ 93.44, 25.265 ], [ 93.435, 25.25 ], [ 93.405, 25.235 ], [ 93.405, 25.22 ], [ 93.37, 25.175 ], [ 93.37, 25.115 ], [ 93.35, 25.08 ], [ 93.33, 25.07 ], [ 93.325, 25.04 ], [ 93.315, 25.03 ], [ 93.275, 25.025 ], [ 93.285, 25.01 ], [ 93.275, 24.99 ], [ 93.285, 24.97 ], [ 93.28, 24.94 ], [ 93.27, 24.935 ], [ 93.275, 24.915 ], [ 93.25, 24.87 ], [ 93.22, 24.845 ], [ 93.22, 24.81 ], [ 93.21, 24.795 ], [ 93.185, 24.775 ], [ 93.17, 24.78 ], [ 93.16, 24.77 ], [ 93.145, 24.77 ], [ 93.125, 24.785 ], [ 93.125, 24.73 ], [ 93.11, 24.7 ], [ 93.125, 24.685 ], [ 93.125, 24.67 ], [ 93.105, 24.615 ], [ 93.125, 24.595 ], [ 93.125, 24.575 ], [ 93.095, 24.555 ], [ 93.08, 24.53 ], [ 93.07, 24.53 ], [ 93.075, 24.52 ], [ 93.06, 24.495 ], [ 93.07, 24.48 ], [ 93.07, 24.46 ], [ 93.055, 24.445 ], [ 93.055, 24.395 ], [ 93.015, 24.38 ], [ 92.985, 24.39 ], [ 92.965, 24.375 ], [ 92.87, 24.38 ], [ 92.855, 24.36 ], [ 92.825, 24.355 ], [ 92.805, 24.385 ], [ 92.805, 24.4 ], [ 92.785, 24.405 ], [ 92.76, 24.475 ], [ 92.725, 24.37 ], [ 92.71, 24.345 ], [ 92.695, 24.33 ], [ 92.67, 24.325 ], [ 92.665, 24.315 ], [ 92.64, 24.31 ], [ 92.63, 24.24 ], [ 92.595, 24.225 ], [ 92.565, 24.23 ], [ 92.55, 24.165 ], [ 92.525, 24.145 ], [ 92.5, 24.14 ], [ 92.495, 24.125 ], [ 92.475, 24.115 ], [ 92.455, 24.115 ], [ 92.42, 24.14 ], [ 92.415, 24.17 ], [ 92.4, 24.185 ], [ 92.4, 24.235 ], [ 92.205, 24.23 ], [ 92.195, 24.24 ], [ 92.195, 24.26 ], [ 92.255, 24.385 ], [ 92.235, 24.41 ], [ 92.235, 24.43 ], [ 92.21, 24.455 ], [ 92.21, 24.485 ], [ 92.16, 24.515 ], [ 92.15, 24.555 ], [ 92.175, 24.575 ], [ 92.18, 24.635 ], [ 92.225, 24.73 ], [ 92.24, 24.78 ], [ 92.245, 24.82 ], [ 92.23, 24.835 ], [ 92.225, 24.9 ], [ 92.24, 24.92 ], [ 92.275, 24.93 ], [ 92.345, 24.905 ], [ 92.38, 24.88 ], [ 92.475, 24.895 ], [ 92.47, 24.92 ], [ 92.445, 24.925 ], [ 92.4, 24.965 ], [ 92.39, 25 ], [ 92.395, 25.04 ], [ 92.445, 25.065 ], [ 92.47, 25.125 ], [ 92.505, 25.125 ], [ 92.505, 25.15 ], [ 92.515, 25.16 ], [ 92.615, 25.14 ], [ 92.655, 25.195 ], [ 92.69, 25.2 ], [ 92.745, 25.23 ], [ 92.755, 25.225 ], [ 92.745, 25.255 ], [ 92.755, 25.285 ], [ 92.77, 25.29 ], [ 92.765, 25.315 ], [ 92.745, 25.32 ], [ 92.725, 25.355 ], [ 92.71, 25.355 ], [ 92.67, 25.395 ], [ 92.655, 25.39 ], [ 92.63, 25.405 ], [ 92.605, 25.395 ], [ 92.59, 25.405 ], [ 92.58, 25.45 ], [ 92.55, 25.455 ], [ 92.55, 25.495 ], [ 92.62, 25.54 ], [ 92.625, 25.55 ], [ 92.595, 25.535 ], [ 92.555, 25.545 ], [ 92.54, 25.57 ], [ 92.54, 25.595 ], [ 92.49, 25.605 ], [ 92.455, 25.665 ], [ 92.425, 25.67 ], [ 92.415, 25.68 ], [ 92.4, 25.725 ], [ 92.38, 25.725 ], [ 92.34, 25.705 ], [ 92.31, 25.705 ], [ 92.28, 25.69 ], [ 92.23, 25.69 ], [ 92.175, 25.645 ], [ 92.14, 25.665 ], [ 92.14, 25.69 ], [ 92.13, 25.705 ], [ 92.13, 25.725 ], [ 92.145, 25.74 ], [ 92.13, 25.78 ], [ 92.135, 25.825 ], [ 92.16, 25.855 ], [ 92.165, 25.885 ], [ 92.175, 25.89 ], [ 92.14, 25.905 ], [ 92.135, 25.95 ], [ 92.155, 25.98 ], [ 92.21, 26.015 ], [ 92.24, 26.045 ], [ 92.17, 26.05 ], [ 92.155, 26.045 ], [ 92.15, 26.03 ], [ 92.14, 26.025 ], [ 92.095, 26.03 ], [ 92.06, 26.015 ], [ 92, 26.02 ], [ 91.985, 26.005 ], [ 91.945, 25.995 ], [ 91.935, 25.98 ], [ 91.91, 25.98 ], [ 91.9, 25.99 ], [ 91.9, 26.005 ], [ 91.875, 26.01 ], [ 91.85, 26.045 ], [ 91.855, 26.085 ], [ 91.825, 26.095 ], [ 91.8, 26.07 ], [ 91.785, 26.07 ], [ 91.75, 26.045 ], [ 91.74, 25.945 ], [ 91.685, 25.89 ], [ 91.64, 25.89 ], [ 91.595, 25.925 ], [ 91.595, 25.96 ], [ 91.615, 25.965 ], [ 91.605, 25.98 ], [ 91.61, 26 ], [ 91.585, 26 ], [ 91.57, 25.965 ], [ 91.55, 25.95 ], [ 91.555, 25.925 ], [ 91.54, 25.905 ], [ 91.555, 25.885 ], [ 91.535, 25.855 ], [ 91.48, 25.84 ], [ 91.45, 25.82 ], [ 91.415, 25.835 ], [ 91.345, 25.815 ], [ 91.295, 25.735 ], [ 91.28, 25.725 ], [ 91.26, 25.73 ], [ 91.235, 25.705 ], [ 91.175, 25.715 ], [ 91.17, 25.755 ], [ 91.16, 25.77 ], [ 91.17, 25.825 ], [ 91.155, 25.83 ], [ 91.125, 25.81 ], [ 91.085, 25.81 ], [ 91.07, 25.8 ], [ 91.04, 25.81 ], [ 91, 25.8 ], [ 90.985, 25.805 ], [ 90.98, 25.83 ], [ 90.995, 25.87 ], [ 90.955, 25.87 ], [ 90.94, 25.92 ], [ 90.93, 25.895 ], [ 90.91, 25.895 ], [ 90.875, 25.925 ], [ 90.825, 25.92 ], [ 90.815, 25.93 ], [ 90.795, 25.895 ], [ 90.74, 25.89 ], [ 90.72, 25.905 ], [ 90.725, 25.93 ], [ 90.71, 25.935 ], [ 90.69, 25.92 ], [ 90.645, 25.905 ], [ 90.645, 25.89 ], [ 90.635, 25.88 ], [ 90.605, 25.88 ], [ 90.585, 25.91 ], [ 90.59, 25.93 ], [ 90.52, 25.875 ], [ 90.505, 25.875 ], [ 90.495, 25.885 ], [ 90.495, 25.905 ], [ 90.515, 25.95 ], [ 90.485, 25.99 ], [ 90.425, 25.97 ], [ 90.405, 25.975 ], [ 90.39, 25.995 ], [ 90.37, 25.99 ], [ 90.33, 25.955 ], [ 90.205, 25.935 ], [ 90.19, 25.925 ], [ 90.165, 25.93 ], [ 90.165, 25.94 ], [ 90.125, 25.94 ], [ 90.12, 25.925 ], [ 90.11, 25.925 ], [ 90.09, 25.9 ], [ 90.08, 25.9 ], [ 90.05, 25.87 ], [ 90.04, 25.87 ], [ 90.04, 25.855 ], [ 90.015, 25.825 ], [ 89.97, 25.805 ], [ 89.975, 25.77 ], [ 89.95, 25.73 ], [ 89.93, 25.72 ], [ 89.955, 25.695 ], [ 89.965, 25.67 ], [ 90.01, 25.645 ], [ 90.035, 25.62 ], [ 90.04, 25.61 ], [ 90.035, 25.59 ], [ 90.01, 25.565 ], [ 89.99, 25.57 ], [ 89.97, 25.55 ], [ 89.89, 25.535 ], [ 89.9, 25.48 ], [ 89.86, 25.43 ], [ 89.84, 25.38 ], [ 89.84, 25.335 ], [ 89.81, 25.33 ], [ 89.795, 25.36 ], [ 89.795, 25.4 ], [ 89.83, 25.505 ], [ 89.845, 25.645 ], [ 89.83, 25.665 ], [ 89.825, 25.695 ], [ 89.8, 25.715 ], [ 89.805, 25.765 ], [ 89.785, 25.825 ], [ 89.81, 25.885 ], [ 89.84, 25.925 ], [ 89.82, 25.925 ], [ 89.8, 25.94 ], [ 89.8, 25.96 ], [ 89.81, 25.97 ], [ 89.79, 25.985 ], [ 89.78, 26.02 ], [ 89.765, 26.025 ], [ 89.755, 26.04 ], [ 89.755, 26.065 ], [ 89.765, 26.075 ], [ 89.74, 26.095 ], [ 89.73, 26.13 ], [ 89.69, 26.16 ], [ 89.69, 26.2 ]] ] ] } }
            ]
          }}
        />
        {
          markers.map((marker, index) => (
            <Marker
              key={index}
              coordinate={{ latitude: marker.lat, longitude: marker.long }}
              title={marker.psName}
              description={`Part No: ${marker.psNo}`}
              onPress={() => {
                setSelectedMarker({
                  'psName': marker.psName,
                  'psNo': marker.psNo,
                  'Total voters': 1000,
                  'Volunteers': 50,
                  'Members': 60,
                  'Last election vote': 58,
                  'ERI score': 55,
                  'Booth Incharge': 'Raj Kumar',
                  'Contact': '9876543210'
                })
              }}
            >
              {/* <Callout>
                <CalloutSubview>
                <View style={{ padding: 10, width: 150 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{marker.psName}</Text>
                  <Text>{`Part No: ${marker.psNo}`}</Text>
                  <Text>{`Total voters - 1000`}</Text>
                  <Text>{`Volunteers - 50`}</Text>
                  <Text>{`Members - 60`}</Text>
                  <Text>{`Last election vote - 58%`}</Text>
                  <Text>{`ERI score - 55`}</Text>
                </View>
                </CalloutSubview>
              </Callout> */}
            </Marker>
          ))
        }

      </MapView>

      <Portal>
        <Modal
          visible={!!selectedMarker}
          onDismiss={() => setSelectedMarker(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedMarker && (
            <>
              <Text style={styles.modalTitle}>{selectedMarker['psName']}</Text>
              <Text>Part No: {selectedMarker['psNo']}</Text>
              <Text>Total voters: {selectedMarker['Total voters']}</Text>
              <Text>Volunteers: {selectedMarker['Volunteers']}</Text>
              <Text>Members: {selectedMarker['Members']}</Text>
              <Text>Last election vote: {selectedMarker['Last election vote']}</Text>
              <Text>ERI score: {selectedMarker['ERI score']}</Text>
              <Text>Booth Incharge: {selectedMarker['Booth Incharge']}</Text>
              {/* make contact number clickable to call */}
              <Text>Contact: 
                <Text onPress={() => Linking.openURL(`tel:${selectedMarker['Contact']}`)} style={{color: 'blue', textDecorationLine: 'underline'}}>
                  {selectedMarker['Contact']}
                </Text>
              </Text>
              
              <Button onPress={() => setSelectedMarker(null)}>Close</Button>
            </>
          )}
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fc',
  },
 map: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  }
});
