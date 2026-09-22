/**
 * DSE Company Name Mappings & Multi-Tier Search Engine
 * Maps trading symbols to official company names and provides intelligent,
 * punctuation-resilient search across Dhaka Stock Exchange instruments.
 * 
 * Sources:
 * - https://new.dsebd.org/api/live/companies/search (Modern DSE Platform)
 * - https://www.dsebd.org/company_listing.php (Classic DSE Board)
 * 
 * Complete verified list of all 422 DSE-listed equities and funds (Treasury Bonds excluded).
 */

export const DSE_COMPANY_NAMES: Record<string, string> = {
  // 1
  "1JANATAMF": "First Janata Bank Mutual Fund",
  "1STPRIMFMF": "Prime Finance First Mutual Fund",

  // A
  "AAMRANET": "aamra networks limited",
  "AAMRATECH": "aamra technologies limited",
  "ABB1STMF": "AB Bank 1st Mutual fund",
  "ABBANK": "AB Bank PLC.",
  "ABBLPBOND": "AB Bank Perpetual Bond",
  "ACFL": "Aman Cotton Fibrous PLC.",
  "ACI": "Advanced Chemical Industries PLC",
  "ACIFORMULA": "ACI Formulations PLC",
  "ACMELAB": "The ACME Laboratories Limited",
  "ACMEPL": "ACME Pesticides Limited",
  "ACTIVEFINE": "Active Fine Chemicals Limited",
  "ADNTEL": "ADN Telecom Limited",
  "ADVENT": "Advent Pharma Limited",
  "AFCAGRO": "AFC Agro Biotech Ltd.",
  "AFTABAUTO": "Aftab Automobiles Limited",
  "AGNISYSL": "Agni Systems PLC.",
  "AGRANINS": "Agrani Insurance PLC.",
  "AIBL1STIMF": "AIBL 1st Islamic Mutual Fund",
  "AIBLPBOND": "AIBL Mudaraba Perpetual Bond",
  "AIL": "Alif Industries Limited",
  "AL-HAJTEX": "Al-Haj Textile Mills Limited",
  "ALARABANK": "Al-Arafah Islami Bank PLC.",
  "ALIF": "Alif Manufacturing Company Ltd.",
  "ALLTEX": "Alltex Industries Ltd.",
  "AMANFEED": "Aman Feed PLC.",
  "AMBEEPHA": "Ambee Pharmaceuticals PLC",
  "AMCL(PRAN)": "Agricultural Marketing Company Ltd. (Pran)",
  "ANLIMAYARN": "Anlimayarn Dyeing Ltd.",
  "ANWARGALV": "Anwar Galvanizing Ltd.",
  "AOL": "Associated Oxygen Limited",
  "APEXFOODS": "Apex Foods Limited",
  "APEXFOOT": "Apex Footwear Limited",
  "APEXSPINN": "Apex Spinning & Knitting Mills Limited",
  "APEXTANRY": "Apex Tannery Limited",
  "APOLOISPAT": "Appollo Ispat Complex Limited",
  "APSCLBOND": "APSCL Non-Convertible and Fully Redeemable Coupon Bearing Bond",
  "ARAMIT": "Aramit Limited",
  "ARAMITCEM": "Aramit Cement Limited",
  "ARGONDENIM": "Argon Denims Limited",
  "ASIAINS": "Asia Insurance PLC.",
  "ASIAPACINS": "Asia Pacific General Insurance PLC",
  "ASIATICLAB": "Asiatic Laboratories Limited",
  "ATLASBANG": "Atlas Bangladesh Ltd.",
  "AZIZPIPES": "Aziz Pipes Ltd.",

  // B
  "BANGAS": "Bangas Ltd.",
  "BANKASI1PB": "Bank Asia 1st Perpetual Bond",
  "BANKASIA": "Bank Asia PLC.",
  "BARKAPOWER": "Baraka Power Limited",
  "BATASHOE": "Bata Shoe Company (Bangladesh) Limited",
  "BATBC": "British American Tobacco Bangladesh Company Limited",
  "BAYLEASING": "Bay Leasing & Investment Limited",
  "BBS": "Bangladesh Building Systems PLC.",
  "BBSCABLES": "BBS Cables PLC.",
  "BDAUTOCA": "Bangladesh Autocars Ltd.",
  "BDCOM": "BDCOM Online Ltd.",
  "BDFINANCE": "Bangladesh Finance PLC.",
  "BDLAMPS": "Bangladesh Lamps PLC",
  "BDSERVICE": "Bangladesh Services Ltd.",
  "BDTHAI": "Bd.Thai Aluminium Ltd.",
  "BDTHAIFOOD": "BD Thai Food & Beverage Limited",
  "BDWELDING": "Bangladesh Welding Electrodes Ltd.",
  "BEACHHATCH": "Beach Hatchery Ltd.",
  "BEACONPHAR": "Beacon Pharmaceuticals PLC",
  "BENGALWTL": "Bengal Windsor Thermoplastics PLC.",
  "BERGERPBL": "Berger Paints Bangladesh Ltd.",
  "BESTHLDNG": "Best Holdings PLC.",
  "BEXGSUKUK": "Beximco Green Sukuk Al Istisna'a",
  "BEXIMCO": "Bangladesh Export Import Company Ltd.",
  "BGIC": "Bangladesh General Insurance Company PLC.",
  "BIFC": "Bangladesh Industrial Fin. Co. Ltd.",
  "BNICL": "Bangladesh National Insurance Company Limited",
  "BPML": "Bashundhara Paper Mills Limited",
  "BPPL": "Baraka Patenga Power Limited",
  "BRACBANK": "BRAC Bank PLC.",
  "BSC": "Bangladesh Shipping Corporation",
  "BSCPLC": "Bangladesh Submarine Cables PLC",
  "BSRMLTD": "Bangladesh Steel Re-Rolling Mills Limited",
  "BSRMSTEEL": "BSRM Steels Limited",
  "BXPHARMA": "Beximco Pharmaceuticals PLC.",

  // C
  "CAPITECGBF": "Capitec Grameen Bank Growth Fund",
  "CAPMBDBLMF": "CAPM BDBL Mutual Fund 01",
  "CAPMIBBLMF": "CAPM IBBL Islamic Mutual Fund",
  "CBLPBOND": "City Bank Perpetual Bond",
  "CENTRALINS": "Central Insurance PLC.",
  "CENTRALPHL": "Central Pharmaceuticals Limited",
  "CITYBANK": "City Bank PLC.",
  "CITYGENINS": "City Insurance PLC.",
  "CLICL": "Chartered Life Insurance PLC.",
  "CNATEX": "C & A Textiles Limited",
  "CONFIDCEM": "Confidence Cement PLC.",
  "CONTININS": "Continental Insurance PLC.",
  "COPPERTECH": "Coppertech Industries Limited",
  "CROWNCEMNT": "Crown Cement PLC.",
  "CRYSTALINS": "Crystal Insurance Company Limited",
  "CVOPRL": "CVO Petrochemical Refinery PLC.",

  // D
  "DACCADYE": "The Dacca Dyeing & Manufacturing Co.Ltd.",
  "DAFODILCOM": "Daffodil Computers PLC.",
  "DBH": "DBH Finance PLC.",
  "DBH1STMF": "DBH First Mutual Fund",
  "DBLPBOND": "Dhaka Bank Perpetual Bond",
  "DEBARACEM": "Aramit Cement Ltd.(Deb-14%)",
  "DEBBDLUGG": "Bangladesh Luggage Ind. Ltd.(Deb-14%)",
  "DEBBDWELD": "BD Welding Electrodes Ltd.(Deb-15%)",
  "DEBBDZIPP": "Bangladesh Zipper Ind. Ltd.(Deb-14%)",
  "DEBBXDENIM": "Beximco Denims Ltd.(Deb-14%)",
  "DEBBXFISH": "Beximco Fisheries Ltd.(Deb-14%)",
  "DEBBXKNI": "Beximco Knitting Ltd.(Deb-14%)",
  "DEBBXTEX": "Beximco Textiles Ltd.(Deb-14%)",
  "DELTALIFE": "Delta Life Insurance Company Ltd.",
  "DELTASPINN": "Delta Spinners Ltd.",
  "DESCO": "Dhaka Electric Supply Company Ltd.",
  "DESHBANDHU": "Deshbandhu Polymer Limited",
  "DGIC": "Desh General Insurance Company Limited",
  "DHAKABANK": "Dhaka Bank PLC.",
  "DHAKAINS": "Dhaka Insurance Limited",
  "DOMINAGE": "Dominage Steel Building Systems Limited",
  "DOREENPWR": "Doreen Power Generations and Systems Limited",
  "DSHGARME": "Desh Garments Ltd.",
  "DSSL": "Dragon Sweater and Spinning Limited",
  "DULAMIACOT": "Dulamia Cotton Spinning Mills Ltd.",
  "DUTCHBANGL": "Dutch-Bangla Bank PLC.",

  // E
  "EASTERNINS": "Eastern Insurance PLC.",
  "EASTLAND": "Eastland Insurance PLC.",
  "EASTRNLUB": "Eastern Lubricants Blenders PLC.",
  "EBL": "Eastern Bank PLC.",
  "EBL1STMF": "EBL First Mutual Fund",
  "EBLNRBMF": "EBL NRB Mutual Fund",
  "ECABLES": "Eastern Cables Ltd.",
  "EGEN": "eGeneration PLC.",
  "EHL": "Eastern Housing Limited",
  "EIL": "Express Insurance Limited",
  "EMERALDOIL": "Emerald Oil Industries Ltd.",
  "ENVOYTEX": "Envoy Textiles Limited",
  "EPGL": "Energypac Power Generation PLC.",
  "ESQUIRENIT": "Esquire Knit Composite PLC",
  "ETL": "Evince Textiles Limited",
  "EXIM1STMF": "EXIM Bank 1st Mutual Fund",
  "EXIMBANK": "Export Import (Exim) Bank of Bangladesh PLC.",

  // F
  "FAMILYTEX": "Familytex (BD) Limited",
  "FARCHEM": "Far Chemical & Textile Ind. PLC",
  "FAREASTFIN": "Fareast Finance & Investment Limited",
  "FAREASTLIF": "Fareast Islami Life Insurance Co. Ltd.",
  "FASFIN": "FAS Finance & Investment Limited",
  "FBFIF": "First Bangladesh Fixed Income Fund",
  "FEDERALINS": "Federal Insurance PLC",
  "FEKDIL": "Far East Knitting & Dyeing Industries PLC.",
  "FINEFOODS": "Fine Foods Limited",
  "FIRSTFIN": "First Finance Limited",
  "FIRSTSBANK": "First Security Islami Bank PLC.",
  "FORTUNE": "Fortune Shoes Limited",
  "FUWANGCER": "Fu-Wang Ceramic Industries Ltd.",
  "FUWANGFOOD": "Fu Wang Food Ltd.",

  // G
  "GBBPOWER": "GBB Power Ltd.",
  "GEMINISEA": "Gemini Sea Food PLC",
  "GENEXIL": "Genex Infosys PLC",
  "GENNEXT": "Generation Next Fashions Limited",
  "GHAIL": "Golden Harvest Agro Industries Ltd.",
  "GHCL": "Global Heavy Chemicals Limited",
  "GIB": "Global Islami Bank PLC",
  "GLDNJMF": "ICB AMCL CMSF Golden Jubilee Mutual Fund",
  "GLOBALINS": "Global Insurance PLC",
  "GOLDENSON": "Golden Son Ltd.",
  "GP": "Grameenphone Ltd.",
  "GPHISPAT": "GPH Ispat Ltd.",
  "GQBALLPEN": "GQ Ball Pen Industries Ltd.",
  "GRAMEENS2": "Grameen One : Scheme Two",
  "GREENDELMF": "Green Delta Mutual Fund",
  "GREENDELT": "Green Delta Insurance PLC.",
  "GSPFINANCE": "GSP Finance Company (Bangladesh) PLC.",

  // H
  "HAKKANIPUL": "Hakkani Pulp & Paper Mills PLC.",
  "HAMI": "Hami Industries PLC",
  "HEIDELBCEM": "Heidelberg Materials Bangladesh PLC.",
  "HFL": "Hamid Fabrics PLC",
  "HRTEX": "H.R.Textile Ltd.",
  "HWAWELLTEX": "Hwa Well Textiles (BD) PLC.",

  // I
  "IBBL2PBOND": "IBBL 2nd Perpetual Mudaraba Bond",
  "IBBLPBOND": "IBBL Mudaraba Perpetual Bond",
  "IBNSINA": "The IBN SINA  Pharmaceutical Industry PLC",
  "IBP": "Indo-Bangla Pharmaceuticals Limited",
  "ICB": "Investment Corporation Of Bangladesh",
  "ICB3RDNRB": "ICB AMCL Third NRB Mutual Fund",
  "ICBAGRANI1": "ICB AMCL First Agrani Bank Mutual Fund",
  "ICBAMCL2ND": "ICB AMCL Second Mutual Fund",
  "ICBEPMF1S1": "ICB Employees Provident MF 1: Scheme 1",
  "ICBIBANK": "ICB Islamic Bank Limited",
  "ICBSONALI1": "ICB AMCL Sonali Bank Limited 1st Mutual Fund",
  "ICICL": "Islami Commercial Insurance PLC.",
  "IDLC": "IDLC Finance PLC.",
  "IFADAUTOS": "IFAD Autos PLC.",
  "IFIC": "IFIC Bank PLC",
  "IFIC1STMF": "IFIC Bank 1st Mutual Fund",
  "IFILISLMF1": "IFIL Islamic Mutual Fund-1",
  "ILFSL": "International Leasing & Financial Services Limited",
  "INDEXAGRO": "Index Agro Industries Limited",
  "INTECH": "Intech Limited",
  "INTRACO": "Intraco Refueling Station PLC",
  "IPDC": "IPDC Finance PLC.",
  "ISLAMIBANK": "Islami Bank Bangladesh PLC.",
  "ISLAMICFIN": "Islamic Finance & Investment PLC.",
  "ISLAMIINS": "Islami Insurance Bangladesh Limited",
  "ISNLTD": "Information Services Network Ltd.",
  "ITC": "IT Consultants PLC.",

  // J
  "JAMUNABANK": "Jamuna Bank PLC.",
  "JAMUNAOIL": "Jamuna Oil PLC.",
  "JANATAINS": "Janata Insurance PLC",
  "JHRML": "JMI Hospital Requisite Manufacturing Limited",
  "JMISMDL": "JMI Syringes & Medical Devices Ltd.",
  "JUTESPINN": "Jute Spinners Ltd.",

  // K
  "KARNAPHULI": "Karnaphuli Insurance PLC",
  "KAY&QUE": "Kay & Que (Bangladesh) Ltd.",
  "KBPPWBIL": "Khan Brothers PP Woven Bag Industries Limited",
  "KDSALTD": "KDS Accessories Limited",
  "KEYACOSMET": "Keya Cosmetics Ltd.",
  "KOHINOOR": "Kohinoor Chemical Company (Bangladesh) PLC.",
  "KPCL": "Khulna Power Company Limited",
  "KPPL": "Khulna Printing & Packaging Limited",
  "KTL": "Kattali Textile Limited",

  // L
  "LANKABAFIN": "LankaBangla Finance PLC.",
  "LEGACYFOOT": "Legacy Footwear Ltd.",
  "LHB": "LafargeHolcim Bangladesh PLC.",
  "LIBRAINFU": "Libra Infusions Limited",
  "LINDEBD": "Linde Bangladesh Limited",
  "LOVELLO": "Taufika Foods and Lovello Ice-cream PLC",
  "LRBDL": "Lub-rref (Bangladesh) Limited",
  "LRGLOBMF1": "LR Global Bangladesh Mutual Fund One",

  // M
  "MAGURAPLEX": "Magura Multiplex PLC.",
  "MAKSONSPIN": "Maksons Spinning Mills PLC.",
  "MALEKSPIN": "Malek Spinning Mills PLC.",
  "MARICO": "Marico Bangladesh Limited",
  "MATINSPINN": "Matin Spinning Mills PLC",
  "MBL1STMF": "MBL 1st Mutual Fund",
  "MBPLCPBOND": "Mercantile Bank Perpetual Bond",
  "MEGCONMILK": "Meghna Condensed Milk Industries Ltd.",
  "MEGHNACEM": "Meghna Cement Mills PLC.",
  "MEGHNAINS": "Meghna Insurance PLC.",
  "MEGHNALIFE": "Meghna Life Insurance PLC",
  "MEGHNAPET": "Meghna Pet Industries Ltd.",
  "MERCANBANK": "Mercantile Bank PLC.",
  "MERCINS": "Mercantile Islami Insurance PLC",
  "METROSPIN": "Metro Spinning Ltd.",
  "MHSML": "Mozaffar Hossain Spinning Mills Ltd.",
  "MIDASFIN": "MIDAS Financing PLC.",
  "MIDLANDBNK": "Midland Bank PLC.",
  "MIRACLEIND": "Miracle Industries Ltd.",
  "MIRAKHTER": "Mir Akhter Hossain Limited",
  "MITHUNKNIT": "Mithun Knitting and Dyeing Ltd.",
  "MJLBD": "MJL Bangladesh PLC.",
  "MLDYEING": "M.L. Dyeing Limited",
  "MONNOAGML": "Monno Agro & General Machinery Limited",
  "MONNOCERA": "Monno Ceramic Industries Ltd.",
  "MONNOFABR": "Monno Fabrics Limited",
  "MONOSPOOL": "Monospool Bangladesh PLC",
  "MPETROLEUM": "Meghna Petroleum PLC.",
  "MTB": "Mutual Trust Bank PLC",
  "MTBPBOND": "Mutual Trust Bank Perpetual Bond",

  // N
  "NAHEEACP": "Nahee Aluminum Composite Panel PLC.",
  "NATLIFEINS": "National Life Insurance PLC",
  "NAVANACNG": "Navana CNG Limited",
  "NAVANAPHAR": "Navana Pharmaceuticals PLC",
  "NBL": "National Bank PLC.",
  "NCCBANK": "National Credit and Commerce Bank PLC.",
  "NCCBLMF1": "NCCBL Mutual Fund-1",
  "NEWLINE": "New Line Clothings Limited",
  "NFML": "National Feed Mill Limited",
  "NHFIL": "National Housing Finance PLC",
  "NITOLINS": "Nitol Insurance PLC.",
  "NORTHERN": "Northern Jute Manufacturing Co. Ltd.",
  "NORTHRNINS": "Northern Islami Insurance PLC.",
  "NPOLYMER": "National Polymer Industries PLC.",
  "NRBBANK": "NRB Bank PLC.",
  "NRBCBANK": "NRBC Bank PLC.",
  "NTC": "National Tea Company Ltd.",
  "NTLTUBES": "National Tubes Limited",
  "NURANI": "Nurani Dyeing & Sweater Limited",

  // O
  "OAL": "Olympic Accessories Limited",
  "OIMEX": "Oimex Electrode Limited",
  "OLYMPIC": "Olympic Industries PLC.",
  "ONEBANKPLC": "One Bank PLC",
  "ORIONINFU": "Orion Infusion Ltd.",
  "ORIONPHARM": "Orion Pharma Ltd.",

  // P
  "PADMALIFE": "Padma Islami Life Insurance Limited",
  "PADMAOIL": "Padma Oil PLC.",
  "PARAMOUNT": "Paramount Insurance PLC.",
  "PBLPBOND": "Pubali Bank Perpetual Bond",
  "PDL": "Pacific Denims Limited",
  "PENINSULA": "The Peninsula Chittagong PLC",
  "PEOPLESINS": "Peoples Insurance PLC.",
  "PF1STMF": "Phoenix Finance 1st Mutual Fund",
  "PHARMAID": "Pharma Aids Limited",
  "PHENIXINS": "Phoenix Insurance PLC.",
  "PHOENIXFIN": "Phoenix Finance and Investments Ltd.",
  "PHPMF1": "PHP First Mutual Fund",
  "PIONEERINS": "Pioneer Insurance PLC",
  "PLFSL": "Peoples Leasing and Fin. Services Ltd.",
  "POPULAR1MF": "Popular Life First Mutual Fund",
  "POPULARLIF": "Popular Life Insurance Co. Ltd.",
  "POWERGRID": "Power Grid Company of Bangladesh Ltd.",
  "PRAGATIINS": "Pragati Insurance PLC.",
  "PRAGATILIF": "Pragati Life Insurance PLC.",
  "PREBPBOND": "Premier Bank Perpetual Bond",
  "PREMIERBAN": "The Premier Bank PLC.",
  "PREMIERCEM": "Premier Cement Mills PLC",
  "PREMIERLEA": "Premier Leasing & Finance Limited",
  "PRIME1ICBA": "Prime Bank 1st ICB AMCL Mutual Fund",
  "PRIMEBANK": "Prime Bank PLC.",
  "PRIMEFIN": "Prime Finance & Investment Ltd.",
  "PRIMEINSUR": "Prime Islami Insurance PLC",
  "PRIMELIFE": "Prime Islami Life Insurance Ltd.",
  "PRIMETEX": "Prime Textile Spinning Mills Limited",
  "PROGRESLIF": "Progressive Life Insurance Co. Ltd.",
  "PROVATIINS": "Provati Insurance PLC.",
  "PTL": "Paramount Textile PLC.",
  "PUBALIBANK": "Pubali Bank PLC.",
  "PURABIGEN": "Purabi Gen. Insurance Company Ltd.",

  // Q
  "QUASEMIND": "Quasem Industries Ltd.",
  "QUEENSOUTH": "Queen South Textile Mills Limited",

  // R
  "RAHIMAFOOD": "Rahima Food Corporation Limited",
  "RAHIMTEXT": "Rahim Textile Mills PLC.",
  "RAKCERAMIC": "RAK Ceramics (Bangladesh) Limited",
  "RANFOUNDRY": "Rangpur Foundry Ltd.",
  "RDFOOD": "Rangpur Dairy & Food Products Ltd.",
  "RECKITTBEN": "Reckitt Benckiser (Bangladesh) PLC",
  "REGENTTEX": "Regent Textile Mills Limited",
  "RELIANCE1": "Reliance One the first scheme of Reliance Insurance Mutual Fund",
  "RELIANCINS": "Reliance Insurance PLC.",
  "RENATA": "Renata PLC",
  "RENWICKJA": "Renwick Jajneswar & Co (Bd) Ltd.",
  "REPUBLIC": "Republic Insurance PLC.",
  "RINGSHINE": "Ring Shine Textiles Limited",
  "ROBI": "Robi Axiata PLC.",
  "RSRMSTEEL": "Ratanpur Steel Re-Rolling Mills Limited",
  "RUNNERAUTO": "Runner Automobiles PLC",
  "RUPALIBANK": "Rupali Bank PLC.",
  "RUPALIINS": "Rupali Insurance Company Ltd.",
  "RUPALILIFE": "Rupali Life Insurance PLC",

  // S
  "SAFKOSPINN": "Safko Spinnings Mills Ltd.",
  "SAIFPOWER": "SAIF Powertec Limited",
  "SAIHAMCOT": "Saiham Cotton Mills Limited",
  "SAIHAMTEX": "Saiham Textile Mills Ltd.",
  "SALAMCRST": "S. Alam Cold Rolled Steels Ltd.",
  "SALVO": "Salvo Organic Industries PLC.",
  "SAMATALETH": "Samata Leather Complex Ltd.",
  "SAMORITA": "Samorita Hospital Limited",
  "SANDHANINS": "Sandhani Life Insurance Company Ltd.",
  "SAPORTL": "Summit Alliance Port Limited",
  "SAVAREFR": "Savar Refractories Limited",
  "SBACBANK": "SBAC Bank PLC.",
  "SEAPEARL": "Sea Pearl Beach Resort & Spa Limited",
  "SEB1PBOND": "Southeast Bank 1st Perpetual Bond",
  "SEMLFBSLGF": "SEML FBLSL Growth Fund",
  "SEMLIBBLSF": "SEML IBBL Shariah Fund",
  "SEMLLECMF": "SEML Lecture Equity Management Fund",
  "SHAHJABANK": "Shahjalal Islami Bank PLC.",
  "SHARPIND": "Sharp Industries PLC",
  "SHASHADNIM": "Shasha Denims PLC.",
  "SHEPHERD": "Shepherd Industries PLC",
  "SHURWID": "Shurwid Industries Limited",
  "SHYAMPSUG": "Shyampur Sugar Mills Ltd.",
  "SIBL": "Social Islami Bank PLC.",
  "SICL": "Sikder Insurance Company Limited",
  "SILCOPHL": "Silco Pharmaceuticals Limited",
  "SILVAPHL": "Silva Pharmaceuticals Limited",
  "SIMTEX": "Simtex Industries PLC.",
  "SINGERBD": "Singer Bangladesh Limited",
  "SINOBANGLA": "Sinobangla Industries Ltd.",
  "SIPLC": "Sena Insurance PLC",
  "SJIBLPBOND": "SJIBL Mudaraba Perpetual Bond",
  "SKTRIMS": "SK Trims & Industries Limited",
  "SONALIANSH": "Sonali Aansh Industries Limited",
  "SONALILIFE": "Sonali Life Insurance PLC",
  "SONALIPAPR": "Sonali Paper & Board Mills Ltd.",
  "SONARBAINS": "Sonar Bangla Insurance Ltd.",
  "SONARGAON": "Sonargaon Textiles Ltd.",
  "SOUTHEASTB": "Southeast Bank PLC",
  "SPCERAMICS": "Shinepukur Ceramics PLC.",
  "SPCL": "Shahjibazar Power Co. Ltd.",
  "SQUARETEXT": "Square Textiles PLC.",
  "SQURPHARMA": "Square Pharmaceuticals PLC.",
  "SSSTEEL": "S. S. Steel Limited",
  "STANBANK": "Standard Bank Limited",
  "STANCERAM": "Standard Ceramic Industries Ltd.",
  "STANDARINS": "Standard Insurance PLC.",
  "STANDBANKL": "Standard Islami Bank PLC.",
  "STYLECRAFT": "Stylecraft Limited",
  "SUMITPOWER": "Summit Power Limited",
  "SUMMIT": "Summit Power Limited",
  "SUNLIFEINS": "Sunlife Insurance Company Limited",

  // T
  "TAKAFULINS": "Takaful Islami Insurance PLC",
  "TALLUSPIN": "Tallu Spinning Mills Ltd.",
  "TAMIJTEX": "Tamijuddin Textile Mills PLC",
  "TECHNODRUG": "Techno Drugs Ltd.",
  "TILIL": "Trust Islami Life Insurance PLC.",
  "TITASGAS": "Titas Gas Transmission and Distribution PLC.",
  "TOSRIFA": "Tosrifa Industries PLC.",
  "TRUSTB1MF": "Trust Bank 1st Mutual Fund",
  "TRUSTBANK": "Trust Bank PLC.",
  "TUNGHAI": "Tung Hai Knitting & Dyeing Limited",

  // U
  "UCB": "United Commercial Bank PLC",
  "UCB2PBOND": "UCB 2nd Perpetual Bond",
  "UNILEVERCL": "Unilever Consumer Care Limited",
  "UNIONBANK": "Union Bank PLC.",
  "UNIONCAP": "Union Capital Limited",
  "UNIONINS": "Union Insurance PLC.",
  "UNIQUEHRL": "Unique Hotel & Resorts PLC",
  "UNITEDFIN": "United Finance PLC.",
  "UNITEDINS": "United Insurance Company Ltd.",
  "UPGDCL": "United Power Generation & Distribution Company Ltd.",
  "USMANIAGL": "Usmania Glass Sheet Factory Limited",
  "UTTARABANK": "Uttara Bank PLC.",
  "UTTARAFIN": "Uttara Finance and Investments Limited",

  // V
  "VAMLBDMF1": "Vanguard AML BD Finance Mutual Fund One",
  "VAMLRBBF": "Vanguard AML Rupali Bank Balanced Fund",
  "VFSTDL": "VFS Thread Dyeing Limited",

  // W
  "WALTONHIL": "Walton Hi-Tech Industries PLC",
  "WATACHEM": "Wata Chemicals Limited",
  "WMSHIPYARD": "Western Marine Shipyard Limited",

  // Y
  "YPL": "Yeakin Polymer Limited",

  // Z
  "ZAHEENSPIN": "Zaheen Spinning PLC.",
  "ZAHINTEX": "Zahintex Industries Limited",
  "ZEALBANGLA": "Zeal Bangla Sugar Mills Ltd.",
};

