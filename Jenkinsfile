pipeline {
    agent {
        node {
            label 'kahitoz-builder-node'
        }
    }

    parameters {
        choice(
            name: 'TARGET',
            choices: ['backend', 'frontend'],
            description: 'Choose which image to build & push'
        )
    }

    environment {
        BACKEND_IMAGE_TAG = 'aibackend:latest'
        FRONTEND_IMAGE_TAG = 'aifrontend:latest'
        ARTIFACT_REGISTRY_REPO = 'asia-south2-docker.pkg.dev/upheld-object-479411-j3/smartinterview'
        GCP_PROJECT_ID = 'upheld-object-479411-j3'
        GCP_REGION = 'asia-south2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Credentials & Environment') {
            steps {
                script {
                    echo " Setting up credentials and environment variables..."
                    withCredentials([
                        file(credentialsId: 'gcp_json', variable: 'GCP_CREDS'),
                        file(credentialsId: 'ai_interview_env', variable: 'ENV_FILE'),
                        file(credentialsId: 'ai_frontend_env', variable: 'FRONTEND_ENV')
                    ]) {
                        if (params.TARGET == 'backend') {
                            sh """
                                cp \$GCP_CREDS ${WORKSPACE}/backend/creds.json
                                rm -f ${WORKSPACE}/backend/.env.sh || true
                                install -m 600 /dev/null ${WORKSPACE}/backend/.env.sh
                                tr -d '\\r' < "\$ENV_FILE" > ${WORKSPACE}/backend/.env.sh
                                chmod +x ${WORKSPACE}/backend/.env.sh
                            """
                            echo "  Backend credentials and environment ready"
                        } else {
                            sh """
                                rm -f ${WORKSPACE}/frontend/.env || true
                                install -m 600 /dev/null ${WORKSPACE}/frontend/.env
                                tr -d '\\r' < "\$FRONTEND_ENV" > ${WORKSPACE}/frontend/.env
                            """
                            echo "  Frontend environment ready"
                        }
                    }
                }
            }
        }

        stage('Build Image') {
            steps {
                script {
                    if (params.TARGET == 'backend') {
                        echo "🔨 Building Docker image: ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG}"
                        sh """
                            cd backend
                            docker build -t ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG} .
                        """
                    } else {
                        echo "🔨 Building Docker image: ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG}"
                        sh """
                            cd frontend
                            docker build -t ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG} .
                        """
                    }
                }
            }
        }

        stage('Push to Artifact Registry') {
            steps {
                script {
                    echo "📤 Pushing image to Google Artifact Registry..."
                    withCredentials([file(credentialsId: 'gcp_json', variable: 'GCP_CREDS')]) {
                        sh """
                            # Authenticate with GCP
                            gcloud auth activate-service-account --key-file=\$GCP_CREDS
                            gcloud config set project ${GCP_PROJECT_ID}
                            
                            # Configure Docker authentication for Artifact Registry
                            gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
                            
                            # Push image to Artifact Registry
                            if [ "${TARGET}" = "backend" ]; then
                                docker push ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG}
                            else
                                docker push ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG}
                            fi
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                echo " Pipeline executed successfully!"
                if (params.TARGET == 'backend') {
                    echo " Image: ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG}"
                } else {
                    echo " Image: ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG}"
                }
            }
        }
        failure {
            echo " Pipeline failed!"
        }
        always {
            echo "Cleaning up..."
                sh '''
                    # Clean up sensitive files
                    rm -f ${WORKSPACE}/backend/creds.json
                    rm -f ${WORKSPACE}/backend/.env.sh
                    rm -f ${WORKSPACE}/frontend/.env
                    docker logout || true
                '''
        }
    }
}
