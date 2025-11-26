// Push Docker image to registry
def call(imageName, registryPush, dockerCredsId) {
    stage('Push to Docker Registry') {
        script {
            echo "📤 Pushing image to registry: ${registryPush}/${imageName}"
            withCredentials([usernamePassword(
                credentialsId: dockerCredsId,
                usernameVariable: 'DOCKER_USER',
                passwordVariable: 'DOCKER_PASS'
            )]) {
                sh """
                    echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin ${registryPush}
                    docker push ${registryPush}/${imageName}
                    docker logout ${registryPush}
                    echo "✅ Image pushed successfully"
                """
            }
        }
    }
}

return this
