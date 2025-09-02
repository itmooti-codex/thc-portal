; (() => {
    'use strict';

    // ------------------ YOUR DATASETS ------------------
    // Put all your dropdown datasets here, keyed by a name you set on data-source
    const DATASETS = {
        companyname: [
            { "value": "5Leaf", "count": 10 },
            { "value": "7ACRES", "count": 2 },
            { "value": "ANTG", "count": 22 },
            { "value": "AURA Therapeutics", "count": 18 },
            { "value": "Adaya", "count": 6 },
            { "value": "Aelleve", "count": 6 },
            { "value": "Alfie Therapeutics", "count": 20 },
            { "value": "Alma Cannabis", "count": 19 },
            { "value": "Althea", "count": 3 },
            { "value": "Amapola Lane", "count": 2 },
            { "value": "Ananda Hemp", "count": 7 },
            { "value": "Aurora", "count": 17 },
            { "value": "Avani", "count": 12 },
            { "value": "BATHERA", "count": 2 },
            { "value": "BOB", "count": 10 },
            { "value": "Beacon Medical", "count": 29 },
            { "value": "Bedrocan", "count": 1 },
            { "value": "Billie", "count": 3 },
            { "value": "BioCann", "count": 20 },
            { "value": "Bloom Botanicals", "count": 1 },
            { "value": "Blue Mountain Global", "count": 2 },
            { "value": "Blüm", "count": 4 },
            { "value": "Bondi Cannabis Company", "count": 1 },
            { "value": "Botanitech", "count": 18 },
            { "value": "Botannic", "count": 2 },
            { "value": "Broken Coast", "count": 5 },
            { "value": "Budi", "count": 4 },
            { "value": "Byron Bay Medicinal", "count": 4 },
            { "value": "Byron Bioceuticals", "count": 1 },
            { "value": "CP Medical", "count": 2 },
            { "value": "Cali-X", "count": 2 },
            { "value": "CanDe", "count": 2 },
            { "value": "CannRix", "count": 4 },
            { "value": "Cannabate", "count": 5 },
            { "value": "Cannatrek", "count": 44 },
            { "value": "Canntic Flower", "count": 2 },
            { "value": "Chemovar", "count": 13 },
            { "value": "CherryCo", "count": 8 },
            { "value": "Circle", "count": 8 },
            { "value": "Concessions", "count": 9 },
            { "value": "Cookies", "count": 1 },
            { "value": "Cornerfield", "count": 11 },
            { "value": "Coronel Buendia", "count": 5 },
            { "value": "Craft Botanics", "count": 7 },
            { "value": "CraftPlant", "count": 2 },
            { "value": "Cultiva", "count": 12 },
            { "value": "Curaleaf", "count": 2 },
            { "value": "Curo", "count": 17 },
            { "value": "Cymra Life Sciences", "count": 1 },
            { "value": "DENTYS", "count": 2 },
            { "value": "DOJA", "count": 1 },
            { "value": "Daily Special", "count": 1 },
            { "value": "Delta Tetra", "count": 3 },
            { "value": "Doja Medical", "count": 2 },
            { "value": "Dr Watson", "count": 20 },
            { "value": "Dragonfly", "count": 1 },
            { "value": "Easy Buds", "count": 5 },
            { "value": "EasyDose", "count": 18 },
            { "value": "Elevated Extracts", "count": 4 },
            { "value": "Elysian Botanics", "count": 1 },
            { "value": "Endoca", "count": 8 },
            { "value": "Entoura", "count": 17 },
            { "value": "Evergreen Pharmacare", "count": 1 },
            { "value": "Exotican", "count": 2 },
            { "value": "FOMO", "count": 2 },
            { "value": "GROW® Group", "count": 7 },
            { "value": "Good Supply", "count": 4 },
            { "value": "Grandiosa", "count": 27 },
            { "value": "Green Gold Trading", "count": 8 },
            { "value": "Green Rises by Hale Farm", "count": 5 },
            { "value": "Green Safari Pharma", "count": 2 },
            { "value": "Green Shepherd", "count": 1 },
            { "value": "GreenLit Medical", "count": 1 },
            { "value": "Greena", "count": 5 },
            { "value": "Greenline Therapy", "count": 7 },
            { "value": "HTL Helius Therapeutics Limited (NZ)", "count": 4 },
            { "value": "Hana Wellness", "count": 14 },
            { "value": "Harbour", "count": 3 },
            { "value": "Hash Labs", "count": 3 },
            { "value": "Heirloom", "count": 3 },
            { "value": "Helix", "count": 4 },
            { "value": "Herb", "count": 1 },
            { "value": "Heyday Medical", "count": 15 },
            { "value": "High Country", "count": 5 },
            { "value": "Humacology", "count": 9 },
            { "value": "HummingBud", "count": 1 },
            { "value": "Hypera", "count": 2 },
            { "value": "IGNITE", "count": 1 },
            { "value": "IndiMed", "count": 18 },
            { "value": "IrdcMed", "count": 2 },
            { "value": "Isospec", "count": 2 },
            { "value": "Jungle Boys", "count": 3 },
            { "value": "KANNAVIIS", "count": 1 },
            { "value": "KIKUYA", "count": 3 },
            { "value": "Karoo Bioscience", "count": 2 },
            { "value": "Kayf Industries", "count": 1 },
            { "value": "Kiewa", "count": 2 },
            { "value": "Kind Medical", "count": 22 },
            { "value": "Kola", "count": 2 },
            { "value": "Kälafornia", "count": 11 },
            { "value": "Lady J", "count": 1 },
            { "value": "Levin Health", "count": 8 },
            { "value": "Limited Edition Labs", "count": 6 },
            { "value": "Little Green Pharma (LGP)", "count": 22 },
            { "value": "Lot420", "count": 1 },
            { "value": "Lotus Genetics", "count": 2 },
            { "value": "Lumir", "count": 6 },
            { "value": "Lush Labs", "count": 2 },
            { "value": "MARY LANE", "count": 1 },
            { "value": "MCD", "count": 2 },
            { "value": "MEDCAN Australia", "count": 37 },
            { "value": "MIDZ", "count": 1 },
            { "value": "MJ POPs by Medi Extract", "count": 5 },
            { "value": "MUNCHIESTASH", "count": 3 },
            { "value": "Maali", "count": 10 },
            { "value": "MedReleaf Australia", "count": 1 },
            { "value": "MedTEC Pharma", "count": 9 },
            { "value": "MediC8", "count": 6 },
            { "value": "MediCabilis", "count": 13 },
            { "value": "Medibis", "count": 3 },
            { "value": "Medibliss", "count": 1 },
            { "value": "Medical Cannabis Australia (MCA)", "count": 17 },
            { "value": "Medigrowth Australia", "count": 13 },
            { "value": "Mediquest", "count": 6 },
            { "value": "Medlab Clinical", "count": 2 },
            { "value": "MiniBuds", "count": 4 },
            { "value": "MotherLabs", "count": 2 },
            { "value": "Motherplant", "count": 16 },
            { "value": "Mystery Mountain", "count": 13 },
            { "value": "NUGTz", "count": 5 },
            { "value": "Nadarra Health", "count": 2 },
            { "value": "NectarTek", "count": 17 },
            { "value": "Nova Therapeutics", "count": 4 },
            { "value": "OG Fire", "count": 3 },
            { "value": "Originals", "count": 2 },
            { "value": "Oz Medicann Group (OMG)", "count": 15 },
            { "value": "OzSun", "count": 11 },
            { "value": "Packs", "count": 2 },
            { "value": "Paradise Therapeutics", "count": 3 },
            { "value": "Patch Therapeutics", "count": 1 },
            { "value": "Peace Naturals", "count": 4 },
            { "value": "Peak Harvest", "count": 1 },
            { "value": "PharmaCrop ", "count": 11 },
            { "value": "Phytoca", "count": 27 },
            { "value": "Pouch", "count": 8 },
            { "value": "Precision Pharmaceuticals", "count": 8 },
            { "value": "Predose", "count": 3 },
            { "value": "Promethean BioPharma", "count": 2 },
            { "value": "PureKann by Medi Extract", "count": 14 },
            { "value": "Quest Biotech Pharma (QBP)", "count": 13 },
            { "value": "RAP Med", "count": 3 },
            { "value": "Rainbow Region", "count": 8 },
            { "value": "Redecan", "count": 2 },
            { "value": "Releaf Dispensaries", "count": 4 },
            { "value": "Relic", "count": 1 },
            { "value": "Rua Bioscience", "count": 6 },
            { "value": "SOL", "count": 3 },
            { "value": "SOMA OG", "count": 4 },
            { "value": "SOMAÍ Pharmaceuticals", "count": 33 },
            { "value": "Safmed Botanicals Australia", "count": 4 },
            { "value": "SatiVite", "count": 17 },
            { "value": "Sherpa Big Bag", "count": 3 },
            { "value": "Single Estate", "count": 10 },
            { "value": "Smile", "count": 1 },
            { "value": "Spectrum Therapeutics", "count": 22 },
            { "value": "Spindrift Therapeutics", "count": 1 },
            { "value": "Spirit Bear", "count": 3 },
            { "value": "Spyn by Hale Farm", "count": 5 },
            { "value": "Stanley Brothers", "count": 6 },
            { "value": "Stenocare", "count": 2 },
            { "value": "Superbly Green", "count": 11 },
            { "value": "Superseed", "count": 8 },
            { "value": "SyqeMedical", "count": 1 },
            { "value": "TWD", "count": 3 },
            { "value": "Tasmanian Botanics", "count": 22 },
            { "value": "Tastee Bitz", "count": 1 },
            { "value": "Temple", "count": 1 },
            { "value": "TerpHogz", "count": 4 },
            { "value": "ThanksBud", "count": 4 },
            { "value": "The Natural Flower Company", "count": 1 },
            { "value": "Theragreen", "count": 4 },
            { "value": "Tilray Medical", "count": 7 },
            { "value": "Tofino Ripper", "count": 3 },
            { "value": "Topz & Popz", "count": 3 },
            { "value": "Tri-chome Australia", "count": 1 },
            { "value": "Turkken", "count": 1 },
            { "value": "Tweed", "count": 2 },
            { "value": "Uncle Oz", "count": 7 },
            { "value": "Uncommon Cannabis Co", "count": 1 },
            { "value": "Upstate", "count": 14 },
            { "value": "UrbanLeaf", "count": 8 },
            { "value": "Vivace", "count": 3 },
            { "value": "Wellness Life", "count": 5 },
            { "value": "West Coast Palms", "count": 5 },
            { "value": "Whistler", "count": 2 },
            { "value": "White Label", "count": 10 },
            { "value": "WholeLife Botanicals", "count": 23 },
            { "value": "Wildflower", "count": 5 },
            { "value": "Xativa", "count": 3 },
            { "value": "Xetra", "count": 7 },
            { "value": "Zaari", "count": 4 },
            { "value": "aruma labs", "count": 10 },
            { "value": "iX Syrinx", "count": 3 },
            { "value": "satipharm", "count": 1 },
            { "value": "sundaze", "count": 25 }
        ],
        chemovar: [
            {
                "value": "Green Gelato",
                "count": 13
            },
            {
                "value": "Pink Kush",
                "count": 9
            },
            {
                "value": "Somai Mac 22",
                "count": 9
            },
            {
                "value": "Blue Dream",
                "count": 8
            },
            {
                "value": "Charlotte's Angel",
                "count": 8
            },
            {
                "value": "Girl Scout Cookies",
                "count": 8
            },
            {
                "value": "Gorilla Glue #4",
                "count": 8
            },
            {
                "value": "OG Kush",
                "count": 7
            },
            {
                "value": "Black Cherry Punch",
                "count": 6
            },
            {
                "value": "Blue Cheese",
                "count": 6
            },
            {
                "value": "Kush Cookie",
                "count": 6
            },
            {
                "value": "Afghan Kush",
                "count": 5
            },
            {
                "value": "El Jefe (The Boss)",
                "count": 5
            },
            {
                "value": "Futura",
                "count": 5
            },
            {
                "value": "Ghost Train Haze",
                "count": 5
            },
            {
                "value": "Indica",
                "count": 5
            },
            {
                "value": "Jet Fuel Gelato",
                "count": 5
            },
            {
                "value": "Meringue",
                "count": 5
            },
            {
                "value": "Pineapple Express",
                "count": 5
            },
            {
                "value": "Super Lemon Haze",
                "count": 5
            },
            {
                "value": "Wedding Cake",
                "count": 5
            },
            {
                "value": "cks1",
                "count": 5
            },
            {
                "value": "cksb",
                "count": 5
            },
            {
                "value": "Apples and Bananas ",
                "count": 4
            },
            {
                "value": "Banjo",
                "count": 4
            },
            {
                "value": "Batch dependant",
                "count": 4
            },
            {
                "value": "Colombian Haze",
                "count": 4
            },
            {
                "value": "Critical Kush",
                "count": 4
            },
            {
                "value": "Euforia® (Euforia Skunk)",
                "count": 4
            },
            {
                "value": "Jack Herer",
                "count": 4
            },
            {
                "value": "Jilly Bean",
                "count": 4
            },
            {
                "value": "Night Queen",
                "count": 4
            },
            {
                "value": "Northern Lights",
                "count": 4
            },
            {
                "value": "Sativa",
                "count": 4
            },
            {
                "value": "Sour OG Cheese",
                "count": 4
            },
            {
                "value": "Space Cake",
                "count": 4
            },
            {
                "value": "Tangerine Widow",
                "count": 4
            },
            {
                "value": "Amnesia Haze",
                "count": 3
            },
            {
                "value": "Banana OG",
                "count": 3
            },
            {
                "value": "Blueberry",
                "count": 3
            },
            {
                "value": "C53",
                "count": 3
            },
            {
                "value": "COG-100",
                "count": 3
            },
            {
                "value": "Crossbow",
                "count": 3
            },
            {
                "value": "Euforia",
                "count": 3
            },
            {
                "value": "Euphoria",
                "count": 3
            },
            {
                "value": "GMO Cookies",
                "count": 3
            },
            {
                "value": "Gorilla Glue ",
                "count": 3
            },
            {
                "value": "Hindu Kush",
                "count": 3
            },
            {
                "value": "Ice Cream Cake",
                "count": 3
            },
            {
                "value": "Jealousy",
                "count": 3
            },
            {
                "value": "Kosher Kush",
                "count": 3
            },
            {
                "value": "Kosher Kush (aka Kosher OG )",
                "count": 3
            },
            {
                "value": "Lemon Skunk",
                "count": 3
            },
            {
                "value": "MAC-1",
                "count": 3
            },
            {
                "value": "Masterkusch",
                "count": 3
            },
            {
                "value": "Mimosa",
                "count": 3
            },
            {
                "value": "Original Blitz",
                "count": 3
            },
            {
                "value": "Peanut Butter Soufflé ",
                "count": 3
            },
            {
                "value": "Pennywise",
                "count": 3
            },
            {
                "value": "Pink Kush (Relative of OG Kush)",
                "count": 3
            },
            {
                "value": "Royal Cookies",
                "count": 3
            },
            {
                "value": "Sour Chocolate Diesel",
                "count": 3
            },
            {
                "value": "Sourdough",
                "count": 3
            },
            {
                "value": "Tangie Chem",
                "count": 3
            },
            {
                "value": "Ultra Sour",
                "count": 3
            },
            {
                "value": "Unknown",
                "count": 3
            },
            {
                "value": "Vanilla Cream Cookies",
                "count": 3
            },
            {
                "value": "White Widow",
                "count": 3
            },
            {
                "value": "Afgan Kush (Cold Creek Kush)",
                "count": 2
            },
            {
                "value": "Afghan Layer Cake",
                "count": 2
            },
            {
                "value": "Agent Orange",
                "count": 2
            },
            {
                "value": "Amnesia Fast",
                "count": 2
            },
            {
                "value": "Apple Fritter",
                "count": 2
            },
            {
                "value": "Apples and Bananas",
                "count": 2
            },
            {
                "value": "BISCOTTI",
                "count": 2
            },
            {
                "value": "Bafokeng Choice ",
                "count": 2
            },
            {
                "value": "Bedrocan® (Proprietary)",
                "count": 2
            },
            {
                "value": "Berry Gelato",
                "count": 2
            },
            {
                "value": "Black",
                "count": 2
            },
            {
                "value": "Black Triangle",
                "count": 2
            },
            {
                "value": "Blackberry Moonrocks",
                "count": 2
            },
            {
                "value": "Blend",
                "count": 2
            },
            {
                "value": "Bling Blaow",
                "count": 2
            },
            {
                "value": "Blue Cheese 101",
                "count": 2
            },
            {
                "value": "Blue Dream & Charlottes Angel",
                "count": 2
            },
            {
                "value": "Blueberry Hash x Diesel",
                "count": 2
            },
            {
                "value": "Blueberry Haze",
                "count": 2
            },
            {
                "value": "Blueberry Kush",
                "count": 2
            },
            {
                "value": "BuBBa Mandarin Cookies",
                "count": 2
            },
            {
                "value": "Cake City",
                "count": 2
            },
            {
                "value": "Candy Pavé",
                "count": 2
            },
            {
                "value": "Cannabis Sativa L",
                "count": 2
            },
            {
                "value": "Cannatonic",
                "count": 2
            },
            {
                "value": "Cape Cookies",
                "count": 2
            },
            {
                "value": "Cara Cara",
                "count": 2
            },
            {
                "value": "Chatterbox",
                "count": 2
            },
            {
                "value": "Cherry Bomb Kush",
                "count": 2
            },
            {
                "value": "Choc Cheddar",
                "count": 2
            },
            {
                "value": "Colour of Space",
                "count": 2
            },
            {
                "value": "Creamy Kees ",
                "count": 2
            },
            {
                "value": "Critical Mass",
                "count": 2
            },
            {
                "value": "Daily Grape",
                "count": 2
            },
            {
                "value": "Durban Poison",
                "count": 2
            },
            {
                "value": "Eiffel Sour",
                "count": 2
            },
            {
                "value": "Electric Honeydew",
                "count": 2
            },
            {
                "value": "Euforia Skunk",
                "count": 2
            },
            {
                "value": "Eve (Proprietary)",
                "count": 2
            },
            {
                "value": "Eve ANTG proprietary CBD dominant strain",
                "count": 2
            },
            {
                "value": "Facetz",
                "count": 2
            },
            {
                "value": "Frosted Cookies",
                "count": 2
            },
            {
                "value": "Frozen Lemons",
                "count": 2
            },
            {
                "value": "Galactic Cake",
                "count": 2
            },
            {
                "value": "Gastro Pop",
                "count": 2
            },
            {
                "value": "Gelato #33",
                "count": 2
            },
            {
                "value": "Ghost OG",
                "count": 2
            },
            {
                "value": "Gorilla Glue 4",
                "count": 2
            },
            {
                "value": "Grape Diamond",
                "count": 2
            },
            {
                "value": "Grape Galena",
                "count": 2
            },
            {
                "value": "Grapefruit Gift",
                "count": 2
            },
            {
                "value": "Grapezilla",
                "count": 2
            },
            {
                "value": "Headband",
                "count": 2
            },
            {
                "value": "Hemp",
                "count": 2
            },
            {
                "value": "Huckleberry",
                "count": 2
            },
            {
                "value": "Kate",
                "count": 2
            },
            {
                "value": "Kush Cookies",
                "count": 2
            },
            {
                "value": "Kush Mint",
                "count": 2
            },
            {
                "value": "Kush Sap",
                "count": 2
            },
            {
                "value": "Lemon Cherry Gelato",
                "count": 2
            },
            {
                "value": "Lemon Meringue",
                "count": 2
            },
            {
                "value": "Lemon Sour Diesel",
                "count": 2
            },
            {
                "value": "Lemon Zorilla",
                "count": 2
            },
            {
                "value": "Liquid Imagination",
                "count": 2
            },
            {
                "value": "Mango Sour",
                "count": 2
            },
            {
                "value": "Mokum's Tulip",
                "count": 2
            },
            {
                "value": "Monkey Business",
                "count": 2
            },
            {
                "value": "Nebula II",
                "count": 2
            },
            {
                "value": "Ninja Fruit",
                "count": 2
            },
            {
                "value": "OG Kush x Wedding Cake",
                "count": 2
            },
            {
                "value": "Orange Bud",
                "count": 2
            },
            {
                "value": "Outlaw Amnesia ",
                "count": 2
            },
            {
                "value": "Pineapple God",
                "count": 2
            },
            {
                "value": "Pineapple OG",
                "count": 2
            },
            {
                "value": "Proprietary",
                "count": 2
            },
            {
                "value": "Purple Churro",
                "count": 2
            },
            {
                "value": "Queen Curvee",
                "count": 2
            },
            {
                "value": "Sensi Star",
                "count": 2
            },
            {
                "value": "Sherbert Glue",
                "count": 2
            },
            {
                "value": "Slurricane",
                "count": 2
            },
            {
                "value": "Soft Serve",
                "count": 2
            },
            {
                "value": "Strawberry Cake",
                "count": 2
            },
            {
                "value": "Strawberry Diesel",
                "count": 2
            },
            {
                "value": "Super Boof",
                "count": 2
            },
            {
                "value": "Tassie Highlands",
                "count": 2
            },
            {
                "value": "The Big Mango",
                "count": 2
            },
            {
                "value": "The Valley",
                "count": 2
            },
            {
                "value": "Theia",
                "count": 2
            },
            {
                "value": "Tiger Cake",
                "count": 2
            },
            {
                "value": "Tropical Sherbet",
                "count": 2
            },
            {
                "value": "Tropicana Cherry",
                "count": 2
            },
            {
                "value": "Wappa",
                "count": 2
            },
            {
                "value": "Wedding Cake x Animal Cookies",
                "count": 2
            },
            {
                "value": "White Panther",
                "count": 2
            },
            {
                "value": "Wild Thailand",
                "count": 2
            },
            {
                "value": " Ghost OG x Neville’s Wreck",
                "count": 1
            },
            {
                "value": "(Cookies Gelato)",
                "count": 1
            },
            {
                "value": "10G's",
                "count": 1
            },
            {
                "value": "33 splitter",
                "count": 1
            },
            {
                "value": "91k",
                "count": 1
            },
            {
                "value": "ACDC",
                "count": 1
            },
            {
                "value": "Acai Berry",
                "count": 1
            },
            {
                "value": "Afgani Kush x Blackberry",
                "count": 1
            },
            {
                "value": "Afghan Haze x Skunk",
                "count": 1
            },
            {
                "value": "Afghan haze x Candy Kush CBD",
                "count": 1
            },
            {
                "value": "After Eighth",
                "count": 1
            },
            {
                "value": "Afternoon Tea",
                "count": 1
            },
            {
                "value": "Alien Coffee",
                "count": 1
            },
            {
                "value": "Alien OG",
                "count": 1
            },
            {
                "value": "Ameera",
                "count": 1
            },
            {
                "value": "Amnesia",
                "count": 1
            },
            {
                "value": "Amnesia Haze Smalls",
                "count": 1
            },
            {
                "value": "Amsterdam Amnesia",
                "count": 1
            },
            {
                "value": "Animal Runtz",
                "count": 1
            },
            {
                "value": "Animal Z",
                "count": 1
            },
            {
                "value": "Apes in Space",
                "count": 1
            },
            {
                "value": "Apex OG",
                "count": 1
            },
            {
                "value": "Apple Blossom",
                "count": 1
            },
            {
                "value": "Aurora Australis (Southern Lights)",
                "count": 1
            },
            {
                "value": "Bacio Gelato",
                "count": 1
            },
            {
                "value": "Baked Animal",
                "count": 1
            },
            {
                "value": "Bamba #5",
                "count": 1
            },
            {
                "value": "Banana Cream",
                "count": 1
            },
            {
                "value": "Banana Durban Gushers",
                "count": 1
            },
            {
                "value": "Banana Gas",
                "count": 1
            },
            {
                "value": "Banana Mints",
                "count": 1
            },
            {
                "value": "Bazookas",
                "count": 1
            },
            {
                "value": "Beast Head OG",
                "count": 1
            },
            {
                "value": "Berry Animal (Berry Cream Puff x Animal Face)",
                "count": 1
            },
            {
                "value": "Berry Cream Puff",
                "count": 1
            },
            {
                "value": "Berry Lemonade",
                "count": 1
            },
            {
                "value": "Berry Melody",
                "count": 1
            },
            {
                "value": "Big Red Beard",
                "count": 1
            },
            {
                "value": "Biscotti Gushers",
                "count": 1
            },
            {
                "value": "Biscotti Pancakes",
                "count": 1
            },
            {
                "value": "Biscotti Smalls",
                "count": 1
            },
            {
                "value": "Black Amber",
                "count": 1
            },
            {
                "value": "Black Candyland",
                "count": 1
            },
            {
                "value": "Black Cherry Pie",
                "count": 1
            },
            {
                "value": "Black Cherry Punch #2 + (Slurricane + Margy Mints)",
                "count": 1
            },
            {
                "value": "Black Cherry Punch (Purple Punch x Black Cherry Pie)",
                "count": 1
            },
            {
                "value": "Black Dolato",
                "count": 1
            },
            {
                "value": "Black Mamba",
                "count": 1
            },
            {
                "value": "Black Runtz",
                "count": 1
            },
            {
                "value": "Black Widow",
                "count": 1
            },
            {
                "value": "Blackberry Pie",
                "count": 1
            },
            {
                "value": "Blue Dream (Blueberry x Haze)",
                "count": 1
            },
            {
                "value": "Blue Skies",
                "count": 1
            },
            {
                "value": "Blue Tango",
                "count": 1
            },
            {
                "value": "Blue Z",
                "count": 1
            },
            {
                "value": "Blue Zushi",
                "count": 1
            },
            {
                "value": "Blueberry Cheese",
                "count": 1
            },
            {
                "value": "Blueberry Frost",
                "count": 1
            },
            {
                "value": "Blueberry Muffins",
                "count": 1
            },
            {
                "value": "Blueberry OG x GG #4",
                "count": 1
            },
            {
                "value": "Blunicorn",
                "count": 1
            },
            {
                "value": "Bolo Runtz",
                "count": 1
            },
            {
                "value": "Brissy Berry 26",
                "count": 1
            },
            {
                "value": "Britneys Frozen Lemons (Capulator)",
                "count": 1
            },
            {
                "value": "BuBBa Jungle Pie",
                "count": 1
            },
            {
                "value": "BubbleGum Sherbert",
                "count": 1
            },
            {
                "value": "Burmese",
                "count": 1
            },
            {
                "value": "C37",
                "count": 1
            },
            {
                "value": "CBD Kush",
                "count": 1
            },
            {
                "value": "CPZ",
                "count": 1
            },
            {
                "value": "Cake Batter",
                "count": 1
            },
            {
                "value": "Cake Crasher",
                "count": 1
            },
            {
                "value": "Cake Krusher",
                "count": 1
            },
            {
                "value": "Caldera",
                "count": 1
            },
            {
                "value": "California Orange",
                "count": 1
            },
            {
                "value": "Candy Blast",
                "count": 1
            },
            {
                "value": "Candy Cookies",
                "count": 1
            },
            {
                "value": "Candy Kush CBD",
                "count": 1
            },
            {
                "value": "Candy Store",
                "count": 1
            },
            {
                "value": "Candylands",
                "count": 1
            },
            {
                "value": "Cannatonic Special",
                "count": 1
            },
            {
                "value": "Cap Junk*",
                "count": 1
            },
            {
                "value": "Cap Junky",
                "count": 1
            },
            {
                "value": "Cappuccino",
                "count": 1
            },
            {
                "value": "Caramel Cake x The Fizz",
                "count": 1
            },
            {
                "value": "Carmagnola",
                "count": 1
            },
            {
                "value": "Cereal Dreams",
                "count": 1
            }],
        species: [
            {
                "value": "Indica dominant",
                "count": 457
            },
            {
                "value": "Balanced Hybrid",
                "count": 370
            },
            {
                "value": "Sativa dominant",
                "count": 232
            },
            {
                "value": "Indica",
                "count": 169
            },
            {
                "value": "Sativa",
                "count": 133
            }
        ],
        ratio: [
            {
                "value": "Low CBD, High THC",
                "count": 659
            },
            {
                "value": "THC only",
                "count": 387
            },
            {
                "value": "Balanced",
                "count": 172
            },
            {
                "value": "High CBD, Low THC",
                "count": 102
            },
            {
                "value": "CBD only",
                "count": 87
            },
            {
                "value": "Other (No THC/CBD)",
                "count": 10
            }
        ],
        tga_category: [
            {
                "value": "Category 5",
                "count": 1044
            },
            {
                "value": "Category 3",
                "count": 147
            },
            {
                "value": "Category 1",
                "count": 112
            },
            {
                "value": "Category 2",
                "count": 71
            },
            {
                "value": "Category 4",
                "count": 43
            }
        ],
        feelings: [
            {
                "value": "Relaxed",
                "count": 481
            },
            {
                "value": "Comfortable",
                "count": 346
            },
            {
                "value": "Less Pain",
                "count": 181
            },
            {
                "value": "Sleepy",
                "count": 169
            },
            {
                "value": "Happy",
                "count": 109
            },
            {
                "value": "Dry Mouth",
                "count": 101
            },
            {
                "value": "Hungry",
                "count": 99
            },
            {
                "value": "Positive",
                "count": 88
            },
            {
                "value": "Thirsty",
                "count": 88
            },
            {
                "value": "Zoned Out",
                "count": 80
            },
            {
                "value": "Tired",
                "count": 78
            },
            {
                "value": "Uplifted",
                "count": 76
            },
            {
                "value": "Pain free",
                "count": 74
            },
            {
                "value": "Dreamy",
                "count": 73
            },
            {
                "value": "Couchlocked",
                "count": 63
            },
            {
                "value": "Euphoric",
                "count": 59
            },
            {
                "value": "Focussed",
                "count": 56
            },
            {
                "value": "Motivated",
                "count": 50
            },
            {
                "value": "Tingly",
                "count": 50
            },
            {
                "value": "Red Eyes",
                "count": 49
            },
            {
                "value": "Energetic",
                "count": 37
            },
            {
                "value": "Foggy",
                "count": 35
            },
            {
                "value": "Talkative",
                "count": 34
            },
            {
                "value": "Creative",
                "count": 26
            },
            {
                "value": "Dry Eyes",
                "count": 26
            },
            {
                "value": "Giggly",
                "count": 26
            },
            {
                "value": "Refreshed",
                "count": 20
            },
            {
                "value": "Aroused",
                "count": 17
            },
            {
                "value": "Conscientious",
                "count": 13
            },
            {
                "value": "No Appetite",
                "count": 9
            }
        ],
        conditions: [
            {
                "value": "Anxiety",
                "count": 557
            },
            {
                "value": "Chronic pain",
                "count": 518
            },
            {
                "value": "Insomnia",
                "count": 419
            },
            {
                "value": "Depression",
                "count": 310
            },
            {
                "value": "Post Traumatic Stress Disorder (PTSD)",
                "count": 250
            },
            {
                "value": "ADHD",
                "count": 215
            },
            {
                "value": "Neuropathic pain",
                "count": 166
            },
            {
                "value": "Autism Spectrum Disorder (ASD)",
                "count": 114
            },
            {
                "value": "Arthritis",
                "count": 77
            },
            {
                "value": "Major depression",
                "count": 75
            },
            {
                "value": "Migraine",
                "count": 75
            },
            {
                "value": "Fibromyalgia",
                "count": 74
            },
            {
                "value": "Muscle pain",
                "count": 74
            },
            {
                "value": "Generalised anxiety disorder",
                "count": 65
            },
            {
                "value": "Inflammation",
                "count": 52
            },
            {
                "value": "Cancer pain",
                "count": 44
            },
            {
                "value": "Irritable Bowel Syndrome (IBS)",
                "count": 44
            },
            {
                "value": "Multiple sclerosis (MS)",
                "count": 34
            },
            {
                "value": "Osteoarthritis",
                "count": 34
            },
            {
                "value": "Sleep wake disorder",
                "count": 34
            },
            {
                "value": "Endometriosis",
                "count": 31
            },
            {
                "value": "Headache",
                "count": 31
            },
            {
                "value": "Panic disorder",
                "count": 31
            },
            {
                "value": "Mood disorder",
                "count": 30
            },
            {
                "value": "Obsessive compulsive disorder (OCD)",
                "count": 29
            },
            {
                "value": "Restless legs syndrome",
                "count": 28
            },
            {
                "value": "Social anxiety disorder",
                "count": 24
            },
            {
                "value": "Rheumatoid arthritis",
                "count": 23
            },
            {
                "value": "Epilepsy",
                "count": 21
            },
            {
                "value": "Chronic fatigue syndrome",
                "count": 20
            },
            {
                "value": "Irritable Bowel Disorder (IBD)",
                "count": 19
            },
            {
                "value": "Fatigue",
                "count": 17
            },
            {
                "value": "Seizure management",
                "count": 17
            },
            {
                "value": "Spasticity",
                "count": 15
            },
            {
                "value": "Ehlers-Danlos syndrome",
                "count": 14
            },
            {
                "value": "Bipolar disorder",
                "count": 13
            },
            {
                "value": "Crohn's disease",
                "count": 11
            },
            {
                "value": "Premenstrual syndrome (PMS)",
                "count": 11
            },
            {
                "value": "Anorexia",
                "count": 10
            },
            {
                "value": "Muscle rigidity",
                "count": 9
            },
            {
                "value": "Complex regional pain syndrome (CRPS)",
                "count": 8
            },
            {
                "value": "Neuropathy",
                "count": 8
            },
            {
                "value": "Agitation",
                "count": 7
            },
            {
                "value": "Chemotherapy induced nausea and vomiting (CINV)",
                "count": 7
            },
            {
                "value": "Psoriatic arthritis",
                "count": 7
            },
            {
                "value": "Tinnitus",
                "count": 7
            },
            {
                "value": "Trigeminal neuralgia",
                "count": 5
            },
            {
                "value": "Chronic headache disorder",
                "count": 4
            },
            {
                "value": "Neuralgia",
                "count": 4
            },
            {
                "value": "Peripheral neuropathy",
                "count": 4
            },
            {
                "value": "Smoking cessation assistance",
                "count": 4
            },
            {
                "value": "Ulcerative colitis",
                "count": 4
            },
            {
                "value": "Behavioural problem",
                "count": 3
            },
            {
                "value": "Body dysmorphic disorder",
                "count": 3
            },
            {
                "value": "COPD",
                "count": 3
            },
            {
                "value": "Cerebral palsy",
                "count": 3
            },
            {
                "value": "Cervical spondylosis",
                "count": 3
            },
            {
                "value": "Schizophrenia",
                "count": 3
            },
            {
                "value": "Asthma",
                "count": 2
            },
            {
                "value": "Dermatitis",
                "count": 2
            },
            {
                "value": "Insulin dependent diabetes mellitus",
                "count": 2
            },
            {
                "value": "Lupus",
                "count": 2
            },
            {
                "value": "Psoriasis",
                "count": 2
            },
            {
                "value": "Systemic inflammatory response syndrome",
                "count": 2
            },
            {
                "value": "Tourette's syndrome",
                "count": 2
            },
            {
                "value": "Vertigo",
                "count": 2
            },
            {
                "value": "Bell's palsy",
                "count": 1
            },
            {
                "value": "Blood glucose management",
                "count": 1
            },
            {
                "value": "Cannabis use disorder",
                "count": 1
            },
            {
                "value": "Cognitive decline",
                "count": 1
            },
            {
                "value": "Dementia",
                "count": 1
            },
            {
                "value": "Dizziness",
                "count": 1
            },
            {
                "value": "Eczema",
                "count": 1
            },
            {
                "value": "Essential tremor",
                "count": 1
            },
            {
                "value": "Gastroparesis",
                "count": 1
            },
            {
                "value": "Hashimoto's disease",
                "count": 1
            },
            {
                "value": "Improve cerebral circulation",
                "count": 1
            },
            {
                "value": "Mast cell activation syndrome",
                "count": 1
            },
            {
                "value": "Movement disorder",
                "count": 1
            },
            {
                "value": "Narcolepsy",
                "count": 1
            },
            {
                "value": "Sleeplessness",
                "count": 1
            },
            {
                "value": "Tardive dyskinesia",
                "count": 1
            }
        ],
        symptoms: [
            {
                "value": "Anxiety",
                "count": 506
            },
            {
                "value": "Back pain",
                "count": 430
            },
            {
                "value": "Depression",
                "count": 312
            },
            {
                "value": "Insomnia",
                "count": 309
            },
            {
                "value": "Nerve pain",
                "count": 189
            },
            {
                "value": "Stress",
                "count": 168
            },
            {
                "value": "Inflammation",
                "count": 151
            },
            {
                "value": "Interrupted sleep",
                "count": 142
            },
            {
                "value": "Delayed sleep onset",
                "count": 125
            },
            {
                "value": "Abdominal pain",
                "count": 123
            },
            {
                "value": "Fatigue",
                "count": 88
            },
            {
                "value": "Irritability",
                "count": 80
            },
            {
                "value": "Flashbacks",
                "count": 73
            },
            {
                "value": "Lack of appetite",
                "count": 69
            },
            {
                "value": "Sciatica",
                "count": 68
            },
            {
                "value": "Restlessness",
                "count": 67
            },
            {
                "value": "Nausea",
                "count": 63
            },
            {
                "value": "Migraines",
                "count": 62
            },
            {
                "value": "Headaches",
                "count": 61
            },
            {
                "value": "Inattentive behavior",
                "count": 56
            },
            {
                "value": "Chest pain",
                "count": 55
            },
            {
                "value": "Compulsive behaviour",
                "count": 52
            },
            {
                "value": "Hyperactivity",
                "count": 48
            },
            {
                "value": "Muscle cramps",
                "count": 45
            },
            {
                "value": "Pelvic pain",
                "count": 39
            },
            {
                "value": "Suicidal ideation",
                "count": 31
            },
            {
                "value": "Agitation",
                "count": 27
            },
            {
                "value": "Impulsivity",
                "count": 27
            },
            {
                "value": "Body dysmorphia",
                "count": 23
            },
            {
                "value": "Inability to feel pleasure (Anhedonia)",
                "count": 23
            },
            {
                "value": "Bloating",
                "count": 21
            },
            {
                "value": "Muscle weakness",
                "count": 21
            },
            {
                "value": "Diarrhoea",
                "count": 18
            },
            {
                "value": "Stomach cramps",
                "count": 17
            },
            {
                "value": "Constipation",
                "count": 16
            },
            {
                "value": "Involuntary muscle contractions",
                "count": 14
            },
            {
                "value": "Dizziness (Vertigo)",
                "count": 13
            },
            {
                "value": "Heartburn",
                "count": 12
            },
            {
                "value": "Paranoid ideation",
                "count": 12
            },
            {
                "value": "Spasticity",
                "count": 12
            },
            {
                "value": "Sweats",
                "count": 10
            },
            {
                "value": "Ear Pain (Otalgia)",
                "count": 9
            },
            {
                "value": "Seizures",
                "count": 9
            },
            {
                "value": "Tinnitus",
                "count": 9
            },
            {
                "value": "Weight loss",
                "count": 9
            },
            {
                "value": "Hypertension",
                "count": 8
            },
            {
                "value": "Mania",
                "count": 8
            },
            {
                "value": "Stiffness / Akinesia",
                "count": 8
            },
            {
                "value": "Chills (Shivering)",
                "count": 7
            },
            {
                "value": "Toothache",
                "count": 7
            },
            {
                "value": "Difficulty swallowing (Dysphagia)",
                "count": 5
            },
            {
                "value": "Rectal pain (Proctalgia fugax)",
                "count": 5
            },
            {
                "value": "Vomiting",
                "count": 5
            },
            {
                "value": "Belching",
                "count": 4
            },
            {
                "value": "Painful intercourse",
                "count": 4
            },
            {
                "value": "Double vision",
                "count": 3
            },
            {
                "value": "Flatulence",
                "count": 3
            },
            {
                "value": "Impaired coordination (Ataxia)",
                "count": 3
            },
            {
                "value": "Swelling",
                "count": 3
            },
            {
                "value": "Weight gain",
                "count": 3
            },
            {
                "value": "Athetosis",
                "count": 2
            },
            {
                "value": "Convulsions",
                "count": 2
            },
            {
                "value": "Dyskinesia ",
                "count": 2
            },
            {
                "value": "Erectile dysfunction (Impotence)",
                "count": 2
            },
            {
                "value": "Painful urination (Dysuria)",
                "count": 2
            },
            {
                "value": "Tremor",
                "count": 2
            },
            {
                "value": "Fluid build up (Edema)",
                "count": 1
            },
            {
                "value": "Indigestion (Dyspepsia)",
                "count": 1
            },
            {
                "value": "Somnolence",
                "count": 1
            },
            {
                "value": "Tics",
                "count": 1
            }
        ],
        minor_cannabinoids: [
            {
                "value": "CBC",
                "count": 152
            },
            {
                "value": "CBCA",
                "count": 87
            },
            {
                "value": "CBCV",
                "count": 6
            },
            {
                "value": "CBDA",
                "count": 200
            },
            {
                "value": "CBDV",
                "count": 56
            },
            {
                "value": "CBG",
                "count": 353
            },
            {
                "value": "CBGA",
                "count": 175
            },
            {
                "value": "CBL",
                "count": 12
            },
            {
                "value": "CBN",
                "count": 201
            },
            {
                "value": "CBNA",
                "count": 4
            },
            {
                "value": "D8THC",
                "count": 12
            },
            {
                "value": "THCA",
                "count": 233
            },
            {
                "value": "THCV",
                "count": 64
            },
            {
                "value": "THCVA",
                "count": 30
            }
        ],
        terpenes: [
            {
                "value": "(3Z)-Caryophylla-3,8(13)-dien-5β-ol",
                "count": 2
            },
            {
                "value": "(E) alpha bisabolene",
                "count": 6
            },
            {
                "value": "14-Hydroxy-9-epi-(E)-caryophyllene",
                "count": 2
            },
            {
                "value": "5,7-diepi-α-Eudesmol",
                "count": 1
            },
            {
                "value": "8-Hydroxylinalool isomer",
                "count": 1
            },
            {
                "value": "Agarospirol",
                "count": 1
            },
            {
                "value": "Alpha bisabolol",
                "count": 399
            },
            {
                "value": "Alpha eudesmol",
                "count": 2
            },
            {
                "value": "Alpha guaiene",
                "count": 8
            },
            {
                "value": "Alpha phellandrene",
                "count": 15
            },
            {
                "value": "Alpha pinene",
                "count": 419
            },
            {
                "value": "Alpha selinene",
                "count": 17
            },
            {
                "value": "Alpha terpinene",
                "count": 90
            },
            {
                "value": "Alpha thujene",
                "count": 4
            },
            {
                "value": "Alpha-bulnesene",
                "count": 2
            },
            {
                "value": "Alpha-muurolene",
                "count": 1
            },
            {
                "value": "Alpha-santalene",
                "count": 1
            },
            {
                "value": "Alpha-ylangene",
                "count": 1
            },
            {
                "value": "Ar-Curcumene",
                "count": 1
            },
            {
                "value": "Beta caryophyllene",
                "count": 444
            },
            {
                "value": "Beta pinene",
                "count": 409
            },
            {
                "value": "Beta selinene",
                "count": 14
            },
            {
                "value": "Beta-bisabolene",
                "count": 1
            },
            {
                "value": "Beta-citronellol",
                "count": 24
            },
            {
                "value": "Beta-copaene",
                "count": 1
            },
            {
                "value": "Beta-eudesmol",
                "count": 35
            },
            {
                "value": "Beta-sesquiphellandrene",
                "count": 1
            },
            {
                "value": "Borneol",
                "count": 145
            },
            {
                "value": "Bornerol",
                "count": 1
            },
            {
                "value": "Bornyl",
                "count": 1
            },
            {
                "value": "Bulnesol",
                "count": 5
            },
            {
                "value": "Camphene",
                "count": 280
            },
            {
                "value": "Camphor",
                "count": 32
            },
            {
                "value": "Carene",
                "count": 30
            },
            {
                "value": "Caryophylladienol II",
                "count": 1
            },
            {
                "value": "Caryophyllene oxide",
                "count": 252
            },
            {
                "value": "Caryophyllenyl",
                "count": 9
            },
            {
                "value": "Cedrene",
                "count": 17
            },
            {
                "value": "Cedrol",
                "count": 9
            },
            {
                "value": "Cis-alpha-bergamotene",
                "count": 3
            },
            {
                "value": "Cis-pinene hydrate",
                "count": 1
            },
            {
                "value": "Cis-sabinene hydrate",
                "count": 6
            },
            {
                "value": "Citral",
                "count": 10
            },
            {
                "value": "Cryptomeridiol",
                "count": 1
            },
            {
                "value": "Cryptomeridiol analog II",
                "count": 1
            },
            {
                "value": "Cymene",
                "count": 38
            },
            {
                "value": "Delta 3 carene",
                "count": 71
            },
            {
                "value": "Epi-alpha-bisabolol",
                "count": 2
            },
            {
                "value": "Eremoligenol",
                "count": 1
            },
            {
                "value": "Eremophila-1(10),7(11)-diene",
                "count": 3
            },
            {
                "value": "Eucalyptol",
                "count": 33
            },
            {
                "value": "Eudesma-5,7(11)-diene",
                "count": 1
            },
            {
                "value": "Farnesene",
                "count": 211
            },
            {
                "value": "Fenchol",
                "count": 55
            },
            {
                "value": "Fenchone",
                "count": 95
            },
            {
                "value": "Fenchyl",
                "count": 125
            },
            {
                "value": "Gamma cadinene",
                "count": 6
            },
            {
                "value": "Gamma elemene",
                "count": 10
            },
            {
                "value": "Gamma eudesmol",
                "count": 10
            },
            {
                "value": "Gamma muurolene",
                "count": 1
            },
            {
                "value": "Gamma selinene",
                "count": 10
            },
            {
                "value": "Gamma terpinene",
                "count": 89
            },
            {
                "value": "Gamma-guaiene",
                "count": 1
            },
            {
                "value": "Geraniol",
                "count": 73
            },
            {
                "value": "Geranyl acetate",
                "count": 16
            },
            {
                "value": "Germacrene D",
                "count": 1
            },
            {
                "value": "Germacrene b",
                "count": 30
            },
            {
                "value": "Guaiol",
                "count": 162
            },
            {
                "value": "Hexyl hexanoate",
                "count": 12
            },
            {
                "value": "Hinesol",
                "count": 1
            },
            {
                "value": "Humulene",
                "count": 506
            },
            {
                "value": "Humulene epoxide II",
                "count": 3
            },
            {
                "value": "Isoborneol",
                "count": 8
            },
            {
                "value": "Isopulegol",
                "count": 72
            },
            {
                "value": "Limonene",
                "count": 568
            },
            {
                "value": "Linalool",
                "count": 504
            },
            {
                "value": "Menthol",
                "count": 7
            },
            {
                "value": "Methyl",
                "count": 1
            },
            {
                "value": "Myrcene",
                "count": 494
            },
            {
                "value": "Nerol",
                "count": 9
            },
            {
                "value": "Nerolidol",
                "count": 124
            },
            {
                "value": "Ocimene",
                "count": 201
            },
            {
                "value": "Olivetol",
                "count": 1
            },
            {
                "value": "Para-Cymen-8-ol",
                "count": 4
            },
            {
                "value": "Phellandrene",
                "count": 24
            },
            {
                "value": "Phytol",
                "count": 33
            },
            {
                "value": "Pulegone",
                "count": 5
            },
            {
                "value": "Sabinene",
                "count": 32
            },
            {
                "value": "Selin-6-en-4alpha-ol",
                "count": 1
            },
            {
                "value": "Selina-3,7(11)-diene",
                "count": 39
            },
            {
                "value": "Selina-4(15),7(11)-diene",
                "count": 27
            },
            {
                "value": "Sesquicineole",
                "count": 2
            },
            {
                "value": "Spirovetiva-1(10),7(11)-diene",
                "count": 2
            },
            {
                "value": "Squalene",
                "count": 10
            },
            {
                "value": "Terpinen-4-ol",
                "count": 11
            },
            {
                "value": "Terpinene",
                "count": 35
            },
            {
                "value": "Terpineol",
                "count": 299
            },
            {
                "value": "Terpinolene",
                "count": 244
            },
            {
                "value": "Trans bergamotene",
                "count": 17
            },
            {
                "value": "Trans caryophyllene",
                "count": 133
            },
            {
                "value": "Trans-Nerolidol",
                "count": 194
            },
            {
                "value": "Trans-Sabinene hydrate",
                "count": 11
            },
            {
                "value": "Trans-pinene hydrate",
                "count": 2
            },
            {
                "value": "Trans-piperitol",
                "count": 1
            },
            {
                "value": "Valencene",
                "count": 50
            },
            {
                "value": "cis-Nerolidol",
                "count": 44
            },
            {
                "value": "e-beta ocimene",
                "count": 31
            },
            {
                "value": "z-beta ocimene",
                "count": 23
            }
        ],
        origin: [
            {
                "value": "CA",
                "count": 385
            },
            {
                "value": "AU",
                "count": 230
            },
            {
                "value": "ZA",
                "count": 95
            },
            {
                "value": "PT",
                "count": 48
            },
            {
                "value": "TH",
                "count": 33
            },
            {
                "value": "US",
                "count": 22
            },
            {
                "value": "CO",
                "count": 21
            },
            {
                "value": "NZ",
                "count": 18
            },
            {
                "value": "GR",
                "count": 13
            },
            {
                "value": "CH",
                "count": 12
            },
            {
                "value": "IL",
                "count": 10
            },
            {
                "value": "DK",
                "count": 9
            },
            {
                "value": "LT",
                "count": 6
            },
            {
                "value": "NL",
                "count": 4
            },
            {
                "value": "DE",
                "count": 2
            },
            {
                "value": "AF",
                "count": 1
            },
            {
                "value": "BG",
                "count": 1
            },
            {
                "value": "GB",
                "count": 1
            },
            {
                "value": "JM",
                "count": 1
            },
            {
                "value": "LS",
                "count": 1
            }
        ],
        light_source: [
            {
                "value": "ARTIFICIAL",
                "count": 376
            },
            {
                "value": "HYBRID",
                "count": 198
            },
            {
                "value": "NATURAL",
                "count": 141
            },
            {
                "value": "UNKNOWN",
                "count": 58
            }
        ],
        harvest_method: [
            {
                "value": "Unknown",
                "count": 774
            },
            {
                "value": "Hand",
                "count": 522
            },
            {
                "value": "Hybrid",
                "count": 54
            },
            {
                "value": "Machine",
                "count": 17
            },
            {
                "value": "",
                "count": 14
            },
            {
                "value": "Not Specified",
                "count": 11
            },
            {
                "value": "Hand-Harvested",
                "count": 10
            },
            {
                "value": "Hand-harvested",
                "count": 4
            },
            {
                "value": "Manual",
                "count": 2
            },
            {
                "value": "Manual Harvest",
                "count": 2
            },
            {
                "value": "Full plant hang-dried",
                "count": 1
            },
            {
                "value": "Full/half plant cut down & hang dried",
                "count": 1
            },
            {
                "value": "Glass Jar with Box Protector",
                "count": 1
            },
            {
                "value": "Hand and Crytrimmed",
                "count": 1
            },
            {
                "value": "Hang Dried",
                "count": 1
            },
            {
                "value": "N/A",
                "count": 1
            },
            {
                "value": "Single Use Disposable Cartridge",
                "count": 1
            }
        ],
        trim_method: [
            {
                "value": "Unknown",
                "count": 779
            },
            {
                "value": "Hand",
                "count": 462
            },
            {
                "value": "Hybrid",
                "count": 73
            },
            {
                "value": "Machine",
                "count": 41
            },
            {
                "value": "",
                "count": 13
            },
            {
                "value": "Hand-Trimmed",
                "count": 12
            },
            {
                "value": "Not Specified",
                "count": 11
            },
            {
                "value": "Hand trim",
                "count": 7
            },
            {
                "value": "Hand Trimmed",
                "count": 5
            },
            {
                "value": "Hand-trimmed",
                "count": 5
            },
            {
                "value": "N/A",
                "count": 4
            },
            {
                "value": "Hand ",
                "count": 2
            },
            {
                "value": "Machine and hand finish",
                "count": 1
            },
            {
                "value": "N/A ",
                "count": 1
            },
            {
                "value": "Scissor-trimmed",
                "count": 1
            }
        ],
        growing_medium: [
            {
                "value": "",
                "count": 18
            },
            {
                "value": " Living soil",
                "count": 1
            },
            {
                "value": "Aeroponic",
                "count": 3
            },
            {
                "value": "Aeroponics",
                "count": 2
            },
            {
                "value": "Aquaponics, Deep Water Culture",
                "count": 1
            },
            {
                "value": "Coco",
                "count": 202
            },
            {
                "value": "Coco Coir",
                "count": 4
            },
            {
                "value": "Coco Peat",
                "count": 3
            },
            {
                "value": "CocoCoir",
                "count": 1
            },
            {
                "value": "Greendoor - Aeroponics",
                "count": 1
            },
            {
                "value": "Hydroponic",
                "count": 72
            },
            {
                "value": "Hydroponic (Rockwool)",
                "count": 4
            },
            {
                "value": "Hydroponic Coco Air",
                "count": 2
            },
            {
                "value": "Hydroponic, Soil Based",
                "count": 1
            },
            {
                "value": "Indoor Aeroponic Cultivation",
                "count": 2
            },
            {
                "value": "Indoor, Hydroponic",
                "count": 3
            },
            {
                "value": "LSO",
                "count": 2
            },
            {
                "value": "LSO (Living Soil Organic)",
                "count": 5
            },
            {
                "value": "Live Soil",
                "count": 1
            },
            {
                "value": "Live Soil ",
                "count": 1
            },
            {
                "value": "Living Soil",
                "count": 5
            },
            {
                "value": "Living Soil Organic",
                "count": 1
            },
            {
                "value": "Living Soil Organic (LSO)",
                "count": 7
            },
            {
                "value": "Living soil",
                "count": 2
            },
            {
                "value": "Medicoir Coco Fibre",
                "count": 7
            },
            {
                "value": "N/A",
                "count": 1
            },
            {
                "value": "Not Specified",
                "count": 12
            },
            {
                "value": "Not specified",
                "count": 2
            },
            {
                "value": "Organic Coconut Husk",
                "count": 6
            },
            {
                "value": "Organic Living Soil",
                "count": 13
            },
            {
                "value": "Organic Soil + Coco",
                "count": 5
            },
            {
                "value": "Rockwell",
                "count": 1
            },
            {
                "value": "Rockwool",
                "count": 32
            },
            {
                "value": "Soil",
                "count": 166
            },
            {
                "value": "Soiless Hydrophonic - Organic Inputs ",
                "count": 1
            },
            {
                "value": "Soiless Rockwool",
                "count": 2
            },
            {
                "value": "Soilless",
                "count": 1
            },
            {
                "value": "Soilless hydroponic",
                "count": 1
            }
        ],
        sterilisation: [
            {
                "value": "Unknown",
                "count": 1125
            },
            {
                "value": "E-Beam",
                "count": 169
            },
            {
                "value": "Not Irradiated",
                "count": 54
            },
            {
                "value": "Gamma Irradiation",
                "count": 39
            },
            {
                "value": "",
                "count": 24
            },
            {
                "value": "NA",
                "count": 4
            },
            {
                "value": "Beta Irradiation",
                "count": 2
            }
        ],
        packaging: [
            {
                "value": "Unknown",
                "count": 410
            },
            {
                "value": "Plastic container",
                "count": 291
            },
            {
                "value": "Glass bottle",
                "count": 252
            },
            {
                "value": "Plastic bottle",
                "count": 145
            },
            {
                "value": "Resealable bag",
                "count": 103
            },
            {
                "value": "Single use disposable cartridge",
                "count": 86
            },
            {
                "value": "Tin",
                "count": 29
            },
            {
                "value": "Blister Pack",
                "count": 10
            },
            {
                "value": "UV-Protected Amber Glass Jar",
                "count": 10
            },
            {
                "value": "Single Use Disposable Cartridge",
                "count": 8
            },
            {
                "value": "Glass Jar + Protective Box",
                "count": 7
            },
            {
                "value": "Glass jar",
                "count": 6
            },
            {
                "value": "Chubby Gorilla",
                "count": 4
            },
            {
                "value": "HDPE Jar",
                "count": 4
            },
            {
                "value": "PET Tubs",
                "count": 4
            },
            {
                "value": "Glass Jar",
                "count": 3
            },
            {
                "value": "",
                "count": 2
            },
            {
                "value": "186 × 114 mm Mylar Pouch",
                "count": 2
            },
            {
                "value": "Amber Glass bottle",
                "count": 2
            },
            {
                "value": "Can",
                "count": 2
            },
            {
                "value": "Cartridge",
                "count": 2
            },
            {
                "value": "Child-resistant soft pouch with airtight zipper seal",
                "count": 2
            },
            {
                "value": "Envelope",
                "count": 2
            },
            {
                "value": "Frosted Amber Glass Jar & Box",
                "count": 2
            },
            {
                "value": "Glass Jar - UV Resistant Raw Amber Glass that is sustainable and recyclable.   Boveda Terpene Shield included.",
                "count": 2
            },
            {
                "value": "Glass container",
                "count": 2
            },
            {
                "value": "HDPE Tub",
                "count": 2
            },
            {
                "value": "HDPE bottle with CR closure and induction seal",
                "count": 2
            },
            {
                "value": "UV-Protected Amber Glass Jar housed in Custom Designed Box",
                "count": 2
            },
            {
                "value": "0735850093857",
                "count": 1
            },
            {
                "value": "10 gram white bottle with childproof lid",
                "count": 1
            },
            {
                "value": "10g Jar",
                "count": 1
            },
            {
                "value": "10g Plastic container",
                "count": 1
            },
            {
                "value": "30 ml  glass amber bottle with measure dropper",
                "count": 1
            },
            {
                "value": "30ml Amber Glass bottle with dropper inside bottle. NO syringe.",
                "count": 1
            },
            {
                "value": "30ml Glass Jar",
                "count": 1
            },
            {
                "value": "Amber bottle",
                "count": 1
            },
            {
                "value": "Amber glass bottle 30ml with dropper",
                "count": 1
            },
            {
                "value": "Glass Jar with Box Protector",
                "count": 1
            },
            {
                "value": "Glass container and carton ",
                "count": 1
            },
            {
                "value": "Jar",
                "count": 1
            },
            {
                "value": "Jar with tamper-proof seal & Integra humidity pack",
                "count": 1
            },
            {
                "value": "Mylar Pouch",
                "count": 1
            },
            {
                "value": "PET jar",
                "count": 1
            },
            {
                "value": "Plastic Jar",
                "count": 1
            },
            {
                "value": "Store in a cool and dry place. Keep away from moisture, heatand sunlight.",
                "count": 1
            },
            {
                "value": "UV-Protected Amber Glass Jars",
                "count": 1
            },
            {
                "value": "foil pack",
                "count": 1
            }
        ]
    };
    // -------------- END DATASETS -----------------------

    // CSS.escape polyfill (older browsers)
    if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
        window.CSS = window.CSS || {};
        CSS.escape = function (value) {
            return String(value).replace(/([ !"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~])/g, '\\$1');
        };
    }

    // Populate a multiselect block from dataset
    function populateFromData(root) {
        const key = root.getAttribute('data-source');
        const rows = (DATASETS[key] || []).slice(); // copy

        const select = root.querySelector('[data-ms-select]');
        const menu = root.querySelector('[data-ms-menu]');
        if (!select || !menu) return;

        // Clear existing
        select.innerHTML = '';
        menu.innerHTML = '';

        // Build <option> and <li>
        rows.forEach(row => {
            const value = String(row.value);
            const count = Number(row.count) || 0;

            // <option> for form submission
            select.add(new Option(value, value));

            // <li> for visible menu
            const li = document.createElement('li');
            li.setAttribute('data-value', value);
            li.className = 'flex items-center justify-between px-4 py-2 hover:bg-slate-100 cursor-pointer';
            li.innerHTML = `
        <div class="flex items-center">
          <span class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">${count}</span>
          <span>${value}</span>
        </div>
      `;
            menu.appendChild(li);
        });
    }

    // ---------------- MULTISELECT BEHAVIOR ----------------
    function MultiSelect(root, opts) {
        this.root = root;
        this.opts = opts || {};
        this.select = root.querySelector('[data-ms-select]');
        this.field = root.querySelector('[data-ms-field]');
        this.menu = root.querySelector('[data-ms-menu]');
        this.chips = root.querySelector('[data-ms-chips]');
        this.ph = root.querySelector('[data-ms-placeholder]');
        this.clear = root.querySelector('[data-ms-clear]');

        if (!this.select || !this.field || !this.menu || !this.chips) return;

        // Bind
        this.renderChips = this.renderChips.bind(this);
        this.toggleMenu = this.toggleMenu.bind(this);
        this.openMenu = this.openMenu.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.onKey = this.onKey.bind(this);
        this.onMenuClick = this.onMenuClick.bind(this);
        this.onOutside = this.onOutside.bind(this);
        this.clearAll = this.clearAll.bind(this);

        // Events
        this.field.addEventListener('click', this.toggleMenu);
        this.field.addEventListener('keydown', this.onKey);
        this.menu.addEventListener('click', this.onMenuClick);
        if (this.clear) this.clear.addEventListener('click', this.clearAll);
        document.addEventListener('click', this.onOutside, true);

        // Initial
        this.renderChips();
    }

    MultiSelect.prototype.openMenu = function () { this.menu.classList.remove('hidden'); };
    MultiSelect.prototype.closeMenu = function () { this.menu.classList.add('hidden'); };
    MultiSelect.prototype.toggleMenu = function () { this.menu.classList.toggle('hidden'); };

    MultiSelect.prototype.onKey = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleMenu(); }
        if (e.key === 'Escape') this.closeMenu();
    };

    MultiSelect.prototype.onMenuClick = function (e) {
        const li = e.target.closest && e.target.closest('li[data-value]');
        if (!li) return;
        const value = li.getAttribute('data-value');

        const opt = Array.prototype.find.call(this.select.options, o => o.value === value);
        if (!opt) return;
        opt.selected = !opt.selected;

        li.classList.toggle('bg-slate-200', opt.selected);
        const cb = li.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = opt.selected;

        this.renderChips();
        if (typeof this.opts.onChange === 'function') this.opts.onChange(this.getValues());
        this.menu.classList.add('hidden');
    };

    MultiSelect.prototype.clearAll = function () {
        Array.prototype.forEach.call(this.select.options, o => o.selected = false);
        this.menu.querySelectorAll('li').forEach(li => {
            li.classList.remove('bg-slate-200');
            const cb = li.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = false;
        });
        this.renderChips();
        if (typeof this.opts.onChange === 'function') this.opts.onChange(this.getValues());
    };

    MultiSelect.prototype.onOutside = function (e) {
        if (!this.root.contains(e.target)) this.closeMenu();
    };

    MultiSelect.prototype.getValues = function () {
        return Array.prototype.map.call(this.select.selectedOptions || [], o => o.value);
    };

    MultiSelect.prototype.renderChips = function () {
        // remove chips
        this.chips.querySelectorAll('[data-chip]').forEach(n => n.remove());

        const values = this.getValues();

        if (this.ph) (values.length === 0 ? this.ph.classList.remove('hidden') : this.ph.classList.add('hidden'));
        if (this.clear) (values.length === 0 ? this.clear.classList.add('hidden') : this.clear.classList.remove('hidden'));

        const anchor = (this.ph && this.chips.contains(this.ph)) ? this.ph : null;

        values.forEach(v => {
            const chip = document.createElement('span');
            chip.setAttribute('data-chip', '');
            chip.className = 'inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700';

            const label = document.createElement('span');
            label.textContent = v;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Remove ' + v);
            btn.className = 'hover:text-slate-900';
            btn.textContent = '×';

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const opt = Array.prototype.find.call(this.select.options, o => o.value === v);
                if (opt) opt.selected = false;

                const li = this.menu.querySelector('li[data-value="' + CSS.escape(v) + '"]');
                if (li) {
                    li.classList.remove('bg-slate-200');
                    const cb = li.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                }
                this.renderChips();
                if (typeof this.opts.onChange === 'function') this.opts.onChange(this.getValues());
            });

            chip.appendChild(label);
            chip.appendChild(btn);

            if (anchor) this.chips.insertBefore(chip, anchor);
            else this.chips.appendChild(chip);
        });
    };

    // --------- Init all instances: populate first, then wire behavior ----------
    function initAll(options) {
        document.querySelectorAll('[data-multiselect]').forEach(root => {
            populateFromData(root);            // <- builds <option> + menu from DATASETS
            new MultiSelect(root, options || {});// <- wires the interactivity
        });
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAll());
    } else {
        initAll();
    }

    // Optional: expose for manual re-init / callbacks
    window.MultiSelect = { initAll };

})();

