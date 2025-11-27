// Build stage for the frontend Docker image
def call(imageName, registryPush) {
    stage('Build Frontend Docker Image') {
        script {
            echo " Building frontend Docker image: ${registryPush}/${imageName}"
            sh """
                cd frontend
                docker build -t ${registryPush}/${imageName} .
                echo " Frontend Docker image built successfully"
            """
        }
    }
}

return this
