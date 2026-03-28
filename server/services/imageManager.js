const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const catalog = [
  {
    slug: "ubuntu-24.04",
    display_name: "Ubuntu 24.04 LTS",
    rootfs_url:
      "https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-amd64.tar.gz",
    sha256_url:
      "https://cloud-images.ubuntu.com/minimal/releases/noble/release/SHA256SUMS",
    size_gb: 0.5,
  },
  {
    slug: "debian-12",
    display_name: "Debian 12 (Bookworm)",
    rootfs_url:
      "https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-genericcloud-amd64.tar.xz",
    sha256_url:
      "https://cloud.debian.org/images/cloud/bookworm/latest/SHA256SUMS",
    size_gb: 0.3,
  },
];

const imagesDir = path.resolve(process.cwd(), "data", "images");

function ensureDir() {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function getExpectedSha256(image) {
  if (image.sha256) return image.sha256;
  if (!image.sha256_url) {
    throw new Error(`Missing SHA256 URL for ${image.slug}`);
  }
  const res = spawnSync("curl", ["-fsSL", image.sha256_url], {
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(`Failed to download checksum for ${image.slug}`);
  }
  const filename = path.basename(image.rootfs_url);
  const line = res.stdout
    .split("\n")
    .find((l) => l.trim().endsWith(filename));
  if (!line) {
    throw new Error(`Checksum not found for ${filename}`);
  }
  return line.split(/\s+/)[0];
}

function ensureImage(slug) {
  const image = catalog.find((img) => img.slug === slug);
  if (!image) {
    throw new Error(`Unknown image: ${slug}`);
  }
  ensureDir();
  const filename = path.basename(image.rootfs_url);
  const targetPath = path.join(imagesDir, filename);

  if (!fs.existsSync(targetPath)) {
    const dl = spawnSync("curl", ["-fsSL", image.rootfs_url, "-o", targetPath], {
      encoding: "utf8",
    });
    if (dl.status !== 0) {
      throw new Error(`Failed to download image ${slug}`);
    }
  }

  const expected = getExpectedSha256(image);
  const actual = sha256File(targetPath);
  if (expected !== actual) {
    throw new Error(`SHA256 mismatch for ${slug}`);
  }

  return targetPath;
}

function listImages() {
  ensureDir();
  return catalog.map((image) => {
    const filename = path.basename(image.rootfs_url);
    const targetPath = path.join(imagesDir, filename);
    return {
      id: image.slug,
      slug: image.slug,
      display_name: image.display_name,
      size_gb: image.size_gb,
      available: fs.existsSync(targetPath),
      rootfs_path: targetPath,
    };
  });
}

module.exports = { catalog, ensureImage, listImages };
