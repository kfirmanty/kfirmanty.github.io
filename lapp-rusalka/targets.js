//0.01 == 1KM
//0.0001 == 10m

const targets = [
  {
    "name": "kilka słów o jeziorze",
    "lat": 52.42336245287288,
    "lng": 16.887654940663392,
    "id": "1_kilka słów o jeziorze",
    "minDistance": 0.00007
  },
  {
    "name": "Wanda - Pieśń",
    "lat": 52.4294716,
    "lng": 16.8675367,
    "id": "2_wanda szlam",
    "minDistance": 0.0003
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
    "lat": 52.42568401445951,
    "lng": 16.87693357204269,
    "id": "5_zanurzanie",
    "minDistance": 0.0001
  },
  {
    "name": "Zanurzanie w ścieżkę 2",
    "lat": 52.425174973312785,
    "lng": 16.878362983592602,
    "id": "5_zanurzanie",
    "minDistance": 0.0001
  },
  {
    "name": "Małże 1",
    "lat": 52.42344962175207,
    "lng": 16.882216003385324,
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
    "name": "Obserwatorium ptaków",
    "lat": 52.4303269,
    "lng": 16.8684592,
    "id": "7_obserwatorium",
    "minDistance": 0.0001
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
    "lat": 52.425166203482235,
    "lng": 16.886008270452646,
    "id": "10_porosty",
    "minDistance": 0.00007
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN 2",
    "lat": 52.426328150398746,
    "lng": 16.88344000141914,
    "id": "10_porosty",
    "minDistance": 0.00007
  },
  {
    "name": "Niewidzialny biegacz",
    "lat": 52.4292989,
    "lng": 16.8773018,
    "id": "11_Niewidzialny biegacz",
    "minDistance": 0.0004
  },
  {
    "name": "Żużel 1",
    "lat": 52.4240307,
    "lng": 16.8876878,
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
    "minDistance": 0.0005
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
    "lat": 52.4278488,
    "lng": 16.8788105,
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
    "lat": 52.42396701376059,
    "lng": 16.880620051573374,
    "id": "15_budowa jeziora",
    "minDistance": 0.0001
  },
  {
    "name": "Budowa jeziora 2",
    "lat": 52.42363172507543,
    "lng": 16.88154044056591,
    "id": "15_budowa jeziora",
    "minDistance": 0.0001
  },
  {
    "name": "Piosenka topielca 1",
    "lat": 52.42590715393103,
    "lng": 16.87421197245166,
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
    "lat": 52.424141,
    "lng": 16.8790659,
    "id": "17_Pomnik miejsce rozstrzelań",
    "minDistance": 0.0001
  },
  {
    "name": "Pomnik - miejsce rozstrzelań INTRO lektorzy",
    "lat": 52.42447913753543,
    "lng": 16.87948179159561,
    "id": "17_Pomnik miejsce rozstrzelań",
    "minDistance": 0.00007
  },
  {
    "name": "Stare drzewo 1",
    "lat": 52.4265588,
    "lng": 16.883474,
    "id": "19_drzewo",
    "minDistance": 0.0002
  },
  {
    "name": "Stare drzewo 2",
    "lat": 52.4272528,
    "lng": 16.8809009,
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
];