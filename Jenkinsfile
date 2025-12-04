#!/usr/bin/env groovy

pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker-ta-inner.thinkingdata.cn'
        DOCKER_REGISTRY_USER = 'root'
        BACKEND_IMAGE = "${DOCKER_REGISTRY}/korea/data-generator-backend"
        FRONTEND_IMAGE = "${DOCKER_REGISTRY}/korea/data-generator-frontend"
        NAMESPACE = 'korea'
    }

    stages {
        stage('Build Backend') {
            steps {
                script {
                    echo "Building backend Docker image..."
                    sh """
                        docker build -f data-generator/Dockerfile -t ${BACKEND_IMAGE}:${GIT_COMMIT.take(7)} .
                        docker tag ${BACKEND_IMAGE}:${GIT_COMMIT.take(7)} ${BACKEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    echo "Building frontend Docker image..."
                    sh """
                        docker build -f frontend/Dockerfile -t ${FRONTEND_IMAGE}:${GIT_COMMIT.take(7)} .
                        docker tag ${FRONTEND_IMAGE}:${GIT_COMMIT.take(7)} ${FRONTEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    echo "Pushing Docker images..."
                    sh """
                        echo \${DOCKER_REGISTRY_PASSWORD} | docker login ${DOCKER_REGISTRY} -u ${DOCKER_REGISTRY_USER} --password-stdin
                        docker push ${BACKEND_IMAGE}:${GIT_COMMIT.take(7)}
                        docker push ${BACKEND_IMAGE}:latest
                        docker push ${FRONTEND_IMAGE}:${GIT_COMMIT.take(7)}
                        docker push ${FRONTEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "Deploying to Kubernetes..."
                    sh """
                        # Use custom deploy script that handles errors gracefully
                        chmod +x scripts/deploy-k8s.sh
                        ./scripts/deploy-k8s.sh
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful!"
            echo "🔗 Application URL: http://te-data-generator.tx-local.thinkingdata.cn"
        }
        failure {
            echo "❌ Deployment failed. Check logs for details."
        }
    }
}
