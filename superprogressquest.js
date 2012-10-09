// Copyright (c)2002-2010 Eric Fredricksen <e@fredricksen.net> all rights reserved

ProgressQuest = function() {

var document = undefined;

var events = {
  character_created: function(guy_name) {},
  killing: function(text) {},
  cancel: function() {},
  to_roster: function() {},
  alert: function() {},
  progression: function(id, prog) {},
};

// TODO These code bits don't really belong here, but this is the only 
// shared bit of js

function tabulate(list) {
  var result = '';
  $.each(list, function (index) {
    if (this.length == 2) {
      if (this[1].length)
        result += "   " + this[0] + ": " + this[1] + "\n";
    } else {
      result += "   " + this + "\n";
    }
  });
  return result;
}


String.prototype.escapeHtml = function () {
  return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function template(tmpl, data) {
  var brag = tmpl.replace(/\$([_A-Za-z.]+)/g, function (str, p1) {
    var dict = data;
    $.each(p1.split("."), function (i,v) {
      if (!dict) return true;
      if (v == "___") {
        dict = tabulate(dict);
      } else {
        dict = dict[v.replace("_"," ")];
        if (typeof dict == typeof "")
          dict = dict.escapeHtml();
      }
      return null;
    });
    if (dict === undefined) dict = '';
    return dict;
  });
  return brag;
}

// From http://baagoe.com/en/RandomMusings/javascript/
  // Johannes Baag√∏e <baagoe@baagoe.com>, 2010
function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  mash.version = 'Mash 0.9';
  return mash;
}


// From http://baagoe.com/en/RandomMusings/javascript/
function Alea() {
  return (function(args) {
    // Johannes Baag√∏e <baagoe@baagoe.com>, 2010
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;
    
    if (!args.length) {
      args = [+new Date];
    }
    var mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');
    
    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(args[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(args[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;
    
    var random = function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
    random.uint32 = function() {
      return random() * 0x100000000; // 2^32
    };
    random.fract53 = function() {
      return random() + 
        (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'Alea 0.9';
    random.args = args;
    random.state = function (newstate) {
      if (newstate) {
        s0 = newstate[0];
        s1 = newstate[1];
        s2 = newstate[2];
        c = newstate[3];
      }
      return [s0,s1,s2,c];
    };
    return random;
    
  } (Array.prototype.slice.call(arguments)));
}


var seed = new Alea();

function Random(n) {
  return seed.uint32() % n;
}


function randseed(set) {
  return seed.state(set);
}


function Pick(a) {
  return a[Random(a.length)];
}


var KParts = [
  'br|cr|dr|fr|gr|j|kr|l|m|n|pr||||r|sh|tr|v|wh|x|y|z'.split('|'),
  'a|a|e|e|i|i|o|o|u|u|ae|ie|oo|ou'.split('|'),
  'b|ck|d|g|k|m|n|p|t|v|x|z'.split('|')];

function GenerateName() {
  var result = '';
  for (var i = 0; i <= 5; ++i)
    result += Pick(KParts[i % 3]);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function LocalStorage() {
  this.getItem = function (key, callback) {
    var result = window.localStorage.getItem(key);
    if (callback)
      callback(result);
  };

  this.setItem = function (key, value, callback) {
    window.localStorage.setItem(key, value);
    if (callback)
      callback();
  };

  this.removeItem = function (key) {
    window.localStorage.removeItem(key);
  };
}


function CookieStorage() {
  this.getItem = function(key, callback) {
    var result;
    $.each(document.cookie.split(";"), function (i,cook) {
      if (cook.split("=")[0] === key)
        result = unescape(cook.split("=")[1]);
    });
    if (callback)
      setTimeout(function () { callback(result); }, 0);
    return result;
  };
  
  this.setItem = function (key, value, callback) {
    document.cookie = key + "=" + escape(value);
    if (callback)
      setTimeout(callback, 0);
  };

  this.removeItem = function (key) {
    document.cookie = key + "=; expires=Thu, 01-Jan-70 00:00:01 GMT;";
  };
}

function SqlStorage() {
  this.async = true;

  this.db = window.openDatabase("pq", "", "Progress Quest", 2500);

  this.db.transaction(function(tx) {
    tx.executeSql("CREATE TABLE IF NOT EXISTS Storage(key TEXT UNIQUE, value TEXT)");
  });

  this.getItem = function(key, callback) {
    this.db.transaction(function (tx) {
      tx.executeSql("SELECT value FROM Storage WHERE key=?", [key], function(tx, rs) {
        if (rs.rows.length) 
          callback(rs.rows.item(0).value);
        else
          callback();
      });
    });
  };
  
  this.setItem = function (key, value, callback) {
    this.db.transaction(function (tx) {
      tx.executeSql("INSERT OR REPLACE INTO Storage (key,value) VALUES (?,?)",
                    [key, value], 
                    callback);
    });
  };
  
  this.removeItem = function (key) {
    this.db.transaction(function (tx) {
      tx.executeSql("DELETE FROM Storage WHERE key=?", [key]);
    });
  };
}

var iPad = navigator.userAgent.match(/iPad/);
var iPod = navigator.userAgent.match(/iPod/);
var iPhone = navigator.userAgent.match(/iPhone/);
var iOS = iPad || iPod || iPhone;

var storage = ((window.localStorage && !iOS) ? new LocalStorage() :
               window.openDatabase ? new SqlStorage() :
               new CookieStorage());
  
storage.loadRoster = function (callback) {
  function gotItem(value) {
    if (value) {
      try {
        value = JSON.parse(value);
      } catch (err) {
        // aight
      }
    }
    storage.games = value || {};
    callback(storage.games);
  }
  this.getItem("progressquestroster", gotItem);
}

storage.loadSheet = function (name, callback) {
  return this.loadRoster(function (games) {
    if (callback)
      callback(games[name]);
  });
}


storage.storeRoster = function (roster, callback) {
  this.games = roster;
  try {
    this.setItem("progressquestroster", JSON.stringify(roster), callback);
  } catch (err) {
    if (err.toString().indexOf("QUOTA_EXCEEDED_ERR") != -1) {
      alert("This browser lacks storage capacity to save this game. This game can continue but cannot be saved. (Mobile Safari, I'll wager?)");
      this.storeRoster = function (roster, callback) {
        setTimeout(callback, 0);
      };
      setTimeout(callback, 0);
    } else {
      throw err;
    }
  }
}

storage.addToRoster = function (newguy, callback) {
  if (this.games) {
    this.games[newguy.Traits.Name] = newguy;
    this.storeRoster(this.games, callback);
  } else {
    this.loadRoster(function () {
      if (storage.games)  // should always be true
        storage.addToRoster(newguy, callback);
    });
  }
}

Number.prototype.div = function (divisor) {
  var dividend = this / divisor;
  return (dividend < 0 ? Math.ceil : Math.floor)(dividend);
};


function LevelUpTime(level) {  // seconds 
  // 20 minutes per level
  return 20 * level * 60;
}


var K = {};

K.Traits = ["Name", "Race", "Class", "Level"];

K.PrimeStats = ["STR","CON","DEX","INT","WIS","CHA"];
K.Stats = K.PrimeStats.slice(0).concat(["HP Max","MP Max"]);

K.Equips = ["Weapon",
            "Shield",
            "Helm",
            "Hauberk",
            "Brassairts",
            "Vambraces",
            "Gauntlets",
            "Gambeson",
            "Cuisses",
            "Greaves",
            "Sollerets"];

K.Spells = [
  "Slime Finger",
  "Rabbit Punch",
  "Hastiness",
  "Good Move",
  "Sadness",
  "Seasick",
  "Gyp",
  "Shoelaces",
  "Innoculate",
  "Cone of Annoyance",
  "Magnetic Orb",
  "Invisible Hands",
  "Revolting Cloud",
  "Aqueous Humor",
  "Spectral Miasma",
  "Clever Fellow",
  "Lockjaw",
  "History Lesson",
  "Hydrophobia",
  "Big Sister",
  "Cone of Paste",
  "Mulligan",
  "Nestor's Bright Idea",
  "Holy Batpole",
  "Tumor (Benign)",
  "Braingate",
  "Summon a Bitch",
  "Nonplus",
  "Animate Nightstand",
  "Eye of the Troglodyte",
  "Curse Name",
  "Dropsy",
  "Vitreous Humor",
  "Roger's Grand Illusion",
  "Covet",
  "Black Idaho",
  "Astral Miasma",
  "Spectral Oyster",
  "Acrid Hands",
  "Angioplasty",
  "Grognor's Big Day Off",
  "Tumor (Malignant)",
  "Animate Tunic",
  "Ursine Armor",
  "Holy Roller",
  "Tonsilectomy",
  "Curse Family",
  "Infinite Confusion"];

K.OffenseAttrib = [
  "Polished|+1",
  "Serrated|+1",
  "Heavy|+1",
  "Pronged|+2",
  "Steely|+2",
  "Vicious|+3",
  "Venomed|+4",
  "Stabbity|+4",
  "Dancing|+5",
  "Invisible|+6",
  "Vorpal|+7"];

K.DefenseAttrib = [
  "Studded|+1",
  "Banded|+2",
  "Gilded|+2",
  "Festooned|+3",
  "Holy|+4",
  "Cambric|+1",
  "Fine|+4",
  "Impressive|+5",
  "Custom|+3"];

K.Shields = [
  "Parasol|0",
  "Pie Plate|1",
  "Garbage Can Lid|2",
  "Buckler|3",
  "Plexiglass|4",
  "Fender|4",
  "Round Shield|5",
  "Carapace|5",
  "Scutum|6",
  "Propugner|6",
  "Kite Shield|7",
  "Pavise|8",
  "Tower Shield|9",
  "Baroque Shield|11",
  "Aegis|12",
  "Magnetic Field|18"];

K.Armors = [
  "Lace|1",
  "Macrame|2",
  "Burlap|3",
  "Canvas|4",
  "Flannel|5",
  "Chamois|6",
  "Pleathers|7",
  "Leathers|8",
  "Bearskin|9",
  "Ringmail|10",
  "Scale Mail|12",
  "Chainmail|14",
  "Splint Mail|15",
  "Platemail|16",
  "ABS|17",
  "Kevlar|18",
  "Titanium|19",
  "Mithril Mail|20",
  "Diamond Mail|25",
  "Plasma|30"];

K.Weapons = [
  "Stick|0",
  "Broken Bottle|1",
  "Shiv|1",
  "Sprig|1",
  "Oxgoad|1",
  "Eelspear|2",
  "Bowie Knife|2",
  "Claw Hammer|2",
  "Handpeen|2",
  "Andiron|3",
  "Hatchet|3",
  "Tomahawk|3",
  "Hackbarm|3",
  "Crowbar|4",
  "Mace|4",
  "Battleadze|4",
  "Leafmace|5",
  "Shortsword|5",
  "Longiron|5",
  "Poachard|5",
  "Baselard|5",
  "Whinyard|6",
  "Blunderbuss|6",
  "Longsword|6",
  "Crankbow|6",
  "Blibo|7",
  "Broadsword|7",
  "Kreen|7",
  "Warhammer|7",
  "Morning Star|8",
  "Pole-adze|8",
  "Spontoon|8",
  "Bastard Sword|9",
  "Peen-arm|9",
  "Culverin|10",
  "Lance|10",
  "Halberd|11",
  "Poleax|12",
  "Bandyclef|15"];

K.Specials = [
  "Diadem",
  "Festoon",
  "Gemstone",
  "Phial",
  "Tiara",
  "Scabbard",
  "Arrow",
  "Lens",
  "Lamp",
  "Hymnal",
  "Fleece",
  "Laurel",
  "Brooch",
  "Gimlet",
  "Cobble",
  "Albatross",
  "Brazier",
  "Bandolier",
  "Tome",
  "Garnet",
  "Amethyst",
  "Candelabra",
  "Corset",
  "Sphere",
  "Sceptre",
  "Ankh",
  "Talisman",
  "Orb",
  "Gammel",
  "Ornament",
  "Brocade",
  "Galoon",
  "Bijou",
  "Spangle",
  "Gimcrack",
  "Hood",
  "Vulpeculum"];

K.ItemAttrib = [
  "Golden",
  "Gilded",
  "Spectral",
  "Astral",
  "Garlanded",
  "Precious",
  "Crafted",
  "Dual",
  "Filigreed",
  "Cruciate",
  "Arcane",
  "Blessed",
  "Reverential",
  "Lucky",
  "Enchanted",
  "Gleaming",
  "Grandiose",
  "Sacred",
  "Legendary",
  "Mythic",
  "Crystalline",
  "Austere",
  "Ostentatious",
  "One True",
  "Proverbial",
  "Fearsome",
  "Deadly",
  "Benevolent",
  "Unearthly",
  "Magnificent",
  "Iron",
  "Ormolu",
  "Puissant"];

K.ItemOfs = [
  "Foreboding",
  "Foreshadowing",
  "Nervousness",
  "Happiness",
  "Torpor",
  "Danger",
  "Craft",
  "Silence",
  "Invisibility",
  "Rapidity",
  "Pleasure",
  "Practicality",
  "Hurting",
  "Joy",
  "Petulance",
  "Intrusion",
  "Chaos",
  "Suffering",
  "Extroversion",
  "Frenzy",
  "Sisu",
  "Solitude",
  "Punctuality",
  "Efficiency",
  "Comfort",
  "Patience",
  "Internment",
  "Incarceration",
  "Misapprehension",
  "Loyalty",
  "Envy",
  "Acrimony",
  "Worry",
  "Fear",
  "Awe",
  "Guile",
  "Prurience",
  "Fortune",
  "Perspicacity",
  "Domination",
  "Submission",
  "Fealty",
  "Hunger",
  "Despair",
  "Cruelty",
  "Grob",
  "Dignard",
  "Ra",
  "the Bone",
  "Diamonique",
  "Electrum",
  "Hydragyrum"];

K.BoringItems = [
  "nail",
  "lunchpail",
  "sock",
  "I.O.U.",
  "cookie",
  "pint",
  "toothpick",
  "writ",
  "newspaper",
  "letter",
  "plank",
  "hat",
  "egg",
  "coin",
  "needle",
  "bucket",
  "ladder",
  "chicken",
  "twig",
  "dirtclod",
  "counterpane",
  "vest",
  "teratoma",
  "bunny",
  "rock",
  "pole",
  "carrot",
  "canoe",
  "inkwell",
  "hoe",
  "bandage",
  "trowel",
  "towel",
  "planter box",
  "anvil",
  "axle",
  "tuppence",
  "casket",
  "nosegay",
  "trinket",
  "credenza",
  "writ"];

K.Monsters = [
  "Anhkheg|6|chitin",
  "Ant|0|antenna",
  "Ape|4|ass",
  "Baluchitherium|14|ear",
  "Beholder|10|eyestalk",
  "Black Pudding|10|saliva",
  "Blink Dog|4|eyelid",
  "Cub Scout|1|neckerchief",
  "Girl Scout|2|cookie",
  "Boy Scout|3|merit badge",
  "Eagle Scout|4|merit badge",
  "Bugbear|3|skin",
  "Bugboar|3|tusk",
  "Boogie|3|slime",
  "Camel|2|hump",
  "Carrion Crawler|3|egg",
  "Catoblepas|6|neck",
  "Centaur|4|rib",
  "Centipede|0|leg",
  "Cockatrice|5|wattle",
  "Couatl|9|wing",
  "Crayfish|0|antenna",
  "Demogorgon|53|tentacle",
  "Jubilex|17|gel",
  "Manes|1|tooth",
  "Orcus|27|wand",
  "Succubus|6|bra",
  "Vrock|8|neck",
  "Hezrou|9|leg",
  "Glabrezu|10|collar",
  "Nalfeshnee|11|tusk",
  "Marilith|7|arm",
  "Balor|8|whip",
  "Yeenoghu|25|flail",
  "Asmodeus|52|leathers",
  "Baalzebul|43|pants",
  "Barbed Devil|8|flame",
  "Bone Devil|9|hook",
  "Dispater|30|matches",
  "Erinyes|6|thong",
  "Geryon|30|cornucopia",
  "Malebranche|5|fork",
  "Ice Devil|11|snow",
  "Lemure|3|blob",
  "Pit Fiend|13|seed",
  "Anklyosaurus|9|tail",
  "Brontosaurus|30|brain",
  "Diplodocus|24|fin",
  "Elasmosaurus|15|neck",
  "Gorgosaurus|13|arm",
  "Iguanadon|6|thumb",
  "Megalosaurus|12|jaw",
  "Monoclonius|8|horn",
  "Pentasaurus|12|head",
  "Stegosaurus|18|plate",
  "Triceratops|16|horn",
  "Tyranosauraus Rex|18|forearm",
  "Djinn|7|lamp",
  "Doppleganger|4|face",
  "Black Dragon|7|*",
  "Plaid Dragon|7|sporrin",
  "Blue Dragon|9|*",
  "Beige Dragon|9|*",
  "Brass Dragon|7|pole",
  "Tin Dragon|8|*",
  "Bronze Dragon|9|medal",
  "Chromatic Dragon|16|scale",
  "Copper Dragon|8|loafer",
  "Gold Dragon|8|filling",
  "Green Dragon|8|*",
  "Platinum Dragon|21|*",
  "Red Dragon|10|cocktail",
  "Silver Dragon|10|*",
  "White Dragon|6|tooth",
  "Dragon Turtle|13|shell",
  "Dryad|2|acorn",
  "Dwarf|1|drawers",
  "Eel|2|sashimi",
  "Efreet|10|cinder",
  "Sand Elemental|8|glass",
  "Bacon Elemental|10|bit",
  "Porn Elemental|12|lube",
  "Cheese Elemental|14|curd",
  "Hair Elemental|16|follicle",
  "Swamp Elf|1|lilypad",
  "Brown Elf|1|tusk",
  "Sea Elf|1|jerkin",
  "Ettin|10|fur",
  "Frog|0|leg",
  "Violet Fungi|3|spore",
  "Gargoyle|4|gravel",
  "Gelatinous Cube|4|jam",
  "Ghast|4|vomit",
  "Ghost|10|*",
  "Ghoul|2|muscle",
  "Humidity Giant|12|drops",
  "Beef Giant|11|steak",
  "Quartz Giant|10|crystal",
  "Porcelain Giant|9|fixture",
  "Rice Giant|8|grain",
  "Cloud Giant|12|condensation",
  "Fire Giant|11|cigarettes",
  "Frost Giant|10|snowman",
  "Hill Giant|8|corpse",
  "Stone Giant|9|hatchling",
  "Storm Giant|15|barometer",
  "Mini Giant|4|pompadour",
  "Gnoll|2|collar",
  "Gnome|1|hat",
  "Goblin|1|ear",
  "Grid Bug|1|carapace",
  "Jellyrock|9|seedling",
  "Beer Golem|15|foam",
  "Oxygen Golem|17|platelet",
  "Cardboard Golem|14|recycling",
  "Rubber Golem|16|ball",
  "Leather Golem|15|fob",
  "Gorgon|8|testicle",
  "Gray Ooze|3|gravy",
  "Green Slime|2|sample",
  "Griffon|7|nest",
  "Banshee|7|larynx",
  "Harpy|3|mascara",
  "Hell Hound|5|tongue",
  "Hippocampus|4|mane",
  "Hippogriff|3|egg",
  "Hobgoblin|1|patella",
  "Homonculus|2|fluid",
  "Hydra|8|gyrum",
  "Imp|2|tail",
  "Invisible Stalker|8|*",
  "Iron Peasant|3|chaff",
  "Jumpskin|3|shin",
  "Kobold|1|penis",
  "Leprechaun|1|wallet",
  "Leucrotta|6|hoof",
  "Lich|11|crown",
  "Lizard Man|2|tail",
  "Lurker|10|sac",
  "Manticore|6|spike",
  "Mastodon|12|tusk",
  "Medusa|6|eye",
  "Multicell|2|dendrite",
  "Pirate|1|booty",
  "Berserker|1|shirt",
  "Caveman|2|club",
  "Dervish|1|robe",
  "Merman|1|trident",
  "Mermaid|1|gills",
  "Mimic|9|hinge",
  "Mind Flayer|8|tentacle",
  "Minotaur|6|map",
  "Yellow Mold|1|spore",
  "Morkoth|7|teeth",
  "Mummy|6|gauze",
  "Naga|9|rattle",
  "Nebbish|1|belly",
  "Neo-Otyugh|11|organ ",
  "Nixie|1|webbing",
  "Nymph|3|hanky",
  "Ochre Jelly|6|nucleus",
  "Octopus|2|beak",
  "Ogre|4|talon",
  "Ogre Mage|5|apparel",
  "Orc|1|snout",
  "Otyugh|7|organ",
  "Owlbear|5|feather",
  "Pegasus|4|aileron",
  "Peryton|4|antler",
  "Piercer|3|tip",
  "Pixie|1|dust",
  "Man-o-war|3|tentacle",
  "Purple Worm|15|dung",
  "Quasit|3|tail",
  "Rakshasa|7|pajamas",
  "Rat|0|tail",
  "Remorhaz|11|protrusion",
  "Roc|18|wing",
  "Roper|11|twine",
  "Rot Grub|1|eggsac",
  "Rust Monster|5|shavings",
  "Satyr|5|hoof",
  "Sea Hag|3|wart",
  "Silkie|3|fur",
  "Shadow|3|silhouette",
  "Shambling Mound|10|mulch",
  "Shedu|9|hoof",
  "Shrieker|3|stalk",
  "Skeleton|1|clavicle",
  "Spectre|7|vestige",
  "Sphinx|10|paw",
  "Spider|0|web",
  "Sprite|1|can",
  "Stirge|1|proboscis",
  "Stun Bear|5|tooth",
  "Stun Worm|2|trode",
  "Su-monster|5|tail",
  "Sylph|3|thigh",
  "Titan|20|sandal",
  "Trapper|12|shag",
  "Treant|10|acorn",
  "Triton|3|scale",
  "Troglodyte|2|tail",
  "Troll|6|hide",
  "Umber Hulk|8|claw",
  "Unicorn|4|blood",
  "Vampire|8|pancreas",
  "Wight|4|lung",
  "Will-o'-the-Wisp|9|wisp",
  "Wraith|5|finger",
  "Wyvern|7|wing",
  "Xorn|7|jaw",
  "Yeti|4|fur",
  "Zombie|2|forehead",
  "Wasp|0|stinger",
  "Rat|1|tail",
  "Bunny|0|ear",
  "Moth|0|dust",
  "Beagle|0|collar",
  "Midge|0|corpse",
  "Ostrich|1|beak",
  "Billy Goat|1|beard",
  "Bat|1|wing",
  "Koala|2|heart",
  "Wolf|2|paw",
  "Whippet|2|collar",
  "Uruk|2|boot",
  "Poroid|4|node",
  "Moakum|8|frenum",
  "Fly|0|*",
  "Hogbird|3|curl",
  "Wolog|4|lemma"];

K.MonMods = [
  "-4 fútal *",
  "-4 dying *",
  "-3 crippled *",
  "-3 baby *",
  "-2 adolescent",
  "-2 very sick *",
  "-1 lesser *",
  "-1 undernourished *",
  "+1 greater *",
  "+1 * Elder",
  "+2 war *",
  "+2 Battle-*",
  "+3 Were-*",
  "+3 undead *",
  "+4 giant *",
  "+4 * Rex"];

K.OffenseBad = [
  "Dull|-2",
  "Tarnished|-1",
  "Rusty|-3",
  "Padded|-5",
  "Bent|-4",
  "Mini|-4",
  "Rubber|-6",
  "Nerf|-7",
  "Unbalanced|-2"];

K.DefenseBad = [
  "Holey|-1",
  "Patched|-1",
  "Threadbare|-2",
  "Faded|-1",
  "Rusty|-3",
  "Motheaten|-3",
  "Mildewed|-2",
  "Torn|-3",
  "Dented|-3",
  "Cursed|-5",
  "Plastic|-4",
  "Cracked|-4",
  "Warped|-3",
  "Corroded|-3"];

K.Races = [
  "Half Orc|HP Max",
  "Half Man|CHA",
  "Half Halfling|DEX",
  "Double Hobbit|STR",
  "Hob-Hobbit|DEX,CON",
  "Low Elf|CON",
  "Dung Elf|WIS",
  "Talking Pony|MP Max,INT",
  "Gyrognome|DEX",
  "Lesser Dwarf|CON",
  "Crested Dwarf|CHA",
  "Eel Man|DEX",
  "Panda Man|CON,STR",
  "Trans-Kobold|WIS",
  "Enchanted Motorcycle|MP Max",
  "Will o' the Wisp|WIS",
  "Battle-Finch|DEX,INT",
  "Double Wookiee|STR",
  "Skraeling|WIS",
  "Demicanadian|CON",
  "Land Squid|STR,HP Max"];

K.Klasses = [
  "Ur-Paladin|WIS,CON",
  "Voodoo Princess|INT,CHA",
  "Robot Monk|STR",
  "Mu-Fu Monk|DEX",
  "Mage Illusioner|INT,MP Max",
  "Shiv-Knight|DEX",
  "Inner Mason|CON",
  "Fighter/Organist|CHA,STR",
  "Puma Burgular|DEX",
  "Runeloremaster|WIS",
  "Hunter Strangler|DEX,INT",
  "Battle-Felon|STR",
  "Tickle-Mimic|WIS,INT",
  "Slow Poisoner|CON",
  "Bastard Lunatic|CON",
  "Lowling|WIS",
  "Birdrider|WIS",
  "Vermineer|INT"];

K.Titles = [
  "Mr.",
  "Mrs.",
  "Sir",
  "Sgt.",
  "Ms.",
  "Captain",
  "Chief",
  "Admiral",
  "Saint"];

K.ImpressiveTitles = [
  "King",
  "Queen",
  "Lord",
  "Lady",
  "Viceroy",
  "Mayor",
  "Prince",
  "Princess",
  "Chief",
  "Boss",
  "Archbishop"];


// TODO These code bits don't really belong here, but this is the only 
// shared bit of js

function tabulate(list) {
  var result = '';
  $.each(list, function (index) {
    if (this.length == 2) {
      if (this[1].length)
        result += "   " + this[0] + ": " + this[1] + "\n";
    } else {
      result += "   " + this + "\n";
    }
  });
  return result;
}


String.prototype.escapeHtml = function () {
  return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function template(tmpl, data) {
  var brag = tmpl.replace(/\$([_A-Za-z.]+)/g, function (str, p1) {
    var dict = data;
    $.each(p1.split("."), function (i,v) {
      if (!dict) return true;
      if (v == "___") {
        dict = tabulate(dict);
      } else {
        dict = dict[v.replace("_"," ")];
        if (typeof dict == typeof "")
          dict = dict.escapeHtml();
      }
      return null;
    });
    if (dict === undefined) dict = '';
    return dict;
  });
  return brag;
}

// From http://baagoe.com/en/RandomMusings/javascript/
  // Johannes Baag√∏e <baagoe@baagoe.com>, 2010
function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  mash.version = 'Mash 0.9';
  return mash;
}


// From http://baagoe.com/en/RandomMusings/javascript/
function Alea() {
  return (function(args) {
    // Johannes Baag√∏e <baagoe@baagoe.com>, 2010
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;
    
    if (!args.length) {
      args = [+new Date];
    }
    var mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');
    
    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(args[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(args[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;
    
    var random = function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
    random.uint32 = function() {
      return random() * 0x100000000; // 2^32
    };
    random.fract53 = function() {
      return random() + 
        (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'Alea 0.9';
    random.args = args;
    random.state = function (newstate) {
      if (newstate) {
        s0 = newstate[0];
        s1 = newstate[1];
        s2 = newstate[2];
        c = newstate[3];
      }
      return [s0,s1,s2,c];
    };
    return random;
    
  } (Array.prototype.slice.call(arguments)));
}


var seed = new Alea();

function Random(n) {
  return seed.uint32() % n;
}


function randseed(set) {
  return seed.state(set);
}


function Pick(a) {
  return a[Random(a.length)];
}


var KParts = [
  'br|cr|dr|fr|gr|j|kr|l|m|n|pr||||r|sh|tr|v|wh|x|y|z'.split('|'),
  'a|a|e|e|i|i|o|o|u|u|ae|ie|oo|ou'.split('|'),
  'b|ck|d|g|k|m|n|p|t|v|x|z'.split('|')];

function GenerateName() {
  var result = '';
  for (var i = 0; i <= 5; ++i)
    result += Pick(KParts[i % 3]);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function LocalStorage() {
  this.getItem = function (key, callback) {
    var result = window.localStorage.getItem(key);
    if (callback)
      callback(result);
  };

  this.setItem = function (key, value, callback) {
    window.localStorage.setItem(key, value);
    if (callback)
      callback();
  };

  this.removeItem = function (key) {
    window.localStorage.removeItem(key);
  };
}


function CookieStorage() {
  this.getItem = function(key, callback) {
    var result;
    $.each(document.cookie.split(";"), function (i,cook) {
      if (cook.split("=")[0] === key)
        result = unescape(cook.split("=")[1]);
    });
    if (callback)
      setTimeout(function () { callback(result); }, 0);
    return result;
  };
  
  this.setItem = function (key, value, callback) {
    document.cookie = key + "=" + escape(value);
    if (callback)
      setTimeout(callback, 0);
  };

  this.removeItem = function (key) {
    document.cookie = key + "=; expires=Thu, 01-Jan-70 00:00:01 GMT;";
  };
}

function SqlStorage() {
  this.async = true;

  this.db = window.openDatabase("pq", "", "Progress Quest", 2500);

  this.db.transaction(function(tx) {
    tx.executeSql("CREATE TABLE IF NOT EXISTS Storage(key TEXT UNIQUE, value TEXT)");
  });

  this.getItem = function(key, callback) {
    this.db.transaction(function (tx) {
      tx.executeSql("SELECT value FROM Storage WHERE key=?", [key], function(tx, rs) {
        if (rs.rows.length) 
          callback(rs.rows.item(0).value);
        else
          callback();
      });
    });
  };
  
  this.setItem = function (key, value, callback) {
    this.db.transaction(function (tx) {
      tx.executeSql("INSERT OR REPLACE INTO Storage (key,value) VALUES (?,?)",
                    [key, value], 
                    callback);
    });
  };
  
  this.removeItem = function (key) {
    this.db.transaction(function (tx) {
      tx.executeSql("DELETE FROM Storage WHERE key=?", [key]);
    });
  };
}

var iPad = navigator.userAgent.match(/iPad/);
var iPod = navigator.userAgent.match(/iPod/);
var iPhone = navigator.userAgent.match(/iPhone/);
var iOS = iPad || iPod || iPhone;

var storage = ((window.localStorage && !iOS) ? new LocalStorage() :
               window.openDatabase ? new SqlStorage() :
               new CookieStorage());
  
storage.loadRoster = function (callback) {
  function gotItem(value) {
    if (value) {
      try {
        value = JSON.parse(value);
      } catch (err) {
        // aight
      }
    }
    storage.games = value || {};
    callback(storage.games);
  }
  this.getItem("progressquestroster", gotItem);
}

storage.loadSheet = function (name, callback) {
  return this.loadRoster(function (games) {
    if (callback)
      callback(games[name]);
  });
}


storage.storeRoster = function (roster, callback) {
  this.games = roster;
  try {
    this.setItem("progressquestroster", JSON.stringify(roster), callback);
  } catch (err) {
    if (err.toString().indexOf("QUOTA_EXCEEDED_ERR") != -1) {
      alert("This browser lacks storage capacity to save this game. This game can continue but cannot be saved. (Mobile Safari, I'll wager?)");
      this.storeRoster = function (roster, callback) {
        setTimeout(callback, 0);
      };
      setTimeout(callback, 0);
    } else {
      throw err;
    }
  }
}

storage.addToRoster = function (newguy, callback) {
  if (this.games) {
    this.games[newguy.Traits.Name] = newguy;
    this.storeRoster(this.games, callback);
  } else {
    this.loadRoster(function () {
      if (storage.games)  // should always be true
        storage.addToRoster(newguy, callback);
    });
  }
}

Number.prototype.div = function (divisor) {
  var dividend = this / divisor;
  return (dividend < 0 ? Math.ceil : Math.floor)(dividend);
};


function LevelUpTime(level) {  // seconds 
  // 20 minutes per level
  return 20 * level * 60;
}


var K = {};

K.Traits = ["Name", "Race", "Class", "Level"];

K.PrimeStats = ["STR","CON","DEX","INT","WIS","CHA"];
K.Stats = K.PrimeStats.slice(0).concat(["HP Max","MP Max"]);

K.Equips = ["Weapon",
            "Shield",
            "Helm",
            "Hauberk",
            "Brassairts",
            "Vambraces",
            "Gauntlets",
            "Gambeson",
            "Cuisses",
            "Greaves",
            "Sollerets"];

K.Spells = [
  "Slime Finger",
  "Rabbit Punch",
  "Hastiness",
  "Good Move",
  "Sadness",
  "Seasick",
  "Gyp",
  "Shoelaces",
  "Innoculate",
  "Cone of Annoyance",
  "Magnetic Orb",
  "Invisible Hands",
  "Revolting Cloud",
  "Aqueous Humor",
  "Spectral Miasma",
  "Clever Fellow",
  "Lockjaw",
  "History Lesson",
  "Hydrophobia",
  "Big Sister",
  "Cone of Paste",
  "Mulligan",
  "Nestor's Bright Idea",
  "Holy Batpole",
  "Tumor (Benign)",
  "Braingate",
  "Summon a Bitch",
  "Nonplus",
  "Animate Nightstand",
  "Eye of the Troglodyte",
  "Curse Name",
  "Dropsy",
  "Vitreous Humor",
  "Roger's Grand Illusion",
  "Covet",
  "Black Idaho",
  "Astral Miasma",
  "Spectral Oyster",
  "Acrid Hands",
  "Angioplasty",
  "Grognor's Big Day Off",
  "Tumor (Malignant)",
  "Animate Tunic",
  "Ursine Armor",
  "Holy Roller",
  "Tonsilectomy",
  "Curse Family",
  "Infinite Confusion"];

K.OffenseAttrib = [
  "Polished|+1",
  "Serrated|+1",
  "Heavy|+1",
  "Pronged|+2",
  "Steely|+2",
  "Vicious|+3",
  "Venomed|+4",
  "Stabbity|+4",
  "Dancing|+5",
  "Invisible|+6",
  "Vorpal|+7"];

K.DefenseAttrib = [
  "Studded|+1",
  "Banded|+2",
  "Gilded|+2",
  "Festooned|+3",
  "Holy|+4",
  "Cambric|+1",
  "Fine|+4",
  "Impressive|+5",
  "Custom|+3"];

K.Shields = [
  "Parasol|0",
  "Pie Plate|1",
  "Garbage Can Lid|2",
  "Buckler|3",
  "Plexiglass|4",
  "Fender|4",
  "Round Shield|5",
  "Carapace|5",
  "Scutum|6",
  "Propugner|6",
  "Kite Shield|7",
  "Pavise|8",
  "Tower Shield|9",
  "Baroque Shield|11",
  "Aegis|12",
  "Magnetic Field|18"];

K.Armors = [
  "Lace|1",
  "Macrame|2",
  "Burlap|3",
  "Canvas|4",
  "Flannel|5",
  "Chamois|6",
  "Pleathers|7",
  "Leathers|8",
  "Bearskin|9",
  "Ringmail|10",
  "Scale Mail|12",
  "Chainmail|14",
  "Splint Mail|15",
  "Platemail|16",
  "ABS|17",
  "Kevlar|18",
  "Titanium|19",
  "Mithril Mail|20",
  "Diamond Mail|25",
  "Plasma|30"];

K.Weapons = [
  "Stick|0",
  "Broken Bottle|1",
  "Shiv|1",
  "Sprig|1",
  "Oxgoad|1",
  "Eelspear|2",
  "Bowie Knife|2",
  "Claw Hammer|2",
  "Handpeen|2",
  "Andiron|3",
  "Hatchet|3",
  "Tomahawk|3",
  "Hackbarm|3",
  "Crowbar|4",
  "Mace|4",
  "Battleadze|4",
  "Leafmace|5",
  "Shortsword|5",
  "Longiron|5",
  "Poachard|5",
  "Baselard|5",
  "Whinyard|6",
  "Blunderbuss|6",
  "Longsword|6",
  "Crankbow|6",
  "Blibo|7",
  "Broadsword|7",
  "Kreen|7",
  "Warhammer|7",
  "Morning Star|8",
  "Pole-adze|8",
  "Spontoon|8",
  "Bastard Sword|9",
  "Peen-arm|9",
  "Culverin|10",
  "Lance|10",
  "Halberd|11",
  "Poleax|12",
  "Bandyclef|15"];

K.Specials = [
  "Diadem",
  "Festoon",
  "Gemstone",
  "Phial",
  "Tiara",
  "Scabbard",
  "Arrow",
  "Lens",
  "Lamp",
  "Hymnal",
  "Fleece",
  "Laurel",
  "Brooch",
  "Gimlet",
  "Cobble",
  "Albatross",
  "Brazier",
  "Bandolier",
  "Tome",
  "Garnet",
  "Amethyst",
  "Candelabra",
  "Corset",
  "Sphere",
  "Sceptre",
  "Ankh",
  "Talisman",
  "Orb",
  "Gammel",
  "Ornament",
  "Brocade",
  "Galoon",
  "Bijou",
  "Spangle",
  "Gimcrack",
  "Hood",
  "Vulpeculum"];

K.ItemAttrib = [
  "Golden",
  "Gilded",
  "Spectral",
  "Astral",
  "Garlanded",
  "Precious",
  "Crafted",
  "Dual",
  "Filigreed",
  "Cruciate",
  "Arcane",
  "Blessed",
  "Reverential",
  "Lucky",
  "Enchanted",
  "Gleaming",
  "Grandiose",
  "Sacred",
  "Legendary",
  "Mythic",
  "Crystalline",
  "Austere",
  "Ostentatious",
  "One True",
  "Proverbial",
  "Fearsome",
  "Deadly",
  "Benevolent",
  "Unearthly",
  "Magnificent",
  "Iron",
  "Ormolu",
  "Puissant"];

K.ItemOfs = [
  "Foreboding",
  "Foreshadowing",
  "Nervousness",
  "Happiness",
  "Torpor",
  "Danger",
  "Craft",
  "Silence",
  "Invisibility",
  "Rapidity",
  "Pleasure",
  "Practicality",
  "Hurting",
  "Joy",
  "Petulance",
  "Intrusion",
  "Chaos",
  "Suffering",
  "Extroversion",
  "Frenzy",
  "Sisu",
  "Solitude",
  "Punctuality",
  "Efficiency",
  "Comfort",
  "Patience",
  "Internment",
  "Incarceration",
  "Misapprehension",
  "Loyalty",
  "Envy",
  "Acrimony",
  "Worry",
  "Fear",
  "Awe",
  "Guile",
  "Prurience",
  "Fortune",
  "Perspicacity",
  "Domination",
  "Submission",
  "Fealty",
  "Hunger",
  "Despair",
  "Cruelty",
  "Grob",
  "Dignard",
  "Ra",
  "the Bone",
  "Diamonique",
  "Electrum",
  "Hydragyrum"];

K.BoringItems = [
  "nail",
  "lunchpail",
  "sock",
  "I.O.U.",
  "cookie",
  "pint",
  "toothpick",
  "writ",
  "newspaper",
  "letter",
  "plank",
  "hat",
  "egg",
  "coin",
  "needle",
  "bucket",
  "ladder",
  "chicken",
  "twig",
  "dirtclod",
  "counterpane",
  "vest",
  "teratoma",
  "bunny",
  "rock",
  "pole",
  "carrot",
  "canoe",
  "inkwell",
  "hoe",
  "bandage",
  "trowel",
  "towel",
  "planter box",
  "anvil",
  "axle",
  "tuppence",
  "casket",
  "nosegay",
  "trinket",
  "credenza",
  "writ"];

K.Monsters = [
  "Anhkheg|6|chitin",
  "Ant|0|antenna",
  "Ape|4|ass",
  "Baluchitherium|14|ear",
  "Beholder|10|eyestalk",
  "Black Pudding|10|saliva",
  "Blink Dog|4|eyelid",
  "Cub Scout|1|neckerchief",
  "Girl Scout|2|cookie",
  "Boy Scout|3|merit badge",
  "Eagle Scout|4|merit badge",
  "Bugbear|3|skin",
  "Bugboar|3|tusk",
  "Boogie|3|slime",
  "Camel|2|hump",
  "Carrion Crawler|3|egg",
  "Catoblepas|6|neck",
  "Centaur|4|rib",
  "Centipede|0|leg",
  "Cockatrice|5|wattle",
  "Couatl|9|wing",
  "Crayfish|0|antenna",
  "Demogorgon|53|tentacle",
  "Jubilex|17|gel",
  "Manes|1|tooth",
  "Orcus|27|wand",
  "Succubus|6|bra",
  "Vrock|8|neck",
  "Hezrou|9|leg",
  "Glabrezu|10|collar",
  "Nalfeshnee|11|tusk",
  "Marilith|7|arm",
  "Balor|8|whip",
  "Yeenoghu|25|flail",
  "Asmodeus|52|leathers",
  "Baalzebul|43|pants",
  "Barbed Devil|8|flame",
  "Bone Devil|9|hook",
  "Dispater|30|matches",
  "Erinyes|6|thong",
  "Geryon|30|cornucopia",
  "Malebranche|5|fork",
  "Ice Devil|11|snow",
  "Lemure|3|blob",
  "Pit Fiend|13|seed",
  "Anklyosaurus|9|tail",
  "Brontosaurus|30|brain",
  "Diplodocus|24|fin",
  "Elasmosaurus|15|neck",
  "Gorgosaurus|13|arm",
  "Iguanadon|6|thumb",
  "Megalosaurus|12|jaw",
  "Monoclonius|8|horn",
  "Pentasaurus|12|head",
  "Stegosaurus|18|plate",
  "Triceratops|16|horn",
  "Tyranosauraus Rex|18|forearm",
  "Djinn|7|lamp",
  "Doppleganger|4|face",
  "Black Dragon|7|*",
  "Plaid Dragon|7|sporrin",
  "Blue Dragon|9|*",
  "Beige Dragon|9|*",
  "Brass Dragon|7|pole",
  "Tin Dragon|8|*",
  "Bronze Dragon|9|medal",
  "Chromatic Dragon|16|scale",
  "Copper Dragon|8|loafer",
  "Gold Dragon|8|filling",
  "Green Dragon|8|*",
  "Platinum Dragon|21|*",
  "Red Dragon|10|cocktail",
  "Silver Dragon|10|*",
  "White Dragon|6|tooth",
  "Dragon Turtle|13|shell",
  "Dryad|2|acorn",
  "Dwarf|1|drawers",
  "Eel|2|sashimi",
  "Efreet|10|cinder",
  "Sand Elemental|8|glass",
  "Bacon Elemental|10|bit",
  "Porn Elemental|12|lube",
  "Cheese Elemental|14|curd",
  "Hair Elemental|16|follicle",
  "Swamp Elf|1|lilypad",
  "Brown Elf|1|tusk",
  "Sea Elf|1|jerkin",
  "Ettin|10|fur",
  "Frog|0|leg",
  "Violet Fungi|3|spore",
  "Gargoyle|4|gravel",
  "Gelatinous Cube|4|jam",
  "Ghast|4|vomit",
  "Ghost|10|*",
  "Ghoul|2|muscle",
  "Humidity Giant|12|drops",
  "Beef Giant|11|steak",
  "Quartz Giant|10|crystal",
  "Porcelain Giant|9|fixture",
  "Rice Giant|8|grain",
  "Cloud Giant|12|condensation",
  "Fire Giant|11|cigarettes",
  "Frost Giant|10|snowman",
  "Hill Giant|8|corpse",
  "Stone Giant|9|hatchling",
  "Storm Giant|15|barometer",
  "Mini Giant|4|pompadour",
  "Gnoll|2|collar",
  "Gnome|1|hat",
  "Goblin|1|ear",
  "Grid Bug|1|carapace",
  "Jellyrock|9|seedling",
  "Beer Golem|15|foam",
  "Oxygen Golem|17|platelet",
  "Cardboard Golem|14|recycling",
  "Rubber Golem|16|ball",
  "Leather Golem|15|fob",
  "Gorgon|8|testicle",
  "Gray Ooze|3|gravy",
  "Green Slime|2|sample",
  "Griffon|7|nest",
  "Banshee|7|larynx",
  "Harpy|3|mascara",
  "Hell Hound|5|tongue",
  "Hippocampus|4|mane",
  "Hippogriff|3|egg",
  "Hobgoblin|1|patella",
  "Homonculus|2|fluid",
  "Hydra|8|gyrum",
  "Imp|2|tail",
  "Invisible Stalker|8|*",
  "Iron Peasant|3|chaff",
  "Jumpskin|3|shin",
  "Kobold|1|penis",
  "Leprechaun|1|wallet",
  "Leucrotta|6|hoof",
  "Lich|11|crown",
  "Lizard Man|2|tail",
  "Lurker|10|sac",
  "Manticore|6|spike",
  "Mastodon|12|tusk",
  "Medusa|6|eye",
  "Multicell|2|dendrite",
  "Pirate|1|booty",
  "Berserker|1|shirt",
  "Caveman|2|club",
  "Dervish|1|robe",
  "Merman|1|trident",
  "Mermaid|1|gills",
  "Mimic|9|hinge",
  "Mind Flayer|8|tentacle",
  "Minotaur|6|map",
  "Yellow Mold|1|spore",
  "Morkoth|7|teeth",
  "Mummy|6|gauze",
  "Naga|9|rattle",
  "Nebbish|1|belly",
  "Neo-Otyugh|11|organ ",
  "Nixie|1|webbing",
  "Nymph|3|hanky",
  "Ochre Jelly|6|nucleus",
  "Octopus|2|beak",
  "Ogre|4|talon",
  "Ogre Mage|5|apparel",
  "Orc|1|snout",
  "Otyugh|7|organ",
  "Owlbear|5|feather",
  "Pegasus|4|aileron",
  "Peryton|4|antler",
  "Piercer|3|tip",
  "Pixie|1|dust",
  "Man-o-war|3|tentacle",
  "Purple Worm|15|dung",
  "Quasit|3|tail",
  "Rakshasa|7|pajamas",
  "Rat|0|tail",
  "Remorhaz|11|protrusion",
  "Roc|18|wing",
  "Roper|11|twine",
  "Rot Grub|1|eggsac",
  "Rust Monster|5|shavings",
  "Satyr|5|hoof",
  "Sea Hag|3|wart",
  "Silkie|3|fur",
  "Shadow|3|silhouette",
  "Shambling Mound|10|mulch",
  "Shedu|9|hoof",
  "Shrieker|3|stalk",
  "Skeleton|1|clavicle",
  "Spectre|7|vestige",
  "Sphinx|10|paw",
  "Spider|0|web",
  "Sprite|1|can",
  "Stirge|1|proboscis",
  "Stun Bear|5|tooth",
  "Stun Worm|2|trode",
  "Su-monster|5|tail",
  "Sylph|3|thigh",
  "Titan|20|sandal",
  "Trapper|12|shag",
  "Treant|10|acorn",
  "Triton|3|scale",
  "Troglodyte|2|tail",
  "Troll|6|hide",
  "Umber Hulk|8|claw",
  "Unicorn|4|blood",
  "Vampire|8|pancreas",
  "Wight|4|lung",
  "Will-o'-the-Wisp|9|wisp",
  "Wraith|5|finger",
  "Wyvern|7|wing",
  "Xorn|7|jaw",
  "Yeti|4|fur",
  "Zombie|2|forehead",
  "Wasp|0|stinger",
  "Rat|1|tail",
  "Bunny|0|ear",
  "Moth|0|dust",
  "Beagle|0|collar",
  "Midge|0|corpse",
  "Ostrich|1|beak",
  "Billy Goat|1|beard",
  "Bat|1|wing",
  "Koala|2|heart",
  "Wolf|2|paw",
  "Whippet|2|collar",
  "Uruk|2|boot",
  "Poroid|4|node",
  "Moakum|8|frenum",
  "Fly|0|*",
  "Hogbird|3|curl",
  "Wolog|4|lemma"];

K.MonMods = [
  "-4 fútal *",
  "-4 dying *",
  "-3 crippled *",
  "-3 baby *",
  "-2 adolescent",
  "-2 very sick *",
  "-1 lesser *",
  "-1 undernourished *",
  "+1 greater *",
  "+1 * Elder",
  "+2 war *",
  "+2 Battle-*",
  "+3 Were-*",
  "+3 undead *",
  "+4 giant *",
  "+4 * Rex"];

K.OffenseBad = [
  "Dull|-2",
  "Tarnished|-1",
  "Rusty|-3",
  "Padded|-5",
  "Bent|-4",
  "Mini|-4",
  "Rubber|-6",
  "Nerf|-7",
  "Unbalanced|-2"];

K.DefenseBad = [
  "Holey|-1",
  "Patched|-1",
  "Threadbare|-2",
  "Faded|-1",
  "Rusty|-3",
  "Motheaten|-3",
  "Mildewed|-2",
  "Torn|-3",
  "Dented|-3",
  "Cursed|-5",
  "Plastic|-4",
  "Cracked|-4",
  "Warped|-3",
  "Corroded|-3"];

K.Races = [
  "Half Orc|HP Max",
  "Half Man|CHA",
  "Half Halfling|DEX",
  "Double Hobbit|STR",
  "Hob-Hobbit|DEX,CON",
  "Low Elf|CON",
  "Dung Elf|WIS",
  "Talking Pony|MP Max,INT",
  "Gyrognome|DEX",
  "Lesser Dwarf|CON",
  "Crested Dwarf|CHA",
  "Eel Man|DEX",
  "Panda Man|CON,STR",
  "Trans-Kobold|WIS",
  "Enchanted Motorcycle|MP Max",
  "Will o' the Wisp|WIS",
  "Battle-Finch|DEX,INT",
  "Double Wookiee|STR",
  "Skraeling|WIS",
  "Demicanadian|CON",
  "Land Squid|STR,HP Max"];

K.Klasses = [
  "Ur-Paladin|WIS,CON",
  "Voodoo Princess|INT,CHA",
  "Robot Monk|STR",
  "Mu-Fu Monk|DEX",
  "Mage Illusioner|INT,MP Max",
  "Shiv-Knight|DEX",
  "Inner Mason|CON",
  "Fighter/Organist|CHA,STR",
  "Puma Burgular|DEX",
  "Runeloremaster|WIS",
  "Hunter Strangler|DEX,INT",
  "Battle-Felon|STR",
  "Tickle-Mimic|WIS,INT",
  "Slow Poisoner|CON",
  "Bastard Lunatic|CON",
  "Lowling|WIS",
  "Birdrider|WIS",
  "Vermineer|INT"];

K.Titles = [
  "Mr.",
  "Mrs.",
  "Sir",
  "Sgt.",
  "Ms.",
  "Captain",
  "Chief",
  "Admiral",
  "Saint"];

K.ImpressiveTitles = [
  "King",
  "Queen",
  "Lord",
  "Lady",
  "Viceroy",
  "Mayor",
  "Prince",
  "Princess",
  "Chief",
  "Boss",
  "Archbishop"];



function Roll(stat) {
  stats[stat] = 3 + Random(6) + Random(6) + Random(6);
  if (document)
    $("#"+stat).text(stats[stat]);
  return stats[stat];
}

function Choose(n, k) {
  var result = n;
  var d = 1;
  for (var i = 2; i <= k; ++i) {
    result *= (1+n-i);
    d = d * i;
  }
  return result / d;
}

var stats = {};
var traits = {};
var total = 0;
var seedHistory = [];

function RollEm() {
  stats.seed = randseed();
  total = 0;
  var best = -1;
  $.each(K.PrimeStats, function () { 
    total += Roll(this);
    if (best < stats[this]) {
      best = stats[this];
      stats.best = this;
    }
  });
  stats['HP Max'] = Random(8) + stats.CON.div(6);
  stats['MP Max'] = Random(8) + stats.INT.div(6);

  var color = 
    (total >= (63+18)) ? 'red'    :
    (total > (4 * 18)) ? 'yellow' :
    (total <= (63-18)) ? 'grey'   :
    (total < (3 * 18)) ? 'silver' :
    'white';

  if (document) {
    var Total = $("#Total");
    Total.text(total);
    Total.css("background-color", color);

    $("#Unroll").attr("disabled", !seedHistory.length);
  }
}

function RerollClick() {
  seedHistory.push(stats.seed);
  RollEm();
}


function UnrollClick() {
  randseed(seedHistory.pop());
  RollEm();
}

function fill(e, a, n) {
  var def = Random(a.length);
  for (var i = 0; i < a.length; ++i) {
    var v = a[i].split("|")[0];
    var check = (def == i) ? " checked " : " ";
    if (def == i) traits[n] = v;
    if (document) {
      $("<div><input type=radio id='" + v + "' name=\"" + n + "\" value=\"" + v + "\" " +
        check  +"><label for='" + v + "'>" + v + "</label></div>").appendTo(e);
    }
  }
}

function NewGuyFormLoad() {
  seed = new Alea();
  RollEm();
  GenClick();

  fill("#races", K.Races, "Race");
  fill("#classes", K.Klasses, "Class");

  if (document) {
    $("#Reroll").click(RerollClick);
    $("#Unroll").click(UnrollClick);
    $("#RandomName").click(GenClick);
    $('#Sold').click(sold);
    $('#quit').click(cancel);

    //var caption = 'Progress Quest - New Character';
    //if (MainForm.GetHostName != '')
      //  caption = caption + ' [' + MainForm.GetHostName + ']';

    $("#Name").focus();
    $("#Name").select();
  }
}


if (document)
  $(document).ready(NewGuyFormLoad);

function sold() {
  var newguy = {
    Traits: traits,
    dna: stats.seed,
    seed: stats.seed,
    birthday: ''+new Date(),
    birthstamp: +new Date(),
    Stats: stats,
    beststat: stats.best + " " + stats[stats.best],
    task: "",
    tasks: 0,
    elapsed: 0,
    bestequip: "Sharp Rock",
    Equips: {},
    Inventory: [['Gold', 0]],
    Spells: [],
    act: 0,
    bestplot: "Prologue",
    Quests: [],
    questmonster: "",
    kill: "Loading....",
    ExpBar: { position: 0, max: LevelUpTime(1) },
    EncumBar: { position: 0, max: stats.STR + 10 },
    PlotBar: { position: 0, max: 26 },
    QuestBar: { position: 0, max: 1 },
    TaskBar: { position: 0, max: 2000 },
    queue: [
      'task|10|Experiencing an enigmatic and foreboding night vision',
      "task|6|Much is revealed about that wise old bastard you'd underestimated",
      'task|6|A shocking series of events leaves you alone and bewildered, but resolute',
      'task|4|Drawing upon an unrealized reserve of determination, you set out on a long and dangerous journey',
      'plot|2|Loading'
    ]
  };

  if (document) {
    newguy.Traits.Name = $("#Name").val();
    newguy.Traits.Race = $("input:radio[name=Race]:checked").val();
    newguy.Traits.Class = $("input:radio[name=Class]:checked").val();
  }
  newguy.Traits.Level = 1;

  newguy.date = newguy.birthday;
  newguy.stamp = newguy.birthstamp;

  $.each(K.Equips, function (i,equip) { newguy.Equips[equip] = ''; });
  newguy.Equips.Weapon = newguy.bestequip;
  newguy.Equips.Hauberk = "-3 Burlap";

  storage.addToRoster(newguy, function () {
    events.character_created(newguy.Traits.Name);
  });

}

function cancel() {
  events.cancel();
}

function GenClick() {
  traits.Name = GenerateName();
  if (document)
    $("#Name").attr("value", traits.Name);
}

var game = {};
var lasttick, timerid;

function timeGetTime() {
  return new Date().getTime();
}

function StartTimer() {
  if (!timerid) {
    lasttick = timeGetTime();
    timerid = setTimeout(Timer1Timer, 100);
  }
}

function StopTimer() {
  clearTimeout(timerid);
  timerid = null;
}

function Q(s) {
  game.queue.push(s);
  Dequeue();
}

function TaskDone() {
  return TaskBar.done();
}

function Odds(chance, outof) {
  return Random(outof) < chance;
}

function RandSign() {
  return Random(2) * 2 - 1;
}

function RandomLow(below) {
  return Min(Random(below), Random(below));
}

function PickLow(s) {
  return s[RandomLow(s.length)];
}

function Copy(s, b, l) {
  return s.substr(b-1, l);
}

function Length(s) {
  return s.length;
}

function Starts(s, pre) {
  return 0 === s.indexOf(pre);
}

function Ends(s, e) {
  return Copy(s, 1+Length(s)-Length(e), Length(e)) == e;
}

function Plural(s) {
  if (Ends(s,'y'))
    return Copy(s,1,Length(s)-1) + 'ies';
  else if (Ends(s,'us'))
    return Copy(s,1,Length(s)-2) + 'i';
  else if (Ends(s,'ch') || Ends(s,'x') || Ends(s,'s') || Ends(s, 'sh'))
    return s + 'es';
  else if (Ends(s,'f'))
    return Copy(s,1,Length(s)-1) + 'ves';
  else if (Ends(s,'man') || Ends(s,'Man'))
    return Copy(s,1,Length(s)-2) + 'en';
  else return s + 's';
}

function Split(s, field, separator) {
  return s.split(separator || "|")[field];
}

function Indefinite(s, qty) {
  if (qty == 1) {
    if (Pos(s.charAt(0), 'AEIOU‹aeiou¸') > 0)
      return 'an ' + s;
    else
      return 'a ' + s;
  } else {
    return IntToStr(qty) + ' ' + Plural(s);
  }
}

function Definite(s, qty) {
  if (qty > 1)
    s = Plural(s);
  return 'the ' + s;
}

function prefix(a, m, s, sep) {
  if (sep == undefined) sep = ' ';
  m = Abs(m);
  if (m < 1 || m > a.length) return s;  // In case of screwups
  return a[m-1] + sep + s;
}

function Sick(m, s) {
  m = 6 - Abs(m);
  return prefix(['dead','comatose','crippled','sick','undernourished'], m, s);
}


function Young(m, s) {
  m = 6 - Abs(m);
  return prefix(['foetal','baby','preadolescent','teenage','underage'], m, s);
}


function Big(m, s) {
  return prefix(['greater','massive','enormous','giant','titanic'], m, s);
}

function Special(m, s) {
  if (Pos(' ', s) > 0)
    return prefix(['veteran','cursed','warrior','undead','demon'], m, s);
  else
    return prefix(['Battle-','cursed ','Were-','undead ','demon '], m, s, '');
}

function InterplotCinematic() {
  switch (Random(3)) {
  case 0:
    Q('task|1|Exhausted, you arrive at a friendly oasis in a hostile land');
    Q('task|2|You greet old friends and meet new allies');
    Q('task|2|You are privy to a council of powerful do-gooders');
    Q('task|1|There is much to be done. You are chosen!');
    break;
  case 1:
    Q('task|1|Your quarry is in sight, but a mighty enemy bars your path!');
    var nemesis = NamedMonster(GetI(Traits,'Level')+3);
    Q('task|4|A desperate struggle commences with ' + nemesis);
    var s = Random(3);
    for (var i = 1; i <= Random(1 + game.act + 1); ++i) {
      s += 1 + Random(2);
      switch (s % 3) {
      case 0: Q('task|2|Locked in grim combat with ' + nemesis); break;
      case 1: Q('task|2|' + nemesis + ' seems to have the upper hand'); break;
      case 2: Q('task|2|You seem to gain the advantage over ' + nemesis); break;
      }
    }
    Q('task|3|Victory! ' + nemesis + ' is slain! Exhausted, you lose conciousness');
    Q('task|2|You awake in a friendly place, but the road awaits');
    break;
  case 2:
    var nemesis2 = ImpressiveGuy();
    Q("task|2|Oh sweet relief! You've reached the protection of the good " + nemesis2);
    Q('task|3|There is rejoicing, and an unnerving encouter with ' + nemesis2 + ' in private');
    Q('task|2|You forget your ' + BoringItem() + ' and go back to get it');
    Q("task|2|What's this!? You overhear something shocking!");
    Q('task|2|Could ' + nemesis2 + ' be a dirty double-dealer?');
    Q('task|3|Who can possibly be trusted with this news!? ... Oh yes, of course');
    break;
  }
  Q('plot|1|Loading');
}


function StrToInt(s) {
  return parseInt(s, 10);
}

function IntToStr(i) {
  return i + "";
}

function NamedMonster(level) {
  var lev = 0;
  var result = '';
  for (var i = 0; i < 5; ++i) {
    var m = Pick(K.Monsters);
    if (!result || (Abs(level-StrToInt(Split(m,1))) < Abs(level-lev))) {
      result = Split(m,0);
      lev = StrToInt(Split(m,1));
    }
  }
  return GenerateName() + ' the ' + result;
}

function ImpressiveGuy() {
  return Pick(K.ImpressiveTitles) +
    (Random(2) ? ' of the ' + Pick(K.Races) : ' of ' + GenerateName());
}

function MonsterTask(level) {
  var definite = false;
  for (var i = level; i >= 1; --i) {
    if (Odds(2,5))
      level += RandSign();
  }
  if (level < 1) level = 1;
  // level = level of puissance of opponent(s) we'll return

  var monster, lev;
  if (Odds(1,25)) {
    // Use an NPC every once in a while
      monster = ' ' + Split(Pick(K.Races), 0);
    if (Odds(1,2)) {
      monster = 'passing' + monster + ' ' + Split(Pick(K.Klasses), 0);
    } else {
      monster = PickLow(K.Titles) + ' ' + GenerateName() + ' the' + monster;
      definite = true;
    }
    lev = level;
    monster = monster + '|' + IntToStr(level) + '|*';
  } else if (game.questmonster && Odds(1,4)) {
    // Use the quest monster
    monster = K.Monsters[game.questmonsterindex];
    lev = StrToInt(Split(monster,1));
  } else {
    // Pick the monster out of so many random ones closest to the level we want
    monster = Pick(K.Monsters);
    lev = StrToInt(Split(monster,1));
    for (var ii = 0; ii < 5; ++ii) {
      var m1 = Pick(K.Monsters);
      if (Abs(level-StrToInt(Split(m1,1))) < Abs(level-lev)) {
        monster = m1;
        lev = StrToInt(Split(monster,1));
      }
    }
  }

  var result = Split(monster,0);
  game.task = 'kill|' + monster;

  var qty = 1;
  if (level-lev > 10) {
    // lev is too low. multiply...
    qty = Math.floor((level + Random(lev)) / Max(lev,1));
    if (qty < 1) qty = 1;
    level = Math.floor(level / qty);
  }

  if ((level - lev) <= -10) {
    result = 'imaginary ' + result;
  } else if ((level-lev) < -5) {
    i = 10+(level-lev);
    i = 5-Random(i+1);
    result = Sick(i,Young((lev-level)-i,result));
  } else if (((level-lev) < 0) && (Random(2) == 1)) {
    result = Sick(level-lev,result);
  } else if (((level-lev) < 0)) {
    result = Young(level-lev,result);
  } else if ((level-lev) >= 10) {
    result = 'messianic ' + result;
  } else if ((level-lev) > 5) {
    i = 10-(level-lev);
    i = 5-Random(i+1);
    result = Big(i,Special((level-lev)-i,result));
  } else if (((level-lev) > 0) && (Random(2) == 1)) {
    result = Big(level-lev,result);
  } else if (((level-lev) > 0)) {
    result = Special(level-lev,result);
  }

  lev = level;
  level = lev * qty;

  if (!definite) result = Indefinite(result, qty);
  return { 'description': result, 'level': level };
}

function LowerCase(s) {
  return s.toLowerCase();
}

function ProperCase(s) {
  return Copy(s,1,1).toUpperCase() + Copy(s,2,10000);
}

function EquipPrice() {
  return  5 * GetI(Traits,'Level') * GetI(Traits,'Level') +
    10 * GetI(Traits,'Level') +
    20;
}

function Dequeue() {
  while (TaskDone()) {
    if (Split(game.task,0) == 'kill') {
      if (Split(game.task,3) == '*') {
        WinItem();
      } else if (Split(game.task,3)) {
        Add(Inventory,LowerCase(Split(game.task,1) + ' ' +
                                ProperCase(Split(game.task,3))),1);
      }
    } else if (game.task == 'buying') {
      // buy some equipment
      Add(Inventory,'Gold',-EquipPrice());
      WinEquip();
    } else if ((game.task == 'market') || (game.task == 'sell')) {
      if (game.task == 'sell') {
        var amt = GetI(Inventory, 1) * GetI(Traits,'Level');
        if (Pos(' of ', Inventory.label(1)) > 0)
          amt *= (1+RandomLow(10)) * (1+RandomLow(GetI(Traits,'Level')));
        Inventory.remove1();
        Add(Inventory, 'Gold', amt);
      }
      if (Inventory.length() > 1) {
        Inventory.scrollToTop();
        Task('Selling ' + Indefinite(Inventory.label(1), GetI(Inventory,1)),
             1 * 1000);
        game.task = 'sell';
        break;
      }
    }

    var old = game.task;
    game.task = '';
    if (game.queue.length > 0) {
      var a = Split(game.queue[0],0);
      var n = StrToInt(Split(game.queue[0],1));
      var s = Split(game.queue[0],2);
      if (a == 'task' || a == 'plot') {
        game.queue.shift();
        if (a == 'plot') {
          CompleteAct();
          s = 'Loading ' + game.bestplot;
        }
        Task(s, n * 1000);
      } else {
        throw 'bah!' + a;
      }
    } else if (EncumBar.done()) {
      Task('Heading to market to sell loot',4 * 1000);
      game.task = 'market';
    } else if ((Pos('kill|',old) <= 0) && (old != 'heading')) {
      if (GetI(Inventory, 'Gold') > EquipPrice()) {
        Task('Negotiating purchase of better equipment', 5 * 1000);
        game.task = 'buying';
      } else {
        Task('Heading to the killing fields', 4 * 1000);
        game.task = 'heading';
      }
    } else {
      var nn = GetI(Traits, 'Level');
      var t = MonsterTask(nn);
      var InventoryLabelAlsoGameStyleTag = 3;
      nn = Math.floor((2 * InventoryLabelAlsoGameStyleTag * t.level * 1000) / nn);
      Task('Executing ' + t.description, nn);
    }
  }
}


function Put(list, key, value) {
  if (typeof key === typeof 1)
    key = list.label(key);

  if (list.fixedkeys) {
    game[list.id][key] = value;
  } else {
    var i = 0;
    for (; i < game[list.id].length; ++i) {
      if (game[list.id][i][0] === key) {
        game[list.id][i][1] = value;
        break;
      }
    }
    if (i == game[list.id].length)
      game[list.id].push([key,value]);
  }

  list.PutUI(key, value);

  if (key === 'STR')
    EncumBar.reset(10 + value, EncumBar.Position());

  if (list === Inventory) {
    var cubits = 0;
    $.each(game.Inventory.slice(1), function (index, item) {
      cubits += StrToInt(item[1]);
    });
    EncumBar.reposition(cubits);
  }
}


function ProgressBar(id, tmpl) {
  this.id = id;
  this.bar = $("#"+ id + " > .bar");
  this.tmpl = tmpl;

  this.Max = function () { return game[this.id].max; };
  this.Position = function () { return game[this.id].position; };

  this.reset = function (newmax, newposition) {
    game[this.id].max = newmax;
    this.reposition(newposition || 0);
  };

  this.reposition = function (newpos) {
    game[this.id].position = Min(newpos, this.Max());

    // Recompute hint
    game[this.id].percent = (100 * this.Position()).div(this.Max());
    game[this.id].remaining = Math.floor(this.Max() - this.Position());
    game[this.id].time = RoughTime(this.Max() - this.Position());
    game[this.id].hint = template(this.tmpl, game[this.id]);

    // Update UI
    var p = this.Max() ? this.Position() / this.Max() : 0;
    if (this.bar) {
      this.bar.css("width", (p * 100) + "%");
      this.bar.parent().find(".hint").text(game[this.id].hint);
    }
    events.progression(this.id, p);
  };

  this.increment = function (inc) {
    this.reposition(this.Position() + inc);
  };

  this.done = function () {
    return this.Position() >= this.Max();
  };

  this.load = function (game) {
    this.reposition(this.Position());
  };
}



function Key(tr) {
  return $(tr).children().first().text();
}

function Value(tr) {
  return $(tr).children().last().text();
}



function ListBox(id, columns, fixedkeys) {
  this.id = id;
  this.box = $("tbody#_, #_ tbody".replace(/_/g, id));
  this.columns = columns;
  this.fixedkeys = fixedkeys;

  this.AddUI = function (caption) {
    if (!this.box) return;
    var tr = $("<tr><td><input type=checkbox disabled> " +
               caption + "</td></tr>");
    tr.appendTo(this.box);
    tr.each(function () {this.scrollIntoView();});
    return tr;
  };

  this.ClearSelection = function () {
    if (this.box)
      this.box.find("tr").removeClass("selected");
  };

  this.PutUI = function (key, value) {
    if (!this.box) return;
    var item = this.rows().filter(function (index) {
      return Key(this) === key;
    });
    if (!item.length) {
      item = $("<tr><td>" + key + "</td><td/></tr>");
      this.box.append(item);
    }

    item.children().last().text(value);
    item.addClass("selected");
    item.each(function () {this.scrollIntoView();});
  };

  this.scrollToTop = function () {
    if (this.box)
      this.box.parents(".scroll").scrollTop(0);
  };

  this.rows = function () {
    return this.box.find("tr").has("td");
  };

  this.CheckAll = function (butlast) {
    if (this.box) {
      if (butlast)
        this.rows().find("input:checkbox").not(':last').attr("checked","true");
      else
        this.rows().find("input:checkbox").attr("checked","true");
    }
   };

  this.length = function () {
    return (this.fixedkeys || game[this.id]).length;
  };

  this.remove0 = function (n) {
    if (game[this.id])
      game[this.id].shift();
    if (this.box)
      this.box.find("tr").first().remove();
  };

  this.remove1 = function (n) {
    var t = game[this.id].shift();
    game[this.id].shift();
    game[this.id].unshift(t);
    if (this.box)
      this.box.find("tr").eq(1).remove();
  };


  this.load = function (game) {
    var that = this;
    var dict = game[this.id];
    if (this.fixedkeys) {
      $.each(this.fixedkeys, function (index, key) {
        that.PutUI(key, dict[key]);
      });
    } else {
      $.each(dict, function (index, row) {
        if (that.columns == 2)
          that.PutUI(row[0], row[1]);
        else
          that.AddUI(row);
      });
    }
  };


  this.label = function (n) {
    return this.fixedkeys ? this.fixedkeys[n] : game[this.id][n][0];
  };
}


var ExpBar, PlotBar, TaskBar, QuestBar, EncumBar;
var Traits,Stats,Spells,Equips,Inventory,Plots,Quests;
var Kill;
var AllBars, AllLists;


function StrToIntDef(s, def) {
  var result = parseInt(s, 10);
  return isNaN(result) ? def : result;
}


function WinSpell() {
  AddR(Spells, K.Spells[RandomLow(Min(GetI(Stats,'WIS')+GetI(Traits,'Level'),
                                      K.Spells.length))], 1);
}

function LPick(list, goal) {
  var result = Pick(list);
  for (var i = 1; i <= 5; ++i) {
    var best = StrToInt(Split(result, 1));
    var s = Pick(list);
    var b1 = StrToInt(Split(s,1));
    if (Abs(goal-best) > Abs(goal-b1))
      result = s;
  }
  return result;
}

function Abs(x) {
  if (x < 0) return -x; else return x;
}

function WinEquip() {
  var posn = Random(Equips.length());

  if (!posn) {
    stuff = K.Weapons;
    better = K.OffenseAttrib;
    worse = K.OffenseBad;
  } else {
    better = K.DefenseAttrib;
    worse = K.DefenseBad;
    stuff = (posn == 1) ? K.Shields:  K.Armors;
  }
  var name = LPick(stuff, GetI(Traits,'Level'));
  var qual = StrToInt(Split(name,1));
  name = Split(name,0);
  var plus = GetI(Traits,'Level') - qual;
  if (plus < 0) better = worse;
  var count = 0;
  while (count < 2 && plus) {
    var modifier = Pick(better);
    qual = StrToInt(Split(modifier, 1));
    modifier = Split(modifier, 0);
    if (Pos(modifier, name) > 0) break; // no repeats
    if (Abs(plus) < Abs(qual)) break; // too much
    name = modifier + ' ' + name;
    plus -= qual;
    ++count;
  }
  if (plus) name = plus + ' ' + name;
  if (plus > 0) name = '+' + name;

  Put(Equips, posn, name);
  game.bestequip = name;
  if (posn > 1) game.bestequip += ' ' + Equips.label(posn);
}


function Square(x) { return x * x; }

function WinStat() {
  var i;
  if (Odds(1,2))  {
    i = Pick(K.Stats);
  } else {
    // Favor the best stat so it will tend to clump
    var t = 0;
    $.each(K.Stats, function (index, key) {
      t += Square(GetI(Stats, key));
    });
    t = Random(t);
    $.each(K.Stats, function (index, key) {
      i = key;
      t -= Square(GetI(Stats, key));
      if (t < 0) return false;
    });
  }
  Add(Stats, i, 1);
}

function SpecialItem() {
  return InterestingItem() + ' of ' + Pick(K.ItemOfs);
}

function InterestingItem() {
  return Pick(K.ItemAttrib) + ' ' + Pick(K.Specials);
}

function BoringItem() {
  return Pick(K.BoringItems);
}

function WinItem() {
  Add(Inventory, SpecialItem(), 1);
}

function CompleteQuest() {
  QuestBar.reset(50 + RandomLow(1000));
  if (Quests.length()) {
    Log('Quest completed: ' + game.bestquest);
    Quests.CheckAll();
    [WinSpell,WinEquip,WinStat,WinItem][Random(4)]();
  }
  while (Quests.length() > 99)
    Quests.remove0();

  game.questmonster = '';
  var caption;
  switch (Random(5)) {
  case 0:
    var level = GetI(Traits,'Level');
    var lev = 0;
    for (var i = 1; i <= 4; ++i) {
      var montag = Random(K.Monsters.length);
      var m = K.Monsters[montag];
      var l = StrToInt(Split(m,1));
      if (i == 1 || Abs(l - level) < Abs(lev - level)) {
        lev = l;
        game.questmonster = m;
        game.questmonsterindex = montag;
      }
    }
    caption = 'Exterminate ' + Definite(Split(game.questmonster,0),2);
    break;
  case 1:
    caption = 'Seek ' + Definite(InterestingItem(), 1);
    break;
  case 2:
    caption = 'Deliver this ' + BoringItem();
    break;
  case 3:
    caption = 'Fetch me ' + Indefinite(BoringItem(), 1);
    break;
  case 4:
    var mlev = 0;
    level = GetI(Traits,'Level');
    for (var ii = 1; ii <= 2; ++ii) {
      montag = Random(K.Monsters.length);
      m = K.Monsters[montag];
      l = StrToInt(Split(m,1));
      if ((ii == 1) || (Abs(l - level) < Abs(mlev - level))) {
        mlev = l;
        game.questmonster = m;
      }
    }
    caption = 'Placate ' + Definite(Split(game.questmonster,0),2);
    game.questmonster = '';  // We're trying to placate them, after all
    break;
  }
  if (!game.Quests) game.Quests = [];
  while (game.Quests.length > 99) game.Quests.shift();
  game.Quests.push(caption);
  game.bestquest = caption;
  Quests.AddUI(caption);


  Log('Commencing quest: ' + caption);

  SaveGame();
}

function toRoman(n) {
  if (!n) return "N";
  var s = "";
  function _rome(dn,ds) {
    if (n >= dn) {
      n -= dn;
      s += ds;
      return true;
    } else return false;
  }
  if (n < 0) {
    s = "-";
    n = -n;
  }
  while (_rome(1000,"M")) {0;}
  _rome(900,"CM");
  _rome(500,"D");
  _rome(400,"CD");
  while (_rome(100,"C")) {0;}
  _rome(90,"XC");
  _rome(50,"L");
  _rome(40,"XL");
  while (_rome(10,"X")) {0;}
  _rome(9,"IX");
  _rome(5,"V");
  _rome(4,"IV");
  while (_rome(1,"I")) {0;}
  return s;
}

function toArabic(s) {
  n = 0;
  s = s.toUpperCase();
  function _arab(ds,dn) {
    if (!Starts(s, ds)) return false;
    s = s.substr(ds.length);
    n += dn;
    return true;
  }
  while (_arab("M",1000)) {0;}
  _arab("CM",900);
  _arab("D",500);
  _arab("CD",400);
  while (_arab("C",100)) {0;}
  _arab("XC",90);
  _arab("L",50);
  _arab("XL",40);
  while (_arab("X",10)) {0;}
  _arab("IX",9);
  _arab("V",5);
  _arab("IV",4);
  while (_arab("I",1)) {0;}
  return n;
}

function CompleteAct() {
  Plots.CheckAll();
  game.act += 1;
  PlotBar.reset(60 * 60 * (1 + 5 * game.act)); // 1 hr + 5/act
  Plots.AddUI((game.bestplot = 'Act ' + toRoman(game.act)));

  if (game.act > 1) {
    WinItem();
    WinEquip();
  }

  Brag('act');
}


function Log(line) {
  if (game.log)
    game.log[+new Date()] = line;
  // TODO: and now what?
}

function Task(caption, msec) {
  game.kill = caption + "...";
  events.killing(game.kill);
  Log(game.kill);
  TaskBar.reset(msec);
}

function Add(list, key, value) {
  Put(list, key, value + GetI(list,key));

  /*$IFDEF LOGGING*/
  if (!value) return;
  var line = (value > 0) ? "Gained" : "Lost";
  if (key == 'Gold') {
    key = "gold piece";
    line = (value > 0) ? "Got paid" : "Spent";
  }
  if (value < 0) value = -value;
  line = line + ' ' + Indefinite(key, value);
  Log(line);
  /*$ENDIF*/
}

function AddR(list, key, value) {
  Put(list, key, toRoman(value + toArabic(Get(list,key))));
}

function Get(list, key) {
  if (list.fixedkeys) {
    if (typeof key === typeof 1)
      key = list.fixedkeys[key];
    return game[list.id][key];
  } else if (typeof key === typeof 1) {
    if (key < game[list.id].length)
      return game[list.id][key][1];
    else
      return "";
  } else {
    for (var i = 0; i < game[list.id].length; ++i) {
      if (game[list.id][i][0] === key)
        return game[list.id][i][1];
    }
    return "";
  }
}

function GetI(list, key) {
  return StrToIntDef(Get(list,key), 0);
}

function Min(a,b) {
  return a < b ? a : b;
}

function Max(a,b) {
  return a > b ? a : b;
}

function LevelUp() {
  events.killing("You gain one level");
  Add(Traits,'Level',1);
  Add(Stats,'HP Max', GetI(Stats,'CON').div(3) + 1 + Random(4));
  Add(Stats,'MP Max', GetI(Stats,'INT').div(3) + 1 + Random(4));
  WinStat();
  WinStat();
  WinSpell();
  ExpBar.reset(LevelUpTime(GetI(Traits,'Level')));
  Brag('level');
}

function ClearAllSelections() {
  $.each(AllLists, function () {this.ClearSelection();});
}

function RoughTime(s) {
  if (s < 120) return s + ' seconds';
  else if (s < 60 * 120) return s.div(60) + ' minutes';
  else if (s < 60 * 60 * 48) return s.div(3600) + ' hours';
  else if (s < 60 * 60 * 24 * 60) return s.div(3600 * 24) + ' days';
  else if (s < 60 * 60 * 24 * 30 * 24) return s.div(3600 * 24 * 30) +" months";
  else return s.div(3600 * 24 * 30 * 12) + " years";

}

function Pos(needle, haystack) {
  return haystack.indexOf(needle) + 1;
}

var dealing = false;

function Timer1Timer() {
  timerid = null;  // Event has fired
  if (TaskBar.done()) {
    game.tasks += 1;
    game.elapsed += TaskBar.Max().div(1000);

    ClearAllSelections();

    if (game.kill == 'Loading....')
      TaskBar.reset(0);  // Not sure if this is still the ticket

    // gain XP / level up
    var gain = Pos('kill|', game.task) == 1;
    if (gain) {
      if (ExpBar.done())
        LevelUp();
      else
        ExpBar.increment(TaskBar.Max() / 1000);
    }

    // advance quest
    if (gain && game.act >= 1) {
      if (QuestBar.done() || !Quests.length()) {
        CompleteQuest();
      } else {
        QuestBar.increment(TaskBar.Max() / 1000);
      }
    }

    // advance plot
    if (gain || !game.act) {
      if (PlotBar.done())
        InterplotCinematic();
      else
        PlotBar.increment(TaskBar.Max() / 1000);
    }

    Dequeue();
    SaveGame();
  } else {
    var elapsed = timeGetTime() - lasttick;
    if (elapsed > 100) elapsed = 100;
    if (elapsed < 0) elapsed = 0;
    TaskBar.increment(elapsed);
  }

  StartTimer();
}

function FormCreate(name) {
  ExpBar =   new ProgressBar("ExpBar", "$remaining XP needed for next level");
  EncumBar = new ProgressBar("EncumBar", "$position/$max cubits");
  PlotBar =  new ProgressBar("PlotBar", "$time remaining");
  QuestBar = new ProgressBar("QuestBar", "$percent% complete");
  TaskBar =  new ProgressBar("TaskBar", "$percent%");

  AllBars = [ExpBar,PlotBar,TaskBar,QuestBar,EncumBar];

  Traits =    new ListBox("Traits",    2, K.Traits);
  Stats =     new ListBox("Stats",     2, K.Stats);
  Spells =    new ListBox("Spells",    2);
  Equips =    new ListBox("Equips",    2, K.Equips);
  Inventory = new ListBox("Inventory", 2);
  Plots =     new ListBox("Plots",  1);
  Quests =    new ListBox("Quests", 1);

  Plots.load = function (sheet) {
    for (var i = Max(0, game.act-99); i <= game.act; ++i)
      this.AddUI(i ? 'Act ' + toRoman(i) : "Prologue");

  };

  AllLists = [Traits,Stats,Spells,Equips,Inventory,Plots,Quests];

  if (document) {
    Kill = $("#Kill");

    $("#quit").click(quit);

    $(document).keypress(FormKeyDown);

    $(document).bind('beforeunload', function () {
      if (!storage)
        return "Are you sure you want to quit? All your progress will be lost!";
    });

    $(window).unload(function (event) {
      StopTimer();
      SaveGame();
      if (storage.async) {
        // Have to give SQL transaction a chance to complete
        if (window.showModalDialog)
          pause(100);

      }
    });

    if (iOS) $("body").addClass("iOS");
  }

  storage.loadSheet(name, LoadGame);
}



function pause(msec) {
  /*window.showModalDialog("javascript:document.writeln ('<script>window.setTimeout(" +
                         "function () { window.close(); }," + msec + ");</script>')",
                         null, 
                         "dialogWidth:0;dialogHeight:0;dialogHide:yes;unadorned:yes;"+
                  "status:no;scroll:no;center:no;dialogTop:-10000;dialogLeft:-10000");*/
}

function quit() {
  $(window).unbind('unload');
  SaveGame(function () { events.to_roster(); });
}


function HotOrNot() {
  // Figure out which spell is best
  if (Spells.length()) {
    var flat = 1;  // Flattening constant
    var best = 0, i;
    for (i = 1; i < Spells.length(); ++i) {
      if ((i+flat) * toArabic(Get(Spells,i)) >
          (best+flat) * toArabic(Get(Spells,best)))
        best = i;
    }
    game.bestspell = Spells.label(best) + ' ' + Get(Spells, best);
  } else {
    game.bestspell = '';
  }

  /// And which stat is best?
  best = 0;
  for (i = 1; i <= 5; ++i) {
    if (GetI(Stats,i) > GetI(Stats,best))
      best = i;
  }
  game.beststat = Stats.label(best) + ' ' + GetI(Stats, best);
}


function SaveGame(callback) {
  Log('Saving game: ' + GameSaveName());
  HotOrNot();
  game.date = ''+new Date();
  game.stamp = +new Date();
  game.seed = randseed();
  storage.addToRoster(game, callback);
}

function LoadGame(sheet) {
  if (!sheet) {
    events.to_roster();
    return;
  }

  game = sheet;

  if (document) {
    var title = "Progress Quest - " + GameSaveName();
    $("#title").text(title);
    if (iOS) title = GameSaveName();
    document.title = title;
  }
  

  randseed(game.seed);
  $.each(AllBars.concat(AllLists), function (i, e) { e.load(game); });
  events.killing(game.kill);
  ClearAllSelections();
  $.each([Plots,Quests], function () {
    this.CheckAll(true);
  });
  Log('Loaded game: ' + game.Traits.Name);
  if (!game.elapsed)
    Brag('start');
  StartTimer();
}

function GameSaveName() {
  if (!game.saveName) {
    game.saveName = Get(Traits, 'Name');
    if (game.realm)
      game.saveName += ' [' + game.realm + ']';
  }
  return game.saveName;
}


function InputBox(message, def) {
  var i = prompt(message, def || '');
  return (i !== null) ? i : def;
}

function ToDna(s) {
  s = s + "";
  var code = {
    '0': "AT",
    '1': "AG",
    '2': "AC",
    '3': "TA",
    '4': "TG",
    '5': "TC",
    '6': "GA",
    '7': "GT",
    '8': "GC",
    '9': "CA",
    ',': "CT",
    '.': "CG"
  };
  var r = "";
  for (var i = 0; i < s.length; ++i) {
    r += code[s[i]];
    if (i && (i % 4) == 0) r += " ";
  }
  return r;
}

function FormKeyDown(e) {
  var key = String.fromCharCode(e.which);

  if (key === 'd') {
    alert("Your character's genome is " + ToDna(game.dna + ""));
  }

  if (game.isonline) {
    if (key === 'b') {
      Brag('brag');
    }
    
    if (key === 'g') {
      game.guild = InputBox('Choose a guild.\r\rMake sure you undestand the guild rules before you join one. To learn more about guilds, visit http://progressquest.com/guilds.php', game.guild);
      Brag("guild");
    }
    
    if (key === 'm') {
      game.motto = InputBox('Declare your motto!', game.motto);
      Brag('motto');
    }
  }

  if (key === 'p') {
    if (timerid) {
      $('#paused').css('display', 'block');
      StopTimer();
    } else {
      $('#paused').css('display', '');
      StartTimer();
    }
  }

  if (key === 'q') {
    quit();
  }

  if (key === 's') {
    SaveGame();
    alert('Saved (' + JSON.stringify(game).length + ' bytes).');
  }

}

function LFSR(pt, salt) {
  var result = salt;
  for (var k = 1; k <= Length(pt); ++k)
    result = Ord(pt[k]) ^ (result << 1) ^ (1 && ((result >> 31) ^ (result >> 5)));
  for (var kk = 1; kk <= 10; ++kk)
    result = (result << 1) ^ (1 && ((result >> 31) ^ (result >> 5)));
}


function Brag(trigger) {
  SaveGame();
  if (game.isonline) {
    game.bragtrigger = trigger;
    $.post("webrag.php", game, function (data, textStatus, request) {
      if (data.alert)
        events.alert(data.alert);
    }, "json");
  }
}

function launch() {
  if (localStorage.getItem("progressquestplayer")) {
    real_launch(localStorage.getItem("progressquestplayer"));
  } else {
    NewGuyFormLoad();
    events.character_created = function(name) {
      localStorage.setItem("progressquestplayer", name);
      launch();
    };
    sold();
  }
}

function real_launch(name) {
  FormCreate(name);
}

return {
  events: events,
  launch: launch,
};

this.events = events;
this.launch = launch;

};