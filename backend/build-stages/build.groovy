// Build stage
def call(imageName, registryPush) {
    stage('Build Docker Image') {
        script {
            echo " Building Docker image: ${registryPush}/${imageName}"
            sh """
                cd backend
                docker build -t ${registryPush}/${imageName} .
                echo " Docker image built successfully"
            """
        }
    }
}

return this
