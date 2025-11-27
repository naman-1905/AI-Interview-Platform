// Load frontend environment variables from Jenkins credentials
def call(envCredentialsId = 'ai_frontend_env') {
    stage('Setup Frontend Environment') {
        script {
            echo " Setting up frontend environment variables from Jenkins credentials..."

            withCredentials([file(credentialsId: envCredentialsId, variable: 'ENV_FILE')]) {
                sh """
                    # Copy environment file from Jenkins credentials to frontend directory
                    cp \$ENV_FILE ${WORKSPACE}/frontend/.env

                    # Ensure correct permissions and normalize line endings
                    chmod 600 ${WORKSPACE}/frontend/.env
                    tr -d '\\r' < ${WORKSPACE}/frontend/.env > ${WORKSPACE}/frontend/.env.tmp
                    mv ${WORKSPACE}/frontend/.env.tmp ${WORKSPACE}/frontend/.env

                    echo "  Frontend .env copied to: ${WORKSPACE}/frontend/.env"
                """
            }
        }
    }
}

return this
