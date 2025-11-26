// Helper to load and invoke stage scripts (similar to kahitoz-japanese-backend)
def runStageScript(script, scriptName, args = []) {
    def dirNames = ['backend/build-stages', 'build-stages']

    for (dir in dirNames) {
        def relativePath = "${dir}/${scriptName}"
        if (script.fileExists(relativePath)) {
            def loaded = script.load(relativePath)
            if (loaded.metaClass.respondsTo(loaded, 'call')) {
                return args ? loaded.call(*args) : loaded.call()
            }
            script.error("Stage script '${relativePath}' does not expose a call() method")
        }
    }

    script.error("Unable to locate stage script '${scriptName}'. Checked ${dirNames.join(', ')}")
}

pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(
            name: 'ACTION',
            choices: ['build-and-push', 'build-push-deploy', 'deploy-only'],
            description: 'Select what the pipeline should do'
        )
    }

    environment {
        IMAGE_TAG = 'aibackend:latest'
        ARTIFACT_REGISTRY_REPO = 'asia-south2-docker.pkg.dev/upheld-object-479411-j3/smartinterview'
        GCP_PROJECT_ID = 'upheld-object-479411-j3'
        GCP_REGION = 'asia-south2'
        GCP_CREDS_ID = 'gcp_json'
        FIRESTORE_CREDS_ID = 'firestore_json'
        ENV_FILE_CRED_ID = 'ai_interview_env'
        DOCKER_CREDS_ID = 'docker_creds'
        CLOUD_RUN_SERVICE = 'ai-interview-backend'
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
                    echo "Setting up credentials and environment variables..."
                    withCredentials([
                        file(credentialsId: env.GCP_CREDS_ID, variable: 'GCP_CREDS'),
                        file(credentialsId: env.FIRESTORE_CREDS_ID, variable: 'FIRESTORE_CREDS')
                    ]) {
                        sh """
                            cp \$GCP_CREDS ${WORKSPACE}/backend/creds.json
                            cp \$FIRESTORE_CREDS ${WORKSPACE}/backend/creds_firestore.json
                        """
                    }

                    // Copy .env.sh via helper script
                    runStageScript(this, 'addenvs.groovy', [env.ENV_FILE_CRED_ID])
                }
            }
        }

        stage('Build Image') {
            when {
                expression { params.ACTION in ['build-and-push', 'build-push-deploy'] }
            }
            steps {
                script {
                    echo "🔨 Building Docker image: ${ARTIFACT_REGISTRY_REPO}/${IMAGE_TAG}"
                    runStageScript(this, 'build.groovy', [env.IMAGE_TAG, env.ARTIFACT_REGISTRY_REPO])
                }
            }
        }

        stage('Push to Artifact Registry') {
            when {
                expression { params.ACTION in ['build-and-push', 'build-push-deploy'] }
            }
            steps {
                script {
                    echo "📤 Pushing image to Google Artifact Registry..."
                    withCredentials([file(credentialsId: env.GCP_CREDS_ID, variable: 'GCP_CREDS')]) {
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

        stage('Deploy to Cloud Run') {
            when {
                expression { params.ACTION in ['build-push-deploy', 'deploy-only'] }
            }
            steps {
                script {
                    runStageScript(
                        this,
                        'deploy.groovy',
                        [
                            env.IMAGE_TAG,
                            env.ARTIFACT_REGISTRY_REPO,
                            env.GCP_CREDS_ID,
                            env.GCP_PROJECT_ID,
                            env.CLOUD_RUN_SERVICE,
                            env.GCP_REGION,
                            env.DOCKER_CREDS_ID
                        ]
                    )
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
