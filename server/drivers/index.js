const lxc = require("./lxc");
const gvisor = require("./gvisor");
const sysbox = require("./sysbox");
const qemuTcg = require("./qemu_tcg");

const drivers = [lxc, gvisor, sysbox, qemuTcg];
const registry = new Map();

for (const driver of drivers) {
  const available = Boolean(driver.isAvailable());
  registry.set(driver.name, { ...driver, available });
  console.log(`[driver] ${driver.name}: ${available ? "available" : "unavailable"}`);
}

function getDriver(name) {
  const driver = registry.get(name);
  if (!driver || !driver.available) {
    throw new Error("Driver not available");
  }
  return driver;
}

function getRecommended() {
  for (const driver of drivers) {
    const entry = registry.get(driver.name);
    if (entry?.available) return entry;
  }
  throw new Error("No available drivers");
}

function listDrivers() {
  return drivers.map((driver) => {
    const entry = registry.get(driver.name);
    return {
      id: driver.name,
      name: driver.name,
      available: entry?.available ?? false,
      ...driver.metadata,
    };
  });
}

module.exports = { registry, getDriver, getRecommended, listDrivers };
