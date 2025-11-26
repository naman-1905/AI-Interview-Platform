// Checkout stage
def call() {
    stage('Checkout') {
        script {
            echo "📥 Checking out code from repository..."
            checkout scm
            sh """
                echo "Current branch: \$(git rev-parse --abbrev-ref HEAD)"
                echo "Latest commit: \$(git log -1 --pretty=%B)"
            """
        }
    }
}

return this
