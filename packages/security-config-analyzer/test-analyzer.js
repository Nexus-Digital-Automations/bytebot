#!/usr/bin/env node

try {
  const {
    DockerSecurityAnalyzer,
  } = require("./dist/analyzers/docker-analyzer.js");
  console.log("✅ DockerSecurityAnalyzer constructor available");

  const analyzer = new DockerSecurityAnalyzer();
  console.log("✅ DockerSecurityAnalyzer instantiated successfully");

  const methods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(analyzer),
  ).filter((m) => m !== "constructor");
  console.log("Available methods:", methods);

  // Test database analyzer
  const {
    DatabaseSecurityAnalyzer,
  } = require("./dist/analyzers/database-analyzer.js");
  console.log("✅ DatabaseSecurityAnalyzer available");

  // Test service analyzer
  const {
    ServiceSecurityAnalyzer,
  } = require("./dist/analyzers/service-analyzer.js");
  console.log("✅ ServiceSecurityAnalyzer available");

  // Test system analyzer
  const {
    SystemSecurityAnalyzer,
  } = require("./dist/analyzers/system-analyzer.js");
  console.log("✅ SystemSecurityAnalyzer available");

  // Test types
  const types = require("./dist/types/index.js");
  console.log("✅ Types module available");
  console.log("Available types:", Object.keys(types));

  console.log("\n🎉 All security analyzer components loaded successfully!");
} catch (e) {
  console.error("❌ Security analyzer test failed:", e.message);
  console.error("Stack:", e.stack);
  process.exit(1);
}
