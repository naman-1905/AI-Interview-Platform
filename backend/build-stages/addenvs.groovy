// Load environment variables from Jenkins credentials and create .env.sh
def call(envCredentialsId = 'ai_interview_env') {
    stage('Setup Environment') {
        script {
            echo " Setting up environment variables from Jenkins credentials..."
            
            withCredentials([file(credentialsId: envCredentialsId, variable: 'ENV_FILE')]) {
                sh """
                    # Copy environment file from Jenkins credentials to backend
                    cp \$ENV_FILE ${WORKSPACE}/backend/.env.sh
                    
                    # Make it executable
                    chmod +x ${WORKSPACE}/backend/.env.sh
                    
                    echo " Environment variables loaded successfully"
                    echo " .env.sh copied to: ${WORKSPACE}/backend/.env.sh"
                """
            }
        }
    }
}

return this
