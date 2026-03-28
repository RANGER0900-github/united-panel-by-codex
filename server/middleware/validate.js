const ALLOWED_IMAGES = ["ubuntu-24.04", "debian-12"];
const ALLOWED_TECH = ["lxc", "gvisor", "sysbox", "qemu_tcg"];

function sanitizeString(str) {
  return String(str || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function validateVPSInput(body) {
  const errors = [];
  const name = body?.name;
  const cpu = Number(body?.cpu);
  const ram_mb = Number(body?.ram_mb);
  const disk_gb = Number(body?.disk_gb);
  const image = body?.image;
  const technology = body?.technology;

  if (!name || typeof name !== "string") {
    errors.push("name is required");
  } else {
    const sanitized = sanitizeString(name);
    if (sanitized !== name) {
      errors.push("name contains invalid characters");
    }
    if (name.length < 3 || name.length > 32) {
      errors.push("name must be 3-32 characters");
    }
  }

  if (!Number.isInteger(cpu) || cpu < 1 || cpu > 16) {
    errors.push("cpu must be an integer between 1 and 16");
  }

  if (!Number.isInteger(ram_mb) || ram_mb < 128 || ram_mb > 32768) {
    errors.push("ram_mb must be an integer between 128 and 32768");
  }

  if (!Number.isInteger(disk_gb) || disk_gb < 1 || disk_gb > 500) {
    errors.push("disk_gb must be an integer between 1 and 500");
  }

  if (!image || !ALLOWED_IMAGES.includes(image)) {
    errors.push("image must be one of the allowed images");
  }

  if (!technology || !ALLOWED_TECH.includes(technology)) {
    errors.push("technology must be one of the allowed drivers");
  }

  if (body?.storage_path && typeof body.storage_path !== "string") {
    errors.push("storage_path must be a string");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { sanitizeString, validateVPSInput, ALLOWED_IMAGES, ALLOWED_TECH };
