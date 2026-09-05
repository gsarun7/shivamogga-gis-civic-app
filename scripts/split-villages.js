import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const inputPath = path.join(
  projectDirectory,
  "src",
  "data",
  "Karnataka",
  "karnataka-villages.geojson",
);
const outputDirectory = path.join(projectDirectory, "src", "data", "villages");

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const byDistrict = new Map();

for (const feature of source.features) {
  const district = feature.properties?.district?.trim();
  if (!district) {
    throw new Error("Every village feature must have a district property.");
  }

  const slug = slugify(district);
  if (!slug) {
    throw new Error(
      `Could not create a filename slug for district: ${district}`,
    );
  }

  if (!byDistrict.has(slug)) {
    byDistrict.set(slug, { district, features: [] });
  }
  byDistrict.get(slug).features.push(feature);
}

fs.mkdirSync(outputDirectory, { recursive: true });

for (const [slug, districtData] of byDistrict) {
  const output = {
    type: "FeatureCollection",
    features: districtData.features,
  };
  fs.writeFileSync(
    path.join(outputDirectory, `${slug}.geojson`),
    `${JSON.stringify(output)}\n`,
  );
  console.log(
    `${districtData.district}: ${districtData.features.length} features`,
  );
}

console.log(
  `Wrote ${byDistrict.size} district files with ${source.features.length} village features.`,
);
