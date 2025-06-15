//0.01 == 1KM
//0.0001 == 10m

const dayTargets = [
  {
    "name": "kilka słów o jeziorze",
    "lat": 52.423497,
    "lng": 16.888135,
    "id": "1_kilka słów o jeziorze",
    "minDistance": 0.00007
  },
  {
    "name": "Wanda - Pieśń",
    "lat": 52.429228,
    "lng": 16.867809,
    "id": "2_wanda szlam",
    "minDistance": 0.0004
  },
  {
    "name": "Tur 1",
    "lat": 52.4304682,
    "lng": 16.8699867,
    "id": "3_tur",
    "minDistance": 0.0002
  },
  {
    "name": "Tur 2",
    "lat": 52.4300458,
    "lng": 16.8749107,
    "id": "3_tur",
    "minDistance": 0.0002
  },
  {
    "name": "Nudyści 1",
    "lat": 52.4283577,
    "lng": 16.8688815,
    "id": "4_nudyści",
    "minDistance": 0.00015
  },
  {
    "name": "Nudyści 2",
    "lat": 52.426570210260664,
    "lng": 16.873069024200667,
    "id": "4_nudyści",
    "minDistance": 0.00015
  },
  {
    "name": "Zanurzanie w ścieżkę 1",
    "lat": 52.425622,
    "lng": 16.877373,
    "id": "5_zanurzanie",
    "minDistance": 0.0001
  },
  {
    "name": "Zanurzanie w ścieżkę 2",
    "lat": 52.424882,
    "lng": 16.878708,
    "id": "5_zanurzanie",
    "minDistance": 0.0001
  },
  {
    "name": "Małże 1",
    "lat": 52.423370,
    "lng": 16.882715,
    "id": "6_małże",
    "minDistance": 0.00015
  },
  {
    "name": "Małże 2",
    "lat": 52.42316311093776,
    "lng": 16.887268072578838,
    "id": "6_małże",
    "minDistance": 0.00015
  },
  {
    "name": "Małże 3",
    "lat": 52.421947,
    "lng": 16.887077,
    "id": "6_małże",
    "minDistance": 0.00015
  },
  {
    "name": "Obserwatorium ptaków",
    "lat": 52.4303269,
    "lng": 16.8684592,
    "id": "7_obserwatorium",
    "minDistance": 0.00015
  },
  {
    "name": "BOBRY",
    "lat": 52.4302249,
    "lng": 16.8677449,
    "id": "9_bobry",
    "minDistance": 0.0001
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN",
    "lat": 52.425259,
    "lng": 16.885733,
    "id": "10_porosty",
    "minDistance": 0.00007
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN 2",
    "lat": 52.426572,
    "lng": 16.883632,
    "id": "10_porosty",
    "minDistance": 0.00007
  },
  {
    "name": "Niewidzialny biegacz",
    "lat": 52.429479,
    "lng": 16.877393,
    "id": "11_Niewidzialny biegacz",
    "minDistance": 0.0004
  },
  {
    "name": "Żużel 1",
    "lat": 52.423932,
    "lng": 16.887943,
    "id": "12_żużel",
    "minDistance": 0.0001
  },
  {
    "name": "Żużel 2",
    "lat": 52.42498517275162,
    "lng": 16.88647083503324,
    "id": "12_żużel",
    "minDistance": 0.0001
  },
  {
    "name": "Grill - Żarcie węgla na plaży",
    "lat": 52.4286152,
    "lng": 16.8777662,
    "id": "13_grill",
    "minDistance": 0.00025
  },
  {
    "name": "Ośrodek 1",
    "lat": 52.4274806,
    "lng": 16.8798917,
    "id": "14_ośrodek",
    "minDistance": 0.00007
  },
  {
    "name": "Ośrodek 2",
    "lat": 52.427911,
    "lng": 16.878951,
    "id": "14_ośrodek",
    "minDistance": 0.00007
  },
  {
    "name": "Ośrodek 3",
    "lat": 52.4295953,
    "lng": 16.8760081,
    "id": "14_ośrodek",
    "minDistance": 0.00015
  },
  {
    "name": "Piosenka LATO",
    "lat": 52.4290192,
    "lng": 16.8765082,
    "id": "15_lato w pełni",
    "minDistance": 0.00007
  },
  {
    "name": "Budowa jeziora 1",
    "lat": 52.424241,
    "lng": 16.880019,
    "id": "15_budowa jeziora",
    "minDistance": 0.0001
  },
  {
    "name": "Budowa jeziora 2",
    "lat": 52.423413,
    "lng": 16.882278,
    "id": "15_budowa jeziora",
    "minDistance": 0.0001
  },
  {
    "name": "Piosenka topielca 1",
    "lat": 52.426323,
    "lng": 16.873411,
    "id": "16_piostenka topielca geja",
    "minDistance": 0.00015
  },
  {
    "name": "Piosenka topielca 2",
    "lat": 52.42577466500602,
    "lng": 16.875950136896353,
    "id": "16_piostenka topielca geja",
    "minDistance": 0.00015
  },
  {
    "name": "Pomnik - miejsce rozstrzelań",
    "lat": 52.424293,
    "lng": 16.879284,
    "id": "17_Pomnik miejsce rozstrzelań",
    "minDistance": 0.0001
  },
  {
    "name": "Pomnik - miejsce rozstrzelań INTRO lektorzy",
    "lat": 52.424531,
    "lng": 16.879429,
    "id": "18_Pomnik intro lektorzy",
    "minDistance": 0.00015
  },
  {
    "name": "Stare drzewo 1",
    "lat": 52.426774,
    "lng": 16.883203,
    "id": "19_drzewo",
    "minDistance": 0.0001
  },
  {
    "name": "Stare drzewo 2",
    "lat": 52.427392,
    "lng": 16.880503,
    "id": "19_drzewo",
    "minDistance": 0.0002
  },

  //qr codes targets
  {
    "name": "QR_1_punkt startowy golęcin",
    "lat": 0,
    "lng": 0,
    "id": "QR_1_punkt startowy golęcin"
  },
  {
    "name": "QR_2_punkt startowy ośrodek",
    "lat": 0,
    "lng": 0,
    "id": "QR_2_punkt startowy ośrodek"
  },
  {
    "name": "QR_3_punkt startowy mostek bobrowy",
    "lat": 0,
    "lng": 0,
    "id": "QR_3_punkt startowy mostek bobrowy"
  },
  {
    "name": "QR_4_punkt startowy plaża nudystów",
    "lat": 0,
    "lng": 0,
    "id": "QR_4_punkt startowy plaża nudystów"
  },
  {
    "name": "QR_5_punkt startowy ulica botaniczna",
    "lat": 0,
    "lng": 0,
    "id": "QR_5_punkt startowy botaniczna"
  },

  //test
  {
    "name": "test",
    "lat": 53.363467173434785,
    "lng": 14.604279010497695,
    "id": "1_kilka słów o jeziorze"
  },

  {
    "name": "park",
    "lat": 53.364020,
    "lng": 14.604161,
    "id": "3_tur"
  },

  {
    "name": "lapidarium",
    "lat": 53.365783,
    "lng": 14.606104,
    "id": "19_drzewo"
  },

  //test 2

  {
    "name": "rondo",
    "lat": 53.371254,
    "lng": 14.604488,
    "id": "1_kilka słów o jeziorze",
    "minDistance": 0.00007
  },
  {
    "name": "mol",
    "lat": 53.379747,
    "lng": 14.627430,
    "id": "2_wanda szlam",
    "minDistance": 0.0004
  },
  {
    "name": "selgros",
    "lat": 53.378757,
    "lng": 14.641773,
    "id": "3_tur",
    "minDistance": 0.0002
  },
  {
    "name": "jasna",
    "lat": 53.377789,
    "lng": 14.648990,
    "id": "4_nudyści",
    "minDistance": 0.0002
  },
  {
    "name": "dk krzemień",
    "lat": 53.366403,
    "lng": 14.598921,
    "id": "3_tur",
    "minDistance": 0.00015
  },
  {
    "name": "Park 2",
    "lat": 53.365511,
    "lng": 14.600010,
    "id": "5_zanurzanie",
    "minDistance": 0.0001
  },
  {
    "name": "Park 3",
    "lat": 53.365533,
    "lng": 14.598762,
    "id": "6_małże",
    "minDistance": 0.00015
  }
];







