// Push the frontend Docker image to the configured registry
def call(imageName, registryPush, dockerCredsId) {
    stage('Push Frontend Docker Image') {
        script {
            echo "📤 Pushing frontend image to registry: ${registryPush}/${imageName}"
            withCredentials([usernamePassword(
                credentialsId: dockerCredsId,
                usernameVariable: 'DOCKER_USER',
                passwordVariable: 'DOCKER_PASS'
            )]) {
                sh """
                    echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin ${registryPush}
                    docker push ${registryPush}/${imageName}
                    docker logout ${registryPush}
                    echo " Frontend image pushed successfully"
                """
            }
        }
    }
}

return this
