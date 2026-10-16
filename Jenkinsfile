// ==============================================================================
// ResQGrid Jenkins Declarative CI/CD Pipeline
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Institution: SRM Institute of Science and Technology (CSE Final Year Project)
// Evaluation: CI/CD, SonarQube Quality Gates, OWASP & Trivy Security, Amazon ECR
// ==============================================================================

pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    environment {
        AWS_DEFAULT_REGION = 'ap-south-1'
        AWS_REGION         = 'ap-south-1'
        AWS_ACCOUNT_ID     = credentials('aws-account-id')
        ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG          = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'local'}-${env.BUILD_NUMBER}"
        BACKEND_IMAGE      = "${ECR_REGISTRY}/resqgrid-backend"
        FRONTEND_IMAGE     = "${ECR_REGISTRY}/resqgrid-frontend"
        CI                 = 'true'
    }

    stages {
        // ----------------------------------------------------------------------
        // Stage 1: Checkout exact commit triggered by GitHub Webhook
        // ----------------------------------------------------------------------
        stage('1. Checkout Exact Commit') {
            steps {
                echo "==> Checking out repository at commit: ${env.GIT_COMMIT ?: 'HEAD'}"
                checkout scm
                script {
                    sh 'git log -1 --stat'
                }
            }
        }

        // ----------------------------------------------------------------------
        // Stage 2: Install dependencies reproducibly
        // ----------------------------------------------------------------------
        stage('2. Install Dependencies Reproducibly') {
            steps {
                echo "==> Installing Node.js monorepo workspace dependencies via clean npm ci..."
                sh 'npm ci --prefer-offline --no-audit'
            }
        }

        // ----------------------------------------------------------------------
        // Stage 3: Lint and type-check
        // ----------------------------------------------------------------------
        stage('3. Lint & Type Check') {
            steps {
                echo "==> Enforcing TypeScript compilation and strict static typing checks..."
                sh 'npm run lint'
            }
        }

        // ----------------------------------------------------------------------
        // Stage 4: Build frontend and backend
        // ----------------------------------------------------------------------
        stage('4. Build Frontend & Backend') {
            steps {
                echo "==> Building backend TypeScript (tsc) and frontend static assets (vite build)..."
                sh 'npm run build'
            }
        }

        // ----------------------------------------------------------------------
        // Stage 5: Run existing backend and frontend tests
        // ----------------------------------------------------------------------
        stage('5. Run Tests') {
            steps {
                echo "==> Executing all 81 automated tests with Vitest, Supertest, and RTL..."
                sh 'npm run test'
            }
        }

        // ----------------------------------------------------------------------
        // Stage 6: Publish test reports
        // ----------------------------------------------------------------------
        stage('6. Publish Test Reports') {
            steps {
                echo "==> Publishing JUnit XML test execution reports..."
                junit allowEmptyResults: false,
                      testResults: '**/junit.xml'
            }
        }

        // ----------------------------------------------------------------------
        // Stage 7: Run SonarQube analysis and enforce the quality gate
        // ----------------------------------------------------------------------
        stage('7. SonarQube Quality Gate') {
            steps {
                echo "==> Running SonarQube static analysis and quality gate verification..."
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                            -Dsonar.projectKey=resqgrid \
                            -Dsonar.sources=backend/src,frontend/src \
                            -Dsonar.tests=backend/tests,frontend/tests \
                            -Dsonar.testExecutionReportPaths=backend/junit.xml,frontend/junit.xml
                    '''
                }
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted: SonarQube Quality Gate failed with status: ${qg.status}"
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------------
        // Stage 8: Run OWASP Dependency-Check
        // ----------------------------------------------------------------------
        stage('8. OWASP Dependency-Check') {
            steps {
                echo "==> Scanning dependencies for known CVE vulnerabilities via OWASP Dependency-Check..."
                dependencyCheck additionalArguments: '''
                    --scan package-lock.json \
                    --format ALL \
                    --suppression dependency-check-suppressions.xml \
                    --failOnCVSS 7.0
                ''', odcInstallation: 'OWASP-Dependency-Check'

                dependencyCheckPublisher failedTotalHigh: 1,
                                         failedTotalCritical: 1,
                                         stopBuild: true
            }
        }

        // ----------------------------------------------------------------------
        // Stage 9: Build versioned frontend and backend Docker images
        // ----------------------------------------------------------------------
        stage('9. Build Versioned Docker Images') {
            steps {
                echo "==> Building immutable Docker images tagged with Git SHA: ${IMAGE_TAG}..."
                script {
                    // Backend image build
                    sh """
                        docker build \
                            -t resqgrid-backend:${IMAGE_TAG} \
                            -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                            -t ${BACKEND_IMAGE}:latest \
                            -f infra/docker/backend.Dockerfile .
                    """

                    // Frontend image build
                    sh """
                        docker build \
                            -t resqgrid-frontend:${IMAGE_TAG} \
                            -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                            -t ${FRONTEND_IMAGE}:latest \
                            -f infra/docker/frontend.Dockerfile .
                    """
                }
            }
        }

        // ----------------------------------------------------------------------
        // Stage 10: Scan images with Trivy
        // ----------------------------------------------------------------------
        stage('10. Trivy Vulnerability Scan') {
            steps {
                echo "==> Scanning container images with Trivy for HIGH and CRITICAL vulnerabilities..."
                script {
                    // Scan backend image; fail on HIGH or CRITICAL findings
                    sh """
                        trivy image \
                            --exit-code 1 \
                            --severity HIGH,CRITICAL \
                            --no-progress \
                            resqgrid-backend:${IMAGE_TAG}
                    """

                    // Scan frontend image; fail on HIGH or CRITICAL findings
                    sh """
                        trivy image \
                            --exit-code 1 \
                            --severity HIGH,CRITICAL \
                            --no-progress \
                            resqgrid-frontend:${IMAGE_TAG}
                    """
                }
            }
        }

        // ----------------------------------------------------------------------
        // Stage 11: Push approved images to Amazon ECR
        // ----------------------------------------------------------------------
        stage('11. Push Approved Images to Amazon ECR') {
            steps {
                echo "==> Pushing approved, vulnerability-scanned images to Amazon ECR (${ECR_REGISTRY})..."
                withAWS(credentials: 'aws-ecr-credentials', region: "${AWS_REGION}") {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest
                        
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                    """
                }
                echo "==> Images successfully published to ECR with immutable tag: ${IMAGE_TAG}"
            }
        }
    }

    post {
        always {
            echo "==> Cleaning up transient container build layers..."
            cleanWs(cleanWhenAborted: true, cleanWhenFailure: true, cleanWhenNotBuilt: true, cleanWhenSuccess: true, cleanWhenUnstable: true, deleteDirs: true)
        }
        success {
            echo "==> ResQGrid Pipeline PASSED: Build #${env.BUILD_NUMBER} (${IMAGE_TAG}) verified and published to ECR."
        }
        failure {
            echo "==> ResQGrid Pipeline FAILED: Security gate, test failure, or build exception encountered."
        }
    }
}
