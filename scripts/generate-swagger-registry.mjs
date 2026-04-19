import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDir = path.join(__dirname, "..", "docs", "swagger");
const manifestPath = path.join(swaggerDir, "services.manifest.json");
const outputPath = path.join(swaggerDir, "openapi.index.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const aggregate = {
  version: manifest.version,
  generatedAt: new Date().toISOString(),
  services: manifest.services.map((service) => ({
    name: service.name,
    displayName: service.displayName,
    basePath: service.basePath,
    swaggerUrl: service.swaggerUrl,
    status: service.status,
    tags: service.tags
  }))
};

await writeFile(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);

