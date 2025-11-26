pipeline {
    agent {
        node {
            label 'kahitoz-builder-node'
        }
    }

    parameters {
        choice(
            name: 'ACTION',
            choices: ['build-and-push'],
            description: 'Build and push image to Google Artifact Registry'
        )
    }

    environment {
        IMAGE_TAG = 'aibackend:latest'
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
                        file(credentialsId: 'firstore_json', variable: 'FIRESTORE_CREDS'),
                        file(credentialsId: 'ai_interview_env', variable: 'ENV_FILE')
                    ]) {
                        sh """
                            # Copy credentials to backend directory
                            cp \$GCP_CREDS ${WORKSPACE}/backend/creds.json
                            cp \$FIRESTORE_CREDS ${WORKSPACE}/backend/creds_firestore.json
                            
                            # Copy environment file (normalize line endings to avoid \\r issues)
                            tr -d '\\r' < "\$ENV_FILE" > ${WORKSPACE}/backend/.env.sh
                            chmod +x ${WORKSPACE}/backend/.env.sh
                            
                            echo "  Credentials and environment loaded:"
                            echo "   - creds.json (GCP)"
                            echo "   - creds_firestore.json (Firestore)"
                            echo "   - .env.sh (Environment)"
                        """
                    }
                }
            }
        }

        stage('Build Image') {
            steps {
                script {
                    echo "🔨 Building Docker image: ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG}"
                    sh """
                        cd backend
                        docker build -t ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG} .
                        echo " Docker image built successfully"
                    """
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
                            docker push ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG}
                            
                            echo " Image pushed successfully to ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG}"
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo " Pipeline executed successfully!"
            echo " Image: ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG}"
        }
        failure {
            echo " Pipeline failed!"
        }
        always {
            echo "Cleaning up..."
            sh '''
                # Clean up sensitive files
                rm -f ${WORKSPACE}/backend/creds.json
                rm -f ${WORKSPACE}/backend/creds_firestore.json
                docker logout || true
            '''
        }
    }
}
