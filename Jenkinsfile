pipeline {
  agent any

  triggers {
    pollSCM('H/5 * * * *')
  }

  environment {
    SONAR_HOST_URL = 'http://localhost:9000'
    SONAR_TOKEN = credentials('sonar-token')
    PATH = "${env.HOME}/.nvm/versions/node/v24.6.0/bin:/opt/homebrew/bin:/usr/local/bin:${env.PATH}"
  }

  stages {
    stage('Backend · unitarias') {
      steps {
        sh 'mvn -B test'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
        }
      }
    }

    stage('Backend · integración') {
      steps {
        sh 'mvn -B verify -Dskip.unit.tests=true'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/target/failsafe-reports/*.xml'
        }
      }
    }

    stage('Frontend') {
      steps {
        dir('frontend') {
          sh '''
            npm ci
            npm run test:ci
          '''
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'frontend/junit.xml'
          archiveArtifacts artifacts: 'frontend/coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('E2E') {
      steps {
        sh './scripts/run-e2e-stack.sh'
        dir('frontend') {
          sh 'npx playwright test'
        }
      }
      post {
        always {
          sh './scripts/stop-e2e-stack.sh'
          junit allowEmptyResults: true, testResults: 'frontend/test-results/playwright/results.xml'
          archiveArtifacts artifacts: 'frontend/playwright-report/**', allowEmptyArchive: true
        }
      }
    }

    stage('Análisis · backend') {
      steps {
        sh 'mvn -B sonar:sonar -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_TOKEN -Dsonar.projectKey=tfg-agile-app-backend'
      }
    }

    stage('Análisis · frontend') {
      steps {
        dir('frontend') {
          sh 'sonar-scanner -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_TOKEN'
        }
      }
    }
  }

}