const nightTargets = [
  {
    "name": "Wanda - Pieśń",
    "lat": 52.429228,
    "lng": 16.867809,
    "id": "5_ukrywanie zwłok",
    "minDistance": 0.0004
  },
  {
    "name": "Tur 1",
    "lat": 52.4304682,
    "lng": 16.8699867,
    "id": "9_Punkt z duchami",
    "minDistance": 0.0002
  },
  {
    "name": "Tur 2",
    "lat": 52.4300458,
    "lng": 16.8749107,
    "id": "2_Kompletna dezorientacja II",
    "minDistance": 0.0002
  },
  {
    "name": "Nudyści 1",
    "lat": 52.4283577,
    "lng": 16.8688815,
    "id": "3_Dodatek_4",
    "minDistance": 0.00015
  },
  {
    "name": "Nudyści 2",
    "lat": 52.426570210260664,
    "lng": 16.873069024200667,
    "id": "3_Dodatek_4",
    "minDistance": 0.00015
  },
  {
    "name": "Zanurzanie w ścieżkę 1",
    "lat": 52.425622,
    "lng": 16.877373,
    "id": "4_Dodatek_5",
    "minDistance": 0.0001
  },
  {
    "name": "Zanurzanie w ścieżkę 2",
    "lat": 52.424882,
    "lng": 16.878708,
    "id": "4_Dodatek_5",
    "minDistance": 0.0001
  },
  {
    "name": "Małże 1",
    "lat": 52.423370,
    "lng": 16.882715,
    "id": "1_Wabienie re2",
    "minDistance": 0.00015
  },
  {
    "name": "Małże 2",
    "lat": 52.42316311093776,
    "lng": 16.887268072578838,
    "id": "1_Wabienie re2",
    "minDistance": 0.00015
  },
  {
    "name": "Obserwatorium ptaków",
    "lat": 52.4303269,
    "lng": 16.8684592,
    "id": "1_Wabienie re2",
    "minDistance": 0.00015
  },
  {
    "name": "BOBRY",
    "lat": 52.4302249,
    "lng": 16.8677449,
    "id": "7_Moment spotkania Rusałki z Facetem III",
    "minDistance": 0.0001
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN",
    "lat": 52.425259,
    "lng": 16.885733,
    "id": "8_Kompletna dezorientacja I",
    "minDistance": 0.00007
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN 2",
    "lat": 52.426572,
    "lng": 16.883632,
    "id": "8_Kompletna dezorientacja I",
    "minDistance": 0.00007
  },
  {
    "name": "Niewidzialny biegacz",
    "lat": 52.429479,
    "lng": 16.877393,
    "id": "7_Moment spotkania Rusałki z Facetem III",
    "minDistance": 0.0004
  },
  {
    "name": "Żużel 1",
    "lat": 52.423932,
    "lng": 16.887943,
    "id": "9_Punkt z duchami",
    "minDistance": 0.0001
  },
  {
    "name": "Żużel 2",
    "lat": 52.42498517275162,
    "lng": 16.88647083503324,
    "id": "9_Punkt z duchami",
    "minDistance": 0.0001
  },
  {
    "name": "Grill - Żarcie węgla na plaży",
    "lat": 52.4286152,
    "lng": 16.8777662,
    "id": "10_Dodatek 1 RE2",
    "minDistance": 0.00025
  },
  {
    "name": "Ośrodek 3",
    "lat": 52.4295953,
    "lng": 16.8760081,
    "id": "11_Dodatek_6",
    "minDistance": 0.00015
  },
  {
    "name": "Piosenka LATO",
    "lat": 52.4290192,
    "lng": 16.8765082,
    "id": "12_Dodatek_3",
    "minDistance": 0.00007
  },
  {
    "name": "Budowa jeziora 1",
    "lat": 52.424241,
    "lng": 16.880019,
    "id": "13_Punkt z kłótnią re1",
    "minDistance": 0.0001
  },
  {
    "name": "Budowa jeziora 2",
    "lat": 52.423413,
    "lng": 16.882278,
    "id": "13_Punkt z kłótnią re1",
    "minDistance": 0.0001
  },
  {
    "name": "Piosenka topielca 1",
    "lat": 52.426323,
    "lng": 16.873411,
    "id": "14_Punkt z seksem",
    "minDistance": 0.00015
  },
  {
    "name": "Piosenka topielca 2",
    "lat": 52.42577466500602,
    "lng": 16.875950136896353,
    "id": "14_Punkt z seksem",
    "minDistance": 0.00015
  },
  {
    "name": "Stare drzewo 1",
    "lat": 52.426774,
    "lng": 16.883203,
    "id": "Moment spotkania Rusałki z Facetem I",
    "minDistance": 0.0002
  },
  {
    "name": "Stare drzewo 2",
    "lat": 52.427392,
    "lng": 16.880503,
    "id": "Moment spotkania Rusałki z Facetem I",
    "minDistance": 0.0002
  },

  //qr codes targets
  {
    "name": "QR_1_punkt startowy golęcin",
    "lat": 0,
    "lng": 0,
    "id": "QR_1_punkt startowy golęcin"
  },
  {
    "name": "QR_2_punkt startowy ośrodek",
    "lat": 0,
    "lng": 0,
    "id": "QR_2_punkt startowy ośrodek"
  },
  {
    "name": "QR_3_punkt startowy mostek bobrowy",
    "lat": 0,
    "lng": 0,
    "id": "QR_3_punkt startowy mostek bobrowy"
  },
  {
    "name": "QR_4_punkt startowy plaża nudystów",
    "lat": 0,
    "lng": 0,
    "id": "QR_4_punkt startowy plaża nudystów"
  },
  {
    "name": "QR_5_punkt startowy ulica botaniczna",
    "lat": 0,
    "lng": 0,
    "id": "QR_5_punkt startowy botaniczna"
  },

  //test
  {
    "name": "test",
    "lat": 53.363467173434785,
    "lng": 14.604279010497695,
    "id": "5_ukrywanie zwłok",
  },

  {
    "name": "park",
    "lat": 53.364020,
    "lng": 14.604161,
    "id": "9_Punkt z duchami",
  },

  {
    "name": "lapidarium",
    "lat": 53.365783,
    "lng": 14.606104,
    "id": "1_Wabienie re2"
  }
];

const hour = new Date().getHours();
const isDay = (hour < 21 && hour >= 7)
const targets = isDay ? dayTargets : nightTargets;