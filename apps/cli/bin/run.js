#!/usr/bin/env node

import { execute } from "@oclif/core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import CustomHelp from "../dist/help.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await execute({
  development: false,
  dir: join(__dirname, ".."),
  helpClass: CustomHelp,
});

