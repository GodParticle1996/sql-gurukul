/* =====================================================================
   SQL Gurukul — Ranks, Tracks & shared FACTORY database seed
   Naya track add karna ho? Yahan ek entry + ek nayi data-<track>.js file.

   Domain: asli factory-testing DB se inspired (aas-api) —
   BX50 device builds, BMS board tests, operators, sessions, firmware.
   ===================================================================== */

const RANKS = [
  { xp: 0,    name: 'Query Shishya',        icon: '🐣' },
  { xp: 200,  name: 'SELECT Sevak',         icon: '🔍' },
  { xp: 450,  name: 'WHERE Wala',           icon: '🎯' },
  { xp: 750,  name: 'JOIN Jodidar',         icon: '🔗' },
  { xp: 1100, name: 'GROUP BY Gyani',       icon: '📊' },
  { xp: 1500, name: 'Index Acharya',        icon: '⚡' },
  { xp: 1950, name: 'Transaction Tapasvi',  icon: '🔒' },
  { xp: 2450, name: 'Schema Shilpi',        icon: '🏗️' },
  { xp: 3000, name: 'Optimizer Ojha',       icon: '🚀' },
  { xp: 3600, name: 'Replication Rishi',    icon: '🌐' },
  { xp: 4300, name: 'Database Mahaguru',    icon: '👑' },
];

/* Tracks unlock sequentially: Beginner → Intermediate → Advanced. */
SG.tracks = [
  {
    id: 'beginner',
    icon: '🌱',
    name: 'Beginner — Query Shishya Path',
    blurb: 'Database kya hota hai se shuru. SELECT, WHERE, INSERT/UPDATE/DELETE, data types, GROUP BY, keys — Boss: pehli factory report khud likho.',
    certTitle: 'QUERY PANDIT',
    certSub: 'Certificate of SQL Foundations',
    motto: 'UPDATE se pehle WHERE — yehi pehla vachan hai.',
    formula: 'Database ⊃ Tables ⊃ Rows ⊃ Columns (+ types & keys)',
  },
  {
    id: 'intermediate',
    icon: '🔥',
    name: 'Intermediate — JOIN Sadhak Path',
    blurb: 'Tables ko jodna seekho. INNER/LEFT JOIN, foreign keys, subqueries, normalization, indexes + EXPLAIN, ALTER/migrations — Boss: slow dashboard bachao.',
    certTitle: 'JOIN SADHAK',
    certSub: 'Certificate of Relational Mastery',
    motto: 'Data ek jagah, reference har jagah — duplicate mat karo, JOIN karo.',
    formula: 'Report = JOIN + GROUP BY + Index (EXPLAIN se proof)',
  },
  {
    id: 'advanced',
    icon: '🚀',
    name: 'Advanced — Schema Guru Path',
    blurb: 'Production DBA ka shastra. Transactions/ACID, isolation levels, views & window functions, query tuning, SQL injection se bachao, backup & replication — Final Boss: 3AM database down.',
    certTitle: 'DATABASE MAHAGURU',
    certSub: 'Certificate of Production Database Mastery',
    motto: 'Jo COMMIT nahi hua woh hua hi nahi; jo backup nahi hai woh data nahi hai.',
    formula: 'Prod = ACID + Index + Prepared Statements + Backup + Replica',
  },
  {
    id: 'scale',
    icon: '⚙️',
    name: 'Scale & Internals — Bhaar Ka Rasta',
    blurb: 'Ab DB ko CHALANA seekho. Connection pool, join algorithms & optimizer, locks/MVCC, slow query log, bulk writes, partitioning, replicas, sharding, aur CAP ka asli matlab — sab sliders aur live EXPLAIN ke saath. Final Boss: ek DB jo har taraf se dab raha hai.',
    certTitle: 'SCALE SHILPI',
    certSub: 'Certificate of Database Operations at Scale',
    motto: 'Pehle service time ghatao. Pool badhana uske BAAD ka kadam hai.',
    formula: 'Capacity = pool × (1000 / query_ms) — aur pool badhana muft nahi hai',
  },
  {
    id: 'internals',
    icon: '🔬',
    name: 'Database Internals — Andar Kya Chal Raha Hai',
    blurb: 'WAL/redo log, checkpoint aur crash recovery, MVCC ke versions, partitioning aur pruning, columnar storage, Postgres ka sharding ka rasta, aur 50 TB ka migration. Har level mein MySQL aur Postgres dono ka tareeka, aur asli containers par chalne wale labs.',
    certTitle: 'ENGINE KHOJI',
    certSub: 'Certificate of Database Internals',
    motto: 'Query tez tab hoti hai jab pata ho ki engine disk par kya likh raha hai.',
    formula: 'Durability = WAL pehle, data page baad mein — baaki sab uske upar bana hai',
    alwaysUnlocked: true,
  },
];

