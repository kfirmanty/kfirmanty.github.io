const targets = [
  {
    "name": "kilka słów o jeziorze",
    "lat": 52.235208,
    "lng": 16.8879966,
    "id": "1_kilka słów o jeziorze"
  },
  {
    "name": "Wanda - Pieśń",
    "lat": 52.4294716,
    "lng": 16.8675367,
    "id": "2_wanda szlam"
  },
  {
    "name": "Tur 1",
    "lat": 52.4304682,
    "lng": 16.8699867,
    "id": "3_tur"
  },
  {
    "name": "Tur 2",
    "lat": 52.4300458,
    "lng": 16.8749107,
    "id": "3_tur"
  },
  {
    "name": "Nudyści 1",
    "lat": 52.4283577,
    "lng": 16.8688815,
    "id": "4_nudyści"
  },
  {
    "name": "Nudyści 2",
    "lat": 52.427704,
    "lng": 16.8712044,
    "id": "4_nudyści"
  },
  {
    "name": "Zanurzanie w ścieżkę 1",
    "lat": 52.4256363,
    "lng": 16.8752763,
    "id": "5_zanurzanie"
  },
  {
    "name": "Zanurzanie w ścieżkę 2",
    "lat": 52.4257618,
    "lng": 16.8766226,
    "id": "5_zanurzanie"
  },
  {
    "name": "Małże 1",
    "lat": 52.4237427,
    "lng": 16.881077,
    "id": "6_malze"
  },
  {
    "name": "Małże 2",
    "lat": 52.4232971,
    "lng": 16.8829624,
    "id": "6_malze"
  },
  {
    "name": "Obserwatorium ptaków",
    "lat": 52.4303269,
    "lng": 16.8684592,
    "id": "7_obserwatorium"
  },
  {
    "name": "BOBRY",
    "lat": 52.4302249,
    "lng": 16.8677449,
    "id": "8_bobry"
  },
  {
    "name": "Porosty  Elsensee-Rusałka GENERAL PLAN",
    "lat": 52.4244713,
    "lng": 16.879588,
    "id": "9_porosty"
  },
  {
    "name": "Niewidzialny biegacz",
    "lat": 52.4292989,
    "lng": 16.8773018,
    "id": "10_biegacz"
  },
  {
    "name": "Żużel 1",
    "lat": 52.4240307,
    "lng": 16.8876878,
    "id": "10_żużel"
  },
  {
    "name": "Żużel 2",
    "lat": 52.4239751,
    "lng": 16.887684,
    "id": "10_żużel"
  },
  {
    "name": "Grill - Żarcie węgla na plaży",
    "lat": 52.4286152,
    "lng": 16.8777662,
    "id": "11_grill"
  },
  {
    "name": "Ośrodek 1",
    "lat": 52.4274806,
    "lng": 16.8798917,
    "id": "12_ośrodek"
  },
  {
    "name": "Ośrodek 2",
    "lat": 52.4278488,
    "lng": 16.8788105,
    "id": "12_ośrodek"
  },
  {
    "name": "Ośrodek 3",
    "lat": 52.4295953,
    "lng": 16.8760081,
    "id": "12_ośrodek"
  },
  {
    "name": "Piosenka LATO",
    "lat": 52.4290192,
    "lng": 16.8765082,
    "id": "13_lato w pełni"
  },
  {
    "name": "Szymon 1 Budowa jeziora przez więźniów",
    "lat": 52.425374,
    "lng": 16.8778864,
    "id": "14_budowa jeziora"
  },
  {
    "name": "Szymon 2 Budowa jeziora przez więźniów",
    "lat": 52.4249445,
    "lng": 16.8785773,
    "id": "14_budowa jeziora"
  },
  {
    "name": "Piosenka topielca 1",
    "lat": 52.4271404,
    "lng": 16.872901,
    "id": "15_piosenka topielca"
  },
  {
    "name": "Piosenka topielca 2",
    "lat": 52.4259303,
    "lng": 16.8740533,
    "id": "15_piosenka topielca"
  },
  {
    "name": "Pomnik",
    "lat": 52.424141,
    "lng": 16.8790659,
    "id": "16_pomnik rozstrzelań"
  },
  {
    "name": "Stare drzewo 1",
    "lat": 52.4265588,
    "lng": 16.883474,
    "id": "17_drzewo"
  },
  {
    "name": "Stare drzewo 2",
    "lat": 52.4272528,
    "lng": 16.8809009,
    "id": "17_drzewo"
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
    "id": "QR_5_punkt startowy ulica botaniczna"
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
    "id": "2_wanda szlam"
  },

  {
    "name": "lapidarium",
    "lat": 53.365783,
    "lng": 14.606104,
    "id": "17_drzewo"
  },
];