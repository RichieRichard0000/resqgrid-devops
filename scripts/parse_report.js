const fs = require('fs');

function parse(path) {
  if (!fs.existsSync(path)) {
    console.log("File not found:", path);
    return;
  }
  const r = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log("=== Report Summary: " + (r.projectInfo ? r.projectInfo.name : "N/A") + " ===");
  if (r.scanInfo && r.scanInfo.dataSource) {
    r.scanInfo.dataSource.forEach(d => console.log("DataSource: " + d.name + " -> " + d.timestamp));
  }
  let total = 0;
  let counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  let items = [];
  if (r.dependencies) {
    r.dependencies.forEach(d => {
      if (d.vulnerabilities) {
        d.vulnerabilities.forEach(v => {
          total++;
          const sev = (v.severity || "LOW").toUpperCase();
          counts[sev] = (counts[sev] || 0) + 1;
          items.push({ file: d.fileName, name: v.name, sev: sev });
        });
      }
    });
  }
  console.log("Total Vulnerabilities:", total);
  console.log("Severity Counts:", JSON.stringify(counts));
  items.slice(0, 10).forEach(i => console.log(`  [${i.sev}] ${i.file} -> ${i.name}`));
}

const target = process.argv[2] || "/tmp/dc-backend-full/dependency-check-report.json";
parse(target);
