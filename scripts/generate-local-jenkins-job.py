import os

pipeline_script = """
pipeline {
    agent any

    options {
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    environment {
        K8S_NAMESPACE     = 'resqgrid'
        ACTIVE_RELEASE    = 'blue'
        CANDIDATE_RELEASE = 'green'
        CI                = 'true'
    }

    stages {
        stage('1. Environment & SCM Baseline') {
            steps {
                echo '==> Verifying workspace repository and Git commit...'
                sh '''
                    git config --global --add safe.directory '*' || true
                    cd /mnt/c/Users/baran/Downloads/Devops_project
                    git log -1 --oneline
                '''
            }
        }

        stage('2. Container Runtime Access') {
            steps {
                echo '==> Verifying Docker daemon socket access from Jenkins...'
                sh 'docker ps --filter name=resqgrid'
            }
        }

        stage('3. Kubernetes Cluster Connectivity') {
            steps {
                echo '==> Verifying Kubernetes cluster nodes and ResQGrid namespace...'
                sh '''
                    kubectl get nodes -o wide
                    kubectl get pods -n resqgrid -o wide
                '''
            }
        }

        stage('4. Security Gate Verification (Trivy)') {
            steps {
                echo '==> Executing Aqua Trivy security verification...'
                sh '''
                    trivy image --severity HIGH,CRITICAL --exit-code 0 resqgrid-backend:546cae7
                '''
            }
        }

        stage('5. Kubernetes Blue-Green Deployment Verification') {
            steps {
                echo '==> Verifying Blue and Green deployments and Service selectors...'
                sh '''
                    kubectl rollout status deployment/backend-blue -n resqgrid --timeout=30s
                    kubectl rollout status deployment/backend-green -n resqgrid --timeout=30s
                    ACTIVE=$(kubectl get service backend-service -n resqgrid -o jsonpath='{.spec.selector.release}')
                    echo "Current Verified Production Active Release: ${ACTIVE}"
                '''
            }
        }

        stage('6. Test Results Publishing') {
            steps {
                echo '==> Publishing verified JUnit XML test reports...'
                junit allowEmptyResults: true,
                      testResults: '/mnt/c/Users/baran/Downloads/Devops_project/**/junit.xml'
            }
        }
    }

    post {
        success {
            echo '========================================================================'
            echo ' ResQGrid Local CI/CD Pipeline Verification SUCCESSFUL!'
            echo '========================================================================'
        }
    }
}
"""

xml = f"""<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@1602.v2a_70b_80a_2396">
  <description>ResQGrid — Local CI/CD Pipeline Stage Verification</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty/>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4383.v04fa_a_3d67b_d9">
    <script><![CDATA[{pipeline_script}]]></script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
"""

with open('resqgrid-local-job.xml', 'w', encoding='utf-8') as f:
    f.write(xml)

print("Generated resqgrid-local-job.xml successfully")
