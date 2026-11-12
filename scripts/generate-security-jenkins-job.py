import os

pipeline_script = """pipeline {
    agent any

    options {
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
        NODE_OPTIONS = '--max-old-space-size=768'
    }

    stages {
        stage('1. Source Snapshot Validation') {
            steps {
                echo '==> Stage 1: Validating source snapshot manifests and baseline memory...'
                sh '''
                    echo "=== Host Memory Baseline ==="
                    free -h
                    echo "=== Manifest Verification ==="
                    test -f package.json && echo "Found root package.json"
                    test -f backend/package.json && echo "Found backend/package.json"
                    test -f frontend/package.json && echo "Found frontend/package.json"
                    test -f package-lock.json && echo "Found package-lock.json"
                    echo "=== Workspace File Count ==="
                    ls -la
                '''
            }
        }

        stage('2. Install Dependencies') {
            steps {
                echo '==> Stage 2: Installing dependencies reproducibly with existing lockfile...'
                sh '''
                    echo "--- Memory Before npm ci ---"
                    free -h
                    npm ci --prefer-offline --no-audit
                    echo "--- Memory After npm ci ---"
                    free -h
                '''
            }
        }

        stage('3. Backend TypeScript Check') {
            steps {
                echo '==> Stage 3: Running backend TypeScript check (tsc --noEmit)...'
                sh '''
                    echo "--- Memory Before Backend Lint ---"
                    free -h
                    npm --workspace=backend run lint
                    echo "--- Memory After Backend Lint ---"
                    free -h
                '''
            }
        }

        stage('4. Frontend TypeScript Check') {
            steps {
                echo '==> Stage 4: Running frontend TypeScript check (tsc --noEmit)...'
                sh '''
                    echo "--- Memory Before Frontend Lint ---"
                    free -h
                    npm --workspace=frontend run lint
                    echo "--- Memory After Frontend Lint ---"
                    free -h
                '''
            }
        }

        stage('5. Backend Unit Tests') {
            steps {
                echo '==> Stage 5: Executing backend automated unit and integration tests...'
                sh '''
                    echo "--- Memory Before Backend Tests ---"
                    free -h
                    npm --workspace=backend run test -- --reporter=default --reporter=junit --outputFile=junit.xml
                    echo "--- Memory After Backend Tests ---"
                    free -h
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/junit.xml'
                }
            }
        }

        stage('6. Frontend Unit Tests') {
            steps {
                echo '==> Stage 6: Executing frontend automated unit tests...'
                sh '''
                    echo "--- Memory Before Frontend Tests ---"
                    free -h
                    npm --workspace=frontend run test -- --reporter=default --reporter=junit --outputFile=junit.xml
                    echo "--- Memory After Frontend Tests ---"
                    free -h
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/junit.xml'
                }
            }
        }

        stage('7. Backend Production Build') {
            steps {
                echo '==> Stage 7: Compiling backend production distribution...'
                sh '''
                    echo "--- Memory Before Backend Build ---"
                    free -h
                    npm --workspace=backend run build
                    echo "--- Memory After Backend Build ---"
                    free -h
                    test -d backend/dist && echo "Backend build verified: $(ls -1 backend/dist | wc -l) items in backend/dist"
                '''
            }
        }

        stage('8. Frontend Production Build') {
            steps {
                echo '==> Stage 8: Building frontend production assets via Vite...'
                sh '''
                    echo "--- Memory Before Frontend Build ---"
                    free -h
                    npm --workspace=frontend run build
                    echo "--- Memory After Frontend Build ---"
                    free -h
                    test -d frontend/dist && echo "Frontend build verified: $(ls -1 frontend/dist | wc -l) items in frontend/dist"
                '''
            }
        }

        stage('9. Trivy Vulnerability Scan') {
            steps {
                echo '==> Stage 9: Scanning project filesystem for vulnerabilities with Aqua Trivy...'
                sh '''
                    set -e
                    mkdir -p security-reports/trivy
                    echo "=== Trivy Engine Information ==="
                    trivy --version

                    echo "=== Executing Trivy Filesystem Scan (LOW, MEDIUM, HIGH, CRITICAL) ==="
                    trivy fs \\
                        --scanners vuln \\
                        --severity LOW,MEDIUM,HIGH,CRITICAL \\
                        --skip-dirs node_modules,dist,.git,coverage,tmp \\
                        -o security-reports/trivy/trivy-report.txt \\
                        .

                    trivy fs \\
                        --scanners vuln \\
                        --severity LOW,MEDIUM,HIGH,CRITICAL \\
                        --skip-dirs node_modules,dist,.git,coverage,tmp \\
                        --format json \\
                        -o security-reports/trivy/trivy-report.json \\
                        .

                    echo "=== Trivy Console Report ==="
                    cat security-reports/trivy/trivy-report.txt

                    echo "=== Trivy Vulnerability Summary ==="
                    node -e '
                        const fs = require("fs");
                        const r = JSON.parse(fs.readFileSync("security-reports/trivy/trivy-report.json", "utf8"));
                        let counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
                        let vulns = [];
                        if (r.Results) {
                            for (const res of r.Results) {
                                if (res.Vulnerabilities) {
                                    for (const v of res.Vulnerabilities) {
                                        counts[v.Severity] = (counts[v.Severity] || 0) + 1;
                                        vulns.push({ target: res.Target, pkg: v.PkgName, id: v.VulnerabilityID, sev: v.Severity });
                                    }
                                }
                            }
                        }
                        console.log(`Trivy Severity Counts: CRITICAL: ${counts.CRITICAL} | HIGH: ${counts.HIGH} | MEDIUM: ${counts.MEDIUM} | LOW: ${counts.LOW}`);
                        if (vulns.length > 0) {
                            console.log("Findings Details:");
                            vulns.forEach(item => console.log(`  - [${item.sev}] ${item.pkg} (${item.id}) in ${item.target}`));
                        }
                    '
                '''
            }
        }

        stage('10. OWASP Dependency-Check') {
            steps {
                echo '==> Stage 10: Executing OWASP Dependency-Check on backend and frontend dependencies...'
                sh '''
                    set -e
                    mkdir -p security-reports/dependency-check-backend
                    mkdir -p security-reports/dependency-check-frontend

                    DATA_DIR="/var/jenkins_home/dependency-check-data"
                    SUPPRESSIONS="dependency-check-suppressions.xml"

                    echo "=== Dependency-Check Version ==="
                    dependency-check.sh --version

                    echo "=== Inspecting Persistent NVD Database Cache ==="
                    if [ -f "${DATA_DIR}/odc.mv.db" ]; then
                        DB_SIZE=$(du -h "${DATA_DIR}/odc.mv.db" | cut -f1)
                        DB_MOD=$(stat -c "%y" "${DATA_DIR}/odc.mv.db" 2>/dev/null || echo "Unknown")
                        echo "[PERSISTENT DB DETECTED] Size: ${DB_SIZE} | Last modified: ${DB_MOD}"
                    else
                        echo "[WARNING] ${DATA_DIR}/odc.mv.db not found"
                    fi

                    echo "------------------------------------------------------------------------"
                    echo "[Step 1/2] Scanning Backend Dependencies (Sequential)..."
                    echo "------------------------------------------------------------------------"
                    dependency-check.sh \\
                        --scan backend/package.json \\
                        --scan package-lock.json \\
                        --data "${DATA_DIR}" \\
                        --nvdValidForHours 168 \\
                        --disableOssIndex \\
                        --suppression "${SUPPRESSIONS}" \\
                        --format HTML \\
                        --format JSON \\
                        --out security-reports/dependency-check-backend \\
                        --project "ResQGrid Backend"

                    echo "------------------------------------------------------------------------"
                    echo "[Step 2/2] Scanning Frontend Dependencies (Sequential)..."
                    echo "------------------------------------------------------------------------"
                    dependency-check.sh \\
                        --scan frontend/package.json \\
                        --scan package-lock.json \\
                        --data "${DATA_DIR}" \\
                        --nvdValidForHours 168 \\
                        --disableOssIndex \\
                        --suppression "${SUPPRESSIONS}" \\
                        --format HTML \\
                        --format JSON \\
                        --out security-reports/dependency-check-frontend \\
                        --project "ResQGrid Frontend"

                    echo "========================================================================"
                    echo " OWASP Dependency-Check Summary & Verification"
                    echo "========================================================================"
                    node -e '
                        const fs = require("fs");
                        const bPath = "security-reports/dependency-check-backend/dependency-check-report.json";
                        const fPath = "security-reports/dependency-check-frontend/dependency-check-report.json";

                        function processReport(name, path) {
                            if (!fs.existsSync(path)) {
                                console.log(`[ERROR] Report missing: ${path}`);
                                return;
                            }
                            const r = JSON.parse(fs.readFileSync(path, "utf8"));
                            console.log(`\\n--- ${name} ---`);
                            let nvdTs = null;
                            if (r.scanInfo && r.scanInfo.dataSource) {
                                r.scanInfo.dataSource.forEach(ds => {
                                    console.log(`  Data Source: ${ds.name} -> Timestamp: ${ds.timestamp}`);
                                    if (ds.name.toLowerCase().includes("nvd") || ds.name.toLowerCase().includes("cve")) {
                                        nvdTs = ds.timestamp;
                                    }
                                });
                            }
                            if (nvdTs) {
                                const ageHours = ((new Date() - new Date(nvdTs)) / (1000 * 60 * 60)).toFixed(1);
                                console.log(`  [CACHE REUSE MODE] Scan evaluated against local cached NVD database.`);
                                console.log(`  Database Timestamp: ${nvdTs} (Cache Age: ${ageHours} hours)`);
                                console.log(`  Policy: Reused local DB without external NVD API call (--nvdValidForHours=168)`);
                            }
                            let counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
                            let vulns = [];
                            if (r.dependencies) {
                                for (const dep of r.dependencies) {
                                    if (dep.vulnerabilities) {
                                        for (const v of dep.vulnerabilities) {
                                            const s = (v.severity || "LOW").toUpperCase();
                                            if (counts[s] !== undefined) counts[s]++;
                                            vulns.push({ file: dep.fileName, cve: v.name, sev: s });
                                        }
                                    }
                                }
                            }
                            console.log(`  Severity Counts: CRITICAL: ${counts.CRITICAL} | HIGH: ${counts.HIGH} | MEDIUM: ${counts.MEDIUM} | LOW: ${counts.LOW}`);
                            if (vulns.length > 0) {
                                console.log("  Identified CVEs:");
                                vulns.forEach(item => console.log(`    - [${item.sev}] ${item.file}: ${item.cve}`));
                            } else {
                                console.log("  No CVEs identified.");
                            }
                        }

                        processReport("Backend Dependencies", bPath);
                        processReport("Frontend Dependencies", fPath);
                    '
                '''
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: '**/junit.xml'
            archiveArtifacts artifacts: 'security-reports/**', allowEmptyArchive: true
        }
        success {
            echo '========================================================================'
            echo ' ResQGrid CI Pipeline with Security Scanning SUCCESSFUL!'
            echo ' 10 Stages Completed (8 CI + Trivy Filesystem + OWASP Dependency-Check)'
            echo '========================================================================'
        }
        failure {
            echo '========================================================================'
            echo ' ResQGrid CI Pipeline FAILED'
            echo '========================================================================'
        }
    }
}
"""

