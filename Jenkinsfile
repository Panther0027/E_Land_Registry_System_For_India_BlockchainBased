pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USERNAME = credentials('DOCKERHUB_USERNAME')
        DOCKER_PASSWORD = credentials('DOCKERHUB_TOKEN')
        GITHUB_REPO = 'E_Land_Registry_System_For_India_BlockchainBased'
        BUILD_TAG = "${BUILD_NUMBER}"
        LATEST_TAG = 'latest'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '========== Checking out repository =========='
                checkout scm
                sh 'git log -1 --oneline'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '========== Building Docker images =========='
                script {
                    try {
                        sh '''
                            echo "Building server image..."
                            docker build -t ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-server:${BUILD_TAG} ./server
                            docker tag ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-server:${BUILD_TAG} ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-server:${LATEST_TAG}
                            
                            echo "Building client image..."
                            docker build -t ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-client:${BUILD_TAG} ./client
                            docker tag ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-client:${BUILD_TAG} ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-client:${LATEST_TAG}
                            
                            echo "Images built successfully"
                            docker images | grep blockchainbased_elandregistrysystem
                        '''
                    } catch (Exception e) {
                        echo "Build failed: ${e}"
                        currentBuild.result = 'FAILURE'
                        error("Docker build failed")
                    }
                }
            }
        }

        stage('Run Tests (Optional)') {
            steps {
                echo '========== Running tests =========='
                script {
                    try {
                        sh '''
                            echo "Running server tests..."
                            cd server && npm test --passWithNoTests 2>/dev/null || true
                            cd ..
                            
                            echo "Running client tests..."
                            cd client && npm test --passWithNoTests 2>/dev/null || true
                            cd ..
                        '''
                    } catch (Exception e) {
                        echo "Tests failed: ${e} (continuing to build)"
                    }
                }
            }
        }

        stage('Login to Docker Registry') {
            steps {
                echo '========== Logging in to Docker Hub =========='
                script {
                    try {
                        sh '''
                            echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                            echo "Docker login successful"
                        '''
                    } catch (Exception e) {
                        echo "Docker login failed: ${e}"
                        currentBuild.result = 'FAILURE'
                        error("Docker login failed")
                    }
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                echo '========== Pushing images to Docker Hub =========='
                script {
                    try {
                        sh '''
                            echo "Pushing server image..."
                            docker push ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-server:${BUILD_TAG}
                            docker push ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-server:${LATEST_TAG}
                            
                            echo "Pushing client image..."
                            docker push ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-client:${BUILD_TAG}
                            docker push ${DOCKER_USERNAME}/blockchainbased_elandregistrysystem-client:${LATEST_TAG}
                            
                            echo "All images pushed successfully"
                        '''
                    } catch (Exception e) {
                        echo "Push failed: ${e}"
                        currentBuild.result = 'FAILURE'
                        error("Docker push failed")
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                echo '========== Cleaning up Docker login =========='
                sh '''
                    docker logout || true
                '''
            }
        }

        stage('Deployment (Optional)') {
            when {
                branch 'main'
            }
            steps {
                echo '========== Deployment stage (Optional) =========='
                script {
                    echo "Deployment can be triggered manually or via webhook"
                    echo "To deploy, run: docker compose pull && docker compose up -d"
                }
            }
        }
    }

    post {
        always {
            echo '========== Pipeline Finished =========='
            cleanWs()
        }
        success {
            echo "✓ Pipeline succeeded"
        }
        failure {
            echo "✗ Pipeline failed"
        }
    }
}