document.addEventListener('click', (e) => {
    const t = e.target.closest('.toggle');
    if (!t) return;
    t.dataset.on = t.dataset.on === 'true' ? 'false' : 'true';
});

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                balto: ['"Balto"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                RecoletaBold: ['"RecoletaBold"', 'ui-sans-serif', 'system-ui', 'sans-serif']
            },
        },
    },
}

    ;(function () {
        function closeAllExcept(except) {
            document.querySelectorAll('[data-dd-menu]').forEach(m => {
                const root = m.closest('[data-dd]');
                if (!except || root !== except) {
                    m.classList.add('hidden');
                    root.querySelector('[data-dd-trigger]').setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Toggle menus
        document.querySelectorAll('[data-dd]').forEach(root => {
            const trigger = root.querySelector('[data-dd-trigger]');
            const menu = root.querySelector('[data-dd-menu]');
            const label = root.querySelector('[data-dd-label]');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                closeAllExcept(root);
                menu.classList.toggle('hidden', !isHidden ? true : false);
                trigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            });

            // Select an item
            menu.addEventListener('click', (e) => {
                const li = e.target.closest('li[role="option"]');
                if (!li) return;
                const value = li.getAttribute('data-value');
                label.textContent = li.querySelector('span').textContent;

                // Update checkmarks
                menu.querySelectorAll('[data-check]').forEach(icon => icon.classList.add('opacity-0'));
                const check = li.querySelector('[data-check]');
                if (check) check.classList.remove('opacity-0');

                // Example: reflect page size in "Showing X of Y"
                if (root.getAttribute('data-dd') === 'pagesize') {
                    const showing = document.getElementById('pageShowing');
                    if (showing) showing.textContent = value;
                }
                menu.classList.add('hidden');
                trigger.setAttribute('aria-expanded', 'false');

                // TODO: hook your actual sort/pagination logic here
                // console.log(root.getAttribute('data-dd'), value);
            });
        });

        // Click outside to close
        document.addEventListener('click', () => closeAllExcept(null));
    })();


; (function () {
    const sectionIds = [
        "product-type",
        "stock-status",
        "day-night-section",
        "cured-section"
    ]

    sectionIds.forEach(id => {
        const section = document.getElementById(id)
        if (!section) return

        section.addEventListener("click", e => {
            const el = e.target.closest("button") // only toggle on buttons
            const textSpan = el.querySelector("span.font-medium");
            if (!el || !section.contains(el)) return

            if (el.style.backgroundColor === "rgb(79, 70, 229)") {
                if(textSpan)textSpan.style.color="black"
                el.style.removeProperty("background-color");
            } else {
                if (textSpan) textSpan.style.color = "white"
                el.style.backgroundColor = "rgb(79, 70, 229)";
            }

        })
    })
})()

;(function(){
    const toggleBtn = document.getElementById("toggle-view-more");
    const moreGroup = document.getElementById("more-product-type");

    toggleBtn.addEventListener("click", () => {
        const isHidden = moreGroup.classList.contains("hidden");
        moreGroup.classList.toggle("hidden");
        toggleBtn.textContent = isHidden ? "view less" : "view more";
    });
})();

