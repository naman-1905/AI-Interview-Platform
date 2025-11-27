// Deploy the frontend image to Google Cloud Run
def call(imageName, registryDeploy, gcpCredsId, projectId, serviceName, region, dockerCredsId = 'docker_creds') {
    stage('Deploy Frontend to Cloud Run') {
        script {
            echo " Deploying frontend to Google Cloud Run..."
            echo "   Service: ${serviceName}"
            echo "   Region: ${region}"
            echo "   Image: ${registryDeploy}/${imageName}"

            withCredentials([
                file(credentialsId: gcpCredsId, variable: 'GCP_CREDS'),
                usernamePassword(credentialsId: dockerCredsId, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
            ]) {
                sh """
                    # Authenticate with GCP
                    gcloud auth activate-service-account --key-file=\$GCP_CREDS
                    gcloud config set project ${projectId}

                    # Create base64 encoded credentials for private registry
                    DOCKER_AUTH=\$(echo -n "\$DOCKER_USER:\$DOCKER_PASS" | base64)

                    # Create .dockerconfigjson secret
                    mkdir -p /tmp/docker-auth
                    cat > /tmp/docker-auth/config.json << 'DOCKEREOF'
{
    "auths": {
        "https://${registryDeploy}": {
            "auth": "\$DOCKER_AUTH"
        }
    }
}
DOCKEREOF

                    # Create or update secret in Google Cloud Secret Manager
                    SECRET_NAME="docker-registry-config"
                    if gcloud secrets describe \$SECRET_NAME --project=${projectId} &>/dev/null; then
                        echo "Updating existing secret: \$SECRET_NAME"
                        gcloud secrets versions add \$SECRET_NAME \\
                            --data-file=/tmp/docker-auth/config.json \\
                            --project=${projectId}
                    else
                        echo "Creating new secret: \$SECRET_NAME"
                        gcloud secrets create \$SECRET_NAME \\
                            --data-file=/tmp/docker-auth/config.json \\
                            --replication-policy="automatic" \\
                            --project=${projectId}
                    fi

                    # Deploy to Cloud Run
                    gcloud run deploy ${serviceName} \\
                        --image=${registryDeploy}/${imageName} \\
                        --region=${region} \\
                        --platform=managed \\
                        --allow-unauthenticated \\
                        --memory=512Mi \\
                        --timeout=300 \\
                        --set-env-vars="ENVIRONMENT=production" \\
                        --project=${projectId}

                    # Get service URL
                    SERVICE_URL=\$(gcloud run services describe ${serviceName} \\
                        --region=${region} \\
                        --format='value(status.url)' \\
                        --project=${projectId})

                    echo " Frontend deployment completed successfully"
                    echo "   Service URL: \$SERVICE_URL"

                    # Cleanup
                    rm -rf /tmp/docker-auth
                """
            }
        }
    }
}

return this