xml_template = f"""<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@1624.ve973eb_34e031">
  <actions>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobAction plugin="pipeline-model-definition@2.2293.v6e7193cec599"/>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction plugin="pipeline-model-definition@2.2293.v6e7193cec599">
      <jobProperties>
        <string>org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty</string>
        <string>jenkins.model.BuildDiscarderProperty</string>
      </jobProperties>
      <triggers/>
      <parameters/>
      <options/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction>
  </actions>
  <description>ResQGrid — Full CI Pipeline with Security Scanning (10 Stages: 8 CI + Trivy + OWASP Dependency-Check)</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
      <abortPrevious>false</abortPrevious>
    </org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
    <jenkins.model.BuildDiscarderProperty>
      <strategy class="hudson.tasks.LogRotator">
        <daysToKeep>-1</daysToKeep>
        <numToKeep>10</numToKeep>
        <artifactDaysToKeep>-1</artifactDaysToKeep>
        <artifactNumToKeep>-1</artifactNumToKeep>
        <removeLastBuild>false</removeLastBuild>
      </strategy>
    </jenkins.model.BuildDiscarderProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4403.v471713a_cea_19">
    <script><![CDATA[{pipeline_script.strip()}]]></script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>"""

with open("resqgrid-security-job.xml", "w", encoding="utf-8") as f:
    f.write(xml_template)

print("Generated resqgrid-security-job.xml with CDATA wrapper successfully.")