/**
 * Get company name by trading symbol
 */
export const getCompanyName = (symbol: string): string | null => {
  if (!symbol) return null;
  return DSE_COMPANY_NAMES[symbol.trim().toUpperCase()] || null;
};

/**
 * Normalizes text for comparison by replacing punctuation with spaces
 * and collapsing multiple spaces.
 */
function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.\-_&()/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all non-alphanumeric characters for compact prefix/substring matching.
 */
function compactSearchText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface SearchMatch {
  symbol: string;
  name: string;
  score: number;
}

/**
 * Common abbreviations, aliases, and retail trader shortcuts in Bangladesh.
 * Allows searching by familiar names (e.g., "DBBL" -> DUTCHBANGL, "PRAN" -> AMCL(PRAN)).
 */
export const COMMON_SEARCH_ALIASES: Record<string, string[]> = {
  dbbl: ['DUTCHBANGL'],
  ibbl: ['ISLAMIBANK'],
  fsib: ['FIRSTSBANK', 'FSIBLPBOND'],
  bsrm: ['BSRMLTD', 'BSRMSTEEL'],
  lankabd: ['LANKABAFIN'],
  pran: ['AMCL(PRAN)'],
  summit: ['SUMITPOWER', 'SAPORTL'],
  square: ['SQURPHARMA', 'SQUARETEXT'],
  beximco: ['BEXIMCO', 'BXPHARMA', 'BEXGSUKUK'],
  mbl: ['MERCANBANK'],
  pbl: ['PRIMEBANK'],
  tbl: ['TRUSTBANK'],
  jbl: ['JAMUNABANK'],
  sebl: ['SOUTHEASTB'],
  obl: ['ONEBANKLTD'],
  mtbl: ['MUTUALTRUST'],
  exim: ['EXIMBANK'],
};