/* =====================================================================
   FACTORY DB — shared seed for terminal missions.
   Har mission deep-clone karta hai, isliye ek hi object sab jagah safe hai.
   SG.factoryDB() naya deep clone deta hai jab mission ko tweak karna ho.
   Schema asli aas-api tables ka simplified roop hai:
     bx50Builds  ← builds (buildNum unique, type, duration ms, active)
     bx50Data    ← device registry (FK buildNum → bx50Builds.buildNum)
     bx50Sessions← testing sessions (FK buildNum, userId → operators.opId)
     operators   ← factory operators
     bmsTester   ← BMS board test results (UUID pk, per-test pass/fail)
     adcTestResult ← ADC tester results (-1 fail / 0 pending / 1 pass)
     firmwareFiles ← uploaded firmware binaries
   ===================================================================== */
const FACTORY_DB = {
  tables: {
    bx50Builds: {
      columns: [
        { name: 'id', type: 'INT', pk: true, autoInc: true },
        { name: 'buildNum', type: 'INT', notNull: true, unique: true },
        { name: 'type', type: 'VARCHAR(50)', notNull: true },
        { name: 'startDate', type: 'DATETIME' },
        { name: 'duration', type: 'BIGINT' },              // milliseconds — asli DB mein INT tha, overflow hua, migration se BIGINT bana!
        { name: 'active', type: 'BOOLEAN', default: 1, notNull: true },
        { name: 'partNumber', type: 'VARCHAR(50)' },
      ],
      indexes: [],
      rows: [
        { id: 1, buildNum: 1041, type: 'Gen4', startDate: '2026-06-02 09:15:00', duration: 5400000, active: 1, partNumber: 'P-4410' },
        { id: 2, buildNum: 1042, type: 'Gen3', startDate: '2026-06-05 10:30:00', duration: 7200000, active: 1, partNumber: null },
        { id: 3, buildNum: 1043, type: 'Gen4', startDate: '2026-06-09 08:05:00', duration: 3600000, active: 0, partNumber: 'P-4411' },
        { id: 4, buildNum: 1044, type: 'Gen4', startDate: '2026-06-14 11:45:00', duration: 9000000, active: 1, partNumber: 'P-4410' },
        { id: 5, buildNum: 1045, type: 'Gen3', startDate: '2026-06-18 14:20:00', duration: 4500000, active: 1, partNumber: 'P-3300' },
        { id: 6, buildNum: 1046, type: 'Gen4', startDate: '2026-06-23 09:00:00', duration: 6300000, active: 0, partNumber: null },
        { id: 7, buildNum: 1047, type: 'Gen4', startDate: '2026-06-28 16:10:00', duration: 8100000, active: 1, partNumber: 'P-4412' },
      ],
    },
    bx50Data: {
      columns: [
        { name: 'id', type: 'INT', pk: true, autoInc: true },
        { name: 'bx50Name', type: 'VARCHAR(100)' },
        { name: 'ip', type: 'VARCHAR(45)' },
        { name: 'nucSerialNum', type: 'VARCHAR(100)' },
        { name: 'buildNum', type: 'INT', notNull: true },   // FK → bx50Builds.buildNum
        { name: 'status', type: 'VARCHAR(50)', default: 'Not Built', notNull: true },
        { name: 'bx50Status', type: 'INT', default: 0 },    // -3 valFail, -2 buildFail, -1 err, 0 unreg, 1 reg, 2 building, 3 validating, 4 provisioned
        { name: 'secure', type: 'BOOLEAN', default: 0 },
        { name: 'customerLocation', type: 'VARCHAR(100)' },
        { name: 'bx50Gen', type: 'VARCHAR(20)' },
      ],
      indexes: [],
      rows: [
        { id: 1, bx50Name: 'bx50-tokyo-01', ip: '10.1.0.11', nucSerialNum: 'NUC-88121', buildNum: 1041, status: 'Provisioned', bx50Status: 4, secure: 1, customerLocation: 'Tokyo', bx50Gen: 'Gen4' },
        { id: 2, bx50Name: 'bx50-pune-01', ip: null, nucSerialNum: 'NUC-88134', buildNum: 1042, status: 'Building', bx50Status: 2, secure: 0, customerLocation: 'Pune', bx50Gen: 'Gen3' },
        { id: 3, bx50Name: 'bx50-osaka-01', ip: '10.1.0.13', nucSerialNum: 'NUC-88156', buildNum: 1099, status: 'Error', bx50Status: -1, secure: 0, customerLocation: 'Osaka', bx50Gen: 'Gen4' },
        { id: 4, bx50Name: 'bx50-detroit-01', ip: '10.2.0.21', nucSerialNum: 'NUC-88170', buildNum: 1044, status: 'Provisioned', bx50Status: 4, secure: 1, customerLocation: 'Detroit', bx50Gen: 'Gen4' },
        { id: 5, bx50Name: 'bx50-pune-02', ip: '10.1.0.15', nucSerialNum: 'NUC-88171', buildNum: 1045, status: 'Validating', bx50Status: 3, secure: 0, customerLocation: 'Pune', bx50Gen: 'Gen3' },
        { id: 6, bx50Name: 'bx50-tokyo-02', ip: null, nucSerialNum: 'NUC-88190', buildNum: 1047, status: 'Not Built', bx50Status: 0, secure: 0, customerLocation: 'Tokyo', bx50Gen: 'Gen4' },
        { id: 7, bx50Name: 'bx50-lab-01', ip: '10.9.0.5', nucSerialNum: 'NUC-88201', buildNum: 1044, status: 'Provisioned', bx50Status: 4, secure: 0, customerLocation: null, bx50Gen: 'Gen4' },
      ],
    },
    bx50Sessions: {
      columns: [
        { name: 'id', type: 'INT', pk: true, autoInc: true },
        { name: 'userId', type: 'VARCHAR(20)', notNull: true },  // FK → operators.opId
        { name: 'buildNum', type: 'INT', notNull: true },        // FK → bx50Builds.buildNum
        { name: 'startDate', type: 'DATETIME' },
        { name: 'duration', type: 'BIGINT' },
      ],
      indexes: [],
      rows: [
        { id: 1, userId: 'OP-101', buildNum: 1041, startDate: '2026-06-02 09:20:00', duration: 1800000 },
        { id: 2, userId: 'OP-102', buildNum: 1041, startDate: '2026-06-02 11:00:00', duration: 2400000 },
        { id: 3, userId: 'OP-101', buildNum: 1042, startDate: '2026-06-05 10:40:00', duration: 3600000 },
        { id: 4, userId: 'OP-103', buildNum: 1044, startDate: '2026-06-14 12:00:00', duration: 1200000 },
        { id: 5, userId: 'OP-101', buildNum: 1044, startDate: '2026-06-14 13:30:00', duration: 2700000 },
        { id: 6, userId: 'OP-102', buildNum: 1045, startDate: '2026-06-18 14:30:00', duration: 900000 },
        { id: 7, userId: 'OP-103', buildNum: 1047, startDate: '2026-06-28 16:20:00', duration: 4200000 },
        { id: 8, userId: 'OP-104', buildNum: 1047, startDate: '2026-06-28 18:00:00', duration: 600000 },
      ],
    },
    operators: {
      columns: [
        { name: 'opId', type: 'VARCHAR(20)', pk: true },
        { name: 'name', type: 'VARCHAR(100)', notNull: true },
        { name: 'shift', type: 'VARCHAR(10)' },
        { name: 'station', type: 'VARCHAR(50)' },
      ],
      indexes: [],
      rows: [
        { opId: 'OP-101', name: 'Ravi Kumar', shift: 'day', station: 'BMS-line-1' },
        { opId: 'OP-102', name: 'Priya Sharma', shift: 'night', station: 'BMS-line-1' },
        { opId: 'OP-103', name: 'Amit Patel', shift: 'day', station: 'BX50-bay' },
        { opId: 'OP-104', name: 'Sara Khan', shift: 'night', station: 'ADC-bench' },
        { opId: 'OP-105', name: 'Vikram Rao', shift: 'day', station: 'ADC-bench' },   // koi session/test nahi — LEFT JOIN lesson ke liye
      ],
    },
    bmsTester: {
      columns: [
        { name: 'id', type: 'CHAR(36)', pk: true },          // UUID — asli table mein bhi UUID hai
        { name: 'operatorId', type: 'VARCHAR(20)' },         // FK → operators.opId
        { name: 'buildNumber', type: 'VARCHAR(20)' },
        { name: 'client', type: 'VARCHAR(50)' },
        { name: 'board', type: 'VARCHAR(20)' },
        { name: 'status', type: 'VARCHAR(10)' },             // pass / fail
        { name: 'serial', type: 'VARCHAR(10)' },
        { name: 'dido', type: 'VARCHAR(10)' },
        { name: 'ntc', type: 'VARCHAR(10)' },
        { name: 'currentShunt', type: 'VARCHAR(10)' },
        { name: 'hv', type: 'VARCHAR(10)' },
        { name: 'can', type: 'VARCHAR(10)' },
        { name: 'eeprom', type: 'VARCHAR(10)' },
      ],
      indexes: [],
      rows: [
        { id: 'a1b2c3d4-0001', operatorId: 'OP-101', buildNumber: 'B-2201', client: 'Komatsu', board: 'BMS-A', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0002', operatorId: 'OP-101', buildNumber: 'B-2201', client: 'Komatsu', board: 'BMS-A', status: 'fail', serial: 'pass', dido: 'pass', ntc: 'fail', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0003', operatorId: 'OP-102', buildNumber: 'B-2202', client: 'Hitachi', board: 'BMS-B', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0004', operatorId: 'OP-102', buildNumber: 'B-2202', client: 'Hitachi', board: 'BMS-B', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0005', operatorId: 'OP-101', buildNumber: 'B-2203', client: 'Denyo', board: 'BMS-A', status: 'fail', serial: 'pass', dido: 'fail', ntc: 'pass', currentShunt: 'fail', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0006', operatorId: 'OP-104', buildNumber: 'B-2203', client: 'Denyo', board: 'BMS-A', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0007', operatorId: 'OP-102', buildNumber: 'B-2204', client: 'Komatsu', board: 'BMS-B', status: 'fail', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'fail', can: 'fail', eeprom: 'pass' },
        { id: 'a1b2c3d4-0008', operatorId: 'OP-103', buildNumber: 'B-2204', client: 'Komatsu', board: 'BMS-A', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0009', operatorId: 'OP-104', buildNumber: 'B-2205', client: 'Hitachi', board: 'BMS-B', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
        { id: 'a1b2c3d4-0010', operatorId: 'OP-101', buildNumber: 'B-2205', client: 'Denyo', board: 'BMS-B', status: 'pass', serial: 'pass', dido: 'pass', ntc: 'pass', currentShunt: 'pass', hv: 'pass', can: 'pass', eeprom: 'pass' },
      ],
    },
    adcTestResult: {
      columns: [
        { name: 'id', type: 'INT', pk: true, autoInc: true },
        { name: 'buildNum', type: 'INT', notNull: true },
        { name: 'dateCode', type: 'VARCHAR(20)' },
        { name: 'flashing', type: 'INT', default: 0, notNull: true },      // -1 fail / 0 pending / 1 pass
        { name: 'zeroing', type: 'INT', default: 0, notNull: true },
        { name: 'chargeState', type: 'INT', default: 0, notNull: true },
        { name: 'dischargeState', type: 'INT', default: 0, notNull: true },
        { name: 'primaryCAN', type: 'INT', default: 0, notNull: true },
        { name: 'secondaryCAN', type: 'INT', default: 0, notNull: true },
        { name: 'progress', type: 'INT', default: 0, notNull: true },
        { name: 'failureType', type: 'VARCHAR(100)' },
      ],
      indexes: [],
      rows: [
        { id: 1, buildNum: 501, dateCode: '2624', flashing: 1, zeroing: 1, chargeState: 1, dischargeState: 1, primaryCAN: 1, secondaryCAN: 1, progress: 100, failureType: null },
        { id: 2, buildNum: 502, dateCode: '2624', flashing: 1, zeroing: 1, chargeState: -1, dischargeState: 0, primaryCAN: 0, secondaryCAN: 0, progress: 45, failureType: 'charge relay stuck' },
        { id: 3, buildNum: 503, dateCode: '2625', flashing: 1, zeroing: -1, chargeState: 0, dischargeState: 0, primaryCAN: 0, secondaryCAN: 0, progress: 20, failureType: 'shunt drift' },
        { id: 4, buildNum: 504, dateCode: '2625', flashing: 1, zeroing: 1, chargeState: 1, dischargeState: 1, primaryCAN: -1, secondaryCAN: 0, progress: 80, failureType: 'CAN timeout' },
        { id: 5, buildNum: 505, dateCode: '2626', flashing: 1, zeroing: 1, chargeState: 1, dischargeState: 1, primaryCAN: 1, secondaryCAN: 1, progress: 100, failureType: null },
      ],
    },
    firmwareFiles: {
      columns: [
        { name: 'id', type: 'INT', pk: true, autoInc: true },
        { name: 'fileName', type: 'VARCHAR(255)', notNull: true },
        { name: 'version', type: 'VARCHAR(20)', notNull: true },
        { name: 'deviceType', type: 'VARCHAR(50)', notNull: true },
        { name: 'uploadedAt', type: 'DATETIME' },
      ],
      indexes: [],
      rows: [
        { id: 1, fileName: 'bms_fw_2_1_0.bin', version: '2.1.0', deviceType: 'BMS', uploadedAt: '2026-05-20 10:00:00' },
        { id: 2, fileName: 'bms_fw_2_2_0.bin', version: '2.2.0', deviceType: 'BMS', uploadedAt: '2026-06-15 09:30:00' },
        { id: 3, fileName: 'adc_fw_1_4_2.bin', version: '1.4.2', deviceType: 'ADC', uploadedAt: '2026-06-01 14:00:00' },
        { id: 4, fileName: 'cloudlink_3_0_1.img', version: '3.0.1', deviceType: 'cloudLink', uploadedAt: '2026-06-25 11:00:00' },
      ],
    },
  },
};

/* Fresh deep clone — jab mission ko seed tweak karke use karna ho */
SG.factoryDB = function (mutate) {
  const db = JSON.parse(JSON.stringify(FACTORY_DB));
  if (mutate) mutate(db);
  return db;
};
