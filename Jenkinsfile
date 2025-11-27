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

        stage('Setup Backend Environment') {
            when {
                expression { params.TARGET == 'backend' }
            }
            steps {
                script {
                    echo " Setting up backend credentials and environment variables..."
                    withCredentials([
                        file(credentialsId: 'gcp_json', variable: 'GCP_CREDS'),
                        file(credentialsId: 'ai_interview_env', variable: 'ENV_FILE')
                    ]) {
                        sh """
                            cp \$GCP_CREDS ${WORKSPACE}/backend/creds.json
                            rm -f ${WORKSPACE}/backend/.env.sh || true
                            install -m 600 /dev/null ${WORKSPACE}/backend/.env.sh
                            tr -d '\\r' < "\$ENV_FILE" > ${WORKSPACE}/backend/.env.sh
                            chmod +x ${WORKSPACE}/backend/.env.sh
                        """
                    }
                    echo "  Backend credentials and environment ready"
                }
            }
        }

        stage('Setup Frontend Environment') {
            when {
                expression { params.TARGET == 'frontend' }
            }
            steps {
                script {
                    echo " Setting up frontend environment variables..."
                    withCredentials([file(credentialsId: 'ai_frontend_env', variable: 'FRONTEND_ENV')]) {
                        sh """
                            rm -f ${WORKSPACE}/frontend/.env || true
                            install -m 600 /dev/null ${WORKSPACE}/frontend/.env
                            tr -d '\\r' < "\$FRONTEND_ENV" > ${WORKSPACE}/frontend/.env
                        """
                    }
                    echo "  Frontend environment ready"
                }
            }
        }

        stage('Build Backend Image') {
            when {
                expression { params.TARGET == 'backend' }
            }
            steps {
                script {
                    echo "🔨 Building backend Docker image: ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG}"
                    sh """
                        cd backend
                        docker build -t ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Build Frontend Image') {
            when {
                expression { params.TARGET == 'frontend' }
            }
            steps {
                script {
                    echo "🔨 Building frontend Docker image: ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG}"
                    sh """
                        cd frontend
                        docker build -t ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push Backend Image') {
            when {
                expression { params.TARGET == 'backend' }
            }
            steps {
                script {
                    echo "📤 Pushing backend image to Google Artifact Registry..."
                    withCredentials([file(credentialsId: 'gcp_json', variable: 'GCP_CREDS')]) {
                        sh """
                            gcloud auth activate-service-account --key-file=\$GCP_CREDS
                            gcloud config set project ${GCP_PROJECT_ID}
                            gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
                            docker push ${ARTIFACT_REGISTRY_REPO}/${BACKEND_IMAGE_TAG}
                        """
                    }
                }
            }
        }

        stage('Push Frontend Image') {
            when {
                expression { params.TARGET == 'frontend' }
            }
            steps {
                script {
                    echo "📤 Pushing frontend image to Google Artifact Registry..."
                    withCredentials([file(credentialsId: 'gcp_json', variable: 'GCP_CREDS')]) {
                        sh """
                            gcloud auth activate-service-account --key-file=\$GCP_CREDS
                            gcloud config set project ${GCP_PROJECT_ID}
                            gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
                            docker push ${ARTIFACT_REGISTRY_REPO}/${FRONTEND_IMAGE_TAG}
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