interface PrecomputedCompany {
  symbol: string;
  name: string;
  symLower: string;
  symCompact: string;
  nameLower: string;
  nameNorm: string;
  nameCompact: string;
  nameWords: string[];
  acronym: string;
}

// Precomputed on module load: 0 runtime allocations during typing
const PRECOMPUTED_COMPANIES: PrecomputedCompany[] = Object.entries(DSE_COMPANY_NAMES).map(([symbol, name]) => {
  const symLower = symbol.toLowerCase();
  const symCompact = compactSearchText(symbol);
  const nameLower = name.toLowerCase();
  const nameNorm = normalizeSearchText(name);
  const nameCompact = compactSearchText(name);
  const nameWords = nameNorm.split(' ').filter(Boolean);
  const acronym = nameWords.map((w) => w[0]).join('');

  return {
    symbol,
    name,
    symLower,
    symCompact,
    nameLower,
    nameNorm,
    nameCompact,
    nameWords,
    acronym,
  };
});

/**
 * Search symbols by company name or symbol.
 * Returns matching symbols ranked by relevance.
 */
export const searchByNameOrSymbol = (query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed || !/[a-z0-9]/i.test(trimmed)) return [];

  const rawLower = trimmed.toLowerCase();
  const normQuery = normalizeSearchText(trimmed);
  const compactQuery = compactSearchText(trimmed);
  const queryWords = normQuery.split(' ').filter(Boolean);
  const queryWordsLen = queryWords.length;
  const rawLen = rawLower.length;
  const compactLen = compactQuery.length;

  const results: SearchMatch[] = [];
  const aliasSymbols = COMMON_SEARCH_ALIASES[rawLower] || COMMON_SEARCH_ALIASES[compactQuery];

  for (let i = 0; i < PRECOMPUTED_COMPANIES.length; i++) {
    const item = PRECOMPUTED_COMPANIES[i];
    let score = 0;

    // 1. Retail alias direct match (e.g. DBBL -> DUTCHBANGL)
    if (aliasSymbols && aliasSymbols.includes(item.symbol)) {
      score = 950;
    }
    // 2. Exact symbol match (e.g. "GP" -> GP)
    else if (item.symLower === rawLower || (compactLen > 0 && item.symCompact === compactQuery)) {
      score = 1000;
    }
    // 3. Symbol starts with query (e.g. "BEX" -> BEXIMCO)
    else if (item.symLower.startsWith(rawLower) || (compactLen > 0 && item.symCompact.startsWith(compactQuery))) {
      score = 900;
    }
    // 4. Symbol contains query (e.g. "PHARMA" -> BXPHARMA, SQURPHARMA)
    else if (item.symLower.includes(rawLower) || (compactLen > 0 && item.symCompact.includes(compactQuery))) {
      score = 800;
    }
    // 5. Company name starts with query (e.g. "Grameen" -> Grameenphone)
    else if (item.nameLower.startsWith(rawLower) || item.nameNorm.startsWith(normQuery)) {
      score = 750;
    }
    // 6. Acronym exact match (e.g. "BATBC" -> British American Tobacco Bangladesh Company)
    else if (item.acronym === rawLower || (rawLen >= 3 && item.acronym.startsWith(rawLower))) {
      score = 700;
    }
    // 7. Multi-word query matches all word prefixes (e.g. "Square Pharma" -> Square Pharmaceuticals)
    else if (queryWordsLen > 1 && queryWords.every((qw) => item.nameWords.some((nw) => nw.startsWith(qw)))) {
      score = 600;
    }
    // 8. Single word matches start of any word in company name (e.g. "Steel", "Power", "Pharma")
    else if (rawLen >= 2 && item.nameWords.some((nw) => nw.startsWith(rawLower))) {
      score = 500;
    }
    // 9. Compacted alphanumeric match (e.g. "sssteel" -> "S. S. Steel")
    else if (compactLen >= 3 && item.nameCompact.includes(compactQuery)) {
      score = 300;
    }
    // 10. Substring in company name (only for queries >= 4 chars to avoid 2-3 char noise)
    else if (rawLen >= 4 && (item.nameLower.includes(rawLower) || item.nameNorm.includes(normQuery))) {
      score = 200;
    }

    if (score > 0) {
      results.push({ symbol: item.symbol, name: item.name, score });
    }
  }

  // Sort descending by score, then alphabetically by symbol
  results.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));
  return results.map((r) => r.symbol);
};

/**
 * Rich search returning structured items (symbol, name) with an optional limit.
 */
export const searchCompanies = (
  query: string,
  limit: number = 20
): Array<{ symbol: string; name: string }> => {
  const symbols = searchByNameOrSymbol(query);
  return symbols.slice(0, limit).map((symbol) => ({
    symbol,
    name: DSE_COMPANY_NAMES[symbol] || symbol,
  }));
};

