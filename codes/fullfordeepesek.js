//lib/db.js
import fs from "fs";
import path from "path";

export function createDB(file = "./data/db.json") {
    const abs = path.resolve(file);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let data = {
        meta: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: "2.0",
            description: "Unified Database for WhatsApp Bot & Web Store Panel",
            slot: {
                saldoAwal: 100000,
                biaya: 5000,
                winrate: 35,
                maxWinRate: 5,
                depoReward: 50000,
                depoCooldown: 3 * 60 * 60 * 1000,
                spinCooldown: 10000
            },
            pendingTransfers: {},
            tournament: {
                active: false,
                startTime: 0,
                endTime: 0,
                prizePool: 0,
                participants: {},
                winner: null
            }
        },
        whatsapp: {
            users: {},
            groups: {},
            premium: {},
            responses: {}
        },
        panel: {
            servers: {},
            users: {},
            buyerGroups: {},
            buyerMembers: {},
            resellerGroups: {},
            unlimitedCommands: ["3gb", "5gb", "10gb", "unli", "unlimited"]
        },
        webstore: {
            users: [],
            orders: [],
            services: [],
            referralCodes: {},
            verificationCodes: {},
            resetTokens: {}
        }
    };

    let needsSave = false;
    let autoSaveInterval = null;

    function ensureShape() {
        if (!data.meta) {
            data.meta = { 
                createdAt: Date.now(), 
                updatedAt: Date.now(),
                version: "2.0"
            };
        }
        
        // Ensure meta.slot structure
        if (!data.meta.slot) {
            data.meta.slot = {
                saldoAwal: 100000,
                biaya: 5000,
                winrate: 35,
                maxWinRate: 5,
                depoReward: 50000,
                depoCooldown: 3 * 60 * 60 * 1000,
                spinCooldown: 10000
            };
        }
        
        // Ensure tournament structure
        if (!data.meta.tournament) {
            data.meta.tournament = {
                active: false,
                startTime: 0,
                endTime: 0,
                prizePool: 0,
                participants: {},
                winner: null
            };
        }
        
        // Ensure pendingTransfers
        if (!data.meta.pendingTransfers) {
            data.meta.pendingTransfers = {};
        }
        
        if (!data.whatsapp) data.whatsapp = {};
        if (!data.whatsapp.users) data.whatsapp.users = {};
        if (!data.whatsapp.groups) data.whatsapp.groups = {};
        if (!data.whatsapp.premium) data.whatsapp.premium = {};
        if (!data.whatsapp.responses) data.whatsapp.responses = {};
        
        if (!data.panel) data.panel = {};
        if (!data.panel.servers) data.panel.servers = {};
        if (!data.panel.users) data.panel.users = {};
        if (!data.panel.buyerGroups) data.panel.buyerGroups = {};
        if (!data.panel.buyerMembers) data.panel.buyerMembers = {};
        if (!data.panel.resellerGroups) data.panel.resellerGroups = {};
        if (!Array.isArray(data.panel.unlimitedCommands)) {
            data.panel.unlimitedCommands = ["3gb", "5gb", "10gb", "unli", "unlimited"];
        }
        
        if (!data.webstore) data.webstore = {};
        if (!Array.isArray(data.webstore.users)) data.webstore.users = [];
        if (!Array.isArray(data.webstore.orders)) data.webstore.orders = [];
        if (!Array.isArray(data.webstore.services)) data.webstore.services = [];
        if (!data.webstore.referralCodes) data.webstore.referralCodes = {};
        if (!data.webstore.verificationCodes) data.webstore.verificationCodes = {};
        if (!data.webstore.resetTokens) data.webstore.resetTokens = {};
    }

    function migrateFromOldStructure(oldData) {
        if (oldData.users || oldData.groups || oldData.responses) {
            console.log("Detected old structure, migrating...");
            
            if (oldData.users) data.whatsapp.users = oldData.users;
            if (oldData.groups) data.whatsapp.groups = oldData.groups;
            if (oldData.premium) data.whatsapp.premium = oldData.premium;
            if (oldData.responses) data.whatsapp.responses = oldData.responses;
            
            if (oldData.panel) {
                if (oldData.panel.servers) data.panel.servers = oldData.panel.servers;
                if (oldData.panel.users) data.panel.users = oldData.panel.users;
                if (oldData.panel.buyerGroups) data.panel.buyerGroups = oldData.panel.buyerGroups;
                if (oldData.panel.buyerMembers) data.panel.buyerMembers = oldData.panel.buyerMembers;
                if (oldData.panel.resellerGroups) data.panel.resellerGroups = oldData.panel.resellerGroups;
            }
            
            if (Array.isArray(oldData.webstore_users)) {
                data.webstore.users = oldData.webstore_users;
            }
            if (Array.isArray(oldData.webstore_orders)) {
                data.webstore.orders = oldData.webstore_orders;
            }
            if (Array.isArray(oldData.webstore_services)) {
                data.webstore.services = oldData.webstore_services;
            }
            
            // Migrate old slot data
            if (oldData.meta?.slot) {
                data.meta.slot = oldData.meta.slot;
            }
            
            // Migrate tournament data
            if (oldData.meta?.tournament) {
                data.meta.tournament = oldData.meta.tournament;
            }
            
            // Migrate pending transfers
            if (oldData.meta?.pendingTransfers) {
                data.meta.pendingTransfers = oldData.meta.pendingTransfers;
            }
        }
        return data;
    }

    async function load() {
        if (!fs.existsSync(abs)) {
            ensureShape();
            await fs.promises.writeFile(abs, JSON.stringify(data, null, 2));
            console.log(`Database created: ${abs}`);
            startAutoSave();
            return data;
        }
        
        const raw = await fs.promises.readFile(abs, "utf8");
        if (!raw || raw.trim() === "") {
            ensureShape();
            await fs.promises.writeFile(abs, JSON.stringify(data, null, 2));
            startAutoSave();
            return data;
        }
        
        try {
            const parsed = JSON.parse(raw);
            
            if (parsed.users || parsed.groups) {
                data = migrateFromOldStructure(parsed);
            } else {
                data = parsed;
            }
            
            ensureShape();
            console.log(`Database loaded from: ${abs}`);
            startAutoSave();
            return data;
        } catch (error) {
            console.error("Error parsing database:", error.message);
            ensureShape();
            await fs.promises.writeFile(abs, JSON.stringify(data, null, 2));
            startAutoSave();
            return data;
        }
    }

    async function save() {
        ensureShape();
        data.meta.updatedAt = Date.now();
        needsSave = false;
        
        try {
            await fs.promises.writeFile(abs, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error("Error saving database:", error.message);
            return false;
        }
    }

    async function saveIfNeeded() {
        if (needsSave) {
            return save();
        }
        return Promise.resolve();
    }

    function markForSave() {
        needsSave = true;
    }

    function startAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        autoSaveInterval = setInterval(() => {
            if (needsSave) {
                save().catch(err => console.error("Auto-save error:", err));
            }
        }, 5000);
        
        setInterval(() => {
            if (needsSave) {
                save().catch(err => console.error("Forced auto-save error:", err));
            }
        }, 30000);
        
        console.log("Auto-save enabled");
    }

    function getUser(id) {
if (!id) return null;
const k = String(id);

if (!data.whatsapp.users[k]) {
    data.whatsapp.users[k] = {
        id: k,
        name: "",
        hits: 0,
        banned: false,
        warning: 0,
        afkTime: -1,
        afkReason: "",
        autoai: false,
        energy: 100,
        maxEnergy: 999,
        lastRest: 0,
        rpg: {
            role: "Novice",
            level: 1,
            exp: 0,
            maxExp: 999,
            hp: 100,
            maxHp: 999,
            str: 5,
            def: 2,
            gold: 1000,
            atm: 0,
            inventory: [],
            dungeonStage: 1,
            lastAdventure: 0,
            lastDaily: 0,
            lastGacha: 0,
            lastMining: 0,
            lastFishing: 0,
            questProgress: {},
            achievements: []
        },
        sholat: {
            on: false,
            cityId: null,
            cityName: "",
            lastDate: "",
            sentToday: {},
            autoClose: false,
            closeDuration: 10
        },
        slot: {
            saldo: 100000,
            lastSpin: 0,
            lastDepo: 0,
            bet: 5000,
            lastRampok: 0,
            rampokCount: 0,
            lastJual: 0,
            jualCount: 0,
            lastJualDate: 0,
            jualStreak: 0,
            rampokHistory: [],
            earningsHistory: [],
            transferHistory: [],
            shopHistory: [],
            vipRewards: [],
            achievements: [],
            protectionActive: false,
            protectionUntil: 0,
            protectionBought: 0,
            doubleBetActive: false,
            doubleBetUntil: 0,
            doubleBetBought: 0,
            luckyCharmActive: false,
            luckyCharmUntil: 0,
            luckyCharmBought: 0,
            jackpotBoostActive: false,
            jackpotBoostUntil: 0,
            jackpotBoostBought: 0,
            limitResets: 0,
            lastVipDaily: 0,
            totalSpins: 0,
            totalWins: 0,
            totalWinAmount: 0,
            jackpotCount: 0,
            totalJual: 0,
            jualItems: {},
            totalTransferOut: 0,
            totalTransferIn: 0,
            rampokSuccessCount: 0,
            rampokFailCount: 0,
            totalRampokSuccess: 0,
            achievementRewards: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

const u = data.whatsapp.users[k];

// Ensure basic fields
if (typeof u.hits === "undefined") u.hits = 0;
if (typeof u.banned === "undefined") u.banned = false;
if (typeof u.warning === "undefined") u.warning = 0;
if (typeof u.energy === "undefined") {
    u.energy = 100;
    u.maxEnergy = 100;
    u.lastRest = 0;
}

// Di dalam function getUser(id), setelah inisialisasi user:
if (!u.roleplay) {
    u.roleplay = {
        profile: {
            bio: "",
            title: "Pemula",
            badge: "🥚 Newbie",
            status: "Single",
            happiness: 100,
            health: 100,
            education: 0,
            level: 1,
            exp: 0
        },
        economy: {
            cash: 1000,
            bank: 0,
            job: null,
            salary: 0,
            totalEarned: 0,
            businesses: [],
            investments: []
        },
        social: {
            friends: [],
            spouse: null,
            children: [],
            visits: 0,
            popularity: 0
        },
        property: {
            house: "Kos",
            car: null,
            furniture: [],
            garden: []
        },
        lifestyle: {
            hobbies: [],
            lastVacation: 0,
            educationLevel: 0
        }
    };
}

if (!u.rpg) u.rpg = {};
const r = u.rpg;
    
    if (!r.role) r.role = "Novice";
    if (typeof r.level !== "number") r.level = 1;
    if (typeof r.exp !== "number") r.exp = 0;
    if (typeof r.maxExp !== "number") r.maxExp = 200;
    if (typeof r.hp !== "number") r.hp = 100;
    if (typeof r.maxHp !== "number") r.maxHp = 100;
    if (typeof r.str !== "number") r.str = 5;
    if (typeof r.def !== "number") r.def = 2;
    if (typeof r.gold !== "number") r.gold = 1000;
    if (typeof r.atm !== "number") r.atm = 0;
    if (!Array.isArray(r.inventory)) r.inventory = [];
    if (typeof r.dungeonStage !== "number") r.dungeonStage = 1;
    if (!r.questProgress) r.questProgress = {};
    if (!r.achievements) r.achievements = [];
    
    if (!r.lastAdventure) r.lastAdventure = 0;
    if (!r.lastDaily) r.lastDaily = 0;
    if (!r.lastGacha) r.lastGacha = 0;
    if (!r.lastMining) r.lastMining = 0;
    if (!r.lastFishing) r.lastFishing = 0;
    
    // Ensure sholat structure
    if (!u.sholat) {
        u.sholat = {
            on: false,
            cityId: null,
            cityName: "",
            lastDate: "",
            sentToday: {},
            autoClose: false,
            closeDuration: 10
        };
    }
    
    // Ensure slot structure with all new fields
    if (!u.slot) {
        u.slot = {
            saldo: 100000,
            lastSpin: 0,
            lastDepo: 0,
            bet: 5000,
            lastRampok: 0,
            rampokCount: 0,
            lastJual: 0,
            jualCount: 0,
            lastJualDate: 0,
            jualStreak: 0,
            rampokHistory: [],
            earningsHistory: [],
            transferHistory: [],
            shopHistory: [],
            vipRewards: [],
            achievements: [],
            protectionActive: false,
            protectionUntil: 0,
            protectionBought: 0,
            doubleBetActive: false,
            doubleBetUntil: 0,
            doubleBetBought: 0,
            luckyCharmActive: false,
            luckyCharmUntil: 0,
            luckyCharmBought: 0,
            jackpotBoostActive: false,
            jackpotBoostUntil: 0,
            jackpotBoostBought: 0,
            limitResets: 0,
            lastVipDaily: 0,
            totalSpins: 0,
            totalWins: 0,
            totalWinAmount: 0,
            jackpotCount: 0,
            totalJual: 0,
            jualItems: {},
            totalTransferOut: 0,
            totalTransferIn: 0,
            rampokSuccessCount: 0,
            rampokFailCount: 0,
            totalRampokSuccess: 0,
            achievementRewards: 0
        };
    }
    
    const s = u.slot;
    
    // Ensure all slot fields exist
    if (typeof s.saldo !== "number") s.saldo = 100000;
    if (typeof s.lastSpin !== "number") s.lastSpin = 0;
    if (typeof s.lastDepo !== "number") s.lastDepo = 0;
    if (typeof s.bet !== "number") s.bet = 5000;
    if (typeof s.lastRampok !== "number") s.lastRampok = 0;
    if (typeof s.rampokCount !== "number") s.rampokCount = 0;
    if (typeof s.lastJual !== "number") s.lastJual = 0;
    if (typeof s.jualCount !== "number") s.jualCount = 0;
    if (typeof s.lastJualDate !== "number") s.lastJualDate = 0;
    if (typeof s.jualStreak !== "number") s.jualStreak = 0;
    if (!Array.isArray(s.rampokHistory)) s.rampokHistory = [];
    if (!Array.isArray(s.earningsHistory)) s.earningsHistory = [];
    if (!Array.isArray(s.transferHistory)) s.transferHistory = [];
    if (!Array.isArray(s.shopHistory)) s.shopHistory = [];
    if (!Array.isArray(s.vipRewards)) s.vipRewards = [];
    if (!Array.isArray(s.achievements)) s.achievements = [];
    if (typeof s.protectionActive !== "boolean") s.protectionActive = false;
    if (typeof s.protectionUntil !== "number") s.protectionUntil = 0;
    if (typeof s.protectionBought !== "number") s.protectionBought = 0;
    if (typeof s.doubleBetActive !== "boolean") s.doubleBetActive = false;
    if (typeof s.doubleBetUntil !== "number") s.doubleBetUntil = 0;
    if (typeof s.doubleBetBought !== "number") s.doubleBetBought = 0;
    if (typeof s.luckyCharmActive !== "boolean") s.luckyCharmActive = false;
    if (typeof s.luckyCharmUntil !== "number") s.luckyCharmUntil = 0;
    if (typeof s.luckyCharmBought !== "number") s.luckyCharmBought = 0;
    if (typeof s.jackpotBoostActive !== "boolean") s.jackpotBoostActive = false;
    if (typeof s.jackpotBoostUntil !== "number") s.jackpotBoostUntil = 0;
    if (typeof s.jackpotBoostBought !== "number") s.jackpotBoostBought = 0;
    if (typeof s.limitResets !== "number") s.limitResets = 0;
    if (typeof s.lastVipDaily !== "number") s.lastVipDaily = 0;
    if (typeof s.totalSpins !== "number") s.totalSpins = 0;
    if (typeof s.totalWins !== "number") s.totalWins = 0;
    if (typeof s.totalWinAmount !== "number") s.totalWinAmount = 0;
    if (typeof s.jackpotCount !== "number") s.jackpotCount = 0;
    if (typeof s.totalJual !== "number") s.totalJual = 0;
    if (!s.jualItems) s.jualItems = {};
    if (typeof s.totalTransferOut !== "number") s.totalTransferOut = 0;
    if (typeof s.totalTransferIn !== "number") s.totalTransferIn = 0;
    if (typeof s.rampokSuccessCount !== "number") s.rampokSuccessCount = 0;
    if (typeof s.rampokFailCount !== "number") s.rampokFailCount = 0;
    if (typeof s.totalRampokSuccess !== "number") s.totalRampokSuccess = 0;
    if (typeof s.achievementRewards !== "number") s.achievementRewards = 0;
    
    return u;
}

function getGroup(id) {
    if (!id) return null;
    const k = String(id);
    
    if (!data.whatsapp.groups[k]) {
        data.whatsapp.groups[k] = {
            id: k,
            members: {},
            welcome: false,
            goodbye: false,
            antiDelete: false,
            antiTagSW: false,
            welcomeText: "Selamat datang @user di @subject\n\n@desc",
            goodbyeText: "Selamat tinggal @user",
            expired: 0, 
            sewa: { 
                active: false,
                renter: "", 
                renterName: "",
                startTime: 0,
                endTime: 0,
                days: 0,
                amount: 0,
                paymentProof: "",
                paymentMethod: "",
                transactionId: "",
                lastReminder: 0,
                remindersSent: 0
            },
            bannedMembers: [],
            autoAcc: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }
    
    const g = data.whatsapp.groups[k];
    if (typeof g.antiDelete === "undefined") g.antiDelete = false;
    
    if (!g.sewa) {
        g.sewa = {
            active: false,
            renter: "",
            renterName: "",
            startTime: 0,
            endTime: 0,
            days: 0,
            amount: 0,
            paymentProof: "",
            paymentMethod: "",
            transactionId: "",
            lastReminder: 0,
            remindersSent: 0
        };
    }
    
    if (typeof g.expired === "undefined") g.expired = 0;
    if (!g.members) g.members = {};
    if (typeof g.welcome === "undefined") g.welcome = false;
    if (!g.welcomeText) g.welcomeText = "Selamat datang @user";
    if (!g.goodbyeText) g.goodbyeText = "Selamat tinggal @user";
    if (typeof g.muted === "undefined") g.muted = false;
    if (typeof g.mutedBy === "undefined") g.mutedBy = "";
    if (typeof g.mutedAt === "undefined") g.mutedAt = 0;
    if (typeof g.autoAcc === "undefined") g.autoAcc = false;
    
    if (!g.sholat) {
        g.sholat = {
            on: false,
            cityId: null,
            cityName: "",
            lastDate: "",
            sentToday: {},
            autoClose: false,
            closeDuration: 10
        };
    }
    
    return g;
}

    function getAllGroups() {
        return data.whatsapp.groups || {};
    }
    
    function touchUser(id, name = "") {
        const u = getUser(id);
        if (!u) return null;
        u.updatedAt = Date.now();
        u.hits = (u.hits || 0) + 1;
        if (name) u.name = name;
        return u;
    }

    function touchGroup(id) {
        const g = getGroup(id);
        if (!g) return null;
        g.updatedAt = Date.now();
        return g;
    }
    
    function getGroupMember(groupId, userId) {
        if (!groupId || !userId) return null;
        const g = getGroup(groupId);
        if (!g.members[userId]) {
            g.members[userId] = { 
                id: userId, 
                xp: 0, 
                level: 1, 
                msgCount: 0, 
                lastChat: 0 
            };
        }
        return g.members[userId];
    }
    
    function touchGroupMember(groupId, userId, xpGain = 0) {
        const m = getGroupMember(groupId, userId);
        if (!m) return null;
        m.msgCount += 1;
        m.lastChat = Date.now();
        if (xpGain > 0) m.xp += xpGain;
        return m;
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    
    function getPremium(id) {
        if (!id) return null;
        const k = String(id);
        const p = data.whatsapp.premium[k];
        if (!p) return null;
        return p;
    }
    
    function isPremium(id) {
        if (!id) return false;
        const p = getPremium(id);
        if (!p) return false;
        if (!p.expireAt) return true;
        return Date.now() < p.expireAt;
    }
    
    function addPremiumDays(id, days = 0, by = "", note = "") {
        if (!id) return null;
        const k = String(id);
        const now = Date.now();
        const prev = data.whatsapp.premium[k] || null;
        let expireAt = 0;
        const d = Number(days) || 0;
        
        if (d > 0) {
            const base = prev?.expireAt && prev.expireAt > now ? prev.expireAt : now;
            expireAt = base + d * DAY_MS;
        }
        
        const p = {
            id: k,
            expireAt,
            addedAt: prev?.addedAt || now,
            updatedAt: now,
            addedBy: String(by || ""),
            note: String(note || "")
        };
        
        data.whatsapp.premium[k] = p;
        return p;
    }
    
    function setPremiumExpire(id, expireAt = 0, by = "", note = "") {
        if (!id) return null;
        const k = String(id);
        const now = Date.now();
        const p = {
            id: k,
            expireAt: Number(expireAt) || 0,
            updatedAt: now,
            addedBy: String(by || ""),
            note: String(note || "")
        };
        data.whatsapp.premium[k] = p;
        return p;
    }
    
    function delPremium(id) {
        if (!id) return false;
        const k = String(id);
        if (!data.whatsapp.premium[k]) return false;
        delete data.whatsapp.premium[k];
        return true;
    }
    
    function listPremium() {
        const now = Date.now();
        const all = Object.values(data.whatsapp.premium || {});
        const clean = all.filter(x => x?.id);
        clean.sort((a, b) => (a.expireAt || 0) - (b.expireAt || 0));
        return clean.map(p => ({
            ...p,
            active: isPremium(p.id),
            remainingMs: p.expireAt ? (p.expireAt - now) : 0
        }));
    }
    
    function cleanupExpiredPremium() {
        const now = Date.now();
        let removed = 0;
        for (const [id, p] of Object.entries(data.whatsapp.premium || {})) {
            if (p.expireAt && p.expireAt <= now) {
                delete data.whatsapp.premium[id];
                removed++;
            }
        }
        return removed;
    }

    function getResponse(key) {
        const k = String(key || "").toLowerCase().trim();
        return data.whatsapp.responses[k] || null;
    }
    
    function addResponse(key, value) {
        const k = String(key || "").toLowerCase().trim();
        if (!k || !value) return false;
        data.whatsapp.responses[k] = value;
        return true;
    }
    
    function delResponse(key) {
        const k = String(key || "").toLowerCase().trim();
        if (!data.whatsapp.responses[k]) return false;
        delete data.whatsapp.responses[k];
        return true;
    }
    
    function getAllResponses() {
        return data.whatsapp.responses || {};
    }

    function getPanel() {
        return data.panel;
    }
    
    function getPanelServer(id) {
        return data.panel.servers[String(id)] || null;
    }
    
    function setPanelServer(id, pl = {}) {
        const k = String(id);
        const prev = data.panel.servers[k] || {};
        data.panel.servers[k] = {
            ...prev,
            ...pl,
            id: k,
            updatedAt: Date.now()
        };
        return data.panel.servers[k];
    }
    
    function deletePanelServer(id) {
        if (!data.panel.servers[String(id)]) return false;
        delete data.panel.servers[String(id)];
        return true;
    }
    
    function getPanelUser(id) {
        return data.panel.users[String(id)] || null;
    }
    
    function setPanelUser(id, pl = {}) {
        const k = String(id);
        const prev = data.panel.users[k] || {};
        data.panel.users[k] = {
            ...prev,
            ...pl,
            id: k,
            updatedAt: Date.now()
        };
        return data.panel.users[k];
    }
    
    function deletePanelUser(id) {
        if (!data.panel.users[String(id)]) return false;
        delete data.panel.users[String(id)];
        return true;
    }
    
    function getPanelBuyerGroup(groupId) {
        return data.panel.buyerGroups[String(groupId)] || null;
    }
    
    function setPanelBuyerGroup(groupId, dataGroup = {}) {
        const k = String(groupId);
        const prev = data.panel.buyerGroups[k] || {};
        data.panel.buyerGroups[k] = {
            ...prev,
            ...dataGroup,
            id: k,
            updatedAt: Date.now()
        };
        return data.panel.buyerGroups[k];
    }
    
    function deletePanelBuyerGroup(groupId) {
        if (!data.panel.buyerGroups[String(groupId)]) return false;
        delete data.panel.buyerGroups[String(groupId)];
        return true;
    }
    
    function getAllPanelBuyerGroups() {
        return data.panel.buyerGroups || {};
    }
    
    function isPanelBuyerGroup(groupId) {
        return !!data.panel.buyerGroups[String(groupId)];
    }
    
    function addPanelBuyerMember(userId, groupId) {
        const k = String(userId);
        const groups = data.panel.buyerMembers[k] || [];
        if (!groups.includes(String(groupId))) {
            groups.push(String(groupId));
        }
        data.panel.buyerMembers[k] = groups;
        return groups;
    }
    
    function removePanelBuyerMember(userId, groupId) {
        const k = String(userId);
        const groups = data.panel.buyerMembers[k] || [];
        const index = groups.indexOf(String(groupId));
        if (index > -1) {
            groups.splice(index, 1);
        }
        data.panel.buyerMembers[k] = groups;
        return groups;
    }
    
    function getPanelBuyerMemberGroups(userId) {
        return data.panel.buyerMembers[String(userId)] || [];
    }
    
    function isPanelBuyerMember(userId, groupId = null) {
        const groups = getPanelBuyerMemberGroups(userId);
        if (groupId === null) {
            return groups.length > 0;
        }
        return groups.includes(String(groupId));
    }
    
    function getResellerGroup(groupId) {
        return data.panel.resellerGroups[String(groupId)] || null;
    }
    
    function setResellerGroup(groupId, groupData = {}) {
        const k = String(groupId);
        const prev = data.panel.resellerGroups[k] || {};
        data.panel.resellerGroups[k] = {
            ...prev,
            ...groupData,
            id: k,
            updatedAt: Date.now()
        };
        return data.panel.resellerGroups[k];
    }
    
    function deleteResellerGroup(groupId) {
        if (!data.panel.resellerGroups[String(groupId)]) return false;
        delete data.panel.resellerGroups[String(groupId)];
        return true;
    }
    
    function getAllResellerGroups() {
        return data.panel.resellerGroups || {};
    }
    
    function isResellerGroup(groupId) {
        return !!data.panel.resellerGroups[String(groupId)];
    }
    
    function getPanelUserRoles(userId) {
        const roles = {
            isOwner: false,
            isResellerGroup: false,
            isBuyerGroup: false,
            resellerGroups: [],
            buyerGroups: []
        };
        
        const ownerNumber = process.env.OWNER_NUMBER || "";
        if (String(userId).includes(ownerNumber)) {
            roles.isOwner = true;
        }
        
        for (const [groupId, groupData] of Object.entries(data.panel.resellerGroups || {})) {
            roles.resellerGroups.push(groupId);
            roles.isResellerGroup = true;
        }
        
        const buyerGroups = getPanelBuyerMemberGroups(userId);
        roles.buyerGroups = buyerGroups;
        roles.isBuyerGroup = buyerGroups.length > 0;
        
        return roles;
    }
    
    function getPanelUnlimitedCommands() {
        return data.panel.unlimitedCommands || ["3gb", "5gb", "10gb", "unli", "unlimited"];
    }
    
    function setPanelUnlimitedCommands(commands) {
        data.panel.unlimitedCommands = Array.isArray(commands) ? commands : [];
        markForSave();
        return data.panel.unlimitedCommands;
    }
    
    function checkAndSuspendExpiredServers() {
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let suspendedCount = 0;
        
        for (const [serverId, serverData] of Object.entries(data.panel.servers || {})) {
            if (serverData.expiredAt && serverData.expiredAt > 0 && 
                !serverData.suspended && 
                (now - serverData.expiredAt) > THIRTY_DAYS_MS) {
                
                data.panel.servers[serverId].suspended = true;
                data.panel.servers[serverId].suspendedAt = now;
                data.panel.servers[serverId].suspendedReason = "Auto-suspend: 30 days expired";
                suspendedCount++;
            }
        }
        
        if (suspendedCount > 0) {
            markForSave();
        }
        
        return suspendedCount;
    }
    
    function getServersByUser(userIdentifier) {
        const servers = [];
        const allServers = data.panel.servers || {};
        
        for (const [serverId, serverData] of Object.entries(allServers)) {
            if (serverData.targetJid && serverData.targetJid.includes(userIdentifier)) {
                servers.push({ ...serverData, serverId });
            } else if (serverData.username && serverData.username === userIdentifier) {
                servers.push({ ...serverData, serverId });
            }
        }
        
        return servers;
    }
    
    function getServersByTag(tag) {
        const servers = [];
        const allServers = data.panel.servers || {};
        
        for (const [serverId, serverData] of Object.entries(allServers)) {
            if (serverData.tag && serverData.tag === tag) {
                servers.push({ ...serverData, serverId });
            }
        }
        
        return servers;
    }
    
    function getAllPanelServers() {
        return data.panel.servers || {};
    }

    function getAllWebstoreUsers() {
        return data.webstore.users || [];
    }

    function getAllWebstoreOrders() {
        return data.webstore.orders || [];
    }

    function getAllWebstoreServices() {
        return data.webstore.services || [];
    }

    function getWebstoreUserByCredential(usernameOrEmail) {
        return data.webstore.users.find(u =>
            u.username === usernameOrEmail ||
            u.email === usernameOrEmail
        ) || null;
    }

    function isUsernameTaken(username) {
        return data.webstore.users.some(u => u.username === username);
    }

    function isEmailTaken(email) {
        return data.webstore.users.some(u => u.email === email);
    }

    function getReferralCodes() {
        if (!data.webstore.referralCodes) {
            data.webstore.referralCodes = {};
        }
        return data.webstore.referralCodes;
    }

    function getReferralCode(code) {
        if (!data.webstore.referralCodes) {
            data.webstore.referralCodes = {};
        }
        return data.webstore.referralCodes[code] || null;
    }

    function setReferralCode(code, codeData) {
        if (!data.webstore.referralCodes) {
            data.webstore.referralCodes = {};
        }
        data.webstore.referralCodes[code] = {
            ...codeData,
            code: code,
            updatedAt: Date.now()
        };
        markForSave();
        return data.webstore.referralCodes[code];
    }

    function getUsersWithReferral() {
        return data.webstore.users.filter(u => u.referralCode) || [];
    }

    function getWebstoreOrdersByUser(username) {
        return data.webstore.orders.filter(o => o.username === username) || [];
    }

    function getActiveWebstoreServicesByUser(username) {
        const now = Date.now();
        return data.webstore.services.filter(s =>
            s.owner === username &&
            s.status === 'active' &&
            (s.expired_at > now || s.expired_at === 0)
        ) || [];
    }

    function getWebstoreUsers() {
        return data.webstore.users || [];
    }
    
    function getWebstoreUser(username) {
        const user = data.webstore.users.find(u => u.username === username) || null;
        return user;
    }
    
    function createWebstoreUser(userData) {
        const existing = getWebstoreUser(userData.username);
        if (existing) {
            return null;
        }
        
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: userData.username,
            password: userData.password,
            email: userData.email || "",
            phone: userData.phone || "",
            referralCode: userData.referralCode || null,
            referredBy: userData.referredBy || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastLogin: null,
            status: 'active',
            role: 'user',
            verified: true
        };
        
        data.webstore.users.push(newUser);
        markForSave();
        return newUser;
    }
    
    function updateWebstoreUser(username, updates) {
        const index = data.webstore.users.findIndex(u => u.username === username);
        if (index === -1) return null;
        
        data.webstore.users[index] = {
            ...data.webstore.users[index],
            ...updates,
            updatedAt: Date.now()
        };
        
        markForSave();
        return data.webstore.users[index];
    }
    
    function verifyWebstoreUser(username, password) {
        const user = getWebstoreUser(username);
        if (!user) {
            return null;
        }
        
        if (user.password !== password) {
            return null;
        }
        
        user.lastLogin = Date.now();
        user.updatedAt = Date.now();
        markForSave();
        
        return user;
    }
    
    function getWebstoreOrders() {
        return data.webstore.orders || [];
    }
    
    function getWebstoreOrder(refId) {
        return data.webstore.orders.find(o => o.refId === refId) || null;
    }
    
    function createWebstoreOrder(orderData) {
        const newOrder = {
            ...orderData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        data.webstore.orders.push(newOrder);
        markForSave();
        return newOrder;
    }
    
    function updateWebstoreOrder(refId, updates) {
        const index = data.webstore.orders.findIndex(o => o.refId === refId);
        if (index === -1) return null;
        
        data.webstore.orders[index] = {
            ...data.webstore.orders[index],
            ...updates,
            updatedAt: Date.now()
        };
        
        markForSave();
        return data.webstore.orders[index];
    }
    
    function getWebstoreServices() {
        return data.webstore.services || [];
    }
    
    function getWebstoreServicesByOwner(owner) {
        return data.webstore.services.filter(s => s.owner === owner) || [];
    }
    
    function getWebstoreService(id) {
        return data.webstore.services.find(s => s.id === id) || null;
    }
    
    function createWebstoreService(serviceData) {
        const newService = {
            ...serviceData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        data.webstore.services.push(newService);
        markForSave();
        return newService;
    }
    
    function updateWebstoreService(id, updates) {
        const index = data.webstore.services.findIndex(s => s.id === id);
        if (index === -1) return null;
        
        data.webstore.services[index] = {
            ...data.webstore.services[index],
            ...updates,
            updatedAt: Date.now()
        };
        
        markForSave();
        return data.webstore.services[index];
    }

    function getDatabaseStats() {
    return {
        meta: data.meta,
        stats: {
            whatsapp: {
                users: Object.keys(data.whatsapp.users).length,
                groups: Object.keys(data.whatsapp.groups).length,
                premium: Object.keys(data.whatsapp.premium).length,
                responses: Object.keys(data.whatsapp.responses).length
            },
            panel: {
                servers: Object.keys(data.panel.servers).length,
                users: Object.keys(data.panel.users).length,
                buyerGroups: Object.keys(data.panel.buyerGroups).length,
                buyerMembers: Object.keys(data.panel.buyerMembers).length,
                resellerGroups: Object.keys(data.panel.resellerGroups).length,
                unlimitedCommands: data.panel.unlimitedCommands || []
            },
            webstore: {
                users: data.webstore.users.length,
                orders: data.webstore.orders.length,
                services: data.webstore.services.length
            }
        },
        webstore: {
            users: data.webstore.users.map(u => ({
                username: u.username,
                id: u.id,
                createdAt: new Date(u.createdAt).toLocaleString(),
                lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'
            })),
            orders: data.webstore.orders.map(o => ({
                refId: o.refId,
                username: o.username,
                status: o.status,
                amount: o.amount
            })),
            services: data.webstore.services.map(s => ({
                id: s.id,
                owner: s.owner,
                status: s.status,
                expired_at: s.expired_at ? new Date(s.expired_at).toLocaleString() : 'Lifetime'
            }))
        },
        panel: {
            servers: Object.values(data.panel.servers || {}).map(s => ({
                id: s.serverId || s.id,
                username: s.username,
                targetJid: s.targetJid,
                ram: s.ram,
                cpu: s.cpu,
                createdAt: new Date(s.createdAt || 0).toLocaleString(),
                expiredAt: s.expiredAt ? new Date(s.expiredAt).toLocaleString() : 'Lifetime',
                status: s.expiredAt && Date.now() > s.expiredAt ? 'Expired' : 'Active',
                suspended: s.suspended || false
            })),
            users: Object.values(data.panel.users || {}).map(u => ({
                id: u.userId || u.id,
                username: u.username,
                email: u.email
            })),
            buyerGroups: Object.keys(data.panel.buyerGroups || {}).length,
            resellerGroups: Object.keys(data.panel.resellerGroups || {}).length
        }
    };
}
    
    function backup() {
        const backupDir = path.join(dir, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        
        const backupFile = path.join(backupDir, `backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        return backupFile;
    }

    function debugDatabase() {
        console.log("=== DATABASE DEBUG ===");
        console.log("Webstore Users:", data.webstore.users.length);
        data.webstore.users.forEach((user, i) => {
            console.log(`  ${i+1}. ${user.username} (ID: ${user.id})`);
        });
        console.log("=====================");
    }

    return {
        load,
        save,
        saveIfNeeded,
        data: () => data,
        backup,
        getDatabaseStats,
        debugDatabase,
        markForSave,
        
        getWebstoreUsers,
        getWebstoreUser,
        createWebstoreUser,
        updateWebstoreUser,
        verifyWebstoreUser,
        
        getWebstoreOrders,
        getWebstoreOrder,
        createWebstoreOrder,
        updateWebstoreOrder,
        
        getWebstoreServices,
        getWebstoreServicesByOwner,
        getWebstoreService,
        createWebstoreService,
        updateWebstoreService,
        
        getAllWebstoreUsers,
        getAllWebstoreOrders,
        getAllWebstoreServices,
        getWebstoreUserByCredential,
        isUsernameTaken,
        isEmailTaken,
        getReferralCodes,
        getReferralCode,
        setReferralCode,
        getUsersWithReferral,
        getWebstoreOrdersByUser,
        getActiveWebstoreServicesByUser,
        
        getUser,
        getGroup,
        getAllGroups,
        getGroupMember,
        touchUser,
        touchGroup,
        touchGroupMember,
        
        getPremium,
        isPremium,
        addPremiumDays,
        setPremiumExpire,
        delPremium,
        listPremium,
        cleanupExpiredPremium,
        
        getResponse,
        addResponse,
        delResponse,
        getAllResponses,
        
        getPanel,
        getPanelServer,
        setPanelServer,
        deletePanelServer,
        getPanelUser,
        setPanelUser,
        deletePanelUser,
        
        getPanelBuyerGroup,
        setPanelBuyerGroup,
        deletePanelBuyerGroup,
        getAllPanelBuyerGroups,
        isPanelBuyerGroup,
        
        addPanelBuyerMember,
        removePanelBuyerMember,
        getPanelBuyerMemberGroups,
        isPanelBuyerMember,
        
        getResellerGroup,
        setResellerGroup,
        deleteResellerGroup,
        getAllResellerGroups,
        isResellerGroup,
        getPanelUserRoles,
        getPanelUnlimitedCommands,
        setPanelUnlimitedCommands,
        checkAndSuspendExpiredServers,
        
        getServersByUser,
        getServersByTag,
        getAllPanelServers
    };
    }

//lib/rpglib.js

export const BG_URL = "https://c.termai.cc/i132/4rRti.jpg"
const loadingCooldown = new Map()
// --- CONSTANTS ---
export const CLASSES = {
    "warrior":   { emoji: "⚔️", name: "Warrior",   str: 1.5, def: 1.5, crit: 1.2, hp: 1.2, skill: "Bash", desc: "Tank dengan HP tinggi" },
    "assassin":  { emoji: "🗡️", name: "Assassin",  str: 1.8, def: 0.8, crit: 1.8, hp: 0.9, skill: "Backstab", desc: "Critical damage tinggi" },
    "mage":      { emoji: "🔮", name: "Mage",      str: 2.2, def: 0.5, crit: 1.5, hp: 0.8, skill: "Fireball", desc: "Damage besar area" },
    "tanker":    { emoji: "🛡️", name: "Tanker",    str: 1.0, def: 2.5, crit: 0.8, hp: 2.0, skill: "Shield Wall", desc: "Defense terbaik" },
    "healer":    { emoji: "🌿", name: "Healer",    str: 0.8, def: 1.2, crit: 1.0, hp: 1.5, skill: "Holy Light", desc: "Healing & support" },
    "archer":    { emoji: "🏹", name: "Archer",    str: 1.6, def: 0.7, crit: 1.6, hp: 0.9, skill: "Precise Shot", desc: "Ranged attacker" }
}

export const ITEMS = {
  // Consumables
  "potion":       { name: "❤️ HP Potion",     alias: ["hp", "heal", "darah"], price: 50,    sell: 25,   type: "consumable", effect: "hp", value: 200, desc: "Pulihkan 200 HP" },
  "elixir":       { name: "🧪 Super Elixir",  alias: ["elixir", "super"], price: 200,    sell: 100,   type: "consumable", effect: "hp", value: 500, desc: "Pulihkan 500 HP" },
  "energy_drink": { name: "⚡ Energy Drink",  alias: ["energy", "drink", "stamina"], price: 500,   sell: 350,  type: "consumable", effect: "energy", value: 50, desc: "Isi 50 Energy" },
  "cooked_fish":  { name: "🍲 Cooked Fish",   alias: ["food", "makan", "ikan"], price: 0,     sell: 50,   type: "consumable", effect: "energy", value: 30, desc: "Ikan Bakar (Energy +30)" },
  "berry":        { name: "🍒 Wild Berry",    alias: ["berry", "buah"], price: 0,     sell: 5,    type: "consumable", effect: "energy", value: 10,  desc: "Buah Liar (Energy +10)" },
  "bread":        { name: "🍞 Fresh Bread",   alias: ["bread", "roti"], price: 100,   sell: 50,   type: "consumable", effect: "hp", value: 100, desc: "Roti segar (HP +100)" },
  
  // Special
  "gacha_ticket": { name: "🎫 Gacha Ticket",  alias: ["ticket", "gacha"], price: 1500,  sell: 500,  type: "special",    desc: "Tiket Judi Rare" },
  "lucky_coin":   { name: "🍀 Lucky Coin",    alias: ["coin", "lucky"], price: 2000,  sell: 800,  type: "special",    desc: "Meningkatkan luck" },

  // Tools
  "pickaxe":      { name: "⛏️ Pickaxe",       alias: ["pick", "axe", "beliung"], price: 500,  sell: 500,  type: "tool",       desc: "Alat Tambang (Durability: 20)" },
  "fishing_rod":  { name: "🎣 Fishing Rod",   alias: ["rod", "pancing", "joran"], price: 500,  sell: 500,  type: "tool",       desc: "Alat Pancing (Durability: 15)" },
  "hoe":          { name: "👨‍🌾 Hoe",          alias: ["hoe", "cangkul"], price: 300,   sell: 400,  type: "tool",       desc: "Alat Bertani (Durability: 25)" },
  "axe":          { name: "🪓 Wood Axe",      alias: ["axe", "kapak"], price: 500,  sell: 600,  type: "tool",       desc: "Kapak Tebang (Durability: 30)" },

  // Drops & Materials
  "stone":        { name: "🪨 Stone",         price: 0,     sell: 10,   type: "material", desc: "Batu biasa" },
  "iron_ore":     { name: "⛓️ Iron Ore",      price: 0,     sell: 50,   type: "material", desc: "Bijih besi" },
  "gold_ore":     { name: "🪙 Gold Ore",      price: 0,     sell: 200,  type: "material", desc: "Bijih emas" },
  "diamond":      { name: "💎 Diamond",       price: 0,     sell: 1000, type: "material", desc: "Berlian langka" },
  "ruby":         { name: "🔴 Ruby",          price: 0,     sell: 800,  type: "material", desc: "Batu rubi" },
  "sapphire":     { name: "🔵 Sapphire",      price: 0,     sell: 800,  type: "material", desc: "Batu safir" },
  "emerald":      { name: "💚 Emerald",       price: 0,     sell: 900,  type: "material", desc: "Batu zamrud" },
  "fish":         { name: "🐟 Raw Fish",      price: 0,     sell: 20,   type: "material", desc: "Ikan mentah" },
  "wood":         { name: "🪵 Wood",          price: 0,     sell: 15,   type: "material", desc: "Kayu biasa" },
  "oak_wood":     { name: "🌳 Oak Wood",      price: 0,     sell: 30,   type: "material", desc: "Kayu ek kuat" },
  "wheat":        { name: "🌾 Wheat",         price: 0,     sell: 30,   type: "material", desc: "Gandum" },
  "corn":         { name: "🌽 Corn",          price: 0,     sell: 40,   type: "material", desc: "Jagung" },
  "apple":        { name: "🍎 Apple",         price: 0,     sell: 25,   type: "material", desc: "Apel segar" },
  "herb":         { name: "🌿 Medicinal Herb", price: 0,    sell: 35,   type: "material", desc: "Tanaman obat" },
  "leather":      { name: "🐮 Leather",       price: 0,     sell: 60,   type: "material", desc: "Kulit hewan" },

  // Equipments
  "iron_sword":   { name: "⚔️ Iron Sword",    alias: ["sword", "pedang"], price: 500,  type: "upgrade", stat: "str", value: 15, desc: "ATK +15" },
  "iron_armor":   { name: "🛡️ Iron Armor",    alias: ["armor", "baju", "tameng"], price: 500,  type: "upgrade", stat: "def", value: 15, desc: "DEF +15" },
  "steel_sword":  { name: "🔪 Steel Sword",   alias: ["steel"], price: 2000,  type: "upgrade", stat: "str", value: 35, desc: "ATK +35" },
  "steel_armor":  { name: "⚙️ Steel Armor",   alias: ["steelarmor"], price: 3000,  type: "upgrade", stat: "def", value: 35, desc: "DEF +35" },
  "mythic_sword": { name: "🔥 Mythic Sword",  alias: ["mythic", "pedangdewa"], price: 50000, type: "upgrade", stat: "str", value: 200, desc: "ATK +200 (LEGENDARY)" },
  "dragon_armor": { name: "🐉 Dragon Armor",  alias: ["dragon"], price: 40000, type: "upgrade", stat: "def", value: 150, desc: "DEF +150 (LEGENDARY)" },
  "bow":          { name: "🏹 Hunter's Bow",  alias: ["bow", "busur"], price: 3000,  type: "upgrade", stat: "str", value: 25, desc: "ATK +25 (Ranged)" },
  "wand":         { name: "✨ Magic Wand",    alias: ["wand", "tongkat"], price: 4000,  type: "upgrade", stat: "str", value: 30, desc: "ATK +30 (Magic)" }
}

export const MONSTERS = [
  { name: "Slime",        lvl: 1,  hp: 80,   atk: 8,    exp: 50,   gold: 100, drops: [{item: "potion", chance: 10}, {item: "stone", chance: 30}] },
  { name: "Goblin",       lvl: 5,  hp: 180,  atk: 25,   exp: 100,  gold: 150, drops: [{item: "iron_ore", chance: 20}, {item: "leather", chance: 15}] },
  { name: "Wolf",         lvl: 10, hp: 400,  atk: 50,   exp: 200,  gold: 200, drops: [{item: "leather", chance: 25}, {item: "herb", chance: 20}] },
  { name: "Orc",          lvl: 20, hp: 900,  atk: 100,  exp: 500,  gold: 500, drops: [{item: "iron_ore", chance: 35}, {item: "potion", chance: 25}] },
  { name: "Wyvern",       lvl: 40, hp: 2500, atk: 250,  exp: 1500, gold: 1000, drops: [{item: "diamond", chance: 5}, {item: "ruby", chance: 10}] },
  { name: "Dragon",       lvl: 80, hp: 8000, atk: 700,  exp: 5000, gold: 5000, drops: [{item: "diamond", chance: 15}, {item: "mythic_sword", chance: 1}] }
]

export const QUESTS = [
  { 
    id: "beginner1", 
    name: "🐸 Slime Hunter", 
    desc: "Bunuh 5 Slime", 
    type: "kill", 
    target: "Slime", 
    amount: 5, 
    reward: { gold: 500, exp: 200, items: [{id: "potion", qty: 3}] }, 
    daily: true,
    requirements: { minLevel: 1 }
  },
  { 
    id: "beginner2", 
    name: "⛏️ Stone Collector", 
    desc: "Kumpulkan 20 Stone", 
    type: "collect", 
    target: "stone", 
    amount: 20, 
    reward: { gold: 800, exp: 300, items: [{id: "pickaxe", qty: 1}] }, 
    daily: true,
    requirements: { minLevel: 3, needPickaxe: true }
  },
  { 
    id: "intermediate1", 
    name: "🎣 Master Fisher", 
    desc: "Tangkap 10 Ikan", 
    type: "collect", 
    target: "fish", 
    amount: 10, 
    reward: { gold: 1500, exp: 500, items: [{id: "fishing_rod", qty: 1}] }, 
    daily: true,
    requirements: { minLevel: 5, needFishingRod: true }
  },
  { 
    id: "advanced1", 
    name: "💎 Diamond Seeker", 
    desc: "Cari 3 Diamond", 
    type: "collect", 
    target: "diamond", 
    amount: 3, 
    reward: { gold: 5000, exp: 2000, items: [{id: "diamond", qty: 1}] }, 
    daily: false,
    requirements: { minLevel: 10 }
  },
  { 
    id: "weekly1", 
    name: "🏆 Weekly Challenge", 
    desc: "Kumpulkan 100 berbagai item", 
    type: "collect_multi", 
    targets: ["stone", "wood", "iron_ore"], 
    amount: 100, 
    reward: { gold: 10000, exp: 5000, items: [{id: "gacha_ticket", qty: 3}] }, 
    weekly: true,
    requirements: { minLevel: 20 }
  },
  { 
    id: "iron_miner", 
    name: "⛓️ Iron Miner", 
    desc: "Kumpulkan 10 Iron Ore", 
    type: "collect", 
    target: "iron_ore", 
    amount: 10, 
    reward: { gold: 1500, exp: 600, items: [{id: "iron_sword", qty: 1}] }, 
    daily: true,
    requirements: { minLevel: 8, needPickaxe: true }
  },
  { 
    id: "wood_collector", 
    name: "🪵 Wood Collector", 
    desc: "Kumpulkan 30 Wood", 
    type: "collect", 
    target: "wood", 
    amount: 30, 
    reward: { gold: 1000, exp: 400, items: [{id: "axe", qty: 1}] }, 
    daily: true,
    requirements: { minLevel: 5 }
  }
]

// Dungeons
export const DUNGEONS = [
  { id: 1, name: "🏚️ Goblin Cave", minLvl: 5, energy: 10, rewards: { gold: [100, 300], exp: [200, 500], items: [{item: "potion", chance: 50}] } },
  { id: 2, name: "🏰 Orc Fortress", minLvl: 15, energy: 15, rewards: { gold: [300, 600], exp: [500, 1000], items: [{item: "iron_sword", chance: 10}] } },
  { id: 3, name: "🔥 Dragon Lair", minLvl: 30, energy: 25, rewards: { gold: [1000, 2000], exp: [2000, 4000], items: [{item: "dragon_armor", chance: 5}] } }
]

// Achievements
export const ACHIEVEMENTS = [
  { id: "first_kill", name: "First Blood", desc: "Bunuh monster pertama", reward: { gold: 500, exp: 200 } },
  { id: "level_10", name: "Rising Star", desc: "Capai level 10", reward: { gold: 2000, exp: 1000 } },
  { id: "level_50", name: "Master", desc: "Capai level 50", reward: { gold: 10000, exp: 5000 } },
  { id: "rich", name: "Millionaire", desc: "Kumpulkan 1,000,000 Gold", reward: { gold: 50000, exp: 20000 } },
  { id: "collector", name: "Item Collector", desc: "Kumpulkan 50 item berbeda", reward: { gold: 3000, exp: 1500 } }
]

// --- UTILS ---
export const sleep = (ms) => new Promise(r => setTimeout(r, ms))
export const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const chance = (percent) => Math.random() * 100 < percent

export function drawBar(current, max, length = 10) {
    const percent = Math.min(Math.max(0, current / max), 1)
    const filled = Math.floor(percent * length)
    return "█".repeat(filled) + "░".repeat(length - filled)
}

export function formatNumber(num) {
    return num.toLocaleString('en-US')
}

export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours} jam ${minutes % 60} menit`
    if (minutes > 0) return `${minutes} menit ${seconds % 60} detik`
    return `${seconds} detik`
}

export async function animateLoading(text, m, duration = 1000) {
    const userId = m.sender || m.author
    const now = Date.now()
    const lastUsed = loadingCooldown.get(userId)
    if (lastUsed && (now - lastUsed) < 2000) {
        
    }
    loadingCooldown.set(userId, now)
    
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const startTime = Date.now()
    let message = null
    
    try {
        for (let i = 0; Date.now() - startTime < duration; i++) {
            const dot = dots[i % dots.length]
            const loadingText = `${dot} ${text} ${dot}`
            
            if (!message) {
                
                message = await m.reply(loadingText)
            } else {
                
                try {
                    await message.edit(loadingText)
                } catch (error) {
                    
                    message = await m.reply(loadingText)
                }
            }
            
            await sleep(100)
        }
    } catch (error) {
        console.error('Error in animateLoading:', error)
    }
    
    return message
}

export async function animateProgress(text, m, progress, max = 100) {
    const barLength = 20
    const filled = Math.floor((progress / max) * barLength)
    const empty = barLength - filled
    const percent = Math.floor((progress / max) * 100)
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    
    return await m.reply(`${text}\n${bar} ${percent}%`)
}

export async function animateBattle(m, attacker, defender, action) {
    const actions = {
        'attack': '🗡️ Menyerang',
        'skill': '⚡ Menggunakan Skill',
        'defend': '🛡️ Bertahan',
        'heal': '❤️ Memulihkan HP',
        'crit': '💥 CRITICAL HIT!',
        'dodge': '💨 MENGHINDAR!'
    }
    
    const emoji = actions[action] || '⚔️'
    return await m.reply(`${emoji} *${attacker}* ${actions[action] || action} *${defender}*!`)
}

export async function animateDungeonEntrance(m, dungeonName) {
    const frames = [
        `🏰 Memasuki ${dungeonName}...`,
        `🔦 Menyalakan obor...`,
        `👣 Melangkah ke dalam...`,
        `👁️ Mengamati sekeliling...`,
        `⚔️ Mempersiapkan senjata...`
    ]
    
    for (const frame of frames) {
        await m.send(frame)
        await sleep(300)
    }
}

export async function animateGathering(m, activity, item) {
    const activities = {
        'mining': ['⛏️ Mengayunkan beliung...', '💥 Menghantam batu...', '💎 Menemukan mineral!'],
        'fishing': ['🎣 Melemparkan kail...', '🌊 Menunggu ikan...', '🐟 Ikan menyambar!'],
        'foraging': ['🌿 Mencari di semak...', '🍃 Mengumpulkan bahan...', '🌰 Menemukan barang!'],
        'chopping': ['🪓 Mengayunkan kapak...', '🌲 Menebang pohon...', '🪵 Kayu berjatuhan!']
    }
    
    const frames = activities[activity] || ['🔍 Melakukan aktivitas...', '🔄 Memproses...', '✅ Selesai!']
    
    for (const frame of frames) {
        await m.send(frame)
        await sleep(400)
    }
}

export async function animateCooking(m) {
    const frames = [
        '🍳 Menyalakan kompor...',
        '🔥 Memanaskan wajan...',
        '🥘 Memasak bahan...',
        '👨‍🍳 Mengaduk-aduk...',
        '🍲 Menambahkan bumbu...',
        '👃 Mencium aroma...',
        '✅ Masakan siap!'
    ]
    
    for (const frame of frames) {
        await m.send(frame)
        await sleep(350)
    }
}

// --- HELPER INVENTORY ---
export function addItem(user, id, qty = 1) {
    if (!user.rpg) user.rpg = {}
    if (!user.rpg.inventory) user.rpg.inventory = []
    
    const existing = user.rpg.inventory.find(i => i.id === id)
    
    if (existing) {
        existing.qty += qty
    } else {
        user.rpg.inventory.push({ id, qty })
    }
}

export function delItem(user, id, qty = 1) {
    if (!user.rpg?.inventory) return false
    
    const idx = user.rpg.inventory.findIndex(i => i.id === id)
    if (idx === -1) return false
    
    if (user.rpg.inventory[idx].qty > qty) {
        user.rpg.inventory[idx].qty -= qty
    } else {
        user.rpg.inventory.splice(idx, 1)
    }
    return true
}

export function hasItem(user, id, qty = 1) {
    if (!user.rpg?.inventory) return false
    const it = user.rpg.inventory.find(i => i.id === id)
    return it && it.qty >= qty
}

export function findItem(query) {
    if (!query) return null
    const q = query.toLowerCase().trim()
    return Object.keys(ITEMS).find(k => {
        const item = ITEMS[k]
        if (k === q) return true 
        if (item.name.toLowerCase().includes(q)) return true 
        if (item.alias && item.alias.some(a => a.includes(q))) return true 
        return false
    })
}

export function getItemCount(user, id) {
    if (!user.rpg?.inventory) return 0
    const item = user.rpg.inventory.find(i => i.id === id)
    return item ? item.qty : 0
}

export function checkLevelUp(rpg) {
    let leveled = false
    while (rpg.exp >= rpg.maxExp) {
        rpg.level++
        rpg.exp -= rpg.maxExp
        rpg.maxExp = Math.floor(rpg.maxExp * 1.3) + (rpg.level * 10)
        rpg.str += Math.floor(rpg.level / 2) + 3
        rpg.def += Math.floor(rpg.level / 3) + 2
        rpg.maxHp += 50 + (rpg.level * 5)
        rpg.hp = rpg.maxHp
        leveled = true
    }
    return leveled
}

export function calculateDamage(attacker, defender, isCrit = false) {
    const baseDamage = attacker.str * (isCrit ? 1.5 : 1.0)
    const defenseReduction = defender.def * 0.3
    const finalDamage = Math.max(1, Math.floor(baseDamage - defenseReduction))
    return finalDamage
}

export function getRandomName(gender = 'random') {
    const maleNames = ['Ahmad', 'Budi', 'Candra', 'Doni', 'Eko', 'Fajar', 'Gunawan', 'Hadi', 'Iwan', 'Joko']
    const femaleNames = ['Ani', 'Bunga', 'Citra', 'Dewi', 'Eka', 'Fitri', 'Gita', 'Hana', 'Indah', 'Juli']
    const lastNames = ['Putra', 'Kusuma', 'Wijaya', 'Saputra', 'Pratama', 'Nugraha', 'Santoso', 'Wibowo']
    
    let firstName = ''
    if (gender === 'male' || (gender === 'random' && Math.random() > 0.5)) {
        firstName = maleNames[Math.floor(Math.random() * maleNames.length)]
    } else {
        firstName = femaleNames[Math.floor(Math.random() * femaleNames.length)]
    }
    
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    return `${firstName} ${lastName}`
}

export function calculateComfort(furnitureList) {
    const comfortValues = {
        'sofa': 20,
        'table': 10,
        'bed': 50,
        'tv': 40,
        'fridge': 60,
        'ac': 80,
        'pool': 200
    }
    
    return furnitureList.reduce((total, furn) => {
        return total + (comfortValues[furn.id] || 0)
    }, 0)
}

export function calculateHouseValue(houseType, furnitureList) {
    const housePrices = {
        'kos': 0,
        'apartemen': 50000,
        'rumah': 200000,
        'villa': 500000,
        'istana': 1000000
    }
    
    const baseValue = housePrices[houseType] || 0
    const furnitureValue = furnitureList.length * 1000
    
    return baseValue + furnitureValue
}

export function getJobInfo(jobId) {
    const jobs = {
        'waiter': { name: '👨‍🍳 Pelayan', salary: 50000, requirements: { education: 0 } },
        'driver': { name: '🚗 Supir', salary: 80000, requirements: { education: 10 } },
        'cashier': { name: '💰 Kasir', salary: 100000, requirements: { education: 20 } },
        'programmer': { name: '💻 Programmer', salary: 150000, requirements: { education: 50 } },
        'doctor': { name: '👨‍⚕️ Dokter', salary: 1000000, requirements: { education: 80 } },
        'lawyer': { name: '⚖️ Pengacara', salary: 20000000, requirements: { education: 70 } },
        'ceo': { name: '👑 CEO', salary: 50000000, requirements: { education: 90 } }
    }
    
    return jobs[jobId] || { name: '👨‍💼 Pengangguran', salary: 0, requirements: { education: 0 } }
}

export function formatRoleplayData(user) {
    if (!user || typeof user !== 'object') {
        return {
            profile: { 
                name: 'Unknown', 
                level: 1, 
                title: 'Pemula', 
                status: 'Single',
                bio: '',
                badge: '🥚 Newbie',
                happiness: 100,
                health: 100,
                education: 0
            },
            economy: { 
                cash: 0, 
                bank: 0, 
                job: null,
                salary: 0,
                totalEarned: 0
            },
            social: { 
                friends: 0, 
                spouse: null,
                children: [],
                visits: 0,
                popularity: 0
            },
            property: { 
                house: 'Kos', 
                car: null,
                furniture: [],
                garden: []
            },
            lifestyle: {
                hobbies: [],
                educationLevel: 0
            }
        };
    }
    
    const rp = user.roleplay || {};
    const profile = rp.profile || {};
    const economy = rp.economy || {};
    const social = rp.social || {};
    const property = rp.property || {};
    const lifestyle = rp.lifestyle || {};
    
    return {
        profile: {
            name: user.name || 'Unknown',
            bio: profile.bio || '',
            level: profile.level || 1,
            title: profile.title || 'Pemula',
            badge: profile.badge || '🥚 Newbie',
            status: profile.status || 'Single',
            happiness: profile.happiness || 100,
            health: profile.health || 100,
            education: profile.education || 0,
            exp: profile.exp || 0
        },
        economy: {
            cash: economy.cash || 0,
            bank: economy.bank || 0,
            job: economy.job || null,
            salary: economy.salary || 0,
            totalEarned: economy.totalEarned || 0,
            businesses: economy.businesses || [],
            investments: economy.investments || []
        },
        social: {
            friends: social.friends || [],
            spouse: social.spouse || null,
            children: social.children || [],
            visits: social.visits || 0,
            popularity: social.popularity || 0
        },
        property: {
            house: property.house || 'Kos',
            car: property.car || null,
            furniture: property.furniture || [],
            garden: property.garden || []
        },
        lifestyle: {
            hobbies: lifestyle.hobbies || [],
            educationLevel: lifestyle.educationLevel || 0,
            lastVacation: lifestyle.lastVacation || 0
        }
    };
}

export function createAnimatedBattleLog(rounds) {
    let log = ''
    const animations = {
        'attack': ['🗡️', '⚔️', '🔪'],
        'crit': ['💥', '✨', '🌟'],
        'dodge': ['💨', '🌀', '🌪️'],
        'heal': ['❤️', '💚', '💙'],
        'skill': ['⚡', '🔥', '❄️']
    }
    
    rounds.forEach((round, i) => {
        const animType = round.type || 'attack'
        const anim = animations[animType] ? animations[animType][Math.floor(Math.random() * animations[animType].length)] : '⚔️'
        
        log += `${anim} *ROUND ${i + 1}* ${anim}\n`
        log += `${round.action}\n`
        if (round.damage) log += `💔 Damage: ${round.damage}\n`
        if (round.hp) log += `❤️ HP: ${round.hp}\n`
        log += '\n'
    })
    
    return log
}

export function createProgressAnimation(text, progress, total) {
    const percentage = Math.floor((progress / total) * 100)
    const barLength = 20
    const filled = Math.floor((percentage / 100) * barLength)
    const empty = barLength - filled
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    return `${text}\n${bar} ${percentage}%`
}

export function generateHouseEmoji(houseType) {
    const emojis = {
        'kos': '🏚️',
        'apartemen': '🏢',
        'rumah': '🏠',
        'villa': '🏖️',
        'istana': '🏰'
    }
    return emojis[houseType] || '🏠'
}

export function generateCarEmoji(carType) {
    const emojis = {
        'motor': '🏍️',
        'mobil': '🚗',
        'sport': '🏎️',
        'luxury': '🚙',
        'super': '🚀'
    }
    return emojis[carType] || '🚗'
                  }

//plugins/rpg/rpg-skills.js

import { hasItem, delItem, addItem, ITEMS, rng, formatNumber, chance, QUESTS, animateLoading, animateGathering } from "../../lib/rpglib.js"

export default {
  name: "rpg_skills",
  command: ["mine", "fish", "quest", "quests", "completequest", "abandonquest", "acceptquest"],
  tags: ["rpg"],
  run: async (ev, rt) => {
    const { m, cmd, args, prefix } = ev
    const { db } = rt
    const user = db.getUser(m.sender)
    const rpg = user.rpg

    if (!rpg.quests) rpg.quests = {}
    if (!rpg.activeQuest) rpg.activeQuest = null
    if (!rpg.questProgress) rpg.questProgress = {}
    if (!rpg.lastMine) rpg.lastMine = 0
    if (!rpg.lastFish) rpg.lastFish = 0

    // --- MINING ---
    if (cmd === "mine") {
        if (user.energy < 2) {
            return m.reply(
                `⚡ *ENERGY LOW!*\n\n` +
                `Butuh 2 Energy untuk menambang.\n` +
                `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
                `💡 *CARA DAPAT ENERGY:*\n` +
                `• .daily - Claim 80-300 Energy\n` +
                `• .use berry - Gunakan berry (+10 Energy)\n` +
                `• .buy energy_drink - Beli di shop\n\n` +
                `⏰ Tunggu regenerasi natural`
            )
        }
        
        if (!hasItem(user, "pickaxe", 1)) {
            return m.reply(
                `⛏️ *BUTUH PICKAXE!*\n\n` +
                `Kamu butuh Pickaxe untuk menambang.\n\n` +
                `🛒 *CARA DAPAT PICKAXE:*\n` +
                `• Beli: ${prefix}buy pickaxe (500 Gold)\n` +
                `• Craft: ${prefix}craft pickaxe (3x Wood + 2x Stone + 300G)\n\n` +
                `💰 *HARGA:* 500 Gold\n` +
                `💳 *GOLD KAMU:* ${formatNumber(rpg.gold)}\n\n` +
                `⚒️ *CRAFTING MATERIALS:*\n` +
                `• Wood: .chop atau .forage\n` +
                `• Stone: .mine (ironi ya) atau .forage`
            )
        }
        
        const now = Date.now()
        if (now - rpg.lastMine < 30000) {
            const wait = Math.ceil((30000 - (now - rpg.lastMine)) / 1000)
            return m.reply(
                `⏳ *COOLDOWN ACTIVE*\n\n` +
                `Tunggu ${wait} detik sebelum menambang lagi.\n\n` +
                `💡 *SAMBIL MENUNGGU:*\n` +
                `• .forage - Cari bahan lain\n` +
                `• .hunt - Berburu kecil\n` +
                `• .fish - Memancing\n` +
                `• Cek inventory: .inv`
            )
        }
        
        await animateGathering(m, 'mining', 'mineral')
        
        user.energy -= 2
        rpg.lastMine = now
        
        let pickaxeBroken = false
        if (chance(5)) {
            delItem(user, "pickaxe", 1)
            pickaxeBroken = true
        }
        
        const results = []
        let totalValue = 0
        const miningBonus = Math.floor(rpg.level / 10)
        
        const chances = [
            { item: "stone", chance: 70 + miningBonus, min: 2, max: 5, xp: 5 },
            { item: "iron_ore", chance: 40 + miningBonus, min: 1, max: 3, xp: 10 },
            { item: "gold_ore", chance: 15 + Math.floor(miningBonus/2), min: 1, max: 2, xp: 25 },
            { item: "diamond", chance: 5, min: 1, max: 1, xp: 100 },
            { item: "ruby", chance: 3, min: 1, max: 1, xp: 80 },
            { item: "sapphire", chance: 3, min: 1, max: 1, xp: 80 },
            { item: "emerald", chance: 2, min: 1, max: 1, xp: 90 }
        ]
        
        let totalXP = 0
        
        chances.forEach(chanceData => {
            if (chance(chanceData.chance)) {
                const qty = rng(chanceData.min, chanceData.max)
                addItem(user, chanceData.item, qty)
                results.push(`${ITEMS[chanceData.item].name} x${qty}`)
                totalValue += ITEMS[chanceData.item].sell * qty
                totalXP += chanceData.xp * qty
            }
        })
        
        const baseXP = rng(20, 40)
        rpg.exp += baseXP + totalXP
        
        if (rpg.activeQuest) {
            const quest = rpg.activeQuest
            
            if (quest.type === "collect" && quest.target === "stone") {
                const stoneQty = results.reduce((total, result) => {
                    if (result.includes("Stone")) {
                        const match = result.match(/x(\d+)/)
                        return total + (match ? parseInt(match[1]) : 0)
                    }
                    return total
                }, 0)
                
                if (stoneQty > 0) {
                    quest.progress = Math.min(quest.progress + stoneQty, quest.amount)
                }
            }
            
            if (quest.type === "collect" && quest.target === "diamond") {
                const diamondQty = results.reduce((total, result) => {
                    if (result.includes("Diamond")) {
                        return total + 1
                    }
                    return total
                }, 0)
                
                if (diamondQty > 0) {
                    quest.progress = Math.min(quest.progress + diamondQty, quest.amount)
                }
            }
            
            if (quest.type === "collect" && quest.target === "iron_ore") {
                const ironQty = results.reduce((total, result) => {
                    if (result.includes("Iron Ore")) {
                        const match = result.match(/x(\d+)/)
                        return total + (match ? parseInt(match[1]) : 0)
                    }
                    return total
                }, 0)
                
                if (ironQty > 0) {
                    quest.progress = Math.min(quest.progress + ironQty, quest.amount)
                }
            }
        }
        
        await db.save()
        
        let response = `⛏️ *MINING EXPEDITION* ⛏️\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        
        if (pickaxeBroken) {
            response += `💔 *PICKAXE BROKEN!*\n` +
                       `Pickaxe kamu rusak saat menambang!\n\n`
        }
        
        response += `Kamu menambang di gua...\n\n`
        
        if (results.length > 0) {
            response += `📦 *MATERIALS FOUND:*\n${results.join("\n")}\n\n`
            response += `💰 *TOTAL VALUE:* ${formatNumber(totalValue)} Gold\n`
        } else {
            response += `❌ *TIDAK MENEMUKAN APA-APA*\n` +
                       `Sayang sekali, tidak ada mineral di sini.\n\n`
        }
        
        response += `➕ *XP GAINED:* +${baseXP + totalXP} XP\n` +
                   `⚡ *ENERGY USED:* 2\n` +
                   `📊 *MINING BONUS:* +${miningBonus}% (Level ${rpg.level})\n\n`
        
        if (rpg.activeQuest && rpg.activeQuest.progress < rpg.activeQuest.amount) {
            const quest = rpg.activeQuest
            const progressPercent = Math.floor((quest.progress / quest.amount) * 100)
            response += `📜 *QUEST PROGRESS:*\n` +
                       `${quest.name}\n` +
                       `${quest.progress}/${quest.amount} ${quest.target} (${progressPercent}%)\n\n`
        }
        
        if (pickaxeBroken) {
            response += `🛒 *BUTUH PICKAXE BARU:*\n` +
                       `• Beli: ${prefix}buy pickaxe\n` +
                       `• Craft: ${prefix}craft pickaxe\n\n`
        } else {
            response += `💡 *MINING TIPS:*\n` +
                       `• Level lebih tinggi = chance lebih baik\n` +
                       `• Jual bahan: ${prefix}sell stone/iron_ore\n` +
                       `• Craft equipment dari bahan\n\n`
        }
        
        response += `🎯 *NEXT STEP:*\n` +
                   `• Tambang lagi: ${prefix}mine (30s cooldown)\n` +
                   `• Jual bahan: ${prefix}sell\n` +
                   `• Cek progress: ${prefix}quest`
        
        return m.reply(response)
    }

    // --- FISHING ---
    if (cmd === "fish") {
        if (user.energy < 2) {
            return m.reply(
                `⚡ *ENERGY LOW!*\n\n` +
                `Butuh 2 Energy untuk memancing.\n` +
                `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
                `💡 *CARA DAPAT ENERGY:*\n` +
                `• .daily - Claim 80-300 Energy\n` +
                `• .use berry - +10 Energy\n` +
                `• .use cooked_fish - +30 Energy\n\n` +
                `⏰ Tunggu regenerasi natural`
            )
        }
        
        if (!hasItem(user, "fishing_rod", 1)) {
            return m.reply(
                `🎣 *BUTUH FISHING ROD!*\n\n` +
                `Kamu butuh Fishing Rod untuk memancing.\n\n` +
                `🛒 *CARA DAPAT FISHING ROD:*\n` +
                `• Beli: ${prefix}buy fishing_rod (500 Gold)\n` +
                `• Craft: ${prefix}craft fishing_rod (3x Wood + 200G)\n\n` +
                `💰 *HARGA:* 500 Gold\n` +
                `💳 *GOLD KAMU:* ${formatNumber(rpg.gold)}\n\n` +
                `⚒️ *CRAFTING MATERIALS:*\n` +
                `• Wood: .chop atau .forage\n` +
                `• Gold: .adventure atau .sell items`
            )
        }
        
        const now = Date.now()
        if (now - rpg.lastFish < 30000) {
            const wait = Math.ceil((30000 - (now - rpg.lastFish)) / 1000)
            return m.reply(
                `⏳ *COOLDOWN ACTIVE*\n\n` +
                `Tunggu ${wait} detik sebelum memancing lagi.\n\n` +
                `💡 *SAMBIL MENUNGGU:*\n` +
                `• .forage - Cari bahan\n` +
                `• .mine - Menambang\n` +
                `• .hunt - Berburu kecil\n` +
                `• Masak ikan: .cook`
            )
        }
        
        await animateGathering(m, 'fishing', 'ikan')
        
        user.energy -= 2
        rpg.lastFish = now
        
        let rodBroken = false
        if (chance(5)) {
            delItem(user, "fishing_rod", 1)
            rodBroken = true
        }
        
        const fishingBonus = Math.floor(rpg.level / 15)
        const rand = Math.random() * 100
        let result = ""
        let xpGain = 0
        let goldGain = 0
        
        if (rand < 50 + fishingBonus) {
            const qty = rng(2, 4)
            addItem(user, "fish", qty)
            result = `🐟 Raw Fish x${qty}`
            xpGain = rng(15, 25)
            goldGain = qty * 20
        } 
        else if (rand < 75 + fishingBonus) {
            const qty = rng(1, 2)
            const rareFish = chance(30) ? "gold_ore" : "iron_ore"
            addItem(user, rareFish, qty)
            result = `${ITEMS[rareFish].name} x${qty}`
            xpGain = rng(25, 40)
            goldGain = ITEMS[rareFish].sell * qty
        }
        else if (rand < 90) {
            addItem(user, "potion", 1)
            const extraGold = rng(50, 100)
            rpg.gold += extraGold
            result = `❤️ HP Potion x1 + 💰 ${extraGold} Gold`
            xpGain = rng(40, 60)
            goldGain = extraGold + 25
        }
        else if (rand < 98) {
            const epicItems = ["diamond", "ruby", "sapphire"]
            const epicItem = epicItems[Math.floor(Math.random() * epicItems.length)]
            addItem(user, epicItem, 1)
            result = `💎 ${ITEMS[epicItem].name} x1 (EPIC!)`
            xpGain = rng(80, 120)
            goldGain = ITEMS[epicItem].sell
        }
        else {
            addItem(user, "gacha_ticket", 1)
            const bonusGold = rng(200, 500)
            rpg.gold += bonusGold
            result = `🎫 Gacha Ticket x1 + 💰 ${bonusGold} Gold (LEGENDARY!!)`
            xpGain = rng(150, 250)
            goldGain = bonusGold + 500
        }
        
        rpg.exp += xpGain
        
        if (rpg.activeQuest && rpg.activeQuest.type === "collect" && rpg.activeQuest.target === "fish") {
            const fishMatch = result.match(/Raw Fish x(\d+)/)
            if (fishMatch) {
                const fishQty = parseInt(fishMatch[1])
                rpg.activeQuest.progress = Math.min(rpg.activeQuest.progress + fishQty, rpg.activeQuest.amount)
            }
        }
        
        await db.save()
        
        let response = `🎣 *FISHING EXPEDITION* 🎣\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        
        if (rodBroken) {
            response += `💔 *FISHING ROD BROKEN!*\n` +
                       `Fishing Rod kamu patah saat memancing!\n\n`
        }
        
        response += `Kamu memancing di danau...\n\n` +
                   `🎁 *CATCH:* ${result}\n\n` +
                   `➕ *XP GAINED:* +${xpGain} XP\n` +
                   `💰 *VALUE:* ${formatNumber(goldGain)} Gold\n` +
                   `⚡ *ENERGY USED:* 2\n` +
                   `📊 *FISHING BONUS:* +${fishingBonus}% (Level ${rpg.level})\n\n`
        
        if (rpg.activeQuest && rpg.activeQuest.progress < rpg.activeQuest.amount) {
            const quest = rpg.activeQuest
            const progressPercent = Math.floor((quest.progress / quest.amount) * 100)
            response += `📜 *QUEST PROGRESS:*\n` +
                       `${quest.name}\n` +
                       `${quest.progress}/${quest.amount} ${quest.target} (${progressPercent}%)\n\n`
        }
        
        if (rodBroken) {
            response += `🛒 *BUTUH FISHING ROD BARU:*\n` +
                       `• Beli: ${prefix}buy fishing_rod\n` +
                       `• Craft: ${prefix}craft fishing_rod\n\n`
        } else {
            response += `💡 *FISHING TIPS:*\n` +
                       `• Level lebih tinggi = catch lebih baik\n` +
                       `• Masak ikan: ${prefix}cook (butuh 1 Raw Fish)\n` +
                       `• Cooked Fish memberi +30 Energy\n\n`
        }
        
        response += `🎯 *NEXT STEP:*\n` +
                   `• Mancing lagi: ${prefix}fish (30s cooldown)\n` +
                   `• Masak ikan: ${prefix}cook\n` +
                   `• Jual ikan: ${prefix}sell fish`
        
        return m.reply(response)
    }

    // --- QUESTS ---
    if (cmd === "quest" || cmd === "quests") {
        const availableQuests = [
            { 
                id: "beginner_slime", 
                name: "🐸 Slime Hunter", 
                desc: "Bunuh 5 Slime di adventure", 
                type: "kill", 
                target: "Slime", 
                amount: 5, 
                reward: { gold: 500, exp: 200, items: [{id: "potion", qty: 2}] },
                requirements: { minLevel: 1 },
                daily: true
            },
            { 
                id: "stone_collector", 
                name: "⛏️ Stone Collector", 
                desc: "Kumpulkan 20 Stone dari mining", 
                type: "collect", 
                target: "stone", 
                amount: 20, 
                reward: { gold: 800, exp: 300, items: [{id: "pickaxe", qty: 1}] },
                requirements: { minLevel: 3, needPickaxe: true },
                daily: true
            },
            { 
                id: "master_fisher", 
                name: "🎣 Master Fisher", 
                desc: "Tangkap 15 Ikan dari fishing", 
                type: "collect", 
                target: "fish", 
                amount: 15, 
                reward: { gold: 1200, exp: 400, items: [{id: "fishing_rod", qty: 1}] },
                requirements: { minLevel: 5, needFishingRod: true },
                daily: true
            },
            { 
                id: "diamond_hunter", 
                name: "💎 Diamond Hunter", 
                desc: "Cari 3 Diamond dari mining", 
                type: "collect", 
                target: "diamond", 
                amount: 3, 
                reward: { gold: 3000, exp: 1000, items: [{id: "gacha_ticket", qty: 2}] },
                requirements: { minLevel: 10 },
                daily: false
            },
            { 
                id: "weekly_challenge", 
                name: "🏆 Weekly Challenge", 
                desc: "Kumpulkan 50 berbagai item", 
                type: "collect_multi", 
                targets: ["stone", "wood", "iron_ore", "fish"], 
                amount: 50, 
                reward: { gold: 5000, exp: 2000, items: [{id: "mythic_sword", qty: 1}] },
                requirements: { minLevel: 20 },
                weekly: true
            },
            { 
                id: "iron_miner", 
                name: "⛓️ Iron Miner", 
                desc: "Kumpulkan 10 Iron Ore", 
                type: "collect", 
                target: "iron_ore", 
                amount: 10, 
                reward: { gold: 1500, exp: 600, items: [{id: "iron_sword", qty: 1}] },
                requirements: { minLevel: 8, needPickaxe: true },
                daily: true
            },
            { 
                id: "wood_collector", 
                name: "🪵 Wood Collector", 
                desc: "Kumpulkan 30 Wood", 
                type: "collect", 
                target: "wood", 
                amount: 30, 
                reward: { gold: 1000, exp: 400, items: [{id: "axe", qty: 1}] },
                requirements: { minLevel: 5 },
                daily: true
            }
        ]
        
        if (args[0]?.toLowerCase() === "abandon") {
            if (!rpg.activeQuest) {
                return m.reply("❌ Kamu tidak memiliki quest aktif untuk diabaikan.")
            }
            
            const abandonedQuest = rpg.activeQuest.name
            rpg.activeQuest = null
            
            await db.save()
            return m.reply(`🗑️ *QUEST ABANDONED*\n\nQuest "${abandonedQuest}" telah diabaikan.\n\n💡 Ambil quest baru dengan: ${prefix}quest`)
        }
        
        if (args[0]?.toLowerCase() === "complete") {
            if (!rpg.activeQuest) {
                return m.reply("❌ Kamu tidak memiliki quest aktif untuk diselesaikan.")
            }
            
            if (rpg.activeQuest.progress < rpg.activeQuest.amount) {
                const remaining = rpg.activeQuest.amount - rpg.activeQuest.progress
                return m.reply(
                    `❌ *QUEST BELUM SELESAI!*\n\n` +
                    `Quest: ${rpg.activeQuest.name}\n` +
                    `Progress: ${rpg.activeQuest.progress}/${rpg.activeQuest.amount}\n` +
                    `Sisa: ${remaining} ${rpg.activeQuest.target}\n\n` +
                    `💡 *CARA SELESAIKAN:*\n` +
                    (rpg.activeQuest.target === "stone" ? `• Mining: ${prefix}mine\n` : ``) +
                    (rpg.activeQuest.target === "fish" ? `• Fishing: ${prefix}fish\n` : ``) +
                    (rpg.activeQuest.target === "Slime" ? `• Adventure: ${prefix}adventure\n` : ``) +
                    (rpg.activeQuest.target === "diamond" ? `• Mining (rare): ${prefix}mine\n` : ``) +
                    (rpg.activeQuest.target === "iron_ore" ? `• Mining: ${prefix}mine\n` : ``) +
                    (rpg.activeQuest.target === "wood" ? `• Chop wood: ${prefix}chop\n` : ``)
                )
            }
            
            
            
            const reward = rpg.activeQuest.reward
            const questName = rpg.activeQuest.name
            
            rpg.gold += reward.gold
            rpg.exp += reward.exp
            
            let itemsText = ""
            if (reward.items && reward.items.length > 0) {
                reward.items.forEach(itemReward => {
                    addItem(user, itemReward.id, itemReward.qty)
                    itemsText += `• ${ITEMS[itemReward.id].name} x${itemReward.qty}\n`
                })
            }
            
            if (!rpg.quests.completed) rpg.quests.completed = []
            rpg.quests.completed.push({
                id: rpg.activeQuest.id,
                name: questName,
                completedAt: Date.now(),
                type: rpg.activeQuest.daily ? 'daily' : rpg.activeQuest.weekly ? 'weekly' : 'normal'
            })
            
            rpg.activeQuest = null
            
            await db.save()
            
            return m.reply(
                `🎉 *QUEST COMPLETED!* 🎉\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📜 *QUEST:* ${questName}\n\n` +
                `🏆 *REWARDS RECEIVED:*\n` +
                `💰 Gold: +${formatNumber(reward.gold)}\n` +
                `➕ XP: +${formatNumber(reward.exp)}\n` +
                (itemsText ? `📦 Items:\n${itemsText}\n` : ``) +
                `🎯 *QUEST STATS:*\n` +
                `• Total completed: ${rpg.quests.completed.length}\n` +
                `• Gold earned: ${formatNumber(rpg.gold)}\n\n` +
                `💡 Ambil quest baru dengan: ${prefix}quest`
            )
        }
        
        if (args[0]?.toLowerCase() === "accept") {
            const questIndex = parseInt(args[1]) - 1
            
            const availableForPlayer = availableQuests.filter(quest => {
                if (quest.requirements.minLevel > rpg.level) return false
                
                if (quest.requirements.needPickaxe && !hasItem(user, "pickaxe", 1)) return false
                if (quest.requirements.needFishingRod && !hasItem(user, "fishing_rod", 1)) return false
                
                if (quest.daily) {
                    const today = new Date().toDateString()
                    const lastCompleted = rpg.quests.completed?.find(q => 
                        q.id === quest.id && 
                        new Date(q.completedAt).toDateString() === today
                    )
                    if (lastCompleted) return false
                }
                
                if (quest.weekly) {
                    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
                    const lastCompleted = rpg.quests.completed?.find(q => 
                        q.id === quest.id && 
                        q.completedAt > weekAgo
                    )
                    if (lastCompleted) return false
                }
                
                if (rpg.activeQuest) return false
                
                return true
            })
            
            if (isNaN(questIndex) || questIndex < 0 || questIndex >= availableForPlayer.length) {
                return m.reply(`❌ Nomor quest tidak valid. Gunakan ${prefix}quest untuk melihat daftar quest.`)
            }
            
            const selectedQuest = availableForPlayer[questIndex]
            rpg.activeQuest = {
                id: selectedQuest.id,
                name: selectedQuest.name,
                desc: selectedQuest.desc,
                type: selectedQuest.type,
                target: selectedQuest.target,
                amount: selectedQuest.amount,
                progress: 0,
                reward: selectedQuest.reward,
                daily: selectedQuest.daily || false,
                weekly: selectedQuest.weekly || false
            }
            
            await db.save()
            
            return m.reply(
                `✅ *QUEST ACCEPTED!*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📜 *${selectedQuest.name}*\n` +
                `📝 ${selectedQuest.desc}\n\n` +
                `🎯 *TARGET:* ${selectedQuest.amount} ${selectedQuest.target}\n` +
                `📊 *PROGRESS:* 0/${selectedQuest.amount}\n\n` +
                `🏆 *REWARDS:*\n` +
                `💰 ${formatNumber(selectedQuest.reward.gold)} Gold\n` +
                `➕ ${formatNumber(selectedQuest.reward.exp)} XP\n` +
                (selectedQuest.reward.items ? selectedQuest.reward.items.map(item => `📦 ${ITEMS[item.id].name} x${item.qty}`).join("\n") + "\n" : "") +
                `\n🔧 *CARA SELESAIKAN:*\n` +
                (selectedQuest.target === "stone" ? `• Mining: ${prefix}mine\n` : ``) +
                (selectedQuest.target === "fish" ? `• Fishing: ${prefix}fish\n` : ``) +
                (selectedQuest.target === "Slime" ? `• Adventure: ${prefix}adventure\n` : ``) +
                (selectedQuest.target === "diamond" ? `• Mining (rare drop): ${prefix}mine\n` : ``) +
                (selectedQuest.target === "iron_ore" ? `• Mining: ${prefix}mine\n` : ``) +
                (selectedQuest.target === "wood" ? `• Chop wood: ${prefix}chop\n` : ``) +
                `\n📋 *QUEST COMMANDS:*\n` +
                `• ${prefix}quest - Cek progress\n` +
                `• ${prefix}quest complete - Klaim reward\n` +
                `• ${prefix}quest abandon - Batalkan quest\n\n` +
                `🎮 Selamat mengerjakan quest!`
            )
        }
        
        if (rpg.activeQuest) {
            const quest = rpg.activeQuest
            const progressPercent = Math.floor((quest.progress / quest.amount) * 100)
            const progressBar = "█".repeat(Math.floor(progressPercent / 10)) + "░".repeat(10 - Math.floor(progressPercent / 10))
            
            let howToComplete = ""
            switch(quest.target) {
                case "stone":
                    howToComplete = `⛏️ Mining: ${prefix}mine`
                    break
                case "fish":
                    howToComplete = `🎣 Fishing: ${prefix}fish`
                    break
                case "Slime":
                    howToComplete = `⚔️ Adventure: ${prefix}adventure`
                    break
                case "diamond":
                    howToComplete = `⛏️ Mining (rare drop): ${prefix}mine`
                    break
                case "iron_ore":
                    howToComplete = `⛏️ Mining: ${prefix}mine`
                    break
                case "wood":
                    howToComplete = `🪓 Chop wood: ${prefix}chop`
                    break
                default:
                    howToComplete = `🎮 Various activities`
            }
            
            return m.reply(
                `📜 *CURRENT QUEST* 📜\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🎯 *${quest.name}*\n` +
                `📝 ${quest.desc || `Kumpulkan ${quest.amount} ${quest.target}`}\n\n` +
                `📊 *PROGRESS:*\n` +
                `${quest.progress}/${quest.amount} (${progressPercent}%)\n` +
                `${progressBar}\n\n` +
                `🏆 *REWARDS:*\n` +
                `💰 ${formatNumber(quest.reward.gold)} Gold\n` +
                `➕ ${formatNumber(quest.reward.exp)} XP\n` +
                (quest.reward.items ? quest.reward.items.map(item => `📦 ${ITEMS[item.id].name} x${item.qty}`).join("\n") + "\n" : "") +
                `\n🔧 *HOW TO COMPLETE:*\n` +
                `${howToComplete}\n\n` +
                `⚙️ *QUEST COMMANDS:*\n` +
                `• ${prefix}quest complete - Klaim reward\n` +
                `• ${prefix}quest abandon - Batalkan quest\n` +
                `• ${prefix}quest accept <nomor> - Ambil quest baru`
            )
        }
        
        const availableForPlayer = availableQuests.filter(quest => {
            if (quest.requirements.minLevel > rpg.level) return false
            
            if (quest.requirements.needPickaxe && !hasItem(user, "pickaxe", 1)) return false
            if (quest.requirements.needFishingRod && !hasItem(user, "fishing_rod", 1)) return false
            
            if (quest.daily) {
                const today = new Date().toDateString()
                const lastCompleted = rpg.quests.completed?.find(q => 
                    q.id === quest.id && 
                    new Date(q.completedAt).toDateString() === today
                )
                if (lastCompleted) return false
            }
            
            if (quest.weekly) {
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
                const lastCompleted = rpg.quests.completed?.find(q => 
                    q.id === quest.id && 
                    q.completedAt > weekAgo
                )
                if (lastCompleted) return false
            }
            
            if (rpg.activeQuest) return false
            
            return true
        })
        
        if (availableForPlayer.length === 0) {
            return m.reply(
                `📜 *NO AVAILABLE QUESTS*\n\n` +
                `Tidak ada quest yang tersedia untuk level kamu (${rpg.level}).\n\n` +
                `💡 *REQUIREMENTS:*\n` +
                `• Level up lebih tinggi\n` +
                `• Selesaikan quest yang ada\n` +
                `• Tunggu reset quest harian/mingguan\n\n` +
                `🎯 *CARA LEVEL UP:*\n` +
                `• Adventure: ${prefix}adventure\n` +
                `• Mining: ${prefix}mine\n` +
                `• Fishing: ${prefix}fish\n` +
                `• Daily reward: ${prefix}daily`
            )
        }
        
        let questsList = ""
        availableForPlayer.forEach((quest, index) => {
            questsList += `*${index + 1}. ${quest.name}*\n`
            questsList += `   📝 ${quest.desc}\n`
            questsList += `   🎯 Target: ${quest.amount} ${quest.target}\n`
            questsList += `   🏆 Reward: ${formatNumber(quest.reward.gold)} Gold + ${formatNumber(quest.reward.exp)} XP\n`
            if (quest.reward.items) {
                quest.reward.items.forEach(item => {
                    questsList += `        📦 ${ITEMS[item.id].name} x${item.qty}\n`
                })
            }
            questsList += `   🔧 Requirement: Level ${quest.requirements.minLevel}+`
            if (quest.requirements.needPickaxe) questsList += ` + Pickaxe`
            if (quest.requirements.needFishingRod) questsList += ` + Fishing Rod`
            questsList += `\n   ⏰ Type: ${quest.daily ? 'Daily' : quest.weekly ? 'Weekly' : 'Normal'}\n\n`
        })
        
        return m.reply(
            `📜 *AVAILABLE QUESTS* 📜\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Pilih quest untuk dikerjakan:\n\n` +
            questsList +
            `📝 *CARA AMBIL QUEST:*\n` +
            `${prefix}quest accept <nomor>\n\n` +
            `💡 *QUEST TIPS:*\n` +
            `• Quest memberikan reward besar\n` +
            `• Selesaikan quest untuk item spesial\n` +
            `• Daily quest reset setiap hari\n` +
            `• Weekly quest reset setiap Senin\n\n` +
            `🎯 *LEVEL KAMU:* ${rpg.level}`
        )
    }
  }
                         }


//plugins/rpg/rpg.market.js

import { ITEMS, findItem,CLASSES, hasItem, addItem, getItemCount, delItem, formatNumber } from "../../lib/rpglib.js"

export default {
  name: "rpg_economy",
  command: ["shop", "buy", "sell", "use", "inv", "inventory", "bank", "atm", "isi", "withdraw", "wd", "upgrade", "craft", "market"],
  tags: ["rpg"],
  run: async (ev, rt) => {
    const { m, cmd, args, prefix } = ev
    const { db } = rt
    const user = db.getUser(m.sender)
    const rpg = user.rpg

    // Pastikan struktur data ada
    if (!rpg.inventory) rpg.inventory = []

    // --- SHOP / MARKET ---
    if (cmd === "shop" || cmd === "market") {
        let txt = `🛒 *GENERAL STORE & MARKET* 🛒\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `💰 *SALDO KAMU:* ${formatNumber(rpg.gold)} Gold\n` +
                 `🏦 *TABUNGAN:* ${formatNumber(rpg.atm)} Gold\n` +
                 `💳 *TOTAL:* ${formatNumber(rpg.gold + rpg.atm)} Gold\n\n`
        
        const categories = {
            "consumable": "🧪 CONSUMABLES (Bisa digunakan)",
            "tool": "🛠️ TOOLS (Alat untuk gathering)",
            "upgrade": "⚔️ EQUIPMENT (Tambah stat permanen)",
            "special": "✨ SPECIAL ITEMS (Item langka)"
        }

        for (const [type, label] of Object.entries(categories)) {
            txt += `\n${label}\n`
            txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
            
            let categoryItems = []
            Object.keys(ITEMS).forEach(k => {
                const i = ITEMS[k]
                if (i.type === type && i.price > 0) {
                    categoryItems.push({
                        name: i.name,
                        price: i.price,
                        key: k,
                        desc: i.desc || i.effect ? `(${i.effect} +${i.value})` : ''
                    })
                }
            })
            
            // Sort by price
            categoryItems.sort((a, b) => a.price - b.price)
            
            categoryItems.forEach(item => {
                const profit = item.price - (ITEMS[item.key]?.sell || 0)
                const roi = profit > 0 ? `📈 ROI: ${Math.floor((profit/item.price)*100)}%` : ''
                txt += `• ${item.name} [${formatNumber(item.price)} G] ${item.desc}\n`
                txt += `  🛒 Beli: ${prefix}buy ${item.key}\n`
                if (roi) txt += `  ${roi}\n`
            })
        }
        
        // Add crafting recipes
        txt += `\n⚒️ *CRAFTING RECIPES* ⚒️\n`
        txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        txt += `Craft item dari bahan untuk hemat gold!\n\n`
        
        const recipes = [
            { item: "iron_sword", name: "⚔️ Iron Sword", mats: "3x Iron Ore", gold: 500, sell: 2000 },
            { item: "iron_armor", name: "🛡️ Iron Armor", mats: "5x Iron Ore", gold: 800, sell: 2000 },
            { item: "fishing_rod", name: "🎣 Fishing Rod", mats: "3x Wood", gold: 200, sell: 1000 },
            { item: "pickaxe", name: "⛏️ Pickaxe", mats: "3x Wood + 2x Stone", gold: 300, sell: 1000 }
        ]
        
        recipes.forEach(recipe => {
            const savings = recipe.sell - (recipe.gold + 
                (recipe.mats.includes("Iron Ore") ? (recipe.mats.match(/\d+/)[0] * 50) : 
                 recipe.mats.includes("Wood") ? (recipe.mats.match(/\d+/)[0] * 15) : 0))
            txt += `• ${recipe.name}\n`
            txt += `  📦 Bahan: ${recipe.mats}\n`
            txt += `  💰 Biaya: ${recipe.gold} Gold\n`
            txt += `  💸 Hemat: ${savings > 0 ? `${savings} Gold` : 'Tidak hemat'}\n`
            txt += `  🔨 Craft: ${prefix}craft ${recipe.item}\n`
        })
        
        // Shopping tips
        txt += `\n💡 *SHOPPING TIPS:*\n`
        txt += `1. Beli Pickaxe & Fishing Rod dulu untuk gathering\n`
        txt += `2. Jual bahan mentah untuk profit cepat\n`
        txt += `3. Craft item lebih hemat daripada beli\n`
        txt += `4. Simpan gold di bank untuk keamanan\n`
        txt += `5. Prioritasi beli equipment untuk stat\n`
        
        return m.reply(txt)
    }

    // --- BUY (Dengan petunjuk lengkap) ---
    if (cmd === "buy") {
        let query, amt
        
        // Deteksi argumen jumlah
        if (!isNaN(args[args.length - 1])) {
            amt = parseInt(args[args.length - 1])
            query = args.slice(0, -1).join(" ")
        } else {
            amt = 1
            query = args.join(" ")
        }

        if (!query) {
            return m.reply(
                `🛒 *BUY COMMAND GUIDE* 🛒\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📝 *CARA MEMBELI:*\n` +
                `${prefix}buy <nama_item> <jumlah>\n\n` +
                `📋 *CONTOH PENGGUNAAN:*\n` +
                `${prefix}buy potion 5\n` +
                `${prefix}buy pickaxe 1\n` +
                `${prefix}buy iron_sword 1\n\n` +
                `🔍 *CARA MENCARI ITEM:*\n` +
                `1. Lihat daftar item: ${prefix}shop\n` +
                `2. Cari nama item atau aliasnya\n` +
                `3. Gunakan nama yang muncul di shop\n\n` +
                `💡 *TIPS PEMBELIAN:*\n` +
                `• Beli dalam jumlah banyak untuk hemat waktu\n` +
                `• Cek ROI (Return on Investment) di .shop\n` +
                `• Prioritasi alat gathering dulu\n\n` +
                `💰 *SALDO KAMU:* ${formatNumber(rpg.gold)} Gold`
            )
        }

        const itemKey = findItem(query)
        if (!itemKey) {
            // Suggest similar items
            const suggestions = Object.keys(ITEMS).filter(k => {
                const item = ITEMS[k]
                return item.name.toLowerCase().includes(query.toLowerCase()) || 
                       (item.alias && item.alias.some(a => a.includes(query.toLowerCase())))
            }).slice(0, 5)
            
            let suggestionText = ""
            if (suggestions.length > 0) {
                suggestionText = `\n🔍 *ITEM YANG MIRIP:*\n`
                suggestions.forEach(sugg => {
                    suggestionText += `• ${ITEMS[sugg].name} (${prefix}buy ${sugg})\n`
                })
            }
            
            return m.reply(
                `❌ *ITEM TIDAK DITEMUKAN!*\n\n` +
                `Item "${query}" tidak ada di toko.\n\n` +
                `🔎 *CARA MENCARI:*\n` +
                `1. Gunakan ${prefix}shop untuk lihat semua item\n` +
                `2. Gunakan nama persis seperti di shop\n` +
                `3. Contoh: "potion", "pickaxe", "iron_sword"\n` +
                suggestionText +
                `\n💡 Gunakan ${prefix}shop untuk melihat semua item yang tersedia!`
            )
        }

        const item = ITEMS[itemKey]
        const total = item.price * amt

        if (rpg.gold < total) {
            const needed = total - rpg.gold
            return m.reply(
                `❌ *GOLD TIDAK CUKUP!*\n\n` +
                `💰 *DIBUTUHKAN:* ${formatNumber(total)} Gold\n` +
                `💳 *SALDO KAMU:* ${formatNumber(rpg.gold)} Gold\n` +
                `📉 *KURANG:* ${formatNumber(needed)} Gold\n\n` +
                `💡 *CARA DAPAT GOLD:*\n` +
                `1. .adventure - Berburu monster\n` +
                `2. .sell <item> - Jual bahan\n` +
                `3. .daily - Claim reward harian\n` +
                `4. .withdraw - Tarik dari bank\n\n` +
                `🏦 *SALDO BANK:* ${formatNumber(rpg.atm)} Gold\n` +
                `📈 *TOTAL ASET:* ${formatNumber(rpg.gold + rpg.atm)} Gold`
            )
        }

        // Transaksi
        rpg.gold -= total

        let resultMessage = ""
        
        if (item.type === "upgrade") {
            // Equipment langsung nambah stat
            if (item.stat === "str") rpg.str += (item.value * amt)
            if (item.stat === "def") rpg.def += (item.value * amt)
            
            resultMessage = `✅ *PEMBELIAN BERHASIL!*\n\n` +
                           `🎁 *ITEM:* ${item.name} x${amt}\n` +
                           `📊 *STAT UPGRADE:* ${item.stat.toUpperCase()} +${item.value * amt}\n` +
                           `💰 *HARGA:* ${formatNumber(total)} Gold\n` +
                           `💳 *SISA SALDO:* ${formatNumber(rpg.gold)} Gold\n\n` +
                           `⚔️ *STAT BARU:*\n` +
                           `• STR: ${rpg.str}\n` +
                           `• DEF: ${rpg.def}\n\n` +
                           `💪 Stat upgrade bersifat permanen!`
        } else {
            // Item biasa masuk inventory
            addItem(user, itemKey, amt)
            
            resultMessage = `✅ *PEMBELIAN BERHASIL!*\n\n` +
                           `🎁 *ITEM:* ${item.name} x${amt}\n` +
                           `💰 *HARGA:* ${formatNumber(total)} Gold\n` +
                           `💳 *SISA SALDO:* ${formatNumber(rpg.gold)} Gold\n\n` +
                           `📦 *ITEM TELAH DITAMBAHKAN KE INVENTORY*\n` +
                           `🔍 Cek: ${prefix}inv\n\n`
            
            // Add usage instructions for consumables
            if (item.type === "consumable") {
                resultMessage += `🎯 *CARA GUNAKAN:*\n` +
                               `${prefix}use ${itemKey}\n\n` +
                               `💡 Effect: ${item.effect} +${item.value}`
            } else if (item.type === "tool") {
                resultMessage += `🔨 *CARA GUNAKAN:*\n` +
                               `• ${prefix}mine - Untuk Pickaxe\n` +
                               `• ${prefix}fish - Untuk Fishing Rod\n` +
                               `• ${prefix}chop - Untuk Wood Axe\n\n` +
                               `💡 Tools memiliki durability dan bisa rusak`
            }
        }
        
        await db.save()
        return m.reply(resultMessage)
    }

    // --- INVENTORY ---
    if (cmd === "inv" || cmd === "inventory") {
        if (!rpg.inventory || rpg.inventory.length === 0) {
            return m.reply(
                `🎒 *INVENTORY KOSONG* 🎒\n\n` +
                `Tas kamu masih kosong. Mulai kumpulkan item!\n\n` +
                `💡 *CARA DAPAT ITEM:*\n` +
                `1. .forage - Cari bahan di hutan\n` +
                `2. .mine - Menambang (butuh Pickaxe)\n` +
                `3. .fish - Memancing (butuh Rod)\n` +
                `4. .adventure - Drop dari monster\n` +
                `5. .buy - Beli di shop\n\n` +
                `💰 *GOLD KAMU:* ${formatNumber(rpg.gold)}`
            )
        }
        
        let totalValue = 0
        let itemCount = 0
        
        // Group items by type
        const grouped = {}
        rpg.inventory.forEach(i => {
            const d = ITEMS[i.id]
            if (d) {
                if (!grouped[d.type]) grouped[d.type] = []
                grouped[d.type].push({ name: d.name, qty: i.qty, value: d.sell * i.qty })
                totalValue += d.sell * i.qty
                itemCount += i.qty
            }
        })
        
        let txt = `🎒 *INVENTORY DETAILS* 🎒\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `💰 *GOLD:* ${formatNumber(rpg.gold)}\n` +
                 `📊 *TOTAL ITEMS:* ${itemCount} item(s)\n` +
                 `💸 *TOTAL VALUE:* ${formatNumber(totalValue)} Gold\n\n`
        
        // Display by category
        const categoryOrder = ["upgrade", "tool", "consumable", "special", "material"]
        
        categoryOrder.forEach(type => {
            if (grouped[type]) {
                const categoryName = type === "upgrade" ? "⚔️ EQUIPMENT" :
                                   type === "tool" ? "🛠️ TOOLS" :
                                   type === "consumable" ? "🧪 CONSUMABLES" :
                                   type === "special" ? "✨ SPECIAL" : "📦 MATERIALS"
                
                txt += `${categoryName}\n`
                txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
                
                // Sort by value
                grouped[type].sort((a, b) => b.value - a.value)
                
                grouped[type].forEach(item => {
                    const itemKey = Object.keys(ITEMS).find(k => ITEMS[k].name === item.name)
                    const sellCommand = itemKey ? `${prefix}sell ${itemKey} ${item.qty}` : ""
                    txt += `• ${item.name} x${item.qty}\n`
                    txt += `  💰 Value: ${formatNumber(item.value)} Gold\n`
                    if (sellCommand) txt += `  🛒 Jual: ${sellCommand}\n`
                })
                txt += `\n`
            }
        })
        
        // Add selling tips
        txt += `💡 *SELLING TIPS:*\n`
        txt += `1. Jual bahan mentah untuk gold cepat\n` +
               `2. Simpan consumables untuk battle\n` +
               `3. Equipment lebih baik digunakan\n` +
               `4. Tools jangan dijual (butuh untuk gathering)\n\n` +
               `📈 *POTENTIAL PROFIT:* ${formatNumber(totalValue)} Gold\n` +
               `🎯 *NEXT STEP:* Pilih item untuk dijual!`
        
        return m.reply(txt)
    }

    // --- USE ITEM ---
    if (cmd === "use") {
        const query = args.join(" ")
        
        if (!query) {
            return m.reply(
                `🎯 *USE COMMAND GUIDE* 🎯\n\n` +
                `📝 *CARA MENGGUNAKAN ITEM:*\n` +
                `${prefix}use <nama_item>\n\n` +
                `📋 *ITEM YANG BISA DIGUNAKAN:*\n` +
                `• Potion - Pulihkan HP\n` +
                `• Energy Drink - Tambah Energy\n` +
                `• Berry - Energy kecil\n` +
                `• Cooked Fish - Energy sedang\n\n` +
                `🔍 *CARA MENCARI:*\n` +
                `1. Cek inventory: ${prefix}inv\n` +
                `2. Cari item consumable\n` +
                `3. Gunakan nama item\n\n` +
                `📝 *CONTOH:*\n` +
                `${prefix}use potion\n` +
                `${prefix}use berry\n\n` +
                `💡 *TIP:* Item hanya bisa digunakan 1 per command`
            )
        }
        
        const itemKey = findItem(query)
        
        if (!itemKey) {
            // Check inventory for similar items
            const similar = rpg.inventory?.filter(i => {
                const item = ITEMS[i.id]
                return item && (item.name.toLowerCase().includes(query.toLowerCase()) || 
                       (item.alias && item.alias.some(a => a.includes(query.toLowerCase()))))
            }).slice(0, 3)
            
            let suggestion = ""
            if (similar.length > 0) {
                suggestion = `\n🔍 *ITEM DI INVENTORY YANG MIRIP:*\n`
                similar.forEach(s => {
                    const item = ITEMS[s.id]
                    suggestion += `• ${item.name} (${prefix}use ${s.id})\n`
                })
            }
            
            return m.reply(`❌ Item "${query}" tidak ditemukan di inventory kamu.${suggestion}\n\n💡 Cek inventory: ${prefix}inv`)
        }
        
        if (!hasItem(user, itemKey, 1)) {
            return m.reply(
                `❌ *ITEM TIDAK TERSEDIA!*\n\n` +
                `Kamu tidak punya ${ITEMS[itemKey].name}.\n\n` +
                `🛒 *CARA DAPATKAN:*\n` +
                `• Beli: ${prefix}buy ${itemKey}\n` +
                `• Dapatkan dari: .forage, .adventure, .daily\n` +
                `• Craft: ${prefix}craft (jika bisa)\n\n` +
                `💰 *HARGA:* ${ITEMS[itemKey].price} Gold\n` +
                `💳 *GOLD KAMU:* ${formatNumber(rpg.gold)}`
            )
        }
        
        const item = ITEMS[itemKey]
        if (item.type !== "consumable") {
            return m.reply(
                `❌ *ITEM INI TIDAK BISA DIGUNAKAN!*\n\n` +
                `${item.name} adalah item ${item.type}.\n\n` +
                `🎯 *PENGGUNAAN YANG BENAR:*\n` +
                item.type === "upgrade" ? `• Stat sudah otomatis bertambah saat dibeli\n` :
                item.type === "tool" ? `• Gunakan dengan command: ${prefix}mine, ${prefix}fish, dll\n` :
                item.type === "material" ? `• Jual dengan ${prefix}sell atau craft item\n` :
                `• Simpan atau jual item ini\n\n` +
                `💡 Cek ${prefix}shop untuk info lengkap`
            )
        }

        let resultMessage = ""
        
        if (item.effect === "hp") {
            const oldHp = rpg.hp
            rpg.hp += item.value
            if(rpg.hp > rpg.maxHp) rpg.hp = rpg.maxHp
            const healed = rpg.hp - oldHp
            
            resultMessage = `❤️ *MENGGUNAKAN ${item.name.toUpperCase()}*\n\n` +
                           `💊 *EFFECT:* HP +${healed}\n` +
                           `📊 *STATUS:* ${rpg.hp}/${rpg.maxHp} HP\n` +
                           `📈 *PERCENTAGE:* ${Math.floor((rpg.hp/rpg.maxHp)*100)}%\n\n` +
                           `💡 *KONDISI:* ${
                               rpg.hp === rpg.maxHp ? "🟢 FULL HEALTH!" :
                               rpg.hp > rpg.maxHp * 0.7 ? "🟡 HEALTHY" :
                               rpg.hp > rpg.maxHp * 0.3 ? "🟠 WOUNDED" : "🔴 CRITICAL"
                           }`
        } else if (item.effect === "energy") {
            const oldEnergy = user.energy
            user.energy += item.value
            if(user.energy > user.maxEnergy) user.energy = user.maxEnergy
            const gained = user.energy - oldEnergy
            
            resultMessage = `⚡ *MENGGUNAKAN ${item.name.toUpperCase()}*\n\n` +
                           `🔋 *EFFECT:* Energy +${gained}\n` +
                           `📊 *STATUS:* ${user.energy}/${user.maxEnergy} Energy\n` +
                           `📈 *PERCENTAGE:* ${Math.floor((user.energy/user.maxEnergy)*100)}%\n\n` +
                           `💡 *KONDISI:* ${
                               user.energy === user.maxEnergy ? "⚡ MAX ENERGY!" :
                               user.energy > user.maxEnergy * 0.7 ? "🔋 HIGH ENERGY" :
                               user.energy > user.maxEnergy * 0.3 ? "⚠️ MEDIUM ENERGY" : "🔴 LOW ENERGY"
                           }`
        }
        
        delItem(user, itemKey, 1)
        await db.save()
        
        // Add what's next
        resultMessage += `\n\n🎯 *NEXT STEP:*\n`
        if (item.effect === "hp") {
            resultMessage += `• Lanjut berburu: ${prefix}adventure\n`
            resultMessage += `• Cek energy: ${prefix}cekenergy\n`
        } else {
            resultMessage += `• Mulai berburu: ${prefix}adventure\n`
            resultMessage += `• Cek HP: ${prefix}profile\n`
        }
        
        return m.reply(resultMessage)
    }

    // --- SELL (Dengan petunjuk lengkap) ---
    if (cmd === "sell") {
        let query, amt
        
        // Parse arguments
        if (args.length === 0) {
            return m.reply(
                `💰 *SELL COMMAND GUIDE* 💰\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📝 *CARA MENJUAL:*\n` +
                `${prefix}sell <nama_item> <jumlah>\n` +
                `${prefix}sell <nama_item> all\n\n` +
                `📋 *CONTOH PENGGUNAAN:*\n` +
                `${prefix}sell stone 10\n` +
                `${prefix}sell wood all\n` +
                `${prefix}sell diamond 1\n\n` +
                `🔍 *CARA MENCARI ITEM:*\n` +
                `1. Cek inventory: ${prefix}inv\n` +
                `2. Lihat nama item\n` +
                `3. Gunakan nama persis seperti di inventory\n\n` +
                `💡 *SELLING TIPS:*\n` +
                `1. Jual bahan mentah untuk profit cepat\n` +
                `2. Simpan consumables untuk battle\n` +
                `3. Jangan jual tools (butuh untuk gathering)\n` +
                `4. Equipment lebih baik digunakan\n\n` +
                `📊 *INVENTORY VALUE:*\n` +
                `🔍 Cek: ${prefix}inv\n\n` +
                `💰 *GOLD SAAT INI:* ${formatNumber(rpg.gold)}`
            )
        }
        
        // Check if last arg is number or "all"
        const lastArg = args[args.length - 1].toLowerCase()
        if (lastArg === "all" || !isNaN(lastArg)) {
            amt = lastArg === "all" ? "all" : parseInt(lastArg)
            query = args.slice(0, -1).join(" ")
        } else {
            amt = 1
            query = args.join(" ")
        }

        if(!query) return m.reply(`❌ Tulis nama item yang ingin dijual.\n💡 Contoh: ${prefix}sell stone 10`)

        const itemKey = findItem(query)
        if(!itemKey) {
            // Check inventory for items
            const inventoryItems = rpg.inventory?.map(i => ITEMS[i.id]?.name).filter(Boolean)
            if (inventoryItems && inventoryItems.length > 0) {
                return m.reply(
                    `❌ Item "${query}" tidak ditemukan.\n\n` +
                    `📦 *ITEM DI INVENTORY KAMU:*\n` +
                    `${inventoryItems.slice(0, 10).join("\n")}\n` +
                    `${inventoryItems.length > 10 ? `... dan ${inventoryItems.length - 10} lainnya` : ''}\n\n` +
                    `💡 Gunakan nama persis seperti di atas`
                )
            }
            return m.reply(`❌ Item tidak valid.\n💡 Cek inventory: ${prefix}inv`)
        }

        // Get current quantity
        const currentQty = getItemCount(user, itemKey)
        if (currentQty === 0) {
            return m.reply(
                `❌ *ITEM TIDAK ADA!*\n\n` +
                `Kamu tidak punya ${ITEMS[itemKey].name}.\n\n` +
                `💡 *CARA DAPATKAN:*\n` +
                `• Gathering: .forage, .mine, .fish\n` +
                `• Monster drop: .adventure\n` +
                `• Beli: ${prefix}buy ${itemKey}\n\n` +
                `💰 *HARGA BELI:* ${ITEMS[itemKey].price} Gold\n` +
                `💰 *HARGA JUAL:* ${ITEMS[itemKey].sell} Gold`
            )
        }

        // Determine actual amount to sell
        let actualAmt = amt
        if (amt === "all") {
            actualAmt = currentQty
        } else if (amt > currentQty) {
            return m.reply(
                `❌ *JUMLAH TERLALU BANYAK!*\n\n` +
                `Kamu hanya punya ${currentQty} ${ITEMS[itemKey].name}.\n\n` +
                `💡 *OPTIONS:*\n` +
                `• Jual semua: ${prefix}sell ${itemKey} all\n` +
                `• Jual sebagian: ${prefix}sell ${itemKey} ${Math.min(amt, currentQty)}\n\n` +
                `💰 *TOTAL VALUE:* ${currentQty * ITEMS[itemKey].sell} Gold`
            )
        }

        const item = ITEMS[itemKey]
        const total = item.sell * actualAmt
        
        // Confirm for large sales
        if (actualAmt > 10 && total > 1000) {
            // This would be a confirmation system in a real bot
            // For now, we'll just proceed
        }
        
        delItem(user, itemKey, actualAmt)
        rpg.gold += total
        
        await db.save()
        
        const remaining = currentQty - actualAmt
        const remainingValue = remaining * item.sell
        
        return m.reply(
            `✅ *PENJUALAN BERHASIL!*\n\n` +
            `📦 *ITEM TERJUAL:* ${item.name} x${actualAmt}\n` +
            `💰 *HARGA SATUAN:* ${item.sell} Gold\n` +
            `💰 *TOTAL DITERIMA:* ${formatNumber(total)} Gold\n\n` +
            `📊 *SISA INVENTORY:*\n` +
            `• ${item.name}: ${remaining} unit\n` +
            `• Nilai sisa: ${formatNumber(remainingValue)} Gold\n\n` +
            `💳 *GOLD SEBELUM:* ${formatNumber(rpg.gold - total)} Gold\n` +
            `💰 *GOLD SESUDAH:* ${formatNumber(rpg.gold)} Gold\n\n` +
            `💡 *NEXT STEP:*\n` +
            `${remaining > 0 ? `• Jual lagi: ${prefix}sell ${itemKey} ${Math.min(remaining, 10)}\n` : ''}` +
            `• Cek inventory: ${prefix}inv\n` +
            `• Lanjut gathering: ${prefix}forage`
        )
    }

    // --- BANK ---
    if (["bank", "atm"].includes(cmd)) {
        const totalWealth = rpg.gold + rpg.atm
        
        return m.reply(
            `🏦 *BANKING SYSTEM* 🏦\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💰 *DOMPET:* ${formatNumber(rpg.gold)} Gold\n` +
            `💳 *BANK:* ${formatNumber(rpg.atm)} Gold\n` +
            `📈 *TOTAL KEKAYAAN:* ${formatNumber(totalWealth)} Gold\n\n` +
            `📝 *COMMANDS:*\n` +
            `${prefix}isi <jumlah> - Setor gold ke bank\n` +
            `${prefix}withdraw <jumlah> - Tarik gold dari bank\n` +
            `${prefix}isi all - Setor semua gold\n` +
            `${prefix}withdraw all - Tarik semua gold\n\n` +
            `💡 *BANKING TIPS:*\n` +
            `1. Simpan gold di bank untuk keamanan\n` +
            `2. Tarik hanya saat butuh belanja\n` +
            `3. Tidak ada biaya admin\n` +
            `4. Tidak ada batas maksimal\n\n` +
            `🎯 *NEXT STEP:*\n` +
            `• Setor: ${prefix}isi 1000\n` +
            `• Tarik: ${prefix}withdraw 500`
        )
    }
    
    if (cmd === "isiuang" || cmd === "isi") {
        let amt = args[0]?.toLowerCase() === "all" ? rpg.gold : parseInt(args[0])
        
        if (!amt || amt < 1) {
            return m.reply(
                `❌ *JUMLAH TIDAK VALID!*\n\n` +
                `📝 *CARA SETOR:*\n` +
                `${prefix}isi <jumlah>\n` +
                `${prefix}isi all\n\n` +
                `📋 *CONTOH:*\n` +
                `${prefix}isi 1000\n` +
                `${prefix}isi all\n\n` +
                `💰 *GOLD DI DOMPET:* ${formatNumber(rpg.gold)}\n` +
                `💳 *GOLD DI BANK:* ${formatNumber(rpg.atm)}`
            )
        }
        
        if (rpg.gold < amt) {
            const needed = amt - rpg.gold
            return m.reply(
                `❌ *GOLD TIDAK CUKUP!*\n\n` +
                `💰 *BUTUH:* ${formatNumber(amt)} Gold\n` +
                `💸 *PUNYA:* ${formatNumber(rpg.gold)} Gold\n` +
                `📉 *KURANG:* ${formatNumber(needed)} Gold\n\n` +
                `💡 *CARA DAPAT GOLD:*\n` +
                `• Berburu: ${prefix}adventure\n` +
                `• Jual item: ${prefix}sell\n` +
                `• Daily reward: ${prefix}daily\n\n` +
                `🏦 *SALDO BANK:* ${formatNumber(rpg.atm)} Gold`
            )
        }
        
        const oldWallet = rpg.gold
        const oldBank = rpg.atm
        
        rpg.gold -= amt
        rpg.atm += amt
        
        await db.save()
        
        return m.reply(
            `✅ *SETOR BERHASIL!*\n\n` +
            `💰 *JUMLAH DISETOR:* ${formatNumber(amt)} Gold\n\n` +
            `📊 *SEBELUM:*\n` +
            `• Dompet: ${formatNumber(oldWallet)} Gold\n` +
            `• Bank: ${formatNumber(oldBank)} Gold\n\n` +
            `📈 *SESUDAH:*\n` +
            `• Dompet: ${formatNumber(rpg.gold)} Gold\n` +
            `• Bank: ${formatNumber(rpg.atm)} Gold\n\n` +
            `💡 Gold kamu sekarang aman di bank!\n` +
            `🎯 Tarik kembali dengan: ${prefix}withdraw`
        )
    }
    
    if (cmd === "withdraw" || cmd === "wd") {
        let amt = args[0]?.toLowerCase() === "all" ? rpg.atm : parseInt(args[0])
        
        if (!amt || amt < 1) {
            return m.reply(
                `❌ *JUMLAH TIDAK VALID!*\n\n` +
                `📝 *CARA TARIK:*\n` +
                `${prefix}withdraw <jumlah>\n` +
                `${prefix}withdraw all\n\n` +
                `📋 *CONTOH:*\n` +
                `${prefix}withdraw 1000\n` +
                `${prefix}withdraw all\n\n` +
                `💳 *GOLD DI BANK:* ${formatNumber(rpg.atm)}\n` +
                `💰 *GOLD DI DOMPET:* ${formatNumber(rpg.gold)}`
            )
        }
        
        if (rpg.atm < amt) {
            const needed = amt - rpg.atm
            return m.reply(
                `❌ *SALDO BANK TIDAK CUKUP!*\n\n` +
                `💳 *BUTUH:* ${formatNumber(amt)} Gold\n` +
                `🏦 *PUNYA:* ${formatNumber(rpg.atm)} Gold\n` +
                `📉 *KURANG:* ${formatNumber(needed)} Gold\n\n` +
                `💡 *CARA TAMBAH SALDO:*\n` +
                `• Setor gold: ${prefix}isi\n` +
                `• Dapat gold: ${prefix}adventure\n` +
                `• Jual item: ${prefix}sell\n\n` +
                `💰 *GOLD DI DOMPET:* ${formatNumber(rpg.gold)} Gold`
            )
        }
        
        const oldWallet = rpg.gold
        const oldBank = rpg.atm
        
        rpg.atm -= amt
        rpg.gold += amt
        
        await db.save()
        
        return m.reply(
            `✅ *TARIK BERHASIL!*\n\n` +
            `💰 *JUMLAH DITARIK:* ${formatNumber(amt)} Gold\n\n` +
            `📊 *SEBELUM:*\n` +
            `• Dompet: ${formatNumber(oldWallet)} Gold\n` +
            `• Bank: ${formatNumber(oldBank)} Gold\n\n` +
            `📈 *SESUDAH:*\n` +
            `• Dompet: ${formatNumber(rpg.gold)} Gold\n` +
            `• Bank: ${formatNumber(rpg.atm)} Gold\n\n` +
            `💡 Gold siap untuk digunakan!\n` +
            `🎯 Belanja: ${prefix}shop`
        )
    }

    // --- UPGRADE ---
    if (cmd === "upgrade") {
        const stat = args[0]?.toLowerCase()
        const amt = parseInt(args[1]) || 1
        
        if (!["str", "def"].includes(stat)) {
            return m.reply(
                `💪 *UPGRADE SYSTEM* 💪\n\n` +
                `📝 *CARA UPGRADE:*\n` +
                `${prefix}upgrade <stat> <jumlah>\n\n` +
                `📊 *STATS AVAILABLE:*\n` +
                `• str - Attack strength (${rpg.str})\n` +
                `• def - Defense (${rpg.def})\n\n` +
                `📋 *CONTOH:*\n` +
                `${prefix}upgrade str 1\n` +
                `${prefix}upgrade def 5\n\n` +
                `💰 *BIAYA:* 500 Gold per point\n` +
                `🎯 *EFFECT:* Meningkatkan damage & defense\n\n` +
                `💳 *GOLD KAMU:* ${formatNumber(rpg.gold)}`
            )
        }
        
        const cost = 1000 * amt
        
        if (rpg.gold < cost) {
            const needed = cost - rpg.gold
            return m.reply(
                `❌ *GOLD TIDAK CUKUP!*\n\n` +
                `💪 *UPGRADE:* ${stat.toUpperCase()} +${amt}\n` +
                `💰 *BIAYA:* ${formatNumber(cost)} Gold\n` +
                `💸 *PUNYA:* ${formatNumber(rpg.gold)} Gold\n` +
                `📉 *KURANG:* ${formatNumber(needed)} Gold\n\n` +
                `💡 *CARA DAPAT GOLD:*\n` +
                `• Berburu: ${prefix}adventure\n` +
                `• Jual item: ${prefix}sell\n` +
                `• Daily reward: ${prefix}daily\n\n` +
                `🏦 *SALDO BANK:* ${formatNumber(rpg.atm)} Gold`
            )
        }
        
        const oldStat = stat === "str" ? rpg.str : rpg.def
        
        rpg.gold -= cost
        if(stat === "str") rpg.str += amt
        if(stat === "def") rpg.def += amt
        
        await db.save()
        
        const newStat = stat === "str" ? rpg.str : rpg.def
        const increase = newStat - oldStat
        
        return m.reply(
            `✅ *UPGRADE BERHASIL!*\n\n` +
            `💪 *STAT:* ${stat.toUpperCase()}\n` +
            `📈 *INCREASE:* +${increase} (${oldStat} → ${newStat})\n` +
            `💰 *BIAYA:* ${formatNumber(cost)} Gold\n` +
            `💳 *SISA GOLD:* ${formatNumber(rpg.gold)}\n\n` +
            `🎯 *EFFECT ON BATTLE:*\n` +
            stat === "str" ? 
            `• Damage: +${Math.floor(increase * (CLASSES[rpg.role.toLowerCase()]?.str || 1.5))}\n` :
            `• Defense: +${Math.floor(increase * (CLASSES[rpg.role.toLowerCase()]?.def || 1.5))}\n\n` +
            `💡 Stat upgrade bersifat permanen!\n` +
            `🎮 Battle test: ${prefix}adventure`
        )
    }

    // --- CRAFT ---
    if (cmd === "craft") {
        const itemKey = args[0]?.toLowerCase()
        
        const recipes = {
            "iron_sword": { 
                materials: [{id: "iron_ore", qty: 3}], 
                gold: 500,
                desc: "Pedang besi untuk ATK +15",
                buyPrice: 2000
            },
            "iron_armor": { 
                materials: [{id: "iron_ore", qty: 5}], 
                gold: 800,
                desc: "Zirah besi untuk DEF +15",
                buyPrice: 2000
            },
            "fishing_rod": { 
                materials: [{id: "wood", qty: 3}], 
                gold: 200,
                desc: "Alat pancing untuk memancing ikan",
                buyPrice: 1000
            },
            "pickaxe": { 
                materials: [{id: "wood", qty: 3}, {id: "stone", qty: 2}], 
                gold: 300,
                desc: "Alat tambang untuk menambang",
                buyPrice: 1000
            },
            "axe": {
                materials: [{id: "wood", qty: 2}, {id: "stone", qty: 3}],
                gold: 400,
                desc: "Kapak untuk menebang pohon",
                buyPrice: 1200
            }
        }
        
        if (!itemKey) {
            let recipesList = ""
            for (const [key, recipe] of Object.entries(recipes)) {
                const item = ITEMS[key]
                const materialsCost = recipe.materials.reduce((total, mat) => {
                    return total + (ITEMS[mat.id].sell * mat.qty)
                }, 0)
                const totalCost = materialsCost + recipe.gold
                const savings = recipe.buyPrice - totalCost
                
                recipesList += `• *${key}* - ${item.name}\n`
                recipesList += `  📦 Bahan: ${recipe.materials.map(m => `${ITEMS[m.id].name} x${m.qty}`).join(" + ")}\n`
                recipesList += `  💰 Biaya: ${recipe.gold} Gold\n`
                recipesList += `  🛒 Harga beli: ${recipe.buyPrice} Gold\n`
                recipesList += `  💸 Hemat: ${savings} Gold\n`
                recipesList += `  🔨 Craft: ${prefix}craft ${key}\n\n`
            }
            
            return m.reply(
                `⚒️ *CRAFTING SYSTEM* ⚒️\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Craft item dari bahan untuk menghemat gold!\n\n` +
                `📋 *RECIPES AVAILABLE:*\n\n` +
                recipesList +
                `💡 *CRAFTING TIPS:*\n` +
                `1. Kumpulkan bahan terlebih dahulu\n` +
                `2. Craft lebih hemat daripada beli\n` +
                `3. Prioritasi tools untuk gathering\n` +
                `4. Equipment untuk stat boost\n\n` +
                `🎯 *NEXT STEP:*\n` +
                `Kumpulkan bahan lalu craft item pilihan!`
            )
        }
        
        if (!recipes[itemKey]) {
            const available = Object.keys(recipes).join(", ")
            return m.reply(
                `❌ *RESEP TIDAK DITEMUKAN!*\n\n` +
                `Resep "${itemKey}" tidak ada.\n\n` +
                `📋 *RESEP YANG TERSEDIA:*\n` +
                `${available}\n\n` +
                `💡 Gunakan: ${prefix}craft untuk melihat semua resep`
            )
        }
        
        const recipe = recipes[itemKey]
        const item = ITEMS[itemKey]
        
        // Check materials
        let missingMats = []
        for (const mat of recipe.materials) {
            if (!hasItem(user, mat.id, mat.qty)) {
                const have = getItemCount(user, mat.id)
                missingMats.push({
                    name: ITEMS[mat.id].name,
                    needed: mat.qty,
                    have: have,
                    missing: mat.qty - have
                })
            }
        }
        
        if (missingMats.length > 0) {
            let missingText = `❌ *BAHAN TIDAK LENGKAP!*\n\n`
            missingText += `Untuk craft ${item.name}, kamu butuh:\n\n`
            
            missingMats.forEach(mat => {
                missingText += `• ${mat.name}\n`
                missingText += `  📦 Butuh: ${mat.needed}\n`
                missingText += `  🎒 Punya: ${mat.have}\n`
                missingText += `  📉 Kurang: ${mat.missing}\n\n`
            })
            
            missingText += `💡 *CARA DAPAT BAHAN:*\n`
            if (missingMats.some(m => m.name.includes("Iron Ore"))) {
                missingText += `• Iron Ore: ${prefix}mine\n`
            }
            if (missingMats.some(m => m.name.includes("Wood"))) {
                missingText += `• Wood: ${prefix}chop\n`
            }
            if (missingMats.some(m => m.name.includes("Stone"))) {
                missingText += `• Stone: ${prefix}mine atau ${prefix}forage\n`
            }
            
            return m.reply(missingText)
        }
        
        // Check gold
        if (rpg.gold < recipe.gold) {
            const needed = recipe.gold - rpg.gold
            return m.reply(
                `❌ *GOLD TIDAK CUKUP!*\n\n` +
                `Untuk craft ${item.name}, kamu butuh ${recipe.gold} Gold.\n\n` +
                `💰 *BUTUH:* ${recipe.gold} Gold\n` +
                `💸 *PUNYA:* ${rpg.gold} Gold\n` +
                `📉 *KURANG:* ${needed} Gold\n\n` +
                `💡 *CARA DAPAT GOLD:*\n` +
                `• Jual bahan: ${prefix}sell\n` +
                `• Berburu: ${prefix}adventure\n` +
                `• Daily reward: ${prefix}daily\n\n` +
                `🏦 *SALDO BANK:* ${formatNumber(rpg.atm)} Gold`
            )
        }
        
        // Calculate savings vs buying
        const materialsCost = recipe.materials.reduce((total, mat) => {
            return total + (ITEMS[mat.id].sell * mat.qty)
        }, 0)
        const totalCost = materialsCost + recipe.gold
        const buyPrice = recipe.buyPrice || ITEMS[itemKey].price
        const savings = buyPrice - totalCost
        
        // Deduct materials
        for (const mat of recipe.materials) {
            delItem(user, mat.id, mat.qty)
        }
        
        // Deduct gold
        rpg.gold -= recipe.gold
        
        // Add crafted item
        addItem(user, itemKey, 1)
        
        await db.save()
        
        return m.reply(
            `⚒️ *CRAFTING SUCCESS!* ⚒️\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎁 *ITEM DIBUAT:* ${item.name}\n` +
            `📝 *DESKRIPSI:* ${recipe.desc}\n\n` +
            `📦 *BAHAN DIGUNAKAN:*\n` +
            `${recipe.materials.map(m => `• ${ITEMS[m.id].name} x${m.qty}`).join("\n")}\n\n` +
            `💰 *BIAYA CRAFT:*\n` +
            `• Bahan: ${materialsCost} Gold (nilai jual)\n` +
            `• Gold: ${recipe.gold} Gold\n` +
            `• Total: ${totalCost} Gold\n\n` +
            `🛒 *PERBANDINGAN HARGA:*\n` +
            `• Harga beli: ${buyPrice} Gold\n` +
            `• Harga craft: ${totalCost} Gold\n` +
            `• Penghematan: ${savings} Gold (${Math.floor((savings/buyPrice)*100)}%)\n\n` +
            `💡 *NEXT STEP:*\n` +
            item.type === "tool" ? 
            `• Gunakan: ${itemKey === "pickaxe" ? prefix+"mine" : itemKey === "fishing_rod" ? prefix+"fish" : prefix+"chop"}\n` :
            `• Stat sudah otomatis bertambah!\n` +
            `🎮 Selamat menikmati item baru!`
        )
    }
  }
            }


//plugins/rpg/rpg-main.js

import { BG_URL, CLASSES, ITEMS, chance, drawBar, addItem, rng, formatNumber, formatTime, getJobInfo, animateLoading, animateProgress } from "../../lib/rpglib.js"

export default {
  name: "rpg_main",
  command: [
    "rpg", "menurpg", "guide",
    "profile", "status", "me", "stats", "profil",
    "leaderboard", "top", "rank",
    "setrole", "class",
    "claim","daily", "hadiah",
    "cekenergy", "energy",
    "addenergy", 
    "quest", "quests", "missions",
    "forage", "cook",
    "chop", "farm", "harvest",
    "achievements", "achievement", "pencapaian"
  ],
  tags: ["rpg"],
  run: async (ev, rt) => {
    try { 
      const { m, cmd, args, prefix, isOwner } = ev
      const { db, sock } = rt
      
      if (!m || !m.sender) {
        console.error("m is undefined")
        return
      }
      
      const user = db.getUser(m.sender)
      const rpg = user.rpg
      const roleplay = user.roleplay || {}
    // Init Data
    if (!rpg.inventory) rpg.inventory = []
    if (!rpg.role) rpg.role = "Novice"
    if (!rpg.quests) rpg.quests = {}
    if (!rpg.lastForage) rpg.lastForage = 0
    if (!rpg.lastChop) rpg.lastChop = 0
    if (!rpg.farm) rpg.farm = { planted: null, plantedAt: 0 }
    if (!rpg.achievements) rpg.achievements = []

    // --- PROFILE INTEGRATED (RPG + LIFE) ---
    if (cmd === "profile" || cmd === "status" || cmd === "me" || cmd === "stats" || cmd === "profil") {
        
        
        // Data RPG
        const levelProgress = Math.floor((rpg.exp / rpg.maxExp) * 100)
        const hpPercent = Math.floor((rpg.hp / rpg.maxHp) * 100)
        const energyPercent = Math.floor((user.energy / user.maxEnergy) * 100)
        
        // Data Life Simulation
        const lifeData = roleplay.profile || {}
        const economyData = roleplay.economy || {}
        const socialData = roleplay.social || {}
        const propertyData = roleplay.property || {}
        
        const happiness = lifeData.happiness || 100
        const health = lifeData.health || 100
        const education = lifeData.education || 0
        const job = economyData.job ? getJobInfo(economyData.job).name : "👨‍💼 Pengangguran"
        const salary = economyData.salary || 0
        const cash = economyData.cash || 0
        const bank = economyData.bank || 0
        const spouse = socialData.spouse || "Tidak ada"
        const children = socialData.children || []
        const house = propertyData.house || "Kos"
        const car = propertyData.car || "Tidak ada"
        
        // Progress bars
        const levelBar = drawBar(rpg.exp, rpg.maxExp, 15)
        const hpBar = drawBar(rpg.hp, rpg.maxHp, 10)
        const energyBar = drawBar(user.energy, user.maxEnergy, 10)
        const happinessBar = drawBar(happiness, 100, 10)
        const healthBar = drawBar(health, 100, 10)
        const educationBar = drawBar(education, 100, 10)
        
        // Inventory summary
        const totalItems = rpg.inventory.reduce((sum, item) => sum + item.qty, 0)
        const inventoryValue = rpg.inventory.reduce((sum, item) => {
            const itemData = ITEMS[item.id]
            return sum + ((itemData?.sell || 0) * item.qty)
        }, 0)
        
        // Total wealth
        const totalWealth = rpg.gold + rpg.atm + cash + bank
        
        // Build profile message
        let profileMsg = `🎮 *PROFIL PLAYER* 🎮\n`
        profileMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        
        profileMsg += `👤 *IDENTITAS*\n`
        profileMsg += `🏷️ Nama: ${user.name || m.pushName}\n`
        profileMsg += `🎭 Class: ${rpg.role}\n`
        profileMsg += `📊 Level: ${rpg.level} (${levelProgress}%)\n`
        profileMsg += `${levelBar}\n\n`
        
        profileMsg += `⚔️ *STATUS PERTARUNGAN*\n`
        profileMsg += `❤️ HP: ${rpg.hp}/${rpg.maxHp} (${hpPercent}%)\n`
        profileMsg += `${hpBar}\n`
        profileMsg += `⚡ Energy: ${user.energy}/${user.maxEnergy} (${energyPercent}%)\n`
        profileMsg += `${energyBar}\n`
        profileMsg += `⚔️ STR: ${rpg.str} | 🛡️ DEF: ${rpg.def}\n`
        profileMsg += `💰 Gold: ${formatNumber(rpg.gold)} | 🏦 Bank: ${formatNumber(rpg.atm)}\n\n`
        
        profileMsg += `🏡 *KEHIDUPAN VIRTUAL*\n`
        profileMsg += `😊 Kebahagiaan: ${happiness}/100\n`
        profileMsg += `${happinessBar}\n`
        profileMsg += `❤️ Kesehatan: ${health}/100\n`
        profileMsg += `${healthBar}\n`
        profileMsg += `🎓 Pendidikan: ${education}%\n`
        profileMsg += `${educationBar}\n`
        profileMsg += `💼 Pekerjaan: ${job}\n`
        profileMsg += `💰 Gaji: ${formatNumber(salary)}/jam\n`
        profileMsg += `💵 Cash: ${formatNumber(cash)} | 🏦 Tabungan: ${formatNumber(bank)}\n`
        profileMsg += `👫 Status: ${lifeData.status || 'Single'}\n`
        profileMsg += `💍 Pasangan: ${spouse}\n`
        profileMsg += `👶 Anak: ${children.length} orang\n`
        profileMsg += `🏠 Rumah: ${house}\n`
        profileMsg += `🚗 Mobil: ${car}\n\n`
        
        profileMsg += `🎒 *INVENTORY*\n`
        profileMsg += `📦 Total Items: ${totalItems}\n`
        profileMsg += `💰 Nilai Inventory: ${formatNumber(inventoryValue)} Gold\n\n`
        
        profileMsg += `📊 *STATISTIK*\n`
        profileMsg += `🏆 Total Wealth: ${formatNumber(totalWealth)}\n`
        profileMsg += `📈 Total Earned: ${formatNumber(economyData.totalEarned || 0)} Cash\n`
        profileMsg += `💼 Business: ${(economyData.businesses || []).length}\n`
        profileMsg += `📈 Investments: ${(economyData.investments || []).length}\n`
        profileMsg += `🌟 Popularitas: ${socialData.popularity || 0}\n\n`
        
        profileMsg += `🔧 *QUICK ACTIONS*\n`
        profileMsg += `${prefix}life - Detail kehidupan\n`
        profileMsg += `${prefix}inv - Inventory detail\n`
        profileMsg += `${prefix}upgrade - Naikkan stat\n`
        profileMsg += `${prefix}setrole - Ganti class`
        
        return m.reply(profileMsg)
    }

    // --- FORAGE ---
    if (cmd === "forage") {
        if (user.energy < 3) {
            return m.reply(
                `⚡ *ENERGY LOW!*\n\n` +
                `Butuh 3 Energy untuk mencari bahan.\n` +
                `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
                `💡 Cara dapat energy:\n` +
                `• .daily - Claim 50-100 Energy\n` +
                `• .use berry - Gunakan berry (+10 Energy)\n` +
                `• Tunggu regenerasi natural`
            )
        }
        
        const now = Date.now()
        if (now - rpg.lastForage < 60000) {
            const wait = Math.ceil((60000 - (now - rpg.lastForage)) / 1000)
            return m.reply(`⏳ *COOLDOWN ACTIVE*\n\nTunggu ${wait} detik sebelum mencari lagi.\n💡 Sambil menunggu, coba: .hunt`)
        }
        
        
        
        user.energy -= 3
        rpg.lastForage = now
        
        // Random items
        const items = [
            { id: "berry", chance: 70, min: 2, max: 5 },
            { id: "stone", chance: 50, min: 1, max: 3 },
            { id: "wood", chance: 40, min: 1, max: 2 },
            { id: "apple", chance: 30, min: 1, max: 2 },
            { id: "herb", chance: 20, min: 1, max: 1 }
        ]
        
        let loot = []
        let totalItems = 0
        
        items.forEach(item => {
            if (chance(item.chance)) {
                const qty = rng(item.min, item.max)
                addItem(user, item.id, qty)
                loot.push(`${ITEMS[item.id].name} x${qty}`)
                totalItems += qty
            }
        })
        
        // Special rare find
        if (chance(5)) {
            addItem(user, "potion", 1)
            loot.push(`🎁 SPECIAL FIND: ❤️ HP Potion x1`)
        }
        
        // XP gain
        const xpGain = rng(10, 25)
        rpg.exp += xpGain
        
        // Update quest progress
        if (rpg.activeQuest && rpg.activeQuest.target === "wood") {
            const woodQty = loot.reduce((total, item) => {
                if (item.includes("Wood")) {
                    const match = item.match(/x(\d+)/)
                    return total + (match ? parseInt(match[1]) : 0)
                }
                return total
            }, 0)
            
            if (woodQty > 0) {
                rpg.activeQuest.progress = Math.min(rpg.activeQuest.progress + woodQty, rpg.activeQuest.amount)
            }
        }
        
        await db.save()
        
        if (loot.length > 0) {
            return m.reply(
                `🌿 *FORAGING SUCCESS!* 🌿\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📦 *ITEMS FOUND:*\n${loot.join("\n")}\n\n` +
                `➕ *XP GAINED:* +${xpGain} XP\n` +
                `⚡ *ENERGY USED:* 3\n` +
                `💰 *TOTAL ITEMS:* ${totalItems} items\n\n` +
                `💡 Jual item tidak perlu di .shop`
            )
        } else {
            return m.reply(
                `🌿 *FORAGING COMPLETE* 🌿\n\n` +
                `Tidak menemukan apa-apa hari ini.\n` +
                `➕ *XP GAINED:* +${xpGain}\n\n` +
                `💡 Coba lagi nanti!`
            )
        }
    }

    // --- CHOP WOOD ---
    if (cmd === "chop") {
        if (user.energy < 2) {
            return m.reply(
                `⚡ *ENERGY LOW!*\n\n` +
                `Butuh 2 Energy untuk menebang pohon.\n` +
                `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
                `💡 Quick energy: .daily atau .use berry`
            )
        }
        
        const now = Date.now()
        if (now - rpg.lastChop < 30000) {
            const wait = Math.ceil((30000 - (now - rpg.lastChop)) / 1000)
            return m.reply(
                `⏳ *COOLDOWN ACTIVE*\n\n` +
                `Tunggu ${wait} detik sebelum menebang lagi.\n\n` +
                `💡 Sambil menunggu:\n` +
                `• .forage - Cari bahan lain\n` +
                `• .hunt - Berburu kecil\n` +
                `• .inv - Cek inventory`
            )
        }
        
        
        
        user.energy -= 2
        rpg.lastChop = now
        
        const woodAmount = rng(3, 6)
        addItem(user, "wood", woodAmount)
        
        let extraLoot = ""
        
        // Chance for oak wood
        if (chance(15)) {
            const oakAmount = rng(1, 2)
            addItem(user, "oak_wood", oakAmount)
            extraLoot = `\n🌳 *RARE FIND:* Oak Wood x${oakAmount}`
        }
        
        // Chance for apple
        if (chance(25)) {
            addItem(user, "apple", 1)
            extraLoot += `\n🍎 Apple x1`
        }
        
        // XP gain
        const xpGain = rng(15, 30)
        rpg.exp += xpGain
        
        // Update quest progress
        if (rpg.activeQuest && rpg.activeQuest.target === "wood") {
            rpg.activeQuest.progress = Math.min(rpg.activeQuest.progress + woodAmount, rpg.activeQuest.amount)
        }
        
        await db.save()
        
        return m.reply(
            `🪓 *WOOD CHOPPING* 🪓\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📦 *ITEMS OBTAINED:*\n` +
            `🪵 Wood x${woodAmount}${extraLoot}\n\n` +
            `➕ *XP GAINED:* +${xpGain}\n` +
            `⚡ *ENERGY USED:* 2\n\n` +
            `💰 *SELL VALUE:* ${woodAmount * 15} Gold\n` +
            `💡 Jual dengan: .sell wood ${woodAmount}`
        )
    }

    // --- FARM ---
    if (cmd === "farm") {
        const crop = args[0]?.toLowerCase()
        if (!crop) {
            return m.reply(
                `🌾 *FARMING GUIDE*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📝 *CARA MENANAM:*\n` +
                `${prefix}farm <jenis_tanaman>\n\n` +
                `🌱 *TANAMAN TERSEDIA:*\n` +
                `• wheat - 🌾 Gandum (Harga: 30 Gold)\n` +
                `• corn - 🌽 Jagung (Harga: 40 Gold)\n\n` +
                `📊 *PROFIT PER TANAMAN:*\n` +
                `Wheat: 10-14 x 30 = 300-420 Gold\n` +
                `Corn: 10-14 x 40 = 400-560 Gold\n\n` +
                `⏰ *WAKTU PANEN:* 2 menit\n` +
                `⚡ *ENERGY DIBUTUHKAN:* 10\n\n` +
                `📝 Contoh: ${prefix}farm wheat`
            )
        }
        
        if (!["wheat", "corn"].includes(crop)) {
            return m.reply(`❌ *JENIS TANAMAN TIDAK VALID!*\n\nPilih: wheat atau corn\nContoh: ${prefix}farm wheat`)
        }
        
        if (user.energy < 2) {
            return m.reply(
                `⚡ *ENERGY LOW!*\n\n` +
                `Butuh 2 Energy untuk bertani.\n` +
                `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
                `💡 Energy gratis: .daily (50-100 Energy)`
            )
        }
        
        if (rpg.farm.planted) {
            const cropName = rpg.farm.planted === "wheat" ? "🌾 Wheat" : "🌽 Corn"
            return m.reply(
                `🌱 *LAHAN SUDAH DITANAMI!*\n\n` +
                `Lahan kamu sudah ditanami ${cropName}.\n` +
                `⏰ Tunggu 2 menit lalu gunakan: ${prefix}harvest\n\n` +
                `💡 Tips: Sambil menunggu, coba .adventure atau .mine`
            )
        }
        
        
        
        user.energy -= 2
        rpg.farm.planted = crop
        rpg.farm.plantedAt = Date.now()
        
        const cropName = crop === "wheat" ? "🌾 Wheat" : "🌽 Corn"
        const cropValue = crop === "wheat" ? 30 : 40
        
        await db.save()
        
        return m.reply(
            `🌱 *PLANTING SUCCESSFUL!* 🌱\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${cropName} berhasil ditanam!\n\n` +
            `⏰ *WAKTU PANEN:* 2 menit\n` +
            `📅 *PANEN PADA:* ${prefix}harvest\n` +
            `💰 *NILAI JUAL:* ${cropValue} Gold/item\n` +
            `⚡ *ENERGY DIGUNAKAN:* 10\n\n` +
            `💡 *ESTIMASI PROFIT:*\n` +
            `• Yield: 10-14 items\n` +
            `• Profit: ${10*cropValue}-${14*cropValue} Gold\n` +
            `• ROI: ${Math.floor(((14*cropValue) - 10) / 10 * 100)}%\n\n` +
            `🎯 Sambil menunggu panen, coba aktivitas lain!`
        )
    }

    // --- HARVEST ---
    if (cmd === "harvest") {
        if (!rpg.farm.planted) {
            return m.reply(
                `🌱 *TIDAK ADA TANAMAN!*\n\n` +
                `Lahan kosong. Tanam dulu:\n` +
                `• ${prefix}farm wheat - Tanam gandum\n` +
                `• ${prefix}farm corn - Tanam jagung\n\n` +
                `💡 *PROFIT COMPARISON:*\n` +
                `Wheat: 300-420 Gold per tanam\n` +
                `Corn: 400-560 Gold per tanam`
            )
        }
        
        const now = Date.now()
        const elapsed = now - rpg.farm.plantedAt
        const required = 2 * 60 * 1000
        
        if (elapsed < required) {
            const remaining = required - elapsed
            const minutes = Math.floor(remaining / 60000)
            const seconds = Math.floor((remaining % 60000) / 1000)
            
            return m.reply(
                `⏳ *TANAMAN BELUM SIAP PANEN!*\n\n` +
                `Tanaman ${rpg.farm.planted} masih tumbuh...\n\n` +
                `⏰ *WAKTU TUNGGU:* ${minutes} menit ${seconds} detik\n` +
                `📅 *SIAP PADA:* ${new Date(rpg.farm.plantedAt + required).toLocaleTimeString('id-ID')}\n\n` +
                `💡 Sambil menunggu:\n` +
                `• .forage - Cari bahan\n` +
                `• .hunt - Berburu kecil\n` +
                `• .shop - Belanja`
            )
        }
        
        
        
        const crop = rpg.farm.planted
        const yieldAmount = rng(10, 14)
        addItem(user, crop, yieldAmount)
        
        const cropName = crop === "wheat" ? "🌾 Wheat" : "🌽 Corn"
        const cropValue = crop === "wheat" ? 30 : 40
        const totalValue = yieldAmount * cropValue
        const profit = totalValue - 10
        
        const txt = `🌾 *HARVEST TIME!* 🌾\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `${cropName} siap dipanen!\n\n` +
                   `📦 *HASIL PANEN:* ${cropName} x${yieldAmount}\n` +
                   `💰 *NILAI JUAL:* ${totalValue} Gold\n` +
                   `📈 *PROFIT:* ${profit} Gold (ROI: ${Math.floor((profit/10)*100)}%)\n\n` +
                   `🎯 *NEXT STEP:* Jual dengan .sell ${crop} ${yieldAmount}\n` +
                   `💡 Atau tanam lagi: ${prefix}farm ${crop}`
        
        rpg.farm.planted = null
        rpg.farm.plantedAt = 0
        
        await db.save()
        return m.reply(txt)
    }

    // --- ACHIEVEMENTS ---
    if (cmd === "achievements" || cmd === "achievement" || cmd === "pencapaian") {
        const achievements = [
            { id: "first_kill", name: "First Blood", desc: "Bunuh monster pertama", reward: "500 Gold + 200 XP" },
            { id: "level_10", name: "Rising Star", desc: "Capai level 10", reward: "2000 Gold + 1000 XP" },
            { id: "level_50", name: "Master", desc: "Capai level 50", reward: "10000 Gold + 5000 XP" },
            { id: "rich", name: "Millionaire", desc: "Kumpulkan 1,000,000 Gold", reward: "50000 Gold + 20000 XP" },
            { id: "collector", name: "Item Collector", desc: "Kumpulkan 50 item berbeda", reward: "3000 Gold + 1500 XP" },
            { id: "married", name: "Settled Down", desc: "Menikah dengan pasangan", reward: "5000 Cash + 100 Happiness" },
            { id: "parent", name: "Happy Family", desc: "Memiliki 3 anak", reward: "10000 Cash + 200 Happiness" },
            { id: "business_owner", name: "Entrepreneur", desc: "Memiliki 5 bisnis", reward: "50000 Cash + Business Boost" }
        ]
        
        let txt = `🏅 *ACHIEVEMENTS & PENCAPAIAN* 🏅\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        
        achievements.forEach(achievement => {
            const hasAchieved = rpg.achievements?.includes(achievement.id) || false
            const status = hasAchieved ? "✅" : "🔘"
            txt += `${status} *${achievement.name}*\n`
            txt += `   📝 ${achievement.desc}\n`
            txt += `   🎁 Reward: ${achievement.reward}\n\n`
        })
        
        txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        txt += `📊 *Total Unlocked:* ${rpg.achievements?.length || 0}/${achievements.length}\n`
        txt += `💡 Achievement akan otomatis terbuka saat syarat terpenuhi!`
        
        return m.reply(txt)
    }
    
    // --- DAILY REWARD ---
    if (cmd === "daily" || cmd === "claim" || cmd === "hadiah") {
        const now = Date.now()
        const lastDaily = rpg.lastDaily || 0
        const dayInMs = 24 * 60 * 60 * 1000
        
        if (now - lastDaily < dayInMs) {
            const remaining = dayInMs - (now - lastDaily)
            const hours = Math.floor(remaining / (60 * 60 * 1000))
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
            
            return m.reply(
                `⏳ *DAILY REWARD COOLDOWN*\n\n` +
                `Kamu sudah claim hari ini.\n` +
                `Tunggu: ${hours} jam ${minutes} menit\n\n` +
                `💡 Daily reset setiap hari di waktu yang sama`
            )
        }
        
        
        
        const energyReward = rng(80, 300)
        const goldReward = rng(500, 2000)
        const cashReward = rng(1000, 5000)
        const itemsReward = []
        
        user.energy = Math.min(user.energy + energyReward, user.maxEnergy)
        rpg.gold += goldReward
        
        // Add cash to life simulation
        if (roleplay.economy) {
            roleplay.economy.cash = (roleplay.economy.cash || 0) + cashReward
            roleplay.economy.totalEarned = (roleplay.economy.totalEarned || 0) + cashReward
        }
        
        // Random item reward
        const possibleItems = [
            { id: "potion", chance: 50 },
            { id: "berry", chance: 70 },
            { id: "gacha_ticket", chance: 20 },
            { id: "stone", chance: 40 }
        ]
        
        possibleItems.forEach(item => {
            if (chance(item.chance)) {
                const qty = item.id === "gacha_ticket" ? 1 : rng(1, 3)
                addItem(user, item.id, qty)
                itemsReward.push(`${ITEMS[item.id].name} x${qty}`)
            }
        })
        
        rpg.lastDaily = now
        
        await db.save()
        
        let itemsText = ""
        if (itemsReward.length > 0) {
            itemsText = `\n🎁 *ITEMS:*\n${itemsReward.join("\n")}\n`
        }
        
        return m.reply(
            `🎉 *DAILY REWARD CLAIMED!* 🎉\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💰 *GOLD:* +${formatNumber(goldReward)}\n` +
            `💵 *CASH:* +${formatNumber(cashReward)}\n` +
            `⚡ *ENERGY:* +${energyReward}\n` +
            itemsText + `\n` +
            `📊 *STATUS SEKARANG:*\n` +
            `⚡ Energy: ${user.energy}/${user.maxEnergy}\n` +
            `💰 Gold: ${formatNumber(rpg.gold)}\n` +
            `💵 Cash: ${formatNumber(roleplay.economy?.cash || 0)}\n\n` +
            `⏰ *NEXT DAILY:* 24 jam lagi\n` +
            `💡 Jangan lupa claim setiap hari!`
        )
    }
    
    // --- CEK ENERGY ---
    if (cmd === "cekenergy" || cmd === "energy") {
        const energyPercent = Math.floor((user.energy / user.maxEnergy) * 100)
        const energyBar = drawBar(user.energy, user.maxEnergy, 15)
        
        return m.reply(
            `⚡ *ENERGY STATUS* ⚡\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${energyBar} ${energyPercent}%\n\n` +
            `📊 *DETAIL:* ${user.energy}/${user.maxEnergy}\n\n` +
            `💡 *CARA ISI ENERGY:*\n` +
            `• .daily - Claim harian (80-300)\n` +
            `• .use berry - +10 Energy\n` +
            `• .use energy_drink - +50 Energy\n` +
            `• .use cooked_fish - +30 Energy\n\n` +
            `⏰ *REGENERASI:* 1 Energy per 2 menit\n` +
            `🎯 Gunakan energy untuk berbagai aktivitas!`
        )
    }
    
    // --- SET ROLE / CLASS ---
    if (cmd === "setrole" || cmd === "class") {
        const roleName = args[0]?.toLowerCase()
        
        if (!roleName) {
            let rolesList = ""
            for (const [key, data] of Object.entries(CLASSES)) {
                rolesList += `• ${data.emoji} *${key}* - ${data.desc}\n` +
                            `  ⚔️ ATK: ${data.str}x | 🛡️ DEF: ${data.def}x\n` +
                            `  ❤️ HP: ${data.hp}x | 💥 CRIT: ${data.crit}x\n` +
                            `  ⚡ Skill: ${data.skill}\n\n`
            }
            
            return m.reply(
                `🎭 *CHOOSE YOUR CLASS* 🎭\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 *CLASSES AVAILABLE:*\n\n` +
                rolesList +
                `📝 *CARA GANTI CLASS:*\n` +
                `${prefix}setrole <nama_class>\n\n` +
                `📋 *CONTOH:*\n` +
                `${prefix}setrole warrior\n` +
                `${prefix}setrole assassin\n\n` +
                `💡 Pilih class sesuai gaya bermain!`
            )
        }
        
        if (!CLASSES[roleName]) {
            const available = Object.keys(CLASSES).join(", ")
            return m.reply(
                `❌ *CLASS TIDAK DITEMUKAN!*\n\n` +
                `Class "${roleName}" tidak ada.\n\n` +
                `📋 *CLASS YANG TERSEDIA:*\n` +
                `${available}\n\n` +
                `💡 Gunakan ${prefix}setrole untuk melihat semua class`
            )
        }
        
        // Cek biaya ganti class
        const changeCost = 5000
        if (rpg.role !== "Novice" && rpg.gold < changeCost) {
            return m.reply(
                `❌ *GOLD TIDAK CUKUP!*\n\n` +
                `Biaya ganti class: ${formatNumber(changeCost)} Gold\n` +
                `Gold kamu: ${formatNumber(rpg.gold)}\n\n` +
                `💡 *CARA DAPAT GOLD:*\n` +
                `• Adventure: ${prefix}adventure\n` +
                `• Jual item: ${prefix}sell\n` +
                `• Daily reward: ${prefix}daily`
            )
        }
        
        
        
        const oldRole = rpg.role
        if (rpg.role !== "Novice") {
            rpg.gold -= changeCost
        }
        
        rpg.role = CLASSES[roleName].name
        const newClass = CLASSES[roleName]
        
        await db.save()
        
        return m.reply(
            `✅ *CLASS CHANGED SUCCESSFULLY!*\n\n` +
            `🎭 *DARI:* ${oldRole}\n` +
            `🎭 *MENJADI:* ${newClass.emoji} ${newClass.name}\n` +
            (oldRole !== "Novice" ? `💰 *BIAYA:* ${formatNumber(changeCost)} Gold\n` : ``) +
            `💰 *SISA GOLD:* ${formatNumber(rpg.gold)}\n\n` +
            `📊 *CLASS BONUS:*\n` +
            `⚔️ ATK Multiplier: ${newClass.str}x\n` +
            `🛡️ DEF Multiplier: ${newClass.def}x\n` +
            `❤️ HP Multiplier: ${newClass.hp}x\n` +
            `💥 CRIT Chance: ${((newClass.crit - 1) * 100).toFixed(1)}%\n` +
            `⚡ Skill: ${newClass.skill}\n\n` +
            `🎯 *DESKRIPSI:* ${newClass.desc}\n\n` +
            `💡 Class mempengaruhi battle performance!`
        )
    }
    
    // --- ADD ENERGY (OWNER ONLY) ---
    if (cmd === "addenergy") {
        if (!isOwner) return m.reply("❌ Fitur ini khusus Owner.")

        let target = m.sender
        if (m.mentionedJid && m.mentionedJid[0]) target = m.mentionedJid[0]
        else if (m.quoted) target = m.quoted.sender

        const amount = parseInt(args.find(x => !isNaN(x)) || 0)

        if (!amount) {
            return m.reply(
                `⚡ *ADD ENERGY COMMAND*\n\n` +
                `📝 *CARA PAKAI:*\n` +
                `${prefix}addenergy <jumlah> @user\n` +
                `${prefix}addenergy <jumlah> (reply user)\n\n` +
                `📝 *CONTOH:*\n` +
                `${prefix}addenergy 1000\n` +
                `${prefix}addenergy 500 @username\n\n` +
                `⚠️ *Hanya Owner yang bisa menggunakan command ini*`
            )
        }

        const tUser = db.getUser(target)
        if (!tUser) return m.reply("❌ User tidak ditemukan di database.")

        const oldEnergy = tUser.energy
        const oldMax = tUser.maxEnergy
        
        tUser.energy += amount
        if (tUser.energy > tUser.maxEnergy) {
            tUser.maxEnergy = tUser.energy
        }

        await db.save()
        return m.reply(
            `✅ *ENERGY ADDED SUCCESSFULLY!*\n\n` +
            `⚡ *Untuk:* @${target.split("@")[0]}\n` +
            `📊 *Sebelum:* ${oldEnergy}/${oldMax}\n` +
            `📈 *Sesudah:* ${tUser.energy}/${tUser.maxEnergy}\n` +
            `➕ *Ditambahkan:* ${amount} Energy\n\n` +
            `🎮 Happy gaming!`
        , { mentions: [target] })
    }
    
    // --- LEADERBOARD ---
    if (cmd === "leaderboard" || cmd === "top" || cmd === "rank") {
        const allUsers = Object.values(db.data().whatsapp.users || {})
        
        // Filter users with RPG data
        const rpgUsers = allUsers.filter(u => u.rpg && u.rpg.level).map(u => ({
            name: u.name || u.id.split('@')[0],
            level: u.rpg.level || 1,
            gold: u.rpg.gold || 0,
            str: u.rpg.str || 0,
            def: u.rpg.def || 0
        }))
        
        // Sort by level (descending)
        rpgUsers.sort((a, b) => b.level - a.level)
        
        let leaderboardText = `🏆 *TOP 10 PLAYERS* 🏆\n`
        leaderboardText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        
        const top10 = rpgUsers.slice(0, 10)
        
        top10.forEach((user, index) => {
            const rankEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            leaderboardText += `${rankEmoji} *${user.name}*\n`
            leaderboardText += `   📊 Level: ${user.level}\n`
            leaderboardText += `   💰 Gold: ${formatNumber(user.gold)}\n`
            leaderboardText += `   ⚔️ STR: ${user.str} | 🛡️ DEF: ${user.def}\n\n`
        })
        
        leaderboardText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        leaderboardText += `Total Players: ${rpgUsers.length}\n`
        leaderboardText += `💡 Tingkatkan levelmu untuk masuk leaderboard!`
        
        return m.reply(leaderboardText)
    }
    
    // --- RPG MENU ---
    if (cmd === "rpg" || cmd === "menurpg" || cmd === "guide") {
        return m.reply(
            `🎮 *RPG COMMAND MENU* 🎮\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 *PROFILE & STATUS:*\n` +
            `${prefix}profile - Profil user (RPG + Life)\n` +
            `${prefix}leaderboard - Top 10 players\n` +
            `${prefix}setrole <class> - Ganti class karakter\n\n` +
            
            `⚔️ *BATTLE & ADVENTURE:*\n` +
            `${prefix}adventure - Bertarung dengan monster\n` +
            `${prefix}dungeon - Mode dungeon (hard)\n` +
            `${prefix}hunt - Berburu hewan kecil\n` +
            `${prefix}gacha - Gacha item langka\n` +
            `${prefix}rest - Istirahat (HP full)\n\n` +
            
            `🛠️ *GATHERING & CRAFTING:*\n` +
            `${prefix}mine - Menambang mineral (butuh Pickaxe)\n` +
            `${prefix}fish - Memancing ikan (butuh Fishing Rod)\n` +
            `${prefix}forage - Mencari bahan di hutan\n` +
            `${prefix}chop - Menebang pohon\n` +
            `${prefix}farm - Bertani tanaman\n` +
            `${prefix}harvest - Panen tanaman\n` +
            `${prefix}cook - Masak makanan\n\n` +
            
            `💰 *ECONOMY & SHOP:*\n` +
            `${prefix}shop - Toko item RPG\n` +
            `${prefix}buy <item> - Beli item\n` +
            `${prefix}sell <item> - Jual item\n` +
            `${prefix}use <item> - Gunakan item\n` +
            `${prefix}inv - Cek inventory\n` +
            `${prefix}upgrade <stat> - Naikkan stat\n` +
            `${prefix}bank - Sistem bank RPG\n\n` +
            
            `📜 *QUESTS & ACHIEVEMENTS:*\n` +
            `${prefix}quest - Lihat & ambil quest\n` +
            `${prefix}achievements - Pencapaian\n\n` +
            
            `🔄 *DAILY & ENERGY:*\n` +
            `${prefix}daily - Claim reward harian\n` +
            `${prefix}cekenergy - Cek energy\n\n` +
            
            `💡 *LIFE SIMULATION:*\n` +
            `${prefix}life - Profil kehidupan virtual\n` +
            `${prefix}kerja - Cari pekerjaan\n` +
            `${prefix}belirumah - Beli rumah\n` +
            `${prefix}pacaran - Cari pasangan\n` +
            `${prefix}menikah - Nikahi pacar\n` +
            `${prefix}anak - Punya anak\n` +
            `${prefix}bisnis - Mulai bisnis\n\n` +
            
            `🎯 *TIP:* Gunakan ${prefix}menu untuk menu utama bot\n` +
            `🎮 Selamat bermain RPG!`
        )
    }
  }
 } 
  catch (error) {
    console.error('RPG Main Error:', error)
    
    try {
      if (ev && ev.m && ev.m.reply) {
        return ev.m.reply(`❌ Terjadi error: ${error.message}\n\nCoba ulangi command atau hubungi owner.`)
      }
    } catch (e) {
      console.error('Cannot send error message:', e)
    }
  }
}



//plugins/rpg/rpg-fight.js

import { BG_URL, CLASSES, MONSTERS, rng, drawBar, sleep, checkLevelUp, addItem, hasItem, delItem, ITEMS, formatNumber } from "../../lib/rpglib.js"

export default {
  name: "rpg fight",
  command: ["adventure", "adv", "fight", "dungeon", "hunt", "rest", "heal", "tidur", "gacha", "boss"],
  tags: ["rpg"],
  run: async (ev, rt) => {
    const { m, cmd, prefix } = ev
    const { db } = rt
    const user = db.getUser(m.sender)
    const rpg = user.rpg

    // Initialize rpg if not exist
    if (!rpg) {
      return m.reply(`❌ Kamu belum memiliki karakter RPG!\nGunakan ${prefix}start untuk membuat karakter.`)
    }

    // --- GACHA SYSTEM ---
    if (cmd === "gacha") {
      if (user.energy < 2) {
        return m.reply(
          `⚡ *ENERGI HABIS!*\n\n` +
          `Butuh 2 Energy untuk gacha.\n` +
          `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
          `💡 *CARA DAPAT ENERGI:*\n` +
          `• ${prefix}daily - Claim 100-300 Energy\n` +
          `• ${prefix}use berry - Gunakan berry (+10 Energy)\n` +
          `• ${prefix}shop - Beli energy_drink di shop`
        )
      }
      
      let usingTicket = false
      if (hasItem(user, "gacha_ticket", 1)) {
        delItem(user, "gacha_ticket", 1)
        usingTicket = true
      } else {
        user.energy -= 2
      }
      
      const rewards = [
        { item: "potion", chance: 50, min: 1, max: 3, tier: "common" },
        { item: "berry", chance: 45, min: 2, max: 5, tier: "common" },
        { item: "stone", chance: 40, min: 2, max: 4, tier: "common" },
        { item: "wood", chance: 35, min: 1, max: 3, tier: "common" },
        { item: "energy_drink", chance: 30, min: 1, max: 2, tier: "uncommon" },
        { item: "iron_ore", chance: 25, min: 1, max: 3, tier: "uncommon" },
        { item: "fish", chance: 20, min: 1, max: 2, tier: "uncommon" },
        { item: "apple", chance: 18, min: 1, max: 2, tier: "uncommon" },
        { item: "gold_ore", chance: 15, min: 1, max: 2, tier: "rare" },
        { item: "ruby", chance: 10, min: 1, max: 1, tier: "rare" },
        { item: "sapphire", chance: 10, min: 1, max: 1, tier: "rare" },
        { item: "emerald", chance: 8, min: 1, max: 1, tier: "rare" },
        { item: "diamond", chance: 5, min: 1, max: 1, tier: "epic" },
        { item: "iron_sword", chance: 4, min: 1, max: 1, tier: "epic" },
        { item: "iron_armor", chance: 4, min: 1, max: 1, tier: "epic" },
        { item: "bow", chance: 3, min: 1, max: 1, tier: "epic" },
        { item: "wand", chance: 3, min: 1, max: 1, tier: "epic" },
        { item: "mythic_sword", chance: 1, min: 1, max: 1, tier: "legendary" },
        { item: "dragon_armor", chance: 1, min: 1, max: 1, tier: "legendary" },
        { item: "gacha_ticket", chance: 2, min: 1, max: 1, tier: "legendary" }
      ]
      
      let result = []
      let highestTier = "common"
      const tierColors = {
        "common": "⚪",
        "uncommon": "🟢", 
        "rare": "🔵",
        "epic": "🟣",
        "legendary": "🟡"
      }
      
      const spins = usingTicket ? 1 : 1
      for (let spin = 0; spin < spins; spin++) {
        rewards.forEach(reward => {
          if (Math.random() * 100 < reward.chance) {
            const qty = rng(reward.min, reward.max)
            addItem(user, reward.item, qty)
            
            const tierOrder = ["common", "uncommon", "rare", "epic", "legendary"]
            if (tierOrder.indexOf(reward.tier) > tierOrder.indexOf(highestTier)) {
              highestTier = reward.tier
            }
            
            result.push(`${tierColors[reward.tier]} ${ITEMS[reward.item].name} x${qty}`)
          }
        })
      }
      
      if (result.length === 0) {
        const gold = rng(200, 500)
        rpg.gold += gold
        result.push(`💰 Gold x${gold}`)
      }
      
      await db.save()
      
      const gachaCost = usingTicket ? "1x 🎫 Gacha Ticket" : "2 ⚡ Energy"
      const tierName = highestTier.toUpperCase()
      const tierEmoji = tierColors[highestTier]
      
      return m.reply(
        `🎰 *GACHA TIME!* ${tierEmoji}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎫 *COST:* ${gachaCost}\n` +
        `🏆 *HIGHEST RARITY:* ${tierName}\n\n` +
        `🎁 *REWARDS OBTAINED:*\n${result.join("\n")}\n\n` +
        `💡 *GACHA TIPS:*\n` +
        `• Gunakan gacha ticket untuk hemat energy\n` +
        `• Dapatkan ticket dari ${prefix}daily atau ${prefix}quest\n` +
        `• Chance legendary: 1% per spin\n\n` +
        `⚡ *ENERGY SISA:* ${user.energy}/${user.maxEnergy}`
      )
    }

    // --- BATTLE SYSTEM ---
    if (["adventure", "adv", "fight"].includes(cmd)) {
      const isDungeon = false
      const energyCost = 3
      
      if (rpg.hp < 10) {
        return m.reply(
          `⚠️ *HP KRITIS!*\n\n` +
          `HP kamu: ${rpg.hp}/${rpg.maxHp} (${Math.floor((rpg.hp/rpg.maxHp)*100)}%)\n\n` +
          `💡 *CARA PULIHKAN HP:*\n` +
          `• ${prefix}rest - Istirahat (cooldown 3m)\n` +
          `• ${prefix}use potion - Gunakan potion\n` +
          `• ${prefix}buy potion - Beli potion (50 Gold)\n\n` +
          `🎯 *SEGERA PULIHKAN HP SEBELUM BERTARUNG!*`
        )
      }
      
      if (user.energy < energyCost) {
        return m.reply(
          `⚡ *ENERGI HABIS!*\n\n` +
          `Butuh ${energyCost} Energy untuk adventure.\n` +
          `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
          `💡 *CARA DAPAT ENERGI:*\n` +
          `• ${prefix}daily - Claim 100-300 Energy\n` +
          `• ${prefix}use berry - +10 Energy\n` +
          `• ${prefix}use energy_drink - +50 Energy\n` +
          `• ${prefix}forage - Cari bahan (+energy chance)\n\n` +
          `⏰ Tunggu regenerasi natural: 1 Energy/2 menit`
        )
      }

      // Select monster based on player level (balanced)
      let possibleMonsters = []
      const playerLevel = rpg.level
      
      // Always include monsters at player level or below
      possibleMonsters = MONSTERS.filter(m => m.lvl <= playerLevel + 2 && m.lvl >= Math.max(1, playerLevel - 3))
      
      // If no monsters found, use the first available monster
      if (possibleMonsters.length === 0) {
        possibleMonsters = MONSTERS.filter(m => m.lvl <= playerLevel + 5)
      }
      
      // Weighted selection - higher chance for lower level monsters
      const weightedMonsters = []
      possibleMonsters.forEach(monster => {
        const weight = Math.max(1, 10 - Math.abs(playerLevel - monster.lvl))
        for (let i = 0; i < weight; i++) {
          weightedMonsters.push(monster)
        }
      })
      
      const enemyBase = weightedMonsters[Math.floor(Math.random() * weightedMonsters.length)] || MONSTERS[0]

      const roleData = CLASSES[rpg.role.toLowerCase()] || CLASSES["warrior"]
      const pStr = Math.floor(rpg.str * roleData.str)
      const pDef = Math.floor(rpg.def * roleData.def)
      
      // Adjust monster stats based on player level difference
      const levelDiff = playerLevel - enemyBase.lvl
      const statMultiplier = 1 + (levelDiff * 0.05) // 5% per level difference
      
      const mob = { 
        ...enemyBase, 
        maxHp: Math.floor(enemyBase.hp * Math.max(0.8, Math.min(1.2, statMultiplier))),
        currentHp: Math.floor(enemyBase.hp * Math.max(0.8, Math.min(1.2, statMultiplier))),
        atk: Math.floor(enemyBase.atk * Math.max(0.8, Math.min(1.2, statMultiplier))),
        exp: Math.floor(enemyBase.exp * (1 + (Math.max(0, levelDiff) * 0.1))), // More exp for higher level monsters
        gold: Math.floor(enemyBase.gold * (1 + (Math.max(0, levelDiff) * 0.1))) // More gold for higher level monsters
      }
      
      const battleMsg = await m.reply(
        `⚔️ *BATTLE START* ⚔️\n\n` +
        `🎭 ${rpg.role} Lvl.${rpg.level} vs ${mob.name} Lvl.${mob.lvl}\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} | 👹 HP: ${mob.currentHp}/${mob.maxHp}\n` +
        `💪 STR: ${pStr} | 🛡️ DEF: ${pDef}\n` +
        `⚡ Energy Cost: ${energyCost}\n\n` +
        `🎯 Battle begins...`
      )
      
      await sleep(100)

      let log = []
      let round = 1
      const maxRounds = 12
      const pMin = Math.floor(pStr * 0.8), pMax = Math.floor(pStr * 1.2)
      
      const critChance = (roleData.crit || 1.0) * 0.2 // Base 20% crit chance
      const dodgeChance = roleData.name === "Assassin" ? 0.30 : 
                        roleData.name === "Tanker" ? 0.20 : 
                        roleData.name === "Warrior" ? 0.15 : 0.10

      const skillChance = 0.35 // 35% chance to use skill

      while (rpg.hp > 0 && mob.currentHp > 0 && round <= maxRounds) {
        log.push(`\n*ROUND ${round}*`)
        
        // Player Attack
        let playerDmg = rng(pMin, pMax)
        let attackType = "🗡️ Normal Hit"
        let isCrit = false
        let isSkill = false
        
        // Critical hit
        if (Math.random() < critChance) {
          playerDmg = Math.floor(playerDmg * 1.8) // 80% bonus damage
          attackType = "💥 CRITICAL HIT!"
          isCrit = true
        }
        
        // Skill usage
        if (Math.random() < skillChance) {
          playerDmg = Math.floor(playerDmg * 1.5) // 50% bonus damage
          attackType = `⚡ ${roleData.skill}!`
          isSkill = true
        }
        
        // Defense reduction
        const finalDmg = Math.max(1, Math.floor(playerDmg * (1 - (mob.lvl * 0.01))))
        mob.currentHp -= finalDmg
        if (mob.currentHp < 0) mob.currentHp = 0
        
        log.push(`> ${attackType} (-${finalDmg} HP)`)
        log.push(`   👹 ${mob.name}: ${mob.currentHp}/${mob.maxHp} HP`)
        
        if (mob.currentHp <= 0) break
        
        await sleep(100)
        
        // Mob Attack
        if (Math.random() < dodgeChance) {
          log.push(`> 💨 ${rpg.role} DODGED the attack!`)
        } else {
          let mobDmg = Math.max(1, Math.floor((mob.atk * rng(0.7, 1.3)) - (pDef * 0.6)))
          
          // Reduce damage if player has armor equipment
          if (hasItem(user, "iron_armor") || hasItem(user, "steel_armor") || hasItem(user, "dragon_armor")) {
            mobDmg = Math.floor(mobDmg * 0.8) // 20% damage reduction
          }
          
          rpg.hp -= mobDmg
          if (rpg.hp < 0) rpg.hp = 0
          
          log.push(`> 👹 ${mob.name} attacks! (-${mobDmg} HP)`)
          log.push(`   ❤️ ${rpg.role}: ${rpg.hp}/${rpg.maxHp} HP`)
        }
        
        round++
        if (round <= maxRounds) await sleep(100)
      }

      // Battle Results
      let resultTxt = ""
      let rewardsTxt = ""
      let xpGained = 0
      let goldGained = 0
      let victory = mob.currentHp <= 0
      
      if (victory) {
        user.energy -= energyCost
        xpGained = mob.exp
        goldGained = mob.gold
        
        // Bonus for quick victory
        if (round <= 5) {
          xpGained = Math.floor(xpGained * 2.5)
          goldGained = Math.floor(goldGained * 2.5)
          rewardsTxt += `\n⚡ *QUICK VICTORY BONUS:* +40% XP & Gold`
        }
        
        rpg.exp += xpGained
        rpg.gold += goldGained
        
        // Quest progress
        if (rpg.activeQuest && rpg.activeQuest.type === "kill" && rpg.activeQuest.target === mob.name) {
          rpg.activeQuest.progress = Math.min(rpg.activeQuest.progress + 1, rpg.activeQuest.amount)
        }
        
        let levelUpMsg = ""
        if (checkLevelUp(rpg)) {
          levelUpMsg = `\n🎉 *LEVEL UP!* Lvl.${rpg.level-1} → Lvl.${rpg.level}`
          rewardsTxt += `\n✨ *LEVEL UP BONUS:* +10% semua stat`
        }
        
        // Drops
        let drops = []
        const baseDropChance = 0.4 + (rpg.level * 0.01) // Higher level = better drop chance
        
        if (mob.drops) {
          mob.drops.forEach(drop => {
            const dropRate = drop.chance * (1 + (rpg.level * 0.01))
            if (Math.random() * 100 < dropRate) {
              const qty = rng(drop.min || 1, drop.max || 1)
              addItem(user, drop.item, qty)
              drops.push(`${ITEMS[drop.item].name} x${qty}`)
            }
          })
        }
        
        // Additional random drops
        const randomDrops = [
          { item: "potion", chance: 30 },
          { item: "berry", chance: 25 },
          { item: "stone", chance: 20 },
          { item: "wood", chance: 15 },
          { item: "iron_ore", chance: 10 },
          { item: "energy_drink", chance: 8 },
          { item: "gold_ore", chance: 5 },
          { item: "gacha_ticket", chance: 2 }
        ]
        
        randomDrops.forEach(drop => {
          if (Math.random() * 100 < drop.chance) {
            const qty = rng(1, drop.item === "gacha_ticket" ? 1 : 2)
            addItem(user, drop.item, qty)
            if (!drops.some(d => d.includes(ITEMS[drop.item].name))) {
              drops.push(`${ITEMS[drop.item].name} x${qty}`)
            }
          }
        })
        
        resultTxt = `🏆 *VICTORY!*`
        rewardsTxt = `\n💰 *REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGained)}\n` +
                    `• XP: +${formatNumber(xpGained)}${levelUpMsg}`
        
        if (drops.length > 0) {
          rewardsTxt += `\n📦 *LOOT:*\n${drops.join("\n")}`
        }
        
        if (rpg.activeQuest && rpg.activeQuest.progress < rpg.activeQuest.amount) {
          const quest = rpg.activeQuest
          const progressPercent = Math.floor((quest.progress / quest.amount) * 100)
          const progressBar = drawBar(quest.progress, quest.amount, 10)
          rewardsTxt += `\n\n📜 *QUEST PROGRESS:*\n` +
                       `${quest.name}\n` +
                       `${progressBar} ${progressPercent}%\n` +
                       `${quest.progress}/${quest.amount} ${quest.target}`
        }
        
      } else if (rpg.hp <= 0) {
        user.energy -= Math.floor(energyCost * 0.5) // Only lose half energy on defeat
        rpg.hp = 0
        const goldLost = Math.floor(rpg.gold * 0.03) // Only 3% gold loss
        rpg.gold -= goldLost
        if (rpg.gold < 0) rpg.gold = 0
        
        resultTxt = `☠️ *DEFEAT!*`
        rewardsTxt = `\n💔 *PENALTIES:*\n` +
                    `• HP: 0/${rpg.maxHp}\n` +
                    `• Gold Lost: ${formatNumber(goldLost)}\n` +
                    `• Energy Lost: ${Math.floor(energyCost * 0.5)}`
        
      } else {
        user.energy -= Math.floor(energyCost * 0.7)
        const xpGain = Math.floor(mob.exp * 0.5)
        const goldGain = Math.floor(mob.gold * 0.5)
        
        rpg.exp += xpGain
        rpg.gold += goldGain
        
        resultTxt = `⏰ *TIME OUT!*`
        rewardsTxt = `\n📊 *PARTIAL REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGain)}\n` +
                    `• XP: +${formatNumber(xpGain)}\n` +
                    `• Energy Used: ${Math.floor(energyCost * 0.7)}`
      }

      await db.save()
      
      const battleLog = log.slice(-8).join("\n")
      const winRate = victory ? "✅ WIN" : "❌ LOSE"
      
      return m.reply(
        `${resultTxt} - ${winRate}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎭 *${rpg.role} Lvl.${rpg.level}* vs *${mob.name} Lvl.${mob.lvl}*\n` +
        `⏱️ Rounds: ${round-1}/${maxRounds}\n\n` +
        `${battleLog}\n\n` +
        `📊 *FINAL STATUS:*\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} ${drawBar(rpg.hp, rpg.maxHp, 10)}\n` +
        `⚡ Energy: ${user.energy}/${user.maxEnergy}\n` +
        `💰 Gold: ${formatNumber(rpg.gold)}\n` +
        `📈 XP: ${rpg.exp}/${rpg.maxExp} ${drawBar(rpg.exp, rpg.maxExp, 10)}\n` +
        rewardsTxt + `\n\n` +
        `💡 *NEXT STEP:*\n` +
        (rpg.hp < 50 ? `• Heal: ${prefix}rest atau ${prefix}use potion\n` : ``) +
        (user.energy < 10 ? `• Energy: ${prefix}daily atau ${prefix}use berry\n` : ``) +
        `• Continue: ${prefix}adventure\n` +
        `• Check stats: ${prefix}profile\n` +
        `• Upgrade equipment: ${prefix}shop`
      )
    }

    // --- DUNGEON SYSTEM ---
    if (cmd === "dungeon") {
      const energyCost = 8
      
      if (rpg.hp < 100) {
        return m.reply(
          `⚠️ *HP TIDAK CUKUP UNTUK DUNGEON!*\n\n` +
          `Dungeon membutuhkan HP minimal 100.\n` +
          `HP kamu: ${rpg.hp}/${rpg.maxHp}\n\n` +
          `💡 *CARA PULIHKAN HP:*\n` +
          `• ${prefix}rest - Istirahat (cooldown 3m)\n` +
          `• ${prefix}use potion - Gunakan potion\n` +
          `• ${prefix}use elixir - Super heal (500 HP)`
        )
      }
      
      if (user.energy < energyCost) {
        return m.reply(
          `⚡ *ENERGI HABIS!*\n\n` +
          `Butuh ${energyCost} Energy untuk dungeon.\n` +
          `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
          `💡 *CARA DAPAT ENERGI:*\n` +
          `• ${prefix}daily - Claim 100-300 Energy\n` +
          `• ${prefix}use energy_drink - +50 Energy\n` +
          `• ${prefix}use berry - +10 Energy\n\n` +
          `⏰ Tunggu regenerasi natural`
        )
      }

      // Determine dungeon stage based on player level
      let stageIdx = Math.min(Math.floor(rpg.level / 10), MONSTERS.length - 1)
      const enemyBase = MONSTERS[stageIdx] || MONSTERS[MONSTERS.length - 1]
      
      if (rpg.level < enemyBase.lvl - 5) {
        return m.reply(
          `❌ *LEVEL TERLALU RENDAH!*\n\n` +
          `Dungeon ini membutuhkan level minimal ${enemyBase.lvl - 5}.\n` +
          `Level kamu: ${rpg.level}\n\n` +
          `💡 *TINGKATKAN LEVEL:*\n` +
          `• ${prefix}adventure - Battle normal\n` +
          `• ${prefix}quest - Selesaikan quest\n` +
          `• ${prefix}daily - Claim XP harian`
        )
      }
      
      const dungeonMsg = await m.reply(
        `🏰 *ENTERING DUNGEON* 🏰\n\n` +
        `🔦 Memasuki dungeon gelap...\n` +
        `👣 Berjalan di koridor berlumut...\n` +
        `💎 Mendengar suara monster...\n` +
        `⚔️ Siap untuk bertarung!`
      )
      await sleep(1000)

      const roleData = CLASSES[rpg.role.toLowerCase()] || CLASSES["warrior"]
      const pStr = Math.floor(rpg.str * roleData.str)
      const pDef = Math.floor(rpg.def * roleData.def)
      
      // Dungeon monsters are stronger
      const mob = { 
        ...enemyBase, 
        name: `🔥 ${enemyBase.name} (Dungeon)`,
        maxHp: Math.floor(enemyBase.hp * 2.0),
        currentHp: Math.floor(enemyBase.hp * 2.0),
        atk: Math.floor(enemyBase.atk * 1.5), 
        gold: Math.floor(enemyBase.gold * 3), 
        exp: Math.floor(enemyBase.exp * 2.0)
      }
      
      await dungeonMsg.edit(
        `🏰 *DUNGEON BATTLE* 🏰\n\n` +
        `🎭 ${rpg.role} Lvl.${rpg.level} vs ${mob.name} Lvl.${mob.lvl}\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} | 👹 HP: ${mob.currentHp}/${mob.maxHp}\n` +
        `💪 STR: ${pStr} | 🛡️ DEF: ${pDef}\n` +
        `⚡ Energy Cost: ${energyCost}\n` +
        `🏆 Recommended Level: ${enemyBase.lvl}+`
      )
      
      await sleep(500)

      let log = []
      let round = 1
      const maxRounds = 15
      const pMin = Math.floor(pStr * 0.8), pMax = Math.floor(pStr * 1.2)
      
      const critChance = (roleData.crit || 1.0) * 0.25 // 25% crit chance in dungeon
      const dodgeChance = roleData.name === "Assassin" ? 0.35 : 
                         roleData.name === "Tanker" ? 0.25 : 0.15

      const skillChance = 0.4 // 40% chance to use skill in dungeon

      while (rpg.hp > 0 && mob.currentHp > 0 && round <= maxRounds) {
        log.push(`\n*ROUND ${round}*`)
        
        // Player Attack
        let playerDmg = rng(pMin, pMax)
        let attackType = "🗡️ Normal Hit"
        
        // Critical hit
        if (Math.random() < critChance) {
          playerDmg = Math.floor(playerDmg * 2.0) // 100% bonus damage in dungeon
          attackType = "💥 DUNGEON CRITICAL!"
        }
        
        // Skill usage
        if (Math.random() < skillChance) {
          playerDmg = Math.floor(playerDmg * 1.8) // 80% bonus damage in dungeon
          attackType = `⚡ ${roleData.skill} (Dungeon Boost)!`
        }
        
        // Defense reduction
        const finalDmg = Math.max(1, Math.floor(playerDmg * (1 - (mob.lvl * 0.008)))) // Less defense reduction in dungeon
        mob.currentHp -= finalDmg
        if (mob.currentHp < 0) mob.currentHp = 0
        
        log.push(`> ${attackType} (-${finalDmg} HP)`)
        log.push(`   👹 ${mob.name}: ${mob.currentHp}/${mob.maxHp} HP`)
        
        if (mob.currentHp <= 0) break
        
        await sleep(300)
        
        // Mob Attack (dungeon monsters hit harder)
        if (Math.random() < dodgeChance) {
          log.push(`> 💨 ${rpg.role} DODGED the dungeon attack!`)
        } else {
          let mobDmg = Math.max(1, Math.floor((mob.atk * rng(0.8, 1.5)) - (pDef * 0.4)))
          
          // Additional damage reduction for tank classes
          if (roleData.name === "Tanker" || roleData.name === "Warrior") {
            mobDmg = Math.floor(mobDmg * 0.7) // 30% damage reduction
          }
          
          rpg.hp -= mobDmg
          if (rpg.hp < 0) rpg.hp = 0
          
          log.push(`> 👹 ${mob.name} unleashes dungeon attack! (-${mobDmg} HP)`)
          log.push(`   ❤️ ${rpg.role}: ${rpg.hp}/${rpg.maxHp} HP`)
        }
        
        round++
        if (round <= maxRounds) await sleep(300)
      }

      // Dungeon Results
      let resultTxt = ""
      let rewardsTxt = ""
      let xpGained = 0
      let goldGained = 0
      let victory = mob.currentHp <= 0
      
      if (victory) {
        user.energy -= energyCost
        xpGained = mob.exp
        goldGained = mob.gold
        
        // Big bonus for dungeon victory
        xpGained = Math.floor(xpGained * 1.5) // 50% bonus XP
        goldGained = Math.floor(goldGained * 1.5) // 50% bonus gold
        
        rpg.exp += xpGained
        rpg.gold += goldGained
        
        // Check for level up
        let levelUpMsg = ""
        if (checkLevelUp(rpg)) {
          levelUpMsg = `\n🎉 *LEVEL UP!* Lvl.${rpg.level-1} → Lvl.${rpg.level}`
          rewardsTxt += `\n✨ *DUNGEON LEVEL UP BONUS:* +15% semua stat`
        }
        
        // Dungeon drops
        let drops = []
        
        // Enhanced monster drops
        if (mob.drops) {
          mob.drops.forEach(drop => {
            const dropRate = drop.chance * 2.0 // Double drop chance in dungeon
            if (Math.random() * 100 < dropRate) {
              const qty = rng((drop.min || 1) * 2, (drop.max || 1) * 2) // Double quantity
              addItem(user, drop.item, qty)
              drops.push(`${ITEMS[drop.item].name} x${qty}`)
            }
          })
        }
        
        // Special dungeon drops
        const dungeonDrops = [
          { item: "potion", chance: 70, min: 2, max: 4 },
          { item: "energy_drink", chance: 40, min: 1, max: 3 },
          { item: "gacha_ticket", chance: 25, min: 1, max: 2 },
          { item: "diamond", chance: 15, min: 1, max: 1 },
          { item: "ruby", chance: 15, min: 1, max: 1 },
          { item: "sapphire", chance: 15, min: 1, max: 1 },
          { item: "emerald", chance: 15, min: 1, max: 1 },
          { item: "iron_sword", chance: 10, min: 1, max: 1 },
          { item: "iron_armor", chance: 10, min: 1, max: 1 }
        ]
        
        dungeonDrops.forEach(drop => {
          if (Math.random() * 100 < drop.chance) {
            const qty = rng(drop.min, drop.max)
            addItem(user, drop.item, qty)
            if (!drops.some(d => d.includes(ITEMS[drop.item].name))) {
              drops.push(`🏆 DUNGEON ${ITEMS[drop.item].name} x${qty}`)
            }
          }
        })
        
        // Chance for legendary in dungeon
        if (Math.random() < 0.05) { // 5% chance
          const legendaryDrops = ["mythic_sword", "dragon_armor"]
          const legendaryItem = legendaryDrops[Math.floor(Math.random() * legendaryDrops.length)]
          addItem(user, legendaryItem, 1)
          drops.push(`✨ LEGENDARY ${ITEMS[legendaryItem].name} x1`)
        }
        
        // Update dungeon progress
        if (!rpg.dungeonProgress) rpg.dungeonProgress = {}
        if (!rpg.dungeonProgress[stageIdx]) {
          rpg.dungeonProgress[stageIdx] = 0
        }
        rpg.dungeonProgress[stageIdx]++
        
        resultTxt = `🏆 *DUNGEON VICTORY!*`
        rewardsTxt = `\n💰 *DUNGEON REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGained)}\n` +
                    `• XP: +${formatNumber(xpGained)}${levelUpMsg}\n` +
                    `• Dungeon Stage: ${stageIdx + 1} (Clears: ${rpg.dungeonProgress[stageIdx]})`
        
        if (drops.length > 0) {
          rewardsTxt += `\n📦 *DUNGEON TREASURE:*\n${drops.join("\n")}`
        }
        
      } else if (rpg.hp <= 0) {
        user.energy -= Math.floor(energyCost * 0.6)
        rpg.hp = 0
        const goldLost = Math.floor(rpg.gold * 0.05) // 5% gold loss in dungeon
        rpg.gold -= goldLost
        if (rpg.gold < 0) rpg.gold = 0
        
        resultTxt = `☠️ *DUNGEON DEFEAT!*`
        rewardsTxt = `\n💔 *DUNGEON PENALTIES:*\n` +
                    `• HP: 0/${rpg.maxHp}\n` +
                    `• Gold Lost: ${formatNumber(goldLost)}\n` +
                    `• Energy Used: ${Math.floor(energyCost * 0.6)}`
        
      } else {
        user.energy -= Math.floor(energyCost * 0.8)
        const xpGain = Math.floor(mob.exp * 0.6)
        const goldGain = Math.floor(mob.gold * 0.6)
        
        rpg.exp += xpGain
        rpg.gold += goldGain
        
        resultTxt = `⏰ *DUNGEON TIME OUT!*`
        rewardsTxt = `\n📊 *PARTIAL REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGain)}\n` +
                    `• XP: +${formatNumber(xpGain)}\n` +
                    `• Energy Used: ${Math.floor(energyCost * 0.8)}`
      }

      await db.save()
      
      const battleLog = log.slice(-10).join("\n")
      const winRate = victory ? "✅ DUNGEON WIN" : "❌ DUNGEON LOSE"
      
      return m.reply(
        `${resultTxt} - ${winRate}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🏰 *DUNGEON STAGE ${stageIdx + 1}*\n` +
        `🎭 *${rpg.role} Lvl.${rpg.level}* vs *${mob.name} Lvl.${mob.lvl}*\n` +
        `⏱️ Rounds: ${round-1}/${maxRounds}\n\n` +
        `${battleLog}\n\n` +
        `📊 *FINAL STATUS:*\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} ${drawBar(rpg.hp, rpg.maxHp, 10)}\n` +
        `⚡ Energy: ${user.energy}/${user.maxEnergy}\n` +
        `💰 Gold: ${formatNumber(rpg.gold)}\n` +
        `📈 XP: ${rpg.exp}/${rpg.maxExp} ${drawBar(rpg.exp, rpg.maxExp, 10)}\n` +
        `🏆 Highest Dungeon: ${stageIdx + 1}\n` +
        rewardsTxt + `\n\n` +
        `💡 *NEXT STEP:*\n` +
        (rpg.hp < 100 ? `• Heal: ${prefix}rest atau ${prefix}use elixir\n` : ``) +
        (user.energy < 10 ? `• Energy: ${prefix}daily atau ${prefix}buy energy_drink\n` : ``) +
        `• Continue Dungeon: ${prefix}dungeon\n` +
        `• Normal Battle: ${prefix}adventure\n` +
        `• Upgrade gear: ${prefix}shop`
      )
    }

    // --- BOSS BATTLE ---
    if (cmd === "boss") {
      const energyCost = 15
      
      if (rpg.hp < 150) {
        return m.reply(
          `⚠️ *HP TIDAK CUKUP UNTUK BOSS!*\n\n` +
          `Boss membutuhkan HP minimal 150.\n` +
          `HP kamu: ${rpg.hp}/${rpg.maxHp}\n\n` +
          `💡 *CARA PULIHKAN HP:*\n` +
          `• ${prefix}use elixir - Super heal (500 HP)\n` +
          `• ${prefix}use potion - Multiple potions\n` +
          `• ${prefix}rest - Istirahat (cooldown 3m)`
        )
      }
      
      if (user.energy < energyCost) {
        return m.reply(
          `⚡ *ENERGI HABIS!*\n\n` +
          `Butuh ${energyCost} Energy untuk boss battle.\n` +
          `Energy kamu: ${user.energy}/${user.maxEnergy}\n\n` +
          `💡 *CARA DAPAT ENERGI:*\n` +
          `• ${prefix}daily - Claim 100-300 Energy\n` +
          `• ${prefix}buy energy_drink - Beli di shop\n` +
          `• Tunggu regenerasi`
        )
      }

      if (rpg.level < 20) {
        return m.reply(
          `❌ *LEVEL TERLALU RENDAH!*\n\n` +
          `Boss battle membutuhkan level minimal 20.\n` +
          `Level kamu: ${rpg.level}\n\n` +
          `💡 *TINGKATKAN LEVEL:*\n` +
          `• ${prefix}dungeon - High XP battles\n` +
          `• ${prefix}quest - Selesaikan quest\n` +
          `• ${prefix}adventure - Battle terus`
        )
      }

      // Select boss based on player level
      const bossLevel = Math.min(rpg.level + 5, 100)
      const bossTier = Math.floor(bossLevel / 20)
      const bossNames = ["🔥 Dragon", "👹 Demon Lord", "🐉 Ancient Wyvern", "💀 Death Knight", "👁️ Beholder"]
      const bossName = bossNames[Math.min(bossTier, bossNames.length - 1)] || bossNames[0]
      
      const boss = {
        name: `${bossName}`,
        lvl: bossLevel,
        hp: 3000 + (bossLevel * 100),
        maxHp: 3000 + (bossLevel * 100),
        atk: 150 + (bossLevel * 10),
        exp: 2000 + (bossLevel * 100),
        gold: 5000 + (bossLevel * 50),
        drops: [
          { item: "diamond", chance: 30 },
          { item: "ruby", chance: 25 },
          { item: "sapphire", chance: 25 },
          { item: "emerald", chance: 25 },
          { item: "mythic_sword", chance: 10 },
          { item: "dragon_armor", chance: 10 },
          { item: "gacha_ticket", chance: 50 }
        ]
      }

      const roleData = CLASSES[rpg.role.toLowerCase()] || CLASSES["warrior"]
      const pStr = Math.floor(rpg.str * roleData.str * 1.2) // 20% bonus for boss
      const pDef = Math.floor(rpg.def * roleData.def * 1.2)
      
      const bossMsg = await m.reply(
        `👑 *BOSS BATTLE START* 👑\n\n` +
        `🎭 ${rpg.role} Lvl.${rpg.level} vs ${boss.name} Lvl.${boss.lvl}\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} | 👑 HP: ${boss.currentHp}/${boss.maxHp}\n` +
        `💪 STR: ${pStr} | 🛡️ DEF: ${pDef}\n` +
        `⚡ Energy Cost: ${energyCost}\n\n` +
        `🎯 Epic battle begins...`
      )
      
      await sleep(500)

      let log = []
      let round = 1
      const maxRounds = 20
      const pMin = Math.floor(pStr * 0.9), pMax = Math.floor(pStr * 1.1)
      
      const critChance = (roleData.crit || 1.0) * 0.3 // 30% crit chance vs boss
      const dodgeChance = roleData.name === "Assassin" ? 0.25 : 
                         roleData.name === "Tanker" ? 0.20 : 0.15

      while (rpg.hp > 0 && boss.currentHp > 0 && round <= maxRounds) {
        log.push(`\n*ROUND ${round}*`)
        
        // Player Attack
        let playerDmg = rng(pMin, pMax)
        let attackType = "🗡️ Normal Hit"
        
        // Critical hit
        if (Math.random() < critChance) {
          playerDmg = Math.floor(playerDmg * 2.5) // 150% bonus vs boss
          attackType = "💥 BOSS CRITICAL!"
        }
        
        // Special attack every 3 rounds
        if (round % 3 === 0) {
          playerDmg = Math.floor(playerDmg * 1.8) // 80% bonus
          attackType = `⚡ ${roleData.skill} (CHARGED)!`
        }
        
        boss.currentHp -= playerDmg
        if (boss.currentHp < 0) boss.currentHp = 0
        
        log.push(`> ${attackType} (-${playerDmg} HP)`)
        log.push(`   👑 ${boss.name}: ${boss.currentHp}/${boss.maxHp} HP`)
        
        if (boss.currentHp <= 0) break
        
        await sleep(400)
        
        // Boss Attack (special attacks)
        let bossDmg = Math.max(1, Math.floor((boss.atk * rng(0.8, 1.5)) - (pDef * 0.3)))
        
        // Boss special attacks
        if (round % 4 === 0) {
          bossDmg = Math.floor(bossDmg * 1.5)
          log.push(`> 👑 ${boss.name} uses SPECIAL ATTACK! (-${bossDmg} HP)`)
        } else if (Math.random() < 0.3) {
          bossDmg = Math.floor(bossDmg * 1.3)
          log.push(`> 👑 ${boss.name} uses POWER ATTACK! (-${bossDmg} HP)`)
        } else {
          log.push(`> 👑 ${boss.name} attacks! (-${bossDmg} HP)`)
        }
        
        if (Math.random() < dodgeChance) {
          log[log.length - 1] = `> 💨 ${rpg.role} DODGED ${log[log.length - 1].substring(2)}`
        } else {
          rpg.hp -= bossDmg
          if (rpg.hp < 0) rpg.hp = 0
          log.push(`   ❤️ ${rpg.role}: ${rpg.hp}/${rpg.maxHp} HP`)
        }
        
        round++
        if (round <= maxRounds) await sleep(400)
      }

      // Boss Results
      let resultTxt = ""
      let rewardsTxt = ""
      let victory = boss.currentHp <= 0
      
      if (victory) {
        user.energy -= energyCost
        const xpGained = boss.exp
        const goldGained = boss.gold
        
        rpg.exp += xpGained
        rpg.gold += goldGained
        
        // Massive bonus for boss victory
        const bonusXP = Math.floor(xpGained * 0.5)
        const bonusGold = Math.floor(goldGained * 0.5)
        rpg.exp += bonusXP
        rpg.gold += bonusGold
        
        let levelUpMsg = ""
        if (checkLevelUp(rpg)) {
          levelUpMsg = `\n🎉 *BOSS LEVEL UP!* Lvl.${rpg.level-1} → Lvl.${rpg.level}`
          rewardsTxt += `\n✨ *BOSS VICTORY BONUS:* +20% semua stat`
        }
        
        // Boss drops
        let drops = []
        boss.drops.forEach(drop => {
          if (Math.random() * 100 < drop.chance) {
            const qty = drop.item.includes("mythic") || drop.item.includes("dragon") ? 1 : rng(1, 3)
            addItem(user, drop.item, qty)
            drops.push(`👑 ${ITEMS[drop.item].name} x${qty}`)
          }
        })
        
        // Guaranteed rare drop
        const guaranteedDrops = ["diamond", "ruby", "sapphire", "emerald"]
        const guaranteedItem = guaranteedDrops[Math.floor(Math.random() * guaranteedDrops.length)]
        addItem(user, guaranteedItem, rng(2, 5))
        drops.push(`👑 GUARANTEED: ${ITEMS[guaranteedItem].name} x${rng(2, 5)}`)
        
        // Boss achievement
        if (!rpg.bossKills) rpg.bossKills = 0
        rpg.bossKills++
        
        resultTxt = `🏆 *BOSS VICTORY!*`
        rewardsTxt = `\n💰 *BOSS REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGained)} (+${formatNumber(bonusGold)} bonus)\n` +
                    `• XP: +${formatNumber(xpGained)} (+${formatNumber(bonusXP)} bonus)${levelUpMsg}\n` +
                    `• Bosses Defeated: ${rpg.bossKills}`
        
        if (drops.length > 0) {
          rewardsTxt += `\n📦 *BOSS LOOT:*\n${drops.join("\n")}`
        }
        
      } else if (rpg.hp <= 0) {
        user.energy -= Math.floor(energyCost * 0.7)
        rpg.hp = 0
        const goldLost = Math.floor(rpg.gold * 0.08) // 8% gold loss vs boss
        rpg.gold -= goldLost
        if (rpg.gold < 0) rpg.gold = 0
        
        resultTxt = `☠️ *BOSS DEFEAT!*`
        rewardsTxt = `\n💔 *BOSS PENALTIES:*\n` +
                    `• HP: 0/${rpg.maxHp}\n` +
                    `• Gold Lost: ${formatNumber(goldLost)}\n` +
                    `• Energy Used: ${Math.floor(energyCost * 0.7)}`
        
      } else {
        user.energy -= Math.floor(energyCost * 0.9)
        const xpGain = Math.floor(boss.exp * 0.3)
        const goldGain = Math.floor(boss.gold * 0.3)
        
        rpg.exp += xpGain
        rpg.gold += goldGain
        
        resultTxt = `⏰ *BOSS TIME OUT!*`
        rewardsTxt = `\n📊 *PARTIAL REWARDS:*\n` +
                    `• Gold: +${formatNumber(goldGain)}\n` +
                    `• XP: +${formatNumber(xpGain)}\n` +
                    `• Energy Used: ${Math.floor(energyCost * 0.9)}`
      }

      await db.save()
      
      const battleLog = log.slice(-12).join("\n")
      const winRate = victory ? "✅ BOSS WIN" : "❌ BOSS LOSE"
      
      return m.reply(
        `${resultTxt} - ${winRate}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👑 *EPIC BOSS BATTLE*\n` +
        `🎭 *${rpg.role} Lvl.${rpg.level}* vs *${boss.name} Lvl.${boss.lvl}*\n` +
        `⏱️ Rounds: ${round-1}/${maxRounds}\n\n` +
        `${battleLog}\n\n` +
        `📊 *FINAL STATUS:*\n` +
        `❤️ HP: ${rpg.hp}/${rpg.maxHp} ${drawBar(rpg.hp, rpg.maxHp, 10)}\n` +
        `⚡ Energy: ${user.energy}/${user.maxEnergy}\n` +
        `💰 Gold: ${formatNumber(rpg.gold)}\n` +
        `📈 XP: ${rpg.exp}/${rpg.maxExp} ${drawBar(rpg.exp, rpg.maxExp, 10)}\n` +
        `🏆 Boss Kills: ${rpg.bossKills || 0}\n` +
        rewardsTxt + `\n\n` +
        `💡 *NEXT STEP:*\n` +
        (rpg.hp < 100 ? `• Heal: ${prefix}use elixir atau ${prefix}rest\n` : ``) +
        `• Continue: ${prefix}adventure\n` +
        `• Try Boss again: ${prefix}boss (cooldown 1h)\n` +
        `• Upgrade gear: ${prefix}shop`
      )
    }

    // --- HUNT ---
    if (cmd === "hunt") {
      if (Date.now() - (rpg.lastHunt || 0) < 5000) {
        const wait = Math.ceil((5000 - (Date.now() - rpg.lastHunt)) / 1000)
        return m.reply(
          `⏳ *COOLDOWN ACTIVE*\n\n` +
          `Tunggu ${wait} detik sebelum berburu lagi.\n\n` +
          `💡 *SAMBIL MENUNGGU:*\n` +
          `• ${prefix}forage - Cari bahan (3 Energy)\n` +
          `• ${prefix}inv - Cek inventory\n` +
          `• ${prefix}sell - Jual item`
        )
      }
      
      rpg.lastHunt = Date.now()
      const expGain = rng(30, 60)
      const goldGain = rng(20, 40)
      
      rpg.exp += expGain
      rpg.gold += goldGain
      
      let drops = []
      
      // Better drops for higher levels
      const dropBonus = Math.min(2.0, 1 + (rpg.level * 0.05))
      
      if (Math.random() < 0.4 * dropBonus) {
        const berryQty = rng(1, 3)
        addItem(user, "berry", berryQty)
        drops.push(`🍒 Berry x${berryQty}`)
      }
      
      if (Math.random() < 0.3 * dropBonus) {
        const stoneQty = rng(1, 3)
        addItem(user, "stone", stoneQty)
        drops.push(`🪨 Stone x${stoneQty}`)
      }
      
      if (Math.random() < 0.25 * dropBonus) {
        const woodQty = rng(1, 3)
        addItem(user, "wood", woodQty)
        drops.push(`🪵 Wood x${woodQty}`)
      }
      
      if (Math.random() < 0.15 * dropBonus) {
        const fishQty = rng(1, 2)
        addItem(user, "fish", fishQty)
        drops.push(`🐟 Fish x${fishQty}`)
      }
      
      if (Math.random() < 0.08 * dropBonus) {
        addItem(user, "potion", 1)
        drops.push(`🎁 RARE FIND: ❤️ Potion x1`)
      }
      
      if (rpg.level > 10 && Math.random() < 0.03 * dropBonus) {
        addItem(user, "iron_ore", 1)
        drops.push(`✨ EPIC FIND: ⛓️ Iron Ore x1`)
      }
      
      await db.save()
      
      let dropsText = ""
      if (drops.length > 0) {
        dropsText = `\n📦 *LOOT:*\n${drops.join("\n")}`
      }
      
      return m.reply(
        `🏹 *SMALL GAME HUNTING* 🏹\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Kamu berburu hewan kecil...\n\n` +
        `💰 *REWARDS:*\n` +
        `• Gold: +${goldGain}\n` +
        `• XP: +${expGain}\n` +
        dropsText + `\n\n` +
        `⏰ *COOLDOWN:* 5 detik\n` +
        `🎯 *NEXT:* ${prefix}hunt (setelah cooldown)\n` +
        `💡 Hunting memberikan XP dan item secara konsisten!`
      )
    }

    // --- REST ---
    if (cmd === "rest" || cmd === "heal" || cmd === "tidur") {
      const cooldown = 3 * 60 * 1000
      const lastRest = user.lastRest || 0
      const now = Date.now()
      
      if (now - lastRest < cooldown) {
        const remaining = cooldown - (now - lastRest)
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        
        return m.reply(
          `⏳ *COOLDOWN ACTIVE*\n\n` +
          `Kamu baru saja istirahat.\n\n` +
          `⏰ *TUNGGU LAGI:* ${minutes} menit ${seconds} detik\n` +
          `🕒 *SIAP PADA:* ${new Date(lastRest + cooldown).toLocaleTimeString('id-ID')}\n\n` +
          `💡 *ALTERNATIF HEALING:*\n` +
          `• ${prefix}use potion - Instant heal (200 HP)\n` +
          `• ${prefix}buy potion - Beli potion (50 Gold)\n` +
          `• ${prefix}use elixir - Super heal (500 HP)`
        )
      }
      
      const oldHp = rpg.hp
      rpg.hp = rpg.maxHp
      user.lastRest = now
      
      // Small energy recovery
      user.energy = Math.min(user.maxEnergy, user.energy + 10)
      
      await db.save()
      
      return m.reply(
        `🍹 *RESTING TIME* 🍹\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Kamu beristirahat sejenak...\n\n` +
        `❤️ *HEALING COMPLETE!*\n` +
        `• Sebelum: ${oldHp}/${rpg.maxHp} HP\n` +
        `• Sesudah: ${rpg.hp}/${rpg.maxHp} HP\n` +
        `• Dipulihkan: +${rpg.hp - oldHp} HP\n` +
        `⚡ Energy Recovered: +10\n\n` +
        `⏰ *NEXT REST:* 3 menit lagi\n` +
        `💡 *TIP:* Gunakan potion untuk heal cepat saat battle\n\n` +
        `🎯 Siap untuk bertarung lagi!`
      )
    }
  }
}

//plugins/rpg/rpg-life.js

import { rng, chance, formatNumber, getRandomName, formatRoleplayData, sleep } from "../../lib/rpglib.js"

function getJobInfo(jobId) {
  const jobs = {
    'pengangguran': { name: '👨‍💼 Pengangguran', salary: 0, requirements: { education: 0, cost: 0 }, desc: 'Mencari pekerjaan' },
    'buruh': { name: '👷 Buruh Harian', salary: 10000, requirements: { education: 0, cost: 0 }, desc: 'Buruh kasar' },
    'penjaga': { name: '👮 Penjaga Toko', salary: 15000, requirements: { education: 5, cost: 1000 }, desc: 'Jaga toko' },
    'kasir': { name: '💰 Kasir', salary: 20000, requirements: { education: 10, cost: 2000 }, desc: 'Supermarket' },
    'supir': { name: '🚗 Supir', salary: 25000, requirements: { education: 15, cost: 5000 }, desc: 'Supir online' },
    'pelayan': { name: '👨‍🍳 Pelayan', salary: 30000, requirements: { education: 20, cost: 8000 }, desc: 'Restoran' },
    'staf': { name: '👨‍💼 Staf Kantor', salary: 40000, requirements: { education: 30, cost: 15000 }, desc: 'Perusahaan' },
    'guru': { name: '👨‍🏫 Guru', salary: 50000, requirements: { education: 40, cost: 20000 }, desc: 'Sekolah' },
    'programmer': { name: '💻 Programmer', salary: 75000, requirements: { education: 50, cost: 30000 }, desc: 'Startup tech' },
    'dokter': { name: '👨‍⚕️ Dokter', salary: 100000, requirements: { education: 70, cost: 50000 }, desc: 'Rumah sakit' },
    'pengacara': { name: '⚖️ Pengacara', salary: 150000, requirements: { education: 75, cost: 80000 }, desc: 'Firma hukum' },
    'manager': { name: '👔 Manager', salary: 200000, requirements: { education: 80, cost: 100000 }, desc: 'Perusahaan besar' },
    'direktur': { name: '🎩 Direktur', salary: 300000, requirements: { education: 85, cost: 150000 }, desc: 'Divisi perusahaan' },
    'ceo': { name: '👑 CEO', salary: 500000, requirements: { education: 90, cost: 200000 }, desc: 'Perusahaan multinasional' }
  }
  
  return jobs[jobId] || { name: '👨‍💼 Pengangguran', salary: 0, requirements: { education: 0, cost: 0 }, desc: 'Mencari pekerjaan' }
}

export default {
  name: "rpg_life",
  command: [
    "life", "kehidupan", "kerja", "work", "gaji", "salary",
    "rumah", "house", "belirumah", "belicar", "car",
    "tamantanaman", "garden", "panentanaman", "harvestplant",
    "pacaran", "date", "menikah", "marry", "cerai", "divorce",
    "anak", "child", "keluarga", "family", "bisnis", "business",
    "sekolah", "school", "kuliah", "college", "liburan", "holiday",
    "travel", "jalanjalan", "kesehatan", "health", "rumahsakit",
    "investasi", "invest", "saham", "stock", "belihobi", "hobby",
    "perabot", "furniture", "hutang", "loan", "bayarhutang", "paydebt",
    "bank", "tabung", "save", "ambil", "withdraw", "transfer",
    "shopping", "belanja", "olahraga", "sport", "tamasuka", "hobi"
  ],
  tags: ["rpg"],
  run: async (ev, rt) => {
    try {
      const { m, cmd, args, prefix } = ev
      const { db } = rt
      const user = db.getUser(m.sender)
      
      if (!user.roleplay) {
        user.roleplay = {
          profile: {
            bio: "",
            title: "Pemula",
            badge: "🥚 Newbie",
            status: "Single",
            happiness: 80,
            health: 100,
            education: 0,
            energy: 100,
            age: 18,
            gender: rng(0, 1) === 0 ? "Pria" : "Wanita"
          },
          economy: {
            cash: 10000,
            bank: 0,
            job: null,
            salary: 0,
            totalEarned: 0,
            businesses: [],
            investments: [],
            debt: 0,
            lastSalary: 0,
            dailyLimit: 0
          },
          social: {
            friends: [],
            spouse: null,
            children: [],
            visits: 0,
            popularity: 0,
            datingPartner: null,
            datingSince: 0,
            datingCooldown: 0,
            familyName: getRandomName()
          },
          property: {
            house: "kos",
            car: null,
            furniture: [],
            garden: [],
            plants: []
          },
          lifestyle: {
            hobbies: [],
            lastVacation: 0,
            educationLevel: 0,
            lastExercise: 0,
            lastShop: 0,
            achievements: []
          },
          stats: {
            workDays: 0,
            businessProfit: 0,
            investmentProfit: 0,
            childrenRaised: 0,
            vacationsTaken: 0,
            plantsHarvested: 0
          }
        }
      }
      
      const rp = user.roleplay
      const now = Date.now()
      
      if (cmd === "life" || cmd === "kehidupan") {
        const data = formatRoleplayData(user)
        const spouse = data.social.spouse || null
        const children = data.social.children || []
        const childrenCount = children.length
        const marriageStatus = spouse ? `💍 Menikah dengan ${spouse}` : '💔 Single'
        
        const happinessBar = drawBar(data.profile.happiness, 100, 15)
        const healthBar = drawBar(data.profile.health, 100, 15)
        const energyBar = drawBar(data.profile.energy || 100, 100, 15)
        const educationBar = drawBar(data.profile.education, 100, 15)
        
        let financialStatus = "Miskin"
        if (rp.economy.cash + rp.economy.bank > 50000) financialStatus = "Menengah"
        if (rp.economy.cash + rp.economy.bank > 200000) financialStatus = "Kaya"
        if (rp.economy.cash + rp.economy.bank > 1000000) financialStatus = "Sangat Kaya"
        if (rp.economy.cash + rp.economy.bank > 5000000) financialStatus = "Kaya Raya"
        
        return m.reply(
`🎮 *PROFIL KEHIDUPAN SIMULASI* 🎮
╔══════════════════════════╗
║      👤 IDENTITAS        ║
╚══════════════════════════╝
📝 Nama: ${user.name || m.pushName}
🎂 Umur: ${rp.profile.age} tahun
⚤ Gender: ${rp.profile.gender}
🎖️ Gelar: ${rp.profile.title}
🏅 Badge: ${rp.profile.badge}
💼 Pekerjaan: ${rp.economy.job ? getJobInfo(rp.economy.job).name : 'Pengangguran'}
💰 Status Finansial: ${financialStatus}

╔══════════════════════════╗
║      📊 STATUS HIDUP     ║
╚══════════════════════════╝
😊 Kebahagiaan: ${data.profile.happiness}/100
${happinessBar}
❤️ Kesehatan: ${data.profile.health}/100
${healthBar}
⚡ Energi: ${data.profile.energy || 100}/100
${energyBar}
🎓 Pendidikan: ${data.profile.education}%
${educationBar}

╔══════════════════════════╗
║      💰 EKONOMI          ║
╚══════════════════════════╝
💵 Uang Tunai: ${formatNumber(rp.economy.cash)}
🏦 Tabungan: ${formatNumber(rp.economy.bank)}
💰 Gaji/Jam: ${formatNumber(rp.economy.salary)}
📈 Total Penghasilan: ${formatNumber(rp.economy.totalEarned)}
🏢 Bisnis: ${rp.economy.businesses.length} unit
📈 Investasi: ${rp.economy.investments.length}
💳 Hutang: ${formatNumber(rp.economy.debt)}

╔══════════════════════════╗
║      🏠 PROPERTI         ║
╚══════════════════════════╝
${getHouseEmoji(rp.property.house)} Rumah: ${getHouseName(rp.property.house)}
${rp.property.car ? getCarEmoji(rp.property.car) : '🚫'} Mobil: ${rp.property.car ? getCarName(rp.property.car) : 'Tidak ada'}
🛋️ Perabotan: ${rp.property.furniture.length} item
🌻 Taman: ${rp.property.garden.length} tanaman
🌱 Tanaman Aktif: ${rp.property.plants.length}

╔══════════════════════════╗
║      👨‍👩‍👧‍👦 SOSIAL        ║
╚══════════════════════════╝
${marriageStatus}
${childrenCount > 0 ? `👶 Anak: ${childrenCount} orang` : '👶 Belum punya anak'}
🤝 Teman: ${data.social.friends.length} orang
🌟 Popularitas: ${data.social.popularity}
🎯 Kunjungan: ${data.social.visits}x

╔══════════════════════════╗
║      🎨 HIDUP & HOBI     ║
╚══════════════════════════╝
${rp.lifestyle.hobbies.length > 0 ? `🎭 Hobi: ${rp.lifestyle.hobbies.slice(0, 3).join(', ')}${rp.lifestyle.hobbies.length > 3 ? '...' : ''}` : '🎭 Belum ada hobi'}
${rp.lifestyle.lastVacation ? `🏝️ Liburan: ${getTimeAgo(rp.lifestyle.lastVacation)}` : '🏝️ Belum pernah liburan'}

━━━━━━━━━━━━━━━━━━━━━━━
📱 *MENU UTAMA:*
${prefix}menu - Tampilkan semua menu
${prefix}kerja - Cari pekerjaan
${prefix}gaji - Ambil gaji
${prefix}belirumah - Beli rumah
${prefix}belicar - Beli mobil
${prefix}bank - Sistem perbankan
${prefix}pacaran - Cari pasangan
${prefix}sekolah - Sekolah/Kuliah
${prefix}bisnis - Mulai bisnis`
        )
      }
      
      if (cmd === "menu") {
        return m.reply(
`🏠 *MENU KEHIDUPAN SIMULASI* 🏠

👤 *PROFIL & STATUS*
${prefix}life - Profil kehidupan
${prefix}stats - Statistik pencapaian
${prefix}title - Ganti gelar
${prefix}bio - Ganti bio

💼 *PEKERJAAN & KARIR*
${prefix}kerja - Cari pekerjaan
${prefix}gaji - Ambil gaji
${prefix}quitjob - Keluar pekerjaan
${prefix}promosi - Naik jabatan

💰 *EKONOMI & KEUANGAN*
${prefix}bank - Sistem perbankan
${prefix}tabung <jumlah> - Tabung uang
${prefix}ambil <jumlah> - Ambil uang
${prefix}transfer @tag <jumlah> - Transfer
${prefix}hutang <jumlah> - Pinjam uang
${prefix}bayarhutang <jumlah> - Bayar hutang

🏠 *PROPERTI & RUMAH*
${prefix}belirumah - Beli rumah
${prefix}belicar - Beli mobil
${prefix}perabot - Beli perabotan
${prefix}upgrade - Upgrade properti

👨‍👩‍👧‍👦 *KELUARGA & SOSIAL*
${prefix}pacaran - Cari pacar
${prefix}menikah - Menikahi pacar
${prefix}anak - Punya anak
${prefix}cerai - Bercerai
${prefix}adopsi - Adopsi anak

🎓 *PENDIDIKAN*
${prefix}sekolah - Sekolah/Kuliah
${prefix}kursus - Ikut kursus
${prefix}sertifikasi - Ambil sertifikasi

🏢 *BISNIS & INVESTASI*
${prefix}bisnis - Mulai bisnis
${prefix}investasi - Investasi uang
${prefix}saham - Beli saham
${prefix}realestate - Investasi properti

🌱 *HIDUP SEHAT*
${prefix}olahraga - Olahraga
${prefix}makan - Makan sehat
${prefix}kesehatan - Periksa kesehatan
${prefix}rumahsakit - Berobat

🎨 *HOBI & WAKTU LUANG*
${prefix}hobi - Lihat hobi
${prefix}belihobi - Beli hobi baru
${prefix}liburan - Pergi liburan
${prefix}tamasuka - Aktivitas santai

🌻 *TAMAN & TANAMAN*
${prefix}tamantanaman - Tanam tanaman
${prefix}panentanaman - Panen tanaman
${prefix}garden - Kelola taman
${prefix}jualtanaman - Jual tanaman

🛒 *BELANJA*
${prefix}belanja - Pusat belanja
${prefix}market - Pasar tradisional
${prefix}mall - Mall modern
${prefix}onlineshop - Belanja online

📊 *STATISTIK & PENCAPAIAN*
${prefix}ranking - Peringkat global
${prefix}achievement - Pencapaian
${prefix}leaderboard - Papan peringkat
${prefix}daily - Mission harian

━━━━━━━━━━━━━━━━━━━━━━━
💡 *TIP:* Bangun kehidupan yang seimbang antara kerja, keluarga, dan kesehatan!
`
        )
      }
      
      if (cmd === "kerja" || cmd === "work") {
        const jobs = [
          { id: "buruh", name: "👷 Buruh Harian", salary: 10000, requirements: { education: 0, cost: 0 }, desc: "Buruh kasar", energy: 20 },
          { id: "penjaga", name: "👮 Penjaga Toko", salary: 15000, requirements: { education: 5, cost: 1000 }, desc: "Jaga toko", energy: 15 },
          { id: "kasir", name: "💰 Kasir", salary: 20000, requirements: { education: 10, cost: 2000 }, desc: "Supermarket", energy: 15 },
          { id: "supir", name: "🚗 Supir", salary: 25000, requirements: { education: 15, cost: 5000 }, desc: "Supir online", energy: 20 },
          { id: "pelayan", name: "👨‍🍳 Pelayan", salary: 30000, requirements: { education: 20, cost: 8000 }, desc: "Restoran", energy: 15 },
          { id: "staf", name: "👨‍💼 Staf Kantor", salary: 40000, requirements: { education: 30, cost: 15000 }, desc: "Perusahaan", energy: 10 },
          { id: "guru", name: "👨‍🏫 Guru", salary: 50000, requirements: { education: 40, cost: 20000 }, desc: "Sekolah", energy: 12 },
          { id: "programmer", name: "💻 Programmer", salary: 75000, requirements: { education: 50, cost: 30000 }, desc: "Startup tech", energy: 15 },
          { id: "dokter", name: "👨‍⚕️ Dokter", salary: 100000, requirements: { education: 70, cost: 50000 }, desc: "Rumah sakit", energy: 25 },
          { id: "pengacara", name: "⚖️ Pengacara", salary: 150000, requirements: { education: 75, cost: 80000 }, desc: "Firma hukum", energy: 15 },
          { id: "manager", name: "👔 Manager", salary: 200000, requirements: { education: 80, cost: 100000 }, desc: "Perusahaan besar", energy: 10 },
          { id: "direktur", name: "🎩 Direktur", salary: 300000, requirements: { education: 85, cost: 150000 }, desc: "Divisi perusahaan", energy: 8 },
          { id: "ceo", name: "👑 CEO", salary: 500000, requirements: { education: 90, cost: 200000 }, desc: "Perusahaan multinasional", energy: 5 }
        ]
        
        if (!args[0]) {
          let jobsList = ""
          jobs.forEach(job => {
            const canApply = (rp.profile?.education || 0) >= job.requirements.education
            const status = canApply ? "✅" : "❌"
            const cost = job.requirements.cost > 0 ? `💸 Biaya: ${formatNumber(job.requirements.cost)}` : "💸 Gratis"
            jobsList += `${status} ${job.name}\n`
            jobsList += `   💰 Gaji: ${formatNumber(job.salary)}/jam\n`
            jobsList += `   🎓 Syarat: Pendidikan ${job.requirements.education}%\n`
            jobsList += `   ${cost}\n`
            jobsList += `   ⚡ Energi: ${job.energy}\n`
            jobsList += `   📝 ${job.desc}\n`
            jobsList += `   🛒 Apply: ${prefix}kerja ${job.id}\n\n`
          })
          
          return m.reply(
            `💼 *PASAR KERJA* 💼\n\n` +
            `📊 *STATUS KAMU:*\n` +
            `🎓 Pendidikan: ${rp.profile?.education || 0}%\n` +
            `⚡ Energi: ${rp.profile.energy || 100}/100\n` +
            `💵 Uang: ${formatNumber(rp.economy.cash)}\n\n` +
            `📋 *PEKERJAAN TERSEDIA:*\n\n` +
            jobsList +
            `💡 *TINGKATKAN PENDIDIKAN:*\n` +
            `${prefix}sekolah - Sekolah/Kuliah`
          )
        }
        
        const jobId = args[0].toLowerCase()
        const job = jobs.find(j => j.id === jobId)
        
        if (!job) {
          return m.reply(`❌ Pekerjaan tidak ditemukan. Gunakan ${prefix}kerja untuk melihat list.`)
        }
        
        if ((rp.profile?.education || 0) < job.requirements.education) {
          return m.reply(
            `❌ *SYARAT TIDAK TERPENUHI!*\n\n` +
            `📋 *PEKERJAAN:* ${job.name}\n` +
            `🎓 *SYARAT:* Pendidikan ${job.requirements.education}%\n` +
            `📊 *PENDIDIKAN KAMU:* ${rp.profile?.education || 0}%\n` +
            `📉 *KURANG:* ${job.requirements.education - (rp.profile?.education || 0)}%\n\n` +
            `💡 Tingkatkan pendidikan dengan ${prefix}sekolah`
          )
        }
        
        if (rp.economy?.job === jobId) {
          return m.reply(
            `ℹ️ Kamu sudah bekerja sebagai ${job.name}!\n\n` +
            `💰 Gaji: ${formatNumber(job.salary)} per jam\n` +
            `💡 Ambil gaji dengan ${prefix}gaji`
          )
        }
        
        if (job.requirements.cost > 0 && rp.economy.cash < job.requirements.cost) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `📋 *PEKERJAAN:* ${job.name}\n` +
            `💸 *BIAYA ADMIN:* ${formatNumber(job.requirements.cost)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Kerja dulu untuk dapat uang!`
          )
        }
        
        rp.economy.cash -= job.requirements.cost
        rp.economy.job = job.id
        rp.economy.salary = job.salary
        rp.profile.title = getJobTitle(rp.profile.education, job.id)
        
        await db.save()
        
        return m.reply(
          `🎉 *SELAMAT BEKERJA!* 🎉\n\n` +
          `💼 *PEKERJAAN:* ${job.name}\n` +
          `💰 *GAJI:* ${formatNumber(job.salary)} per jam\n` +
          `📝 *DESKRIPSI:* ${job.desc}\n` +
          `⚡ *ENERGI TERPAKAI:* ${job.energy}\n` +
          `💸 *BIAYA ADMIN:* ${formatNumber(job.requirements.cost)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n\n` +
          `💡 *CARA AMBIL GAJI:*\n` +
          `${prefix}gaji - Ambil gaji (10 menit cooldown)\n` +
          `💤 *ISTIRAHAT:* Gunakan ${prefix}makan untuk pulihkan energi`
        )
      }
      
      if (cmd === "gaji" || cmd === "salary") {
        if (!rp.economy?.job) {
          return m.reply(
            `❌ *BELUM BEKERJA!*\n\n` +
            `Kamu belum memiliki pekerjaan.\n` +
            `💡 Cari kerja: ${prefix}kerja`
          )
        }
        
        const lastSalary = rp.economy.lastSalary || 0
        const now = Date.now()
        const cooldown = 10 * 60 * 1000
        
        if (now - lastSalary < cooldown) {
          const remaining = cooldown - (now - lastSalary)
          const minutes = Math.floor(remaining / 60000)
          const seconds = Math.floor((remaining % 60000) / 1000)
          return m.reply(
            `⏳ *COOLDOWN GAJI*\n\n` +
            `Kamu baru saja mengambil gaji.\n` +
            `Tunggu ${minutes} menit ${seconds} detik lagi.\n\n` +
            `💡 Gaji bisa diambil setiap 10 menit`
          )
        }
        
        const job = getJobInfo(rp.economy.job)
        const salary = rp.economy.salary || job.salary
        
        if ((rp.profile.energy || 100) < 10) {
          return m.reply(
            `😴 *ENERGI HABIS!*\n\n` +
            `Energi kamu: ${rp.profile.energy || 100}/100\n` +
            `💡 Istirahat dulu dengan ${prefix}makan atau tunggu energi pulih`
          )
        }
        
        const energyCost = 10
        rp.profile.energy = Math.max(0, (rp.profile.energy || 100) - energyCost)
        
        let bonus = 0
        if (chance(20)) {
          bonus = Math.floor(salary * 0.3)
          rp.economy.cash += bonus
        }
        
        rp.economy.cash += salary
        rp.economy.totalEarned += salary + bonus
        rp.economy.lastSalary = now
        rp.stats.workDays = (rp.stats.workDays || 0) + 1
        
        rp.profile.happiness = Math.min(100, (rp.profile?.happiness || 100) + 2)
        
        await db.save()
        
        return m.reply(
          `💰 *GAJI DITERIMA!* 💰\n\n` +
          `💼 *PEKERJAAN:* ${job.name}\n` +
          `💵 *GAJI:* ${formatNumber(salary)}\n` +
          `${bonus > 0 ? `🎉 *BONUS:* +${formatNumber(bonus)}\n` : ''}` +
          `📈 *TOTAL CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `🏆 *TOTAL PENGHASILAN:* ${formatNumber(rp.economy.totalEarned)}\n` +
          `⚡ *ENERGI:* -${energyCost} (Sisa: ${rp.profile.energy})\n` +
          `😊 *KEBAHAGIAAN:* +2\n\n` +
          `⏰ *NEXT SALARY:* 10 menit lagi\n` +
          `💡 Terus bekerja untuk naik gaji!`
        )
      }
      
      if (cmd === "quitjob") {
        if (!rp.economy?.job) {
          return m.reply(`❌ Kamu tidak memiliki pekerjaan.`)
        }
        
        const jobName = getJobInfo(rp.economy.job).name
        rp.economy.job = null
        rp.economy.salary = 0
        rp.profile.title = "Pengangguran"
        
        await db.save()
        
        return m.reply(
          `📤 *KELUAR DARI PEKERJAAN*\n\n` +
          `👋 Kamu telah keluar dari pekerjaan:\n` +
          `${jobName}\n\n` +
          `💡 Cari pekerjaan baru dengan ${prefix}kerja`
        )
      }
      
      if (cmd === "promosi") {
        if (!rp.economy?.job) {
          return m.reply(`❌ Kamu tidak memiliki pekerjaan.`)
        }
        
        const job = getJobInfo(rp.economy.job)
        const jobs = {
          'buruh': 'penjaga',
          'penjaga': 'kasir',
          'kasir': 'supir',
          'supir': 'pelayan',
          'pelayan': 'staf',
          'staf': 'guru',
          'guru': 'programmer',
          'programmer': 'dokter',
          'dokter': 'pengacara',
          'pengacara': 'manager',
          'manager': 'direktur',
          'direktur': 'ceo'
        }
        
        const nextJobId = jobs[rp.economy.job]
        if (!nextJobId) {
          return m.reply(`🏆 Kamu sudah di posisi tertinggi (CEO)!`)
        }
        
        const nextJob = getJobInfo(nextJobId)
        const promoCost = nextJob.requirements.cost * 2
        
        if (rp.economy.cash < promoCost) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP UNTUK PROMOSI!*\n\n` +
            `📈 *PROMOSI KE:* ${nextJob.name}\n` +
            `💸 *BIAYA:* ${formatNumber(promoCost)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Tabung uang untuk promosi!`
          )
        }
        
        if ((rp.profile?.education || 0) < nextJob.requirements.education) {
          return m.reply(
            `❌ *PENDIDIKAN TIDAK CUKUP!*\n\n` +
            `📈 *PROMOSI KE:* ${nextJob.name}\n` +
            `🎓 *SYARAT:* Pendidikan ${nextJob.requirements.education}%\n` +
            `📊 *PENDIDIKAN KAMU:* ${rp.profile?.education || 0}%\n\n` +
            `💡 Tingkatkan pendidikan dengan ${prefix}sekolah`
          )
        }
        
        rp.economy.cash -= promoCost
        rp.economy.job = nextJobId
        rp.economy.salary = nextJob.salary
        rp.profile.title = getJobTitle(rp.profile.education, nextJobId)
        
        await db.save()
        
        return m.reply(
          `🎉 *SELAMAT PROMOSI!* 🎉\n\n` +
          `📈 *DARI:* ${job.name}\n` +
          `📈 *MENJADI:* ${nextJob.name}\n` +
          `💰 *GAJI BARU:* ${formatNumber(nextJob.salary)}/jam\n` +
          `💸 *BIAYA PROMOSI:* ${formatNumber(promoCost)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n\n` +
          `🏆 *CAPAIAN:* Naik jabatan sukses!`
        )
      }
      
      if (cmd === "belirumah" || cmd === "rumah" || cmd === "house") {
        const houses = [
          { id: "kos", name: "🏚️ Kos", price: 0, desc: "Tempat tinggal awal", happiness: 0, capacity: 1 },
          { id: "kontrakan", name: "🏡 Kontrakan", price: 50000, desc: "Rumah kontrakan kecil", happiness: 10, capacity: 2 },
          { id: "apartemen", name: "🏢 Apartemen Studio", price: 150000, desc: "Apartemen 1 kamar", happiness: 20, capacity: 3 },
          { id: "rumahkecil", name: "🏠 Rumah Kecil", price: 300000, desc: "Rumah 2 kamar", happiness: 30, capacity: 4 },
          { id: "rumahsedang", name: "🏠 Rumah Sedang", price: 600000, desc: "Rumah 3 kamar", happiness: 40, capacity: 5 },
          { id: "rumahbesar", name: "🏠 Rumah Besar", price: 1200000, desc: "Rumah 4 kamar", happiness: 50, capacity: 6 },
          { id: "villa", name: "🏖️ Villa", price: 2500000, desc: "Villa mewah", happiness: 70, capacity: 8 },
          { id: "mansion", name: "🏰 Mansion", price: 5000000, desc: "Mansion besar", happiness: 80, capacity: 10 },
          { id: "istana", name: "🏯 Istana", price: 10000000, desc: "Istana megah", happiness: 100, capacity: 15 }
        ]
        
        if (!args[0]) {
          let houseList = ""
          houses.forEach(house => {
            const owned = rp.property?.house === house.id
            const status = owned ? "✅ (DIMILIKI)" : "🏠"
            houseList += `${status} ${house.name}\n`
            houseList += `   💰 Harga: ${formatNumber(house.price)}\n`
            houseList += `   😊 Kebahagiaan: +${house.happiness}\n`
            houseList += `   👨‍👩‍👧‍👦 Kapasitas: ${house.capacity} orang\n`
            houseList += `   📝 ${house.desc}\n`
            if (!owned && house.price > 0) {
              houseList += `   🏡 Beli: ${prefix}belirumah ${house.id}\n`
            }
            houseList += `\n`
          })
          
          return m.reply(
            `🏡 *PASAR PROPERTI* 🏡\n\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash || 0)}\n` +
            `🏦 *TABUNGAN:* ${formatNumber(rp.economy.bank || 0)}\n` +
            `🏠 *RUMAH SAAT INI:* ${getHouseName(rp.property?.house || 'kos')}\n\n` +
            houseList +
            `💡 *CATATAN:*\n` +
            `• Rumah meningkatkan kebahagiaan\n` +
            `• Kapasitas menentukan maksimal anggota keluarga\n` +
            `• Bisa upgrade ke rumah yang lebih baik`
          )
        }
        
        const houseId = args[0].toLowerCase()
        const house = houses.find(h => h.id === houseId)
        
        if (!house) {
          return m.reply(`❌ Jenis rumah tidak ditemukan. Gunakan ${prefix}belirumah untuk melihat list.`)
        }
        
        if (rp.property?.house === houseId) {
          return m.reply(`ℹ️ Kamu sudah memiliki rumah ini!`)
        }
        
        const currentHouse = houses.find(h => h.id === rp.property?.house) || houses[0]
        if (house.capacity <= currentHouse.capacity && house.price > 0) {
          return m.reply(
            `❌ *TIDAK BISA DOWNGRADE!*\n\n` +
            `🏠 *RUMAH SAAT INI:* ${currentHouse.name}\n` +
            `🏠 *RUMAH BARU:* ${house.name}\n\n` +
            `💡 Kamu hanya bisa upgrade ke rumah yang lebih baik`
          )
        }
        
        const familySize = (rp.social.children?.length || 0) + (rp.social.spouse ? 2 : 1)
        if (house.capacity < familySize) {
          return m.reply(
            `❌ *KAPASITAS TIDAK CUKUP!*\n\n` +
            `🏠 *RUMAH:* ${house.name}\n` +
            `👨‍👩‍👧‍👦 *KAPASITAS:* ${house.capacity} orang\n` +
            `👪 *KELUARGA KAMU:* ${familySize} orang\n\n` +
            `💡 Pilih rumah dengan kapasitas lebih besar`
          )
        }
        
        if (rp.economy.cash < house.price) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `🏠 *RUMAH:* ${house.name}\n` +
            `💰 *HARGA:* ${formatNumber(house.price)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n` +
            `📉 *KURANG:* ${formatNumber(house.price - rp.economy.cash)}\n\n` +
            `💡 Tabung uang dulu!`
          )
        }
        
        rp.economy.cash -= house.price
        rp.property.house = houseId
        
        const oldHappiness = currentHouse.happiness
        const newHappiness = house.happiness
        const happinessDiff = newHappiness - oldHappiness
        
        if (happinessDiff > 0) {
          rp.profile.happiness = Math.min(100, (rp.profile?.happiness || 100) + happinessDiff)
        }
        
        await db.save()
        
        return m.reply(
          `🏡 *SELAMAT KEPEMILIKAN RUMAH BARU!* 🏡\n\n` +
          `🏠 *RUMAH:* ${house.name}\n` +
          `💰 *DIBAYAR:* ${formatNumber(house.price)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `😊 *KEBAHAGIAAN:* +${happinessDiff > 0 ? happinessDiff : 0}\n` +
          `👨‍👩‍👧‍👦 *KAPASITAS:* ${house.capacity} orang\n` +
          `📝 *DESKRIPSI:* ${house.desc}\n\n` +
          `💡 *NEXT STEP:*\n` +
          `${prefix}belicar - Beli mobil\n` +
          `${prefix}perabot - Beli perabotan\n` +
          `${prefix}anak - Tambah anggota keluarga`
        )
      }
      
      if (cmd === "belicar" || cmd === "car") {
        const cars = [
          { id: "motor", name: "🏍️ Motor", price: 50000, speed: 1, fuel: 5, happiness: 5 },
          { id: "mobilsedan", name: "🚗 Mobil Sedan", price: 200000, speed: 2, fuel: 10, happiness: 10 },
          { id: "mobilmpv", name: "🚙 Mobil MPV", price: 400000, speed: 2, fuel: 15, happiness: 15 },
          { id: "mobilsuv", name: "🚙 Mobil SUV", price: 800000, speed: 3, fuel: 20, happiness: 20 },
          { id: "mobilsport", name: "🏎️ Mobil Sport", price: 1500000, speed: 4, fuel: 25, happiness: 30 },
          { id: "mobilluxury", name: "🚘 Mobil Luxury", price: 3000000, speed: 4, fuel: 30, happiness: 40 },
          { id: "limousin", name: "🚐 Limousin", price: 5000000, speed: 3, fuel: 40, happiness: 50 },
          { id: "supercar", name: "🚀 Super Car", price: 10000000, speed: 5, fuel: 50, happiness: 60 }
        ]
        
        if (!args[0]) {
          let carList = ""
          cars.forEach(car => {
            const owned = rp.property?.car === car.id
            const status = owned ? "✅ (DIMILIKI)" : "🚗"
            carList += `${status} ${car.name}\n`
            carList += `   💰 Harga: ${formatNumber(car.price)}\n`
            carList += `   🏎️ Speed: ${"⭐".repeat(car.speed)}\n`
            carList += `   ⛽ Bensin: ${car.fuel}L/100km\n`
            carList += `   😊 Kebahagiaan: +${car.happiness}\n`
            if (!owned) {
              carList += `   🛒 Beli: ${prefix}belicar ${car.id}\n`
            }
            carList += `\n`
          })
          
          return m.reply(
            `🚗 *PASAR MOBIL* 🚗\n\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n` +
            `🚘 *MOBIL SAAT INI:* ${rp.property?.car ? getCarName(rp.property.car) : 'Tidak ada'}\n\n` +
            carList +
            `💡 *MANFAAT:*\n` +
            `• Mobilitas lebih cepat\n` +
            `• Status sosial meningkat\n` +
            `• Kebahagiaan bertambah\n` +
            `• Butuh biaya bensin`
          )
        }
        
        const carId = args[0].toLowerCase()
        const car = cars.find(c => c.id === carId)
        
        if (!car) {
          return m.reply(`❌ Jenis mobil tidak ditemukan. Gunakan ${prefix}belicar untuk melihat list.`)
        }
        
        if (rp.property?.car === carId) {
          return m.reply(`ℹ️ Kamu sudah memiliki mobil ini!`)
        }
        
        if (rp.economy.cash < car.price) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `🚗 *MOBIL:* ${car.name}\n` +
            `💰 *HARGA:* ${formatNumber(car.price)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n` +
            `📉 *KURANG:* ${formatNumber(car.price - rp.economy.cash)}\n\n` +
            `💡 Tabung uang dulu!`
          )
        }
        
        const familySize = (rp.social.children?.length || 0) + (rp.social.spouse ? 2 : 1)
        let canFit = true
        let capacity = 2
        
        if (carId === "motor") capacity = 2
        else if (carId.includes("sedan")) capacity = 5
        else if (carId.includes("mpv")) capacity = 7
        else if (carId.includes("suv")) capacity = 7
        else if (carId.includes("sport")) capacity = 2
        else if (carId.includes("luxury")) capacity = 5
        else if (carId === "limousin") capacity = 8
        else if (carId === "supercar") capacity = 2
        
        if (familySize > capacity) {
          return m.reply(
            `❌ *KAPASITAS TIDAK CUKUP!*\n\n` +
            `🚗 *MOBIL:* ${car.name}\n` +
            `👥 *KAPASITAS:* ${capacity} orang\n` +
            `👪 *KELUARGA KAMU:* ${familySize} orang\n\n` +
            `💡 Pilih mobil dengan kapasitas lebih besar`
          )
        }
        
        rp.economy.cash -= car.price
        rp.property.car = carId
        rp.profile.happiness = Math.min(100, (rp.profile?.happiness || 100) + car.happiness)
        
        await db.save()
        
        return m.reply(
          `🚗 *SELAMAT KEPEMILIKAN MOBIL BARU!* 🚗\n\n` +
          `🏎️ *MOBIL:* ${car.name}\n` +
          `💰 *DIBAYAR:* ${formatNumber(car.price)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `🏎️ *SPEED:* ${"⭐".repeat(car.speed)}\n` +
          `⛽ *KONSUMSI BENSIN:* ${car.fuel}L/100km\n` +
          `😊 *KEBAHAGIAAN:* +${car.happiness}\n\n` +
          `💡 *NEXT STEP:*\n` +
          `🏡 Beli rumah: ${prefix}belirumah\n` +
          `💼 Mulai bisnis: ${prefix}bisnis\n` +
          `👨‍👩‍👧‍👦 Liburan keluarga: ${prefix}liburan`
        )
      }
      
      if (cmd === "bank" || cmd === "tabung" || cmd === "save" || cmd === "ambil" || cmd === "withdraw" || cmd === "transfer") {
        if (cmd === "bank") {
          return m.reply(
            `🏦 *SISTEM PERBANKAN* 🏦\n\n` +
            `💵 *SALDO TUNAI:* ${formatNumber(rp.economy.cash)}\n` +
            `🏦 *SALDO BANK:* ${formatNumber(rp.economy.bank)}\n` +
            `💰 *TOTAL ASET:* ${formatNumber(rp.economy.cash + rp.economy.bank)}\n` +
            `💳 *HUTANG:* ${formatNumber(rp.economy.debt)}\n\n` +
            `📋 *LAYANAN BANK:*\n` +
            `${prefix}tabung <jumlah> - Tabung uang ke bank\n` +
            `${prefix}ambil <jumlah> - Ambil uang dari bank\n` +
            `${prefix}transfer @tag <jumlah> - Transfer ke teman\n` +
            `${prefix}hutang <jumlah> - Pinjam uang dari bank\n` +
            `${prefix}bayarhutang <jumlah> - Bayar hutang\n\n` +
            `💡 *BUNGA BANK:* 0.1% per hari\n` +
            `⚠️ *SUKU BUNGA HUTANG:* 5% per hari`
          )
        }
        
        if (cmd === "tabung" || cmd === "save") {
          const amount = parseInt(args[0])
          if (!amount || amount <= 0) {
            return m.reply(`❌ Format: ${prefix}tabung <jumlah>`)
          }
          
          if (rp.economy.cash < amount) {
            return m.reply(
              `❌ *SALDO TUNAI TIDAK CUKUP!*\n\n` +
              `💰 *BUTUH:* ${formatNumber(amount)}\n` +
              `💵 *SALDO TUNAI:* ${formatNumber(rp.economy.cash)}\n` +
              `📉 *KURANG:* ${formatNumber(amount - rp.economy.cash)}`
            )
          }
          
          rp.economy.cash -= amount
          rp.economy.bank += amount
          
          await db.save()
          
          return m.reply(
            `💰 *UANG BERHASIL DITABUNG!*\n\n` +
            `💸 *JUMLAH:* ${formatNumber(amount)}\n` +
            `💵 *SISA TUNAI:* ${formatNumber(rp.economy.cash)}\n` +
            `🏦 *SALDO BANK:* ${formatNumber(rp.economy.bank)}\n\n` +
            `💡 Uang di bank aman dari kehilangan!`
          )
        }
        
        if (cmd === "ambil" || cmd === "withdraw") {
          const amount = parseInt(args[0])
          if (!amount || amount <= 0) {
            return m.reply(`❌ Format: ${prefix}ambil <jumlah>`)
          }
          
          if (rp.economy.bank < amount) {
            return m.reply(
              `❌ *SALDO BANK TIDAK CUKUP!*\n\n` +
              `💰 *BUTUH:* ${formatNumber(amount)}\n` +
              `🏦 *SALDO BANK:* ${formatNumber(rp.economy.bank)}\n` +
              `📉 *KURANG:* ${formatNumber(amount - rp.economy.bank)}`
            )
          }
          
          rp.economy.bank -= amount
          rp.economy.cash += amount
          
          await db.save()
          
          return m.reply(
            `💰 *UANG BERHASIL DIAMBIL!*\n\n` +
            `💸 *JUMLAH:* ${formatNumber(amount)}\n` +
            `💵 *SALDO TUNAI:* ${formatNumber(rp.economy.cash)}\n` +
            `🏦 *SISA BANK:* ${formatNumber(rp.economy.bank)}`
          )
        }
        
        if (cmd === "transfer") {
          const mentioned = m.mentionedJid || []
          const amount = parseInt(args[args.length - 1])
          
          if (mentioned.length === 0 || !amount || amount <= 0) {
            return m.reply(`❌ Format: ${prefix}transfer @tag <jumlah>`)
          }
          
          const targetId = mentioned[0]
          if (targetId === m.sender) {
            return m.reply(`❌ Tidak bisa transfer ke diri sendiri!`)
          }
          
          const targetUser = db.getUser(targetId)
          if (!targetUser.roleplay) {
            targetUser.roleplay = {
              profile: { happiness: 80, health: 100, education: 0, energy: 100 },
              economy: { cash: 10000, bank: 0, job: null, salary: 0, totalEarned: 0 },
              social: { friends: [], spouse: null, children: [] },
              property: { house: "kos", car: null, furniture: [], garden: [] },
              lifestyle: { hobbies: [], lastVacation: 0 },
              stats: { workDays: 0 }
            }
          }
          
          if (rp.economy.cash < amount) {
            return m.reply(
              `❌ *SALDO TUNAI TIDAK CUKUP!*\n\n` +
              `💰 *BUTUH:* ${formatNumber(amount)}\n` +
              `💵 *SALDO TUNAI:* ${formatNumber(rp.economy.cash)}\n` +
              `📉 *KURANG:* ${formatNumber(amount - rp.economy.cash)}`
            )
          }
          
          const fee = Math.floor(amount * 0.05)
          const total = amount + fee
          
          if (rp.economy.cash < total) {
            return m.reply(
              `❌ *SALDO TIDAK CUKUP TERMASUK BIAYA ADMIN!*\n\n` +
              `💰 *TRANSFER:* ${formatNumber(amount)}\n` +
              `💸 *BIAYA ADMIN (5%):* ${formatNumber(fee)}\n` +
              `💵 *TOTAL:* ${formatNumber(total)}\n` +
              `📊 *SALDO KAMU:* ${formatNumber(rp.economy.cash)}`
            )
          }
          
          rp.economy.cash -= total
          targetUser.roleplay.economy.cash += amount
          
          await db.save()
          
          return m.reply(
            `💸 *TRANSFER BERHASIL!*\n\n` +
            `👤 *KEPADA:* ${targetUser.name || 'User'}\n` +
            `💰 *JUMLAH:* ${formatNumber(amount)}\n` +
            `💳 *BIAYA ADMIN:* ${formatNumber(fee)}\n` +
            `💵 *SISA SALDO:* ${formatNumber(rp.economy.cash)}\n\n` +
            `✅ Uang telah dikirim ke penerima`
          )
        }
      }
      
      if (cmd === "hutang" || cmd === "loan") {
        const amount = parseInt(args[0])
        if (!amount || amount <= 0) {
          return m.reply(`❌ Format: ${prefix}hutang <jumlah>`)
        }
        
        const maxLoan = Math.max(100000, (rp.economy.totalEarned || 0) / 10)
        if (amount > maxLoan) {
          return m.reply(
            `❌ *MELEBIHI BATAS HUTANG!*\n\n` +
            `💰 *MAKSIMAL HUTANG:* ${formatNumber(maxLoan)}\n` +
            `📈 *BERDASARKAN TOTAL PENGHASILAN:* ${formatNumber(rp.economy.totalEarned)}\n\n` +
            `💡 Tingkatkan penghasilan untuk bisa pinjam lebih banyak`
          )
        }
        
        if (rp.economy.debt > 0) {
          return m.reply(
            `❌ *MASIH MEMILIKI HUTANG!*\n\n` +
            `💳 *HUTANG SEKARANG:* ${formatNumber(rp.economy.debt)}\n` +
            `💡 Bayar dulu dengan ${prefix}bayarhutang`
          )
        }
        
        const interest = Math.floor(amount * 0.05)
        const totalDebt = amount + interest
        
        rp.economy.cash += amount
        rp.economy.debt = totalDebt
        
        await db.save()
        
        return m.reply(
          `💳 *PINJAMAN DITERIMA!*\n\n` +
          `💰 *JUMLAH PINJAM:* ${formatNumber(amount)}\n` +
          `📈 *BUNGA (5%):* ${formatNumber(interest)}\n` +
          `💳 *TOTAL HUTANG:* ${formatNumber(totalDebt)}\n` +
          `💵 *SALDO TUNAI:* ${formatNumber(rp.economy.cash)}\n\n` +
          `⚠️ *PERINGATAN:* Bayar dalam 7 hari atau akan terkena denda!`
        )
      }
      
      if (cmd === "bayarhutang" || cmd === "paydebt") {
        if (rp.economy.debt <= 0) {
          return m.reply(`✅ Kamu tidak memiliki hutang.`)
        }
        
        const amount = parseInt(args[0]) || rp.economy.debt
        
        if (rp.economy.cash < amount) {
          return m.reply(
            `❌ *SALDO TUNAI TIDAK CUKUP!*\n\n` +
            `💳 *HUTANG:* ${formatNumber(rp.economy.debt)}\n` +
            `💰 *BAYAR:* ${formatNumber(amount)}\n` +
            `💵 *SALDO KAMU:* ${formatNumber(rp.economy.cash)}\n` +
            `📉 *KURANG:* ${formatNumber(amount - rp.economy.cash)}`
          )
        }
        
        const payAmount = Math.min(amount, rp.economy.debt)
        rp.economy.cash -= payAmount
        rp.economy.debt -= payAmount
        
        await db.save()
        
        return m.reply(
          `💰 *HUTANG DIBAYAR!*\n\n` +
          `💸 *JUMLAH BAYAR:* ${formatNumber(payAmount)}\n` +
          `${rp.economy.debt > 0 ? `💳 *SISA HUTANG:* ${formatNumber(rp.economy.debt)}\n` : '✅ *LUNAS!* Tidak ada hutang lagi\n'}` +
          `💵 *SISA SALDO:* ${formatNumber(rp.economy.cash)}\n\n` +
          `💡 Bebas dari hutang meningkatkan kebahagiaan!`
        )
      }
      
      if (cmd === "sekolah" || cmd === "school" || cmd === "kuliah" || cmd === "college") {
        const educationLevels = [
          { level: "SD", cost: 5000, education: 10, time: 1 },
          { level: "SMP", cost: 10000, education: 20, time: 2 },
          { level: "SMA", cost: 20000, education: 30, time: 3 },
          { level: "D3", cost: 50000, education: 50, time: 4 },
          { level: "S1", cost: 100000, education: 70, time: 5 },
          { level: "S2", cost: 200000, education: 85, time: 6 },
          { level: "S3", cost: 500000, education: 100, time: 8 }
        ]
        
        const currentEdu = rp.profile.education || 0
        let availableLevels = []
        
        educationLevels.forEach(edu => {
          if (currentEdu < edu.education) {
            availableLevels.push(edu)
          }
        })
        
        if (availableLevels.length === 0) {
          return m.reply(
            `🎓 *PENDIDIKAN SUDAH MAKSIMAL!*\n\n` +
            `Kamu sudah mencapai pendidikan tertinggi (S3).\n` +
            `💼 Bisa apply pekerjaan apapun!\n` +
            `👑 Status: Profesional tingkat tinggi`
          )
        }
        
        if (!args[0]) {
          let eduList = ""
          availableLevels.forEach(edu => {
            eduList += `📚 *${edu.level}*\n`
            eduList += `   💰 Biaya: ${formatNumber(edu.cost)}\n`
            eduList += `   🎓 Pendidikan: +${edu.education - currentEdu}%\n`
            eduList += `   ⏰ Waktu: ${edu.time} jam\n`
            eduList += `   📝 Daftar: ${prefix}sekolah ${edu.level.toLowerCase()}\n\n`
          })
          
          return m.reply(
            `🎓 *PUSAT PENDIDIKAN* 🎓\n\n` +
            `📊 *PENDIDIKAN SAAT INI:* ${currentEdu}%\n` +
            `💵 *SALDO:* ${formatNumber(rp.economy.cash)}\n` +
            `⚡ *ENERGI:* ${rp.profile.energy || 100}/100\n\n` +
            eduList +
            `💡 *MANFAAT PENDIDIKAN:*\n` +
            `• Gaji lebih tinggi\n` +
            `• Pekerjaan lebih baik\n` +
            `• Status sosial meningkat`
          )
        }
        
        const levelId = args[0].toLowerCase()
        const edu = availableLevels.find(e => e.level.toLowerCase() === levelId)
        
        if (!edu) {
          return m.reply(`❌ Tingkat pendidikan tidak ditemukan atau tidak tersedia.`)
        }
        
        if (rp.economy.cash < edu.cost) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP UNTUK SEKOLAH!*\n\n` +
            `📚 *TINGKAT:* ${edu.level}\n` +
            `🎓 *BIAYA:* ${formatNumber(edu.cost)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Kerja dulu untuk dapat uang!`
          )
        }
        
        if ((rp.profile.energy || 100) < 30) {
          return m.reply(
            `😴 *ENERGI TIDAK CUKUP!*\n\n` +
            `📚 *TINGKAT:* ${edu.level}\n` +
            `⚡ *DIBUTUHKAN:* 30 energi\n` +
            `⚡ *ENERGI KAMU:* ${rp.profile.energy || 100}\n\n` +
            `💡 Istirahat dulu dengan ${prefix}makan`
          )
        }
        
        rp.economy.cash -= edu.cost
        rp.profile.education = edu.education
        rp.profile.energy = Math.max(0, (rp.profile.energy || 100) - 30)
        rp.profile.title = getEducationTitle(edu.education)
        
        await db.save()
        
        return m.reply(
          `🎓 *PENDIDIKAN DITINGKATKAN!* 🎓\n\n` +
          `📚 *TINGKAT:* ${edu.level}\n` +
          `📊 *PENDIDIKAN:* ${edu.education}%\n` +
          `💸 *BIAYA:* ${formatNumber(edu.cost)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `⚡ *ENERGI:* -30 (Sisa: ${rp.profile.energy})\n\n` +
          `💼 *MANFAAT:*\n` +
          `• Bisa apply pekerjaan lebih baik\n` +
          `• Gaji lebih tinggi\n` +
          `• Status sosial meningkat\n\n` +
          `💡 Pendidikan investasi terbaik untuk masa depan!`
        )
      }
      
      if (cmd === "olahraga" || cmd === "sport") {
        const lastExercise = rp.lifestyle.lastExercise || 0
        const dayInMs = 24 * 60 * 60 * 1000
        
        if (now - lastExercise < dayInMs) {
          const remaining = dayInMs - (now - lastExercise)
          const hours = Math.floor(remaining / (60 * 60 * 1000))
          return m.reply(
            `⏳ *SUDAH OLAHRAGA HARI INI!*\n\n` +
            `Kamu sudah olahraga hari ini.\n` +
            `Tunggu ${hours} jam lagi.\n\n` +
            `💡 Olahraga rutin setiap hari baik untuk kesehatan!`
          )
        }
        
        if ((rp.profile.energy || 100) < 20) {
          return m.reply(
            `😴 *ENERGI TIDAK CUKUP UNTUK OLAHRAGA!*\n\n` +
            `⚡ *DIBUTUHKAN:* 20 energi\n` +
            `⚡ *ENERGI KAMU:* ${rp.profile.energy || 100}\n\n` +
            `💡 Istirahat dulu dengan ${prefix}makan`
          )
        }
        
        const healthGain = rng(5, 15)
        const happinessGain = rng(3, 8)
        const energyCost = 20
        
        rp.profile.health = Math.min(100, (rp.profile.health || 100) + healthGain)
        rp.profile.happiness = Math.min(100, (rp.profile.happiness || 100) + happinessGain)
        rp.profile.energy = Math.max(0, (rp.profile.energy || 100) - energyCost)
        rp.lifestyle.lastExercise = now
        
        await db.save()
        
        return m.reply(
          `💪 *OLAHRAGA SELESAI!* 💪\n\n` +
          `🏃 *AKTIVITAS:* Jogging & Latihan Ringan\n` +
          `❤️ *KESEHATAN:* +${healthGain} (Total: ${rp.profile.health})\n` +
          `😊 *KEBAHAGIAAN:* +${happinessGain} (Total: ${rp.profile.happiness})\n` +
          `⚡ *ENERGI:* -${energyCost} (Sisa: ${rp.profile.energy})\n\n` +
          `💡 Olahraga rutin meningkatkan kesehatan dan kebahagiaan!`
        )
      }
      
      if (cmd === "makan") {
        const foods = [
          { name: "🍲 Makan Biasa", cost: 5000, energy: 30, health: 5, happiness: 3 },
          { name: "🍱 Makan Sehat", cost: 10000, energy: 50, health: 10, happiness: 5 },
          { name: "🍔 Fast Food", cost: 15000, energy: 40, health: -5, happiness: 10 },
          { name: "🍜 Makan Mewah", cost: 30000, energy: 70, health: 15, happiness: 15 },
          { name: "🥗 Salad Sehat", cost: 20000, energy: 45, health: 20, happiness: 8 }
        ]
        
        if (!args[0]) {
          let foodList = ""
          foods.forEach(food => {
            foodList += `${food.name}\n`
            foodList += `   💰 Harga: ${formatNumber(food.cost)}\n`
            foodList += `   ⚡ Energi: +${food.energy}\n`
            foodList += `   ❤️ Kesehatan: ${food.health >= 0 ? '+' : ''}${food.health}\n`
            foodList += `   😊 Kebahagiaan: +${food.happiness}\n`
            foodList += `   🍽️ Pesan: ${prefix}makan ${food.name.toLowerCase().replace(/ /g, '_')}\n\n`
          })
          
          return m.reply(
            `🍽️ *MENU MAKANAN* 🍽️\n\n` +
            `💵 *SALDO:* ${formatNumber(rp.economy.cash)}\n` +
            `⚡ *ENERGI:* ${rp.profile.energy || 100}/100\n` +
            `❤️ *KESEHATAN:* ${rp.profile.health}/100\n\n` +
            foodList +
            `💡 *TIP:* Makan makanan sehat untuk kesehatan lebih baik!`
          )
        }
        
        const foodName = args.slice(0).join(" ").toLowerCase().replace(/_/g, " ")
        const food = foods.find(f => f.name.toLowerCase().includes(foodName))
        
        if (!food) {
          return m.reply(`❌ Menu makanan tidak ditemukan.`)
        }
        
        if (rp.economy.cash < food.cost) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `🍽️ *MAKANAN:* ${food.name}\n` +
            `💰 *HARGA:* ${formatNumber(food.cost)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Kerja dulu untuk dapat uang!`
          )
        }
        
        rp.economy.cash -= food.cost
        rp.profile.energy = Math.min(100, (rp.profile.energy || 100) + food.energy)
        rp.profile.health = Math.min(100, Math.max(0, (rp.profile.health || 100) + food.health))
        rp.profile.happiness = Math.min(100, (rp.profile.happiness || 100) + food.happiness)
        
        await db.save()
        
        return m.reply(
          `🍽️ *MAKANAN DIHIDANGKAN!* 🍽️\n\n` +
          `🥘 *MENU:* ${food.name}\n` +
          `💰 *HARGA:* ${formatNumber(food.cost)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `⚡ *ENERGI:* +${food.energy} (Total: ${rp.profile.energy})\n` +
          `❤️ *KESEHATAN:* ${food.health >= 0 ? '+' : ''}${food.health} (Total: ${rp.profile.health})\n` +
          `😊 *KEBAHAGIAAN:* +${food.happiness} (Total: ${rp.profile.happiness})\n\n` +
          `💡 Jaga pola makan untuk hidup sehat!`
        )
      }
      
      if (cmd === "stats" || cmd === "statistik") {
        const stats = rp.stats || {}
        
        return m.reply(
          `📊 *STATISTIK KEHIDUPAN* 📊\n\n` +
          `👷 *PEKERJAAN:*\n` +
          `   📅 Hari Kerja: ${stats.workDays || 0} hari\n` +
          `   💰 Total Penghasilan: ${formatNumber(rp.economy.totalEarned || 0)}\n` +
          `   🏆 Pekerjaan Tertinggi: ${rp.economy.job ? getJobInfo(rp.economy.job).name : 'Belum kerja'}\n\n` +
          `👨‍👩‍👧‍👦 *KELUARGA:*\n` +
          `   💍 Status: ${rp.social.spouse ? 'Menikah' : 'Single'}\n` +
          `   👶 Jumlah Anak: ${rp.social.children?.length || 0}\n` +
          `   🎂 Usia Pernikahan: ${rp.social.spouse ? getTimeAgo(rp.social.marriedSince || now, true) : '-'}\n\n` +
          `🏠 *PROPERTI:*\n` +
          `   🏡 Rumah: ${getHouseName(rp.property.house)}\n` +
          `   🚗 Mobil: ${rp.property.car ? getCarName(rp.property.car) : 'Tidak ada'}\n` +
          `   🛋️ Perabotan: ${rp.property.furniture.length} item\n` +
          `   🌱 Tanaman Dipanen: ${stats.plantsHarvested || 0}\n\n` +
          `🎓 *PENDIDIKAN:*\n` +
          `   📚 Tingkat: ${getEducationTitle(rp.profile.education)}\n` +
          `   🎓 Persentase: ${rp.profile.education}%\n` +
          `   📖 Kursus Diambil: ${stats.coursesTaken || 0}\n\n` +
          `🏢 *BISNIS & INVESTASI:*\n` +
          `   🏭 Bisnis Dimiliki: ${rp.economy.businesses?.length || 0}\n` +
          `   📈 Investasi Aktif: ${rp.economy.investments?.length || 0}\n` +
          `   💸 Profit Bisnis: ${formatNumber(stats.businessProfit || 0)}\n` +
          `   📊 Profit Investasi: ${formatNumber(stats.investmentProfit || 0)}\n\n` +
          `🎨 *HIDUP & HOBI:*\n` +
          `   🏝️ Liburan Diambil: ${stats.vacationsTaken || 0}\n` +
          `   🏃 Olahraga: ${stats.exerciseDays || 0} hari\n` +
          `   🎭 Hobi: ${rp.lifestyle.hobbies.length}\n` +
          `   🛒 Belanja: ${stats.shoppingTimes || 0}x\n\n` +
          `🌟 *PENCAPAIAN:*\n` +
          `   🏅 Achievement: ${rp.lifestyle.achievements?.length || 0}`
        )
      }
      
      if (cmd === "belihobi" || cmd === "hobi" || cmd === "tamasuka") {
        const hobbies = [
          { id: "membaca", name: "📚 Membaca", cost: 10000, happiness: 10, energy: -5, desc: "Membaca buku" },
          { id: "musik", name: "🎵 Bermusik", cost: 20000, happiness: 15, energy: -10, desc: "Main alat musik" },
          { id: "gaming", name: "🎮 Gaming", cost: 30000, happiness: 20, energy: -15, desc: "Bermain game" },
          { id: "memasak", name: "🍳 Memasak", cost: 15000, happiness: 12, energy: -10, desc: "Memasak makanan" },
          { id: "fotografi", name: "📸 Fotografi", cost: 50000, happiness: 25, energy: -8, desc: "Mengambil foto" },
          { id: "seni", name: "🎨 Melukis", cost: 40000, happiness: 18, energy: -12, desc: "Melukis gambar" },
          { id: "olahraga_hobi", name: "⚽ Olahraga", cost: 25000, happiness: 20, energy: -20, desc: "Olahraga santai" },
          { id: "traveling", name: "✈️ Traveling", cost: 100000, happiness: 30, energy: -25, desc: "Jalan-jalan" }
        ]
        
        if (!args[0]) {
          let hobbyList = ""
          hobbies.forEach(hobby => {
            const owned = rp.lifestyle.hobbies?.includes(hobby.id)
            const status = owned ? "✅ (DIMILIKI)" : "🎭"
            hobbyList += `${status} ${hobby.name}\n`
            hobbyList += `   💰 Harga: ${formatNumber(hobby.cost)}\n`
            hobbyList += `   😊 Kebahagiaan: +${hobby.happiness}/hari\n`
            hobbyList += `   ⚡ Energi: ${hobby.energy}\n`
            hobbyList += `   📝 ${hobby.desc}\n`
            if (!owned) {
              hobbyList += `   🛒 Beli: ${prefix}belihobi ${hobby.id}\n`
            }
            hobbyList += `\n`
          })
          
          return m.reply(
            `🎭 *PUSAT HOBI* 🎭\n\n` +
            `💵 *SALDO:* ${formatNumber(rp.economy.cash)}\n` +
            `🎨 *HOBI DIMILIKI:* ${rp.lifestyle.hobbies?.length || 0}\n` +
            `😊 *KEBAHAGIAAN:* ${rp.profile.happiness}/100\n\n` +
            hobbyList +
            `💡 *MANFAAT HOBI:*\n` +
            `• Meningkatkan kebahagiaan harian\n` +
            `• Mengurangi stress\n` +
            `• Menambah pengalaman hidup`
          )
        }
        
        const hobbyId = args[0].toLowerCase()
        const hobby = hobbies.find(h => h.id === hobbyId)
        
        if (!hobby) {
          return m.reply(`❌ Hobi tidak ditemukan. Gunakan ${prefix}belihobi untuk melihat list.`)
        }
        
        if (rp.lifestyle.hobbies?.includes(hobbyId)) {
          return m.reply(`ℹ️ Kamu sudah memiliki hobi ini!`)
        }
        
        if (rp.economy.cash < hobby.cost) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `🎭 *HOBI:* ${hobby.name}\n` +
            `💰 *HARGA:* ${formatNumber(hobby.cost)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Kerja dulu untuk dapat uang!`
          )
        }
        
        if (!rp.lifestyle.hobbies) rp.lifestyle.hobbies = []
        rp.lifestyle.hobbies.push(hobbyId)
        rp.economy.cash -= hobby.cost
        
        await db.save()
        
        return m.reply(
          `🎭 *HOBI BARU DITAMBAHKAN!* 🎭\n\n` +
          `🎨 *HOBI:* ${hobby.name}\n` +
          `💰 *DIBAYAR:* ${formatNumber(hobby.cost)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `😊 *KEBAHAGIAAN HARIAN:* +${hobby.happiness}\n` +
          `⚡ *ENERGI TERPAKAI:* ${hobby.energy}\n` +
          `📝 *DESKRIPSI:* ${hobby.desc}\n\n` +
          `💡 *TOTAL HOBI:* ${rp.lifestyle.hobbies.length}\n` +
          `🎯 Nikmati hobi untuk meningkatkan kebahagiaan!`
        )
      }
      
      if (cmd === "perabot" || cmd === "furniture") {
        const furnitureItems = [
          { id: "kursi", name: "🪑 Kursi", price: 10000, comfort: 5, happiness: 3, desc: "Kursi sederhana" },
          { id: "meja", name: "🪑 Meja", price: 15000, comfort: 8, happiness: 4, desc: "Meja kayu" },
          { id: "sofa", name: "🛋️ Sofa", price: 50000, comfort: 20, happiness: 10, desc: "Sofa nyaman" },
          { id: "kasur", name: "🛏️ Kasur", price: 80000, comfort: 30, happiness: 15, desc: "Kasur empuk" },
          { id: "lemari", name: "🗄️ Lemari", price: 60000, comfort: 15, happiness: 8, desc: "Lemari pakaian" },
          { id: "tv", name: "📺 TV", price: 100000, comfort: 25, happiness: 12, desc: "Televisi LED" },
          { id: "ac", name: "❄️ AC", price: 200000, comfort: 40, happiness: 20, desc: "AC ruangan" },
          { id: "kulkas", name: "🧊 Kulkas", price: 150000, comfort: 35, happiness: 18, desc: "Kulkas 2 pintu" },
          { id: "komputer", name: "💻 Komputer", price: 300000, comfort: 30, happiness: 25, desc: "PC gaming" }
        ]
        
        if (!args[0]) {
          let furnitureList = ""
          furnitureItems.forEach(item => {
            const owned = rp.property.furniture?.includes(item.id)
            const status = owned ? "✅ (DIMILIKI)" : "🛋️"
            furnitureList += `${status} ${item.name}\n`
            furnitureList += `   💰 Harga: ${formatNumber(item.price)}\n`
            furnitureList += `   🛋️ Kenyamanan: +${item.comfort}\n`
            furnitureList += `   😊 Kebahagiaan: +${item.happiness}\n`
            furnitureList += `   📝 ${item.desc}\n`
            if (!owned) {
              furnitureList += `   🛒 Beli: ${prefix}perabot ${item.id}\n`
            }
            furnitureList += `\n`
          })
          
          const totalComfort = rp.property.furniture?.reduce((sum, id) => {
            const item = furnitureItems.find(f => f.id === id)
            return sum + (item?.comfort || 0)
          }, 0) || 0
          
          const totalHappiness = rp.property.furniture?.reduce((sum, id) => {
            const item = furnitureItems.find(f => f.id === id)
            return sum + (item?.happiness || 0)
          }, 0) || 0
          
          return m.reply(
            `🛋️ *TOKO PERABOTAN* 🛋️\n\n` +
            `💵 *SALDO:* ${formatNumber(rp.economy.cash)}\n` +
            `🏠 *RUMAH:* ${getHouseName(rp.property.house)}\n` +
            `🛋️ *PERABOTAN DIMILIKI:* ${rp.property.furniture?.length || 0}\n` +
            `🛋️ *TOTAL KENYAMANAN:* +${totalComfort}\n` +
            `😊 *TOTAL KEBAHAGIAAN:* +${totalHappiness}\n\n` +
            furnitureList +
            `💡 *MANFAAT PERABOTAN:*\n` +
            `• Meningkatkan kenyamanan rumah\n` +
            `• Menambah kebahagiaan\n` +
            `• Membuat rumah lebih indah`
          )
        }
        
        const furnitureId = args[0].toLowerCase()
        const furniture = furnitureItems.find(f => f.id === furnitureId)
        
        if (!furniture) {
          return m.reply(`❌ Perabotan tidak ditemukan. Gunakan ${prefix}perabot untuk melihat list.`)
        }
        
        if (rp.property.furniture?.includes(furnitureId)) {
          return m.reply(`ℹ️ Kamu sudah memiliki perabotan ini!`)
        }
        
        if (rp.economy.cash < furniture.price) {
          return m.reply(
            `❌ *UANG TIDAK CUKUP!*\n\n` +
            `🛋️ *PERABOTAN:* ${furniture.name}\n` +
            `💰 *HARGA:* ${formatNumber(furniture.price)}\n` +
            `💵 *CASH KAMU:* ${formatNumber(rp.economy.cash)}\n\n` +
            `💡 Kerja dulu untuk dapat uang!`
          )
        }
        
        const houseCapacity = getHouseCapacity(rp.property.house)
        if ((rp.property.furniture?.length || 0) >= houseCapacity) {
          return m.reply(
            `❌ *RUMAH PENUH!*\n\n` +
            `🏠 *RUMAH:* ${getHouseName(rp.property.house)}\n` +
            `📦 *KAPASITAS:* ${houseCapacity} perabotan\n` +
            `🛋️ *SAAT INI:* ${rp.property.furniture?.length || 0} perabotan\n\n` +
            `💡 Upgrade rumah untuk kapasitas lebih besar`
          )
        }
        
        if (!rp.property.furniture) rp.property.furniture = []
        rp.property.furniture.push(furnitureId)
        rp.economy.cash -= furniture.price
        rp.profile.happiness = Math.min(100, (rp.profile.happiness || 100) + furniture.happiness)
        
        await db.save()
        
        return m.reply(
          `🛋️ *PERABOTAN BERHASIL DIBELI!* 🛋️\n\n` +
          `🏷️ *NAMA:* ${furniture.name}\n` +
          `💰 *DIBAYAR:* ${formatNumber(furniture.price)}\n` +
          `💵 *SISA CASH:* ${formatNumber(rp.economy.cash)}\n` +
          `🛋️ *KENYAMANAN:* +${furniture.comfort}\n` +
          `😊 *KEBAHAGIAAN:* +${furniture.happiness}\n` +
          `📝 *DESKRIPSI:* ${furniture.desc}\n\n` +
          `🏠 *TOTAL PERABOTAN:* ${rp.property.furniture.length}/${houseCapacity}\n` +
          `💡 Perabotan membuat rumah lebih nyaman!`
        )
      }
      
      return m.reply(
        `🎮 *RPG KEHIDUPAN SIMULASI* 🎮\n\n` +
        `📱 *Gunakan ${prefix}menu untuk melihat semua command*\n\n` +
        `👤 *PROFIL:* ${prefix}life\n` +
        `💼 *PEKERJAAN:* ${prefix}kerja\n` +
        `💰 *EKONOMI:* ${prefix}bank\n` +
        `🏠 *PROPERTI:* ${prefix}belirumah\n` +
        `👨‍👩‍👧‍👦 *KELUARGA:* ${prefix}pacaran\n` +
        `🎓 *PENDIDIKAN:* ${prefix}sekolah\n` +
        `🏢 *BISNIS:* ${prefix}bisnis\n` +
        `🌱 *HIDUP SEHAT:* ${prefix}olahraga\n` +
        `🎨 *HOBI:* ${prefix}belihobi\n` +
        `🛒 *BELANJA:* ${prefix}perabot\n\n` +
        `💡 *TIP:* Bangun kehidupan yang seimbang!`
      )
      
    } catch (error) {
      console.error('RPG Life Error:', error)
      return m.reply(`❌ Terjadi error: ${error.message}\n\nCoba ulangi command atau hubungi owner.`)
    }
  }
}

function getHouseName(houseId) {
  const houses = {
    'kos': '🏚️ Kos',
    'kontrakan': '🏡 Kontrakan',
    'apartemen': '🏢 Apartemen Studio',
    'rumahkecil': '🏠 Rumah Kecil',
    'rumahsedang': '🏠 Rumah Sedang',
    'rumahbesar': '🏠 Rumah Besar',
    'villa': '🏖️ Villa',
    'mansion': '🏰 Mansion',
    'istana': '🏯 Istana'
  }
  return houses[houseId] || '🏚️ Kos'
}

function getHouseEmoji(houseId) {
  const emojis = {
    'kos': '🏚️',
    'kontrakan': '🏡',
    'apartemen': '🏢',
    'rumahkecil': '🏠',
    'rumahsedang': '🏠',
    'rumahbesar': '🏠',
    'villa': '🏖️',
    'mansion': '🏰',
    'istana': '🏯'
  }
  return emojis[houseId] || '🏚️'
}

function getHouseCapacity(houseId) {
  const capacities = {
    'kos': 2,
    'kontrakan': 5,
    'apartemen': 8,
    'rumahkecil': 12,
    'rumahsedang': 15,
    'rumahbesar': 20,
    'villa': 25,
    'mansion': 30,
    'istana': 40
  }
  return capacities[houseId] || 2
}

function getCarName(carId) {
  const cars = {
    'motor': '🏍️ Motor',
    'mobilsedan': '🚗 Mobil Sedan',
    'mobilmpv': '🚙 Mobil MPV',
    'mobilsuv': '🚙 Mobil SUV',
    'mobilsport': '🏎️ Mobil Sport',
    'mobilluxury': '🚘 Mobil Luxury',
    'limousin': '🚐 Limousin',
    'supercar': '🚀 Super Car'
  }
  return cars[carId] || '🚗 Mobil'
}

function getCarEmoji(carId) {
  const emojis = {
    'motor': '🏍️',
    'mobilsedan': '🚗',
    'mobilmpv': '🚙',
    'mobilsuv': '🚙',
    'mobilsport': '🏎️',
    'mobilluxury': '🚘',
    'limousin': '🚐',
    'supercar': '🚀'
  }
  return emojis[carId] || '🚗'
}

function getJobTitle(education, jobId) {
  if (!jobId) return 'Pengangguran'
  
  const job = getJobInfo(jobId)
  const baseTitle = job.name.replace(/[^a-zA-Z\s]/g, '')
  
  if (education >= 90) return `Profesional ${baseTitle}`
  if (education >= 70) return `Senior ${baseTitle}`
  if (education >= 50) return `${baseTitle} Terampil`
  if (education >= 30) return `${baseTitle} Menengah`
  if (education >= 10) return `${baseTitle} Pemula`
  return baseTitle
}

function getEducationTitle(education) {
  if (education >= 95) return 'Profesor'
  if (education >= 85) return 'Doktor (S3)'
  if (education >= 70) return 'Magister (S2)'
  if (education >= 50) return 'Sarjana (S1)'
  if (education >= 30) return 'Diploma (D3)'
  if (education >= 20) return 'SMA'
  if (education >= 10) return 'SMP'
  if (education >= 5) return 'SD'
  return 'Tidak Sekolah'
}

function getTimeAgo(timestamp, showDays = false) {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'baru saja'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
  
  const days = Math.floor(diff / 86400000)
  if (showDays) return `${days} hari`
  return `${days} hari lalu`
          }


//plugins/rpg/rpg-cook.js

import { ITEMS, hasItem, addItem, delItem, rng, animateLoading, animateCooking } from "../../lib/rpglib.js"

export default {
  name: "rpg_cooking",
  command: ["cook", "masak"],
  tags: ["rpg"],
  run: async (ev, rt) => {
    const { m, prefix } = ev
    const { db } = rt
    const user = db.getUser(m.sender)
    const rpg = user.rpg

    if (!hasItem(user, "fish", 1)) {
        return m.reply(
            `🍳 *BUTUH BAHAN MASAK!*\n\n` +
            `Kamu butuh bahan untuk memasak.\n\n` +
            `🎣 *CARA DAPAT IKAN:*\n` +
            `• Memancing: ${prefix}fish (butuh Fishing Rod)\n` +
            `• Beli: ${prefix}buy fish (jika tersedia)\n\n` +
            `💡 *RESEP YANG TERSEDIA:*\n` +
            `1. Cooked Fish: 1x Raw Fish\n` +
            `2. Fish Stew: 2x Raw Fish + 1x Berry\n` +
            `3. Grilled Fish: 1x Raw Fish (dengan kayu bakar)`
        )
    }
    
    let recipe = null
    let result = ""
    let energyGain = 0
    
    if (hasItem(user, "fish", 2) && hasItem(user, "berry", 1)) {
        recipe = "Fish Stew"
        delItem(user, "fish", 2)
        delItem(user, "berry", 1)
        addItem(user, "cooked_fish", 2)
        energyGain = 80
        result = `🍲 Fish Stew x2 (Energy +${energyGain})`
    } 
    else if (hasItem(user, "fish", 1) && hasItem(user, "wood", 1)) {
        recipe = "Grilled Fish"
        delItem(user, "fish", 1)
        delItem(user, "wood", 1)
        addItem(user, "cooked_fish", 1)
        energyGain = 40
        result = `🍢 Grilled Fish x1 (Energy +${energyGain})`
    }
    else if (hasItem(user, "fish", 1)) {
        recipe = "Cooked Fish"
        delItem(user, "fish", 1)
        addItem(user, "cooked_fish", 1)
        energyGain = 30
        result = `🍲 Cooked Fish x1 (Energy +${energyGain})`
    }
    
    if (!recipe) {
        return m.reply(
            `❌ *BAHAN TIDAK CUKUP!*\n\n` +
            `💡 *RESEP YANG TERSEDIA:*\n` +
            `🍲 *Cooked Fish:*\n` +
            `   1x Raw Fish\n` +
            `   Energy: +30\n\n` +
            `🍢 *Grilled Fish:*\n` +
            `   1x Raw Fish + 1x Wood\n` +
            `   Energy: +40\n\n` +
            `🍲 *Fish Stew:*\n` +
            `   2x Raw Fish + 1x Berry\n` +
            `   Energy: +80 (mendapat 2x Cooked Fish)\n\n` +
            `🎣 Dapatkan bahan dengan: ${prefix}fish`
        )
    }
    
    await animateCooking(m)
    
    const xpGain = rng(15, 30)
    rpg.exp += xpGain
    
    await db.save()
    
    return m.reply(
        `🍳 *COOKING COMPLETE!* 🍳\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👨‍🍳 *RESEP:* ${recipe}\n` +
        `🎁 *HASIL:* ${result}\n` +
        `➕ *XP GAINED:* +${xpGain}\n\n` +
        `💡 *CARA GUNAKAN:*\n` +
        `• .use cooked_fish\n` +
        `• Energy +${energyGain}\n\n` +
        `🎯 Masak lagi dengan bahan yang tersedia!`
    )
  }
}

//lib/handler.js
import { CONFIG } from "../config.js"
import {
  jidNormalizedUser,
  pickText,
  parseCommand,
  isGroup,
  extractQuoted,
  unwrapMessage
} from "./helper.js"
import { loadPlugins } from "./loader.js"
import { fakeReply } from "./fakeReply.js"
import { logMessage } from "./logger.js"
import baileys from "@dyyxyzz/baileys-mod" 
const { proto, generateWAMessageFromContent } = baileys

const __lidMapCache = new Map()
const __LID_CACHE_TTL = 120000
let sewaCheckerInterval = null;
let autoSuspendInterval = null;

const warningCooldowns = new Map();

const messageCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

setInterval(() => {
    const now = Date.now()
    for (const [key, data] of messageCache.entries()) {
        if (now - data.timestamp > CACHE_TTL) {
            messageCache.delete(key)
        }
    }
}, 60000)

function levenshtein(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function createWhatsAppMention(jid) {
  const num = jidNormalizedUser(jid).split("@")[0]
  return num ? `@${num}` : "@User"
}

async function sendMessageWithMention(rt, chatJid, text, mentionJid, options = {}) {
  const numOnly = jidNormalizedUser(mentionJid).split("@")[0]
  const formattedText = text
  
  return await rt.sock.sendMessage(chatJid, {
    text: formattedText,
    mentions: [mentionJid] 
  }, options)
}

function resolveLidToJid(store, jid) {
  const j = jidNormalizedUser(jid)
  if (!j) return ""
  if (!j.endsWith("@lid")) return j
  if (!store?.contacts) return j
  const direct = store.contacts[j]
  if (direct) {
    const maybe = direct.id || direct.jid || direct?.contact?.id || direct?.contact?.jid || ""
    const out = jidNormalizedUser(maybe)
    if (out && !out.endsWith("@lid")) return out
  }

  for (const id in store.contacts) {
    const c = store.contacts[id]
    if (!c) continue
    if (c.lid === j || c.id === j) {
       const possible = jidNormalizedUser(c.id) 
       if(possible && !possible.endsWith("@lid")) return possible
    }
  }

  return j 
}

async function getGroupLidMap(rt, groupJid) {
  const now = Date.now()
  const cached = __lidMapCache.get(groupJid)
  if (cached && (now - cached.at) < __LID_CACHE_TTL) return cached.map

  const map = new Map()
  try {
    const md = await rt.sock.groupMetadata(groupJid)
    const parts = md?.participants || []
    for (const p of parts) {
      const id = p?.id ? jidNormalizedUser(p.id) : null
      const lid = p?.lid ? jidNormalizedUser(p.lid) : null
      if (id && lid && lid.endsWith("@lid")) map.set(lid, id)
    }
  } catch {}

  __lidMapCache.set(groupJid, { map, at: now })
  return map
}

async function getGroupName(rt, groupId) {
    try {
        const meta = await rt.sock.groupMetadata(groupId);
        return meta.subject || groupId;
    } catch {
        return groupId;
    }
}

async function resolveLidToJidSmart(rt, chatJid, jid) {
  const j = jidNormalizedUser(jid)
  if (!j) return j
  if (!j.endsWith("@lid")) return j

  const byStore = resolveLidToJid(rt.store, j)
  if (byStore && !byStore.endsWith("@lid")) return byStore

  if (chatJid && String(chatJid).endsWith("@g.us")) {
    const map = await getGroupLidMap(rt, chatJid)
    const hit = map.get(j)
    if (hit) return hit
  }

  return j
}

function cacheMessage(msg) {
    try {
        const jid = msg.key.remoteJid
        const msgId = msg.key.id
        
        if (!jid || !msgId || !msg.message) return
        if (!jid.endsWith('@g.us')) return
        const fromMe = !!msg.key.fromMe
        if (fromMe) return
        
        const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
        const message = msg.message
        const text = pickText(msg)
        const root = unwrapMessage(message)
        const mentions = []
        let ctx = null
        if (root?.extendedTextMessage) {
            ctx = root.extendedTextMessage.contextInfo
        } else if (root?.imageMessage) {
            ctx = root.imageMessage.contextInfo
        } else if (root?.videoMessage) {
            ctx = root.videoMessage.contextInfo
        } else if (root?.audioMessage) {
            ctx = root.audioMessage.contextInfo
        } else if (root?.documentMessage) {
            ctx = root.documentMessage.contextInfo
        } else if (root?.stickerMessage) {
            ctx = root.stickerMessage.contextInfo
        } else if (root?.conversation) {
        }
        
        if (ctx?.mentionedJid) {
            mentions.push(...ctx.mentionedJid.map(jidNormalizedUser))
        }
        let mediaUrl = null
        let caption = null
        let fileName = null
        let mimetype = null
        
        if (root?.imageMessage) {
            mediaUrl = root.imageMessage.url
            caption = root.imageMessage.caption
            mimetype = root.imageMessage.mimetype
        } else if (root?.videoMessage) {
            mediaUrl = root.videoMessage.url
            caption = root.videoMessage.caption
            mimetype = root.videoMessage.mimetype
        } else if (root?.audioMessage) {
            mediaUrl = root.audioMessage.url
            mimetype = root.audioMessage.mimetype
        } else if (root?.stickerMessage) {
            mediaUrl = root.stickerMessage.url
            mimetype = root.stickerMessage.mimetype
        } else if (root?.documentMessage) {
            mediaUrl = root.documentMessage.url
            caption = root.documentMessage.caption
            fileName = root.documentMessage.fileName
            mimetype = root.documentMessage.mimetype
        }
        
        const cacheKey = `${jid}:${msgId}`
        messageCache.set(cacheKey, {
            timestamp: Date.now(),
            sender,
            message: JSON.parse(JSON.stringify(message)), 
            text,
            mentions,
            type: Object.keys(message)[0],
            mediaUrl,
            caption,
            fileName,
            mimetype,
            rawMessage: msg 
        })
        
        if (messageCache.size > 500) {
            const oldestKey = Array.from(messageCache.keys())[0]
            messageCache.delete(oldestKey)
        }
        
    } catch (error) {
        console.error('[CACHE ERROR]', error)
    }
}

async function resendDeletedMessage(rt, groupJid, originalMsg, deleterJid) {
    try {
        const { sock, store } = rt
        const deleterName = getContactName(store, deleterJid, "", true)
        const senderName = getContactName(store, originalMsg.sender, "", true)
        
        const caption = `⚠️ *PESAN DIHAPUS*\n` +
                       `👤 *Penghapus:* ${deleterName}\n` +
                       `📝 *Pengirim:* ${senderName}\n` +
                       `🕒 *Dihapus pada:* ${new Date().toLocaleTimeString('id-ID')}\n\n`
        
        
        await sock.sendMessage(groupJid, {
            text: caption,
            mentions: [deleterJid, originalMsg.sender]
        })
        
       
        switch (originalMsg.type) {
            case 'conversation':
                const convText = originalMsg.message?.conversation || ''
                if (convText) {
                    await sock.sendMessage(groupJid, {
                        text: convText
                    })
                }
                break
                
            case 'extendedTextMessage':
                const extText = originalMsg.message?.extendedTextMessage?.text || ''
                const extCtx = originalMsg.message?.extendedTextMessage?.contextInfo
                if (extText) {
                    await sock.sendMessage(groupJid, {
                        text: extText,
                        ...(extCtx?.mentionedJid ? {
                            mentions: extCtx.mentionedJid.map(j => jidNormalizedUser(j))
                        } : {})
                    })
                }
                break
                
            case 'imageMessage':
                const imgMsg = originalMsg.message?.imageMessage
                if (imgMsg?.url) {
                    await sock.sendMessage(groupJid, {
                        image: { url: imgMsg.url },
                        caption: imgMsg.caption || '',
                        mimetype: imgMsg.mimetype
                    })
                } else if (originalMsg.mediaUrl) {
                    await sock.sendMessage(groupJid, {
                        image: { url: originalMsg.mediaUrl },
                        caption: originalMsg.caption || '',
                        mimetype: originalMsg.mimetype
                    })
                }
                break
                
            case 'videoMessage':
                const vidMsg = originalMsg.message?.videoMessage
                if (vidMsg?.url) {
                    await sock.sendMessage(groupJid, {
                        video: { url: vidMsg.url },
                        caption: vidMsg.caption || '',
                        mimetype: vidMsg.mimetype
                    })
                } else if (originalMsg.mediaUrl) {
                    await sock.sendMessage(groupJid, {
                        video: { url: originalMsg.mediaUrl },
                        caption: originalMsg.caption || '',
                        mimetype: originalMsg.mimetype
                    })
                }
                break
                
            case 'audioMessage':
                const audMsg = originalMsg.message?.audioMessage
                if (audMsg?.url) {
                    await sock.sendMessage(groupJid, {
                        audio: { url: audMsg.url },
                        mimetype: audMsg.mimetype,
                        ptt: audMsg.ptt
                    })
                } else if (originalMsg.mediaUrl) {
                    await sock.sendMessage(groupJid, {
                        audio: { url: originalMsg.mediaUrl },
                        mimetype: originalMsg.mimetype
                    })
                }
                break
                
            case 'stickerMessage':
                const stkMsg = originalMsg.message?.stickerMessage
                if (stkMsg?.url) {
                    await sock.sendMessage(groupJid, {
                        sticker: { url: stkMsg.url },
                        mimetype: stkMsg.mimetype
                    })
                } else if (originalMsg.mediaUrl) {
                    await sock.sendMessage(groupJid, {
                        sticker: { url: originalMsg.mediaUrl },
                        mimetype: originalMsg.mimetype
                    })
                }
                break
                
            case 'documentMessage':
                const docMsg = originalMsg.message?.documentMessage
                if (docMsg?.url) {
                    await sock.sendMessage(groupJid, {
                        document: { url: docMsg.url },
                        fileName: docMsg.fileName || 'Document',
                        mimetype: docMsg.mimetype,
                        caption: docMsg.caption || ''
                    })
                } else if (originalMsg.mediaUrl) {
                    await sock.sendMessage(groupJid, {
                        document: { url: originalMsg.mediaUrl },
                        fileName: originalMsg.fileName || 'Document',
                        mimetype: originalMsg.mimetype,
                        caption: originalMsg.caption || ''
                    })
                }
                break
                
            default:
                
                await sock.sendMessage(groupJid, {
                    text: `📎 [${originalMsg.type}] - Pesan tipe ini telah dihapus`
                })
        }
        
        
        
    } catch (error) {
        console.error('[RESEND ERROR]', error)
        
        try {
            await rt.sock.sendMessage(groupJid, {
                text: '⚠️ Gagal mengirim ulang pesan yang dihapus. Mungkin pesan terlalu besar atau format tidak didukung.'
            })
        } catch {}
    }
}
async function handleMessageDelete(rt, msg) {
    try {
        const jid = msg.key.remoteJid
        if (!jid?.endsWith('@g.us')) return
        if (!msg.message?.protocolMessage) return
        
        const protocolMsg = msg.message.protocolMessage
        if (protocolMsg.type !== 2 && protocolMsg.type !== 7) return
        
        const deletedKey = protocolMsg.key
        if (!deletedKey?.id || !deletedKey?.remoteJid) return
        
        const group = rt.db?.getGroup?.(jid)
        if (!group?.antiDelete) {
            console.log('[ANTI-DELETE] Fitur tidak aktif di grup', jid)
            return
        }
        
        const cacheKey = `${deletedKey.remoteJid}:${deletedKey.id}`
        const originalMsg = messageCache.get(cacheKey)
        
        if (!originalMsg) {
            console.log('[ANTI-DELETE] Pesan tidak ditemukan di cache:', cacheKey)
            return
        }
        
        const deleterJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
        const originalSenderJid = jidNormalizedUser(originalMsg.sender)
        const botJid = jidNormalizedUser(rt.sock.user?.id)
        if (deleterJid === botJid) {
            console.log('[ANTI-DELETE] Bot menghapus pesan sendiri, diabaikan')
            return
        }
       
        if (deleterJid === originalSenderJid) {
            const isAdmin = await isSenderAdmin(rt, jid, deleterJid)
            if (isAdmin) {
                console.log('[ANTI-DELETE] Admin menghapus pesan sendiri, diabaikan')
                return
            }
        }
        
        console.log('[ANTI-DELETE] Memproses pesan dihapus oleh:', deleterJid)
        await resendDeletedMessage(rt, jid, originalMsg, deleterJid)
        
        messageCache.delete(cacheKey)
        
    } catch (error) {
        console.error('[ANTI-DELETE ERROR]', error)
    }
}
export function createRuntime({ sock, store, plugins, db }) {
    const rt = {
        sock,
        store,
        plugins,
        db,
        config: CONFIG,
        stats: { startAt: Date.now(), handled: 0, errors: 0 },
        resolveJid: (jid) => resolveLidToJid(store, jid)
    };
    setTimeout(() => startSewaChecker(rt), 10000);
    setTimeout(() => startAutoSuspendChecker(rt), 30000);
    
    return rt;
}

export async function reloadAllPlugins(rt) {
  rt.plugins = await loadPlugins(rt.config.pluginsDir)
  return rt.plugins
}

function getContactName(store, jid, notify = "", defaultToNumber = true) {
  if (!jid) return notify || ""
  
  const jidNormal = jidNormalizedUser(jid)
  let resolvedJid = jidNormal
  
  if (jidNormal.endsWith("@lid")) {
    resolvedJid = resolveLidToJid(store, jidNormal) || jidNormal
  }
  
  let contact = null
  if (store?.contacts) {
    contact = store.contacts[resolvedJid] || store.contacts[jidNormal]
    
    if (!contact && resolvedJid.includes("@")) {
      const numOnly = resolvedJid.split("@")[0]
      const possibleKeys = Object.keys(store.contacts).filter(k => 
        k.includes(numOnly) || 
        (store.contacts[k]?.id && store.contacts[k].id.includes(numOnly))
      )
      if (possibleKeys.length > 0) {
        contact = store.contacts[possibleKeys[0]]
      }
    }
  }
  
  const pushName = notify || contact?.pushName || ""
  const verifiedName = contact?.verifiedName || ""
  const name = contact?.name || ""
  const contactNotify = contact?.notify || ""
  
  const numOnly = resolvedJid.split("@")[0]
  
  if (pushName && pushName !== numOnly) return pushName
  if (verifiedName) return verifiedName
  if (name) return name
  if (contactNotify && contactNotify !== numOnly) return contactNotify
  if (notify && notify !== numOnly) return notify
  
  return defaultToNumber ? numOnly : ""
}

function getDisplayNameForMention(store, jid, notify = "") {
  const name = getContactName(store, jid, notify, false)
  
  if (name && name.trim()) {
    const cleanName = name.replace(/[@#]/g, "").trim()
    if (cleanName) return cleanName
  }
  
  if (notify && notify.trim()) {
    const cleanNotify = notify.replace(/[@#]/g, "").trim()
    if (cleanNotify) return cleanNotify
  }
  
  return "User"
}

function formatTag(store, jid, notify = "") {
  const displayName = getDisplayNameForMention(store, jid, notify)
  const numOnly = jidNormalizedUser(jid).split("@")[0]
  
  return `@${displayName}`
}

function getReplyTag(rt, quotedObj) {
  if (!quotedObj?.sender) return ""
  
  const sender = quotedObj.sender
  const store = rt.store
  const pushName = quotedObj.pushName || quotedObj.name || ""
  
  let resolvedSender = sender
  if (sender.endsWith("@lid")) {
    resolvedSender = resolveLidToJid(store, sender) || sender
  }
  
  return formatTag(store, resolvedSender, pushName)
}

function resolveParticipant(rt, msg, group) {
  let rawJid = ""
  if (group) {
    rawJid = msg.key.participant || msg.participant
  } else {
    rawJid = msg.key.remoteJid
  }
  if (msg.key.fromMe) {
    rawJid = rt.sock.user?.id || ""
  }
  return jidNormalizedUser(rawJid)
}

async function resolveMentionsSmart(rt, chatJid, mentions) {
  if (!Array.isArray(mentions) || !mentions.length) return []
  const out = []
  for (const x of mentions) {
    const resolved = await resolveLidToJidSmart(rt, chatJid, x)
    if (resolved && !resolved.endsWith("@lid")) {
      out.push(resolved)
    }
  }
  return out
}

function isTerminalCommand(text) {
    const trimmed = text.trim()
    return trimmed.startsWith('$ ') || trimmed === '$'
}

function parseTerminalCommand(text) {
    const trimmed = text.trim()
    if (trimmed === '$') return { command: '', args: [] }
    
    const withoutDollar = trimmed.substring(2).trim()
    const parts = withoutDollar.split(/\s+/)
    const command = parts[0] || ''
    const args = parts.slice(1)
    
    return { command, args, raw: withoutDollar }
}

function extractMentionsFrom(msg) {
  const root = unwrapMessage(msg?.message)
  const ctx =
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
    root?.buttonsResponseMessage?.contextInfo ||
    root?.templateButtonReplyMessage?.contextInfo ||
    root?.interactiveResponseMessage?.contextInfo ||
    root?.listResponseMessage?.contextInfo ||
    null

  const list = ctx?.mentionedJid || []
  return Array.isArray(list) ? list.map(jidNormalizedUser) : []
}

function makeMessage(rt, msg, jid, sender, group, fromMe, text) {
  const quotedObj = extractQuoted(msg, sender)
  
  let quotedTag = ""
  if (quotedObj?.sender) {
    quotedTag = createWhatsAppMention(quotedObj.sender)
    quotedObj.tag = quotedTag
    quotedObj.displayName = getDisplayNameForMention(rt.store, quotedObj.sender, quotedObj.pushName)
  }

  const pushName = msg.pushName || "-"
  const senderName = getContactName(rt.store, sender, pushName)
  const senderTag = createWhatsAppMention(sender)

  const rawMentions = extractMentionsFrom(msg)
  const resolvedMentions = rawMentions.map(j => resolveLidToJid(rt.store, j))

  const m = {
    raw: msg,
    id: msg.key?.id,
    chat: jid,
    jid,
    sender,
    senderName,
    senderTag,
    pushName,
    fromMe,
    group,
    text,
    mentionedJid: resolvedMentions,
    quoted: quotedObj,
    reply: async (t, opt = {}) => {
      const s = String(t ?? "")
      if (!s) return
      if (opt?.mentions && Array.isArray(opt.mentions) && opt.mentions.length) {
        const cleanMentions = []
        for (const mention of opt.mentions) {
          const resolved = await resolveLidToJidSmart(rt, jid, mention)
          if (resolved && !resolved.endsWith("@lid")) {
            cleanMentions.push(resolved)
          }
        }
        
        if (cleanMentions.length === 1) {
          return await sendMessageWithMention(rt, jid, s, cleanMentions[0], {
            quoted: msg,
            ...opt
          })
        } else if (cleanMentions.length > 1) {
          let formattedText = s
          cleanMentions.forEach(jid => {
            const num = jidNormalizedUser(jid).split("@")[0]
            formattedText = formattedText.replace(new RegExp(`@${jid}`, 'gi'), `@${num}`)
          })
          
          return await rt.sock.sendMessage(jid, {
            text: formattedText,
            mentions: cleanMentions
          }, {
            quoted: msg,
            ...opt
          })
        }
      }
     
      try {
        return await fakeReply(rt.sock, jid, msg, s, opt)
      } catch {
        return rt.sock.sendMessage(jid, { text: s }, { quoted: msg, ...opt })
      }
    },

    send: async (content, opt = {}) => {
      const c = content || {}

      if (c?.mentions && Array.isArray(c.mentions) && c.mentions.length) {
        c.mentions = await resolveMentionsSmart(rt, jid, c.mentions)
        
        if (typeof c.text === 'string' && c.mentions.length > 0) {
          let formattedText = c.text
          c.mentions.forEach(jid => {
            const num = jidNormalizedUser(jid).split("@")[0]
            formattedText = formattedText.replace(new RegExp(`@${jid}`, 'gi'), `@${num}`)
          })
          c.text = formattedText
        }
      }

      if (typeof c === "string") return m.reply(c)
      if (c.text && Object.keys(c).length === 1) return m.reply(c.text)
      return rt.sock.sendMessage(jid, c, opt)
    },

    react: async (emoji) => {
      const e = String(emoji ?? "").trim()
      if (!e) return
      return rt.sock.sendMessage(jid, { react: { text: e, key: msg.key } })
    }
  }

  return m
}

function matchPlugins(plugins, cmd) {
  const out = []
  const c = String(cmd || "").toLowerCase()
  if (!c) return out

  for (const p of plugins || []) {
    const list = Array.isArray(p.command) ? p.command : []
    for (const it of list) {
      if (typeof it === "string" && it.toLowerCase() === c) out.push(p)
      else if (it instanceof RegExp && it.test(c)) out.push(p)
    }
  }
  return out
}

function toNum(x) {
  return String(x || "").split("@")[0].replace(/[^\d]/g, "")
}

function isOwnerOf(rt, sender) {
  const sn = toNum(sender)
  if (rt.isClone && rt.ownerNumber) {
    if (toNum(rt.ownerNumber) === sn) return true
  }
  return (rt.config.owner || []).some(o => toNum(o) === sn)
}

function getBotState(rt) {
  const d = rt.db?.data?.()
  const b = d?.meta?.bot || {}
  const allowRaw = String(b.allow || "all").toLowerCase()
  const modeRaw = String(b.mode || "public").toLowerCase()
  const allow = ["all", "pc", "gc"].includes(allowRaw) ? allowRaw : "all"
  const mode = ["public", "self"].includes(modeRaw) ? modeRaw : "public"
  return { allow, mode }
}

function isAllowedChat(allow, isGroupChat) {
  if (allow === "all") return true
  if (allow === "gc") return !!isGroupChat
  if (allow === "pc") return !isGroupChat
  return true
}

async function runMiddlewares(rt, m) {
  const plugins = rt.plugins || []
  for (const p of plugins) {
    if (typeof p?.middleware !== "function") continue
    try {
      await p.middleware({ m, rt })
    } catch (e) {
      rt.stats.errors++
      const msgErr = e?.output?.payload?.message || e?.message || String(e)
      console.log("[MIDDLEWARE ERROR]", p?.name || "-", msgErr)
    }
  }
}

function startSewaChecker(rt) {
    if (sewaCheckerInterval) clearInterval(sewaCheckerInterval);
    
    sewaCheckerInterval = setInterval(async () => {
        try {
            const now = Date.now();
            const allGroups = rt.db.getAllGroups();
            
            for (const [groupId, groupData] of Object.entries(allGroups)) {
                if (!groupId.endsWith('@g.us')) continue;
                
                const g = rt.db.getGroup(groupId);
                const sewa = g.sewa || {};
                if (sewa.active && sewa.endTime && sewa.endTime < now) {
                    console.log(`[SEWA] Masa sewa habis: ${groupId}`);
                    g.sewa.active = false;
                    g.sewa.endTime = 0;
                    await rt.db.save();
                    
                    try {
                        const groupName = await getGroupName(rt, groupId);
                        await rt.sock.sendMessage(groupId, {
                            text: `⚠️ *MASA SEWA TELAH BERAKHIR!*\n\n` +
                                  `Bot akan keluar dari grup dalam 1 jam.\n` +
                                  `Segera perpanjang dengan ketik *.bayarsewa*`
                        });
                    } catch (e) {}
                    
                    setTimeout(async () => {
                        try {
                            await rt.sock.groupLeave(groupId);
                            console.log(`[SEWA] Bot keluar: ${groupId}`);
                        } catch (e) {}
                    }, 60 * 60 * 1000);
                }
                else if (sewa.active && sewa.endTime) {
                    const timeLeft = sewa.endTime - now;
                    const oneDay = 24 * 60 * 60 * 1000;
                    const daysLeft = Math.ceil(timeLeft / oneDay);
                    
                    if (daysLeft <= 1 && daysLeft > 0) {
                        const lastReminder = sewa.lastReminder || 0;
                        const reminderCooldown = 12 * 60 * 60 * 1000; 
                        
                        if (now - lastReminder > reminderCooldown) {
                            const renterTag = sewa.renter ? createWhatsAppMention(sewa.renter) : "Penyewa";
                            
                            await rt.sock.sendMessage(groupId, {
                                text: `🔔 *PENGINGAT SEWA*\n\n` +
                                      `${renterTag}, masa sewa bot tinggal *${daysLeft} hari* lagi!\n` +
                                      `Segera perpanjang dengan ketik *.bayarsewa*`
                            });
                            g.sewa.lastReminder = now;
                            await rt.db.save();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[SEWA CHECKER ERROR]', error);
        }
    }, 5 * 60 * 1000);
}

async function checkSewaBlocker(rt, m) {
    try {
        if (!m.group) return false;
       
        const isOwner = isOwnerOf(rt, m.sender);
        if (isOwner) return false;
        
        const text = m.text || '';
        const isCommand = text.startsWith('.') || text.startsWith('#') || text.startsWith('!');
        
        if (!isCommand) return false;
        
        const cmdMatch = text.match(/^[.#!](\w+)/);
        const cmdName = cmdMatch ? cmdMatch[1].toLowerCase() : '';
        
        const allowedCommands = [
            'menu', 'help', 'sewa', 'ceksewa', 'bayarsewa', 'price',
            'owner', 'donasi', 'trial', 'batalbayar', 'out'
        ];
        
        if (allowedCommands.includes(cmdName)) {
            return false;
        }
        
        const g = rt.db.getGroup(m.chat);
        const now = Date.now();
        const groupAge = now - (g.createdAt || now);
        const trialPeriod = 1 * 24 * 60 * 60 * 1000;
        
        const cooldownKey = `${m.chat}:${m.sender}`;
        const lastWarning = warningCooldowns.get(cooldownKey) || 0;
        const canSendWarning = (now - lastWarning) > 60000;
        
        if (groupAge < trialPeriod && !g.sewa?.active) {
            if (trialPeriod - groupAge < 24 * 60 * 60 * 1000 && canSendWarning) {
                const hoursLeft = Math.floor((trialPeriod - groupAge) / (60 * 60 * 1000));
                if (hoursLeft < 24) {
                    
                    warningCooldowns.set(cooldownKey, now);
                }
            }
            return false;
        }
       
        if (!g.sewa?.active || (g.sewa.endTime && g.sewa.endTime < now)) {
            if (canSendWarning) {
                const senderTag = createWhatsAppMention(m.sender);
               
                warningCooldowns.set(cooldownKey, now);
            }
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error("[SEWA BLOKIR ERROR]", error);
        return false;
    }
}

function pickCtxFromRoot(root) {
  return (
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
    root?.buttonsResponseMessage?.contextInfo ||
    root?.templateButtonReplyMessage?.contextInfo ||
    root?.interactiveResponseMessage?.contextInfo ||
    root?.listResponseMessage?.contextInfo ||
    null
  )
}

function deepHasKey(obj, wantedKey, maxDepth = 7) {
  if (!obj || typeof obj !== "object") return false
  if (maxDepth <= 0) return false
  if (Object.prototype.hasOwnProperty.call(obj, wantedKey)) return true
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (v && typeof v === "object") {
      if (deepHasKey(v, wantedKey, maxDepth - 1)) return true
    }
  }
  return false
}

function isStatusMentionMessage(msgMessage) {
  const root = unwrapMessage(msgMessage || {})
  const ctx = pickCtxFromRoot(root)
  if (root?.groupStatusMentionMessage) return true
  if (deepHasKey(root, "groupStatusMentionMessage")) return true
  if (deepHasKey(ctx, "groupStatusMentionMessage")) return true

  return false
}

async function isSenderAdmin(rt, groupJid, senderJid) {
  try {
    const md = await rt.sock.groupMetadata(groupJid)
    const parts = md?.participants || []
    const sNum = toNum(senderJid)
    return parts.some(p => {
      const role = String(p.admin ?? "").toLowerCase()
      const ok = role === "admin" || role === "superadmin" || p.admin === true
      if (!ok) return false
      const pid = jidNormalizedUser(p.id || p.jid || p.lid || "")
      return toNum(pid) === sNum
    })
  } catch {
    return false
  }
}

async function handleAntiTagSW(rt, msg, jid, sender) {
  if (!isGroup(jid)) return
  const g = rt.db?.getGroup ? rt.db.getGroup(jid) : null
  if (!g?.antiTagSW) return
  if (!isStatusMentionMessage(msg?.message)) return
  if (isOwnerOf(rt, sender)) return
  const botId = jidNormalizedUser(rt.sock?.user?.id || "")
  if (botId && jidNormalizedUser(sender) === botId) return
  if (await isSenderAdmin(rt, jid, sender)) return
  const userDb = rt.db?.getUser ? rt.db.getUser(sender) : null
  if (!userDb) return

  userDb.warning = (userDb.warning || 0) + 1
  await rt.db.save?.().catch(() => {})

  const w = userDb.warning || 0
  const mention = sender
  
  const displayName = getDisplayNameForMention(rt.store, sender, "")
  const tagDisplay = displayName ? `@${displayName}` : `@${toNum(sender)}`

  await rt.sock.sendMessage(
    jid,
    {
      text:
        `🚫 *AntiTagSW* terdeteksi (Status Mention).\n` +
        `⚠️ ${tagDisplay} warn *${w}/3*\n\n` +
        `Jika mencapai 3 warn akan otomatis *kick*.`,
      mentions: [mention]
    },
    { quoted: msg }
  ).catch(() => {})

  if (w >= 3) {
    userDb.warning = 0
    await rt.db.save?.().catch(() => {})

    try {
      await rt.sock.groupParticipantsUpdate(jid, [mention], "remove")
      await rt.sock.sendMessage(
        jid,
        { text: `✅ Limit warn tercapai. ${tagDisplay} telah *dikick*.`, mentions: [mention] },
        { quoted: msg }
      ).catch(() => {})
    } catch (e) {
      const err = String(e?.output?.payload?.message || e?.message || e || "")
      await rt.sock.sendMessage(
        jid,
        { text: `Gagal kick. Pastikan bot admin.\n${err}` },
        { quoted: msg }
      ).catch(() => {})
    }
  }
}

async function checkPanelBuyerGroupRestriction(rt, m, cmdData) {
  if (!m.group) return false
  
  const isBuyerGroup = rt.db.isPanelBuyerGroup(m.chat)
  if (!isBuyerGroup) return false
  const panelCommands = [
    'buypanel', '3gb', '5gb', '10gb', 'unli', 'unlimited',
    'panelstatus', 'cekserver', 'myservers', 'panelinfo', 'panelhelp',
    'addpanelgroup', 'panelgrouplist', 
    'listpanel'
  ]
  
  const cmd = String(cmdData?.cmd || "").toLowerCase()
  const isPanelCommand = panelCommands.includes(cmd)
   if (isOwnerOf(rt, m.sender)) return false 
  
  if (!isPanelCommand) {
    await m.reply(`❌ gaboleh ya.`)
    return true
  }
  
  return false
}

async function checkCommandPermissions(rt, m, cmdData) {
    const cmd = String(cmdData?.cmd || "").toLowerCase();
    const db = rt.db;
    const isOwner = isOwnerOf(rt, m.sender);
    
    if (isOwner) return false;
    
    const ownerOnlyCommands = ["listserver", "delserver", "listpanel", "addresellergroup", "removeresellergroup", "resellergrouplist", "panelset"];
    if (ownerOnlyCommands.includes(cmd)) {
        await m.reply("❌ Command ini hanya untuk owner!");
        return true;
    }
    
    const unlimitedCommands = db.getPanelUnlimitedCommands?.() || ["3gb", "5gb", "10gb", "unli", "unlimited"];
    if (unlimitedCommands.includes(cmd)) {
        if (!m.group) {
            await m.reply("❌ Command ini hanya bisa digunakan di grup reseller panel!");
            return true;
        }
        
        const isResellerGroup = db.isResellerGroup?.(m.chat);
        if (!isResellerGroup) {
            await m.reply("❌ Command ini hanya bisa digunakan di grup reseller panel!");
            return true;
        }
        
        return false;
    }
    
    const buyerCommands = ["panelstatus", "cekserver", "myservers", "panelinfo", "panelhelp"];
    if (buyerCommands.includes(cmd)) {
        if (!m.group) {
            await m.reply("❌ Command ini hanya bisa digunakan di grup buyer panel!");
            return true;
        }
        
        const isBuyerGroup = db.isPanelBuyerGroup?.(m.chat);
        if (!isBuyerGroup) {
            await m.reply("❌ Command ini hanya bisa digunakan di grup buyer panel!");
            return true;
        }
        
        return false;
    }
    
    return false;
}

function startAutoSuspendChecker(rt) {
    if (autoSuspendInterval) clearInterval(autoSuspendInterval);
    
    autoSuspendInterval = setInterval(() => {
        try {
            const suspendedCount = rt.db.checkAndSuspendExpiredServers?.();
            if (suspendedCount > 0) {
                console.log(`[AUTO-SUSPEND] ${suspendedCount} server telah di-suspend otomatis`);
            }
        } catch (error) {
            console.error('[AUTO-SUSPEND ERROR]', error);
        }
    }, 24 * 60 * 60 * 1000);
}

export async function onMessagesUpsert(rt, upsert) {
  if (!upsert?.messages?.length) return

  const msg = upsert.messages[0]
  if (!msg?.message) return
  if (msg.key?.remoteJid === "status@broadcast") return

  const jid = msg.key.remoteJid
  if (!jid) return
  if (jid.endsWith("@newsletter")) return
  if (jid.endsWith("@broadcast")) return

  cacheMessage(msg)
  
  await handleMessageDelete(rt, msg)

  const fromMe = !!msg.key.fromMe
  const group = isGroup(jid)
  let rawSender = resolveParticipant(rt, msg, group)
  const sender = resolveLidToJid(rt.store, rawSender) 

  const text = pickText(msg)
  const m = makeMessage(rt, msg, jid, sender, group, fromMe, text)

  if (!group && text) {
    const urlRegex = /(https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
      for (const link of matches) {
        try {
          const inviteCode = link.split('/').pop();
          const groupId = await rt.sock.groupAcceptInvite(inviteCode);
          
          if (groupId) {
            const g = rt.db.getGroup(groupId);
            const now = Date.now();
            g.createdAt = now;
            await rt.db.save();
            
            setTimeout(async () => {
              try {
                await rt.sock.sendMessage(groupId, {
                  text: `🤖 *BOT TELAH BERGABUNG* 🤖\n\n` +
                        `Halo semuanya! Bot siap membantu.\n\n` +
                        `📢 *INFO PENTING:*\n` +
                        `• Masa trial: *3 hari gratis*\n` +
                        `• Setelah trial, harus sewa untuk terus pakai\n` +
                        `• Ketik *.price* untuk lihat harga sewa\n` +
                        `• Ketik *.menu* untuk melihat fitur\n\n` +
                        `Enjoy! 🎉`
                });
              } catch {}
            }, 2000);
          }
        } catch (error) {
          console.error("❌ Gagal join group:", error.message);
        }
      }
    }
  }

  if (isTerminalCommand(text)) {
    const isOwner = isOwnerOf(rt, sender)
    
    if (isOwner) {
      const terminalData = parseTerminalCommand(text)
      const ev = {
        m,
        cmd: '$',
        args: terminalData.args,
        q: terminalData.raw,
        isOwner: true,
        isPublic: false,
        prefix: '$',
        body: terminalData.raw
      }
      
      const terminalPlugin = rt.plugins?.find(p => 
        p.name === "terminal" || 
        (Array.isArray(p.command) && p.command.includes('$'))
      )
      
      if (terminalPlugin && terminalPlugin.run) {
        try {
          rt.stats.handled++
          await terminalPlugin.run(ev, rt)
        } catch (e) {
          rt.stats.errors++
          const msgErr = e?.output?.payload?.message || e?.message || String(e)
          await m.reply(`❌ Terminal Error: ${msgErr}`)
        }
        return 
      } else {
        await m.reply("❌ Terminal plugin tidak ditemukan. Install plugins/main/terminal.js")
        return
      }
    } else {
      
      return
    }
  }

  try {
    logMessage({
      from: m.senderName,
      msg: text || "-",
      time: new Date().toLocaleTimeString("id-ID"),
      group: group ? jid.split("@")[0] : "-",
      chat: jid
    })
  } catch {}

  try {
    if (rt.db?.touchUser) rt.db.touchUser(sender, m.pushName)
    if (group && rt.db?.touchGroup) rt.db.touchGroup(jid)
  } catch {}

  try {
    await handleAntiTagSW(rt, msg, jid, sender)
  } catch (e) {
    rt.stats.errors++
    const msgErr = e?.output?.payload?.message || e?.message || String(e)
    console.log("[AntiTagSW ERROR]", msgErr)
  }

  const isOwner = isOwnerOf(rt, sender)

  if (!isOwner && rt.db?.getUser) {
      const userDb = rt.db.getUser(sender)
      if (userDb && userDb.banned) {
          const isCmd = text.startsWith(rt.config.prefix) || text.startsWith(".") || text.startsWith("#")
          if (isCmd) {
              await m.reply("🚫 Kamu diblokir dan tidak bisa menggunakan bot ini.")
          }
          return 
      }
  }

  const st = getBotState(rt)

  if (!rt.__botBoot) {
    rt.__botBoot = true
    rt.config.publicMode = st.mode === "public"
  }

  if (!isOwner) {
    if (!isAllowedChat(st.allow, group)) return
    if (st.mode === "self") return
  }
  if (!text || !(text.startsWith('.') || text.startsWith('#') || text.startsWith('!'))) {
    await runMiddlewares(rt, m);
  }

  const cmdData = parseCommand(text, rt.config.prefix)
  if (!cmdData) return

  if (group) {
    const isBlockedBySewa = await checkSewaBlocker(rt, m)
    if (isBlockedBySewa) return
    
    const isPanelGroupRestricted = await checkPanelBuyerGroupRestriction(rt, m, cmdData)
    if (isPanelGroupRestricted) return
  }

  const isBlockedByPermission = await checkCommandPermissions(rt, m, cmdData)
  if (isBlockedByPermission) return

  try {
    if (group && rt.db?.getGroup) {
      const g = rt.db.getGroup(jid)
      const cmd = String(cmdData?.cmd || "").toLowerCase()
      if (g?.muted && cmd && cmd !== "mute") return
    }
  } catch {}

  const ev = { ...cmdData, m, isOwner, isPublic: rt.config.publicMode }

  const targets = matchPlugins(rt.plugins, ev.cmd)
  if (!targets.length) {
    const allCmds = []
    rt.plugins.forEach(p => {
        if (p.command && Array.isArray(p.command)) {
            p.command.forEach(c => { if(typeof c === 'string') allCmds.push(c) })
        }
    })

    const suggestions = [...new Set(allCmds)]
        .map(c => {
            const dist = levenshtein(ev.cmd, c)
            const maxLen = Math.max(ev.cmd.length, c.length)
            const score = (maxLen - dist) / maxLen
            return { cmd: c, score }
        })
        .filter(x => x.score > 0.50) 
        .sort((a, b) => b.score - a.score) 
        .slice(0, 3) 

    if (suggestions.length > 0) {
        const bestMatch = suggestions[0].cmd
        
        const buttons = suggestions.map(s => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: `${ev.prefix}${s.cmd}`,
                id: `${ev.prefix}${s.cmd}`
            })
        }))

        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: { text: `❓ Command *${ev.cmd}* tidak ditemukan.\n\nMungkin maksud kamu *${ev.prefix}${bestMatch}*?` },
                        footer: { text: "Klik tombol di bawah untuk memperbaiki" },
                        header: { title: "Sepertinya ada yang keliru", subtitle: "", hasMediaAttachment: false },
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: buttons
                        })
                    })
                }
            }
        }, { quoted: m.raw })

        await rt.sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    return 
  }

  for (const p of targets) {
    if (p.disable) continue
    if (!rt.config.publicMode && !isOwner) continue
    if (p.ownerOnly && !isOwner) continue
    if (p.groupOnly && !m.group) continue
    if (p.privateOnly && m.group) continue
    if (!p.run) continue

    if (rt.db?.getUser && !isOwner) {
        const user = rt.db.getUser(sender)
        const cmdName = String(ev.cmd).toLowerCase()
        
        const whitelist = [
            "menu", "allmenu", "hidetag","warn","kick","close","open","help", "list", "panel", "ping", "runtime",
            "profile", "status", "me", "asahotak","tebakgambar","siapakahaku","family100","tebaktebakan","caklontomg","tebakbendera",
            "lengkapikalimat","susunkata","nyerah",
            "cekenergy", "balance", "gold", "money", 
            "daily", "addenergy", "transferenergy","putar","bet","afk","close","open","hidetag","kick","warn",
            "rpg", "menurpg", "leaderboard", "top", "setrole", 
            "inv", "inventory", "saldo",
            "shop", "buy", "sell", "use", "upgrade", 
            "bank", "atm", "deposit", "depo", "withdraw", "wd",
            "forage", "hunt", "heal", "rest", "tidur", "cook"
        ]
        
        const isFree = whitelist.includes(cmdName)

        if (user && !isFree) {
            if (user.energy <= 0) {
                await m.reply(
                    `⚠️ *ENERGI HABIS (0/${user.maxEnergy})*\n` +
                    `Kamu terlalu lelah. Gunakan command berikut:\n\n` +
                    `💰 *.buy energy* (Beli pakai Gold)\n` +
                    `🎁 *ketik .daily untuk mengambil energy harian* `
                )
                continue 
            }
            
            user.energy -= 2
            await rt.db.save()
        }
    }

    try {
      rt.stats.handled++
      await p.run(ev, rt)
    } catch (e) {
      rt.stats.errors++
      const msgErr = e?.output?.payload?.message || e?.message || String(e)
      await m.reply(`Error: ${msgErr}`)
    }
  }
}

export async function handleButtonResponse(rt, msg) {
  try {
    const buttonResponse = msg.message?.buttonsResponseMessage || 
                          msg.message?.templateButtonReplyMessage
    
    if (!buttonResponse) return
    
    const buttonId = buttonResponse.selectedId || buttonResponse.selectedButtonId
    const chatJid = msg.key.remoteJid
    const fromMe = msg.key.fromMe
    if (buttonId?.startsWith('copy_')) {
      const url = buttonId.replace('copy_', '')
    }
    if (buttonId === 'copy_url') {
    }
    
  } catch (error) {
    console.error('Button response error:', error)
  }
}

export function createMentionTag(jid) {
  return createWhatsAppMention(jid)
}

export function getMentionNumber(jid) {
  return jidNormalizedUser(jid).split("@")[0]
}

export function getContactDisplayName(store, jid, fallback = "") {
  return getContactName(store, jid, fallback, true)
}

export async function sendMentionMessage(rt, chatJid, text, mentionJid, options = {}) {
  return await sendMessageWithMention(rt, chatJid, text, mentionJid, options)
                   }
