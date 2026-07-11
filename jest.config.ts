module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    silent: true,
    verbose: true,
    // Suites run against a single shared dev Postgres database (no per-worker test
    // DB), so Jest's default parallel workers cause real contention/connection
    // exhaustion between suites — beforeAll hooks intermittently time out under
    // load even though each suite passes cleanly on its own. Serializing avoids
    // that; a real dedicated test database (see ENGINEERING_AUDIT.md) would let
    // this run in parallel again.
    maxWorkers: 1,
    // Each suite's beforeAll does a real sequelize.sync() against that shared
    // Postgres DB, which comfortably exceeds Jest's 5000ms default hook timeout
    // under any load. 15s covers that with headroom without masking a genuinely
    // hung test.
    testTimeout: 15000
};
