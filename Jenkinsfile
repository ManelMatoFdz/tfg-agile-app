pipeline {
  agent any

  triggers {
    pollSCM('H/5 * * * *')
  }

  environment {
    SONAR_HOST_URL = 'http://localhost:9000'
    SONAR_TOKEN = credentials('sonar-token')
    PATH = "/opt/homebrew/bin:/Users/porterodarkoa/.nvm/versions/node/v24.6.0/bin:${env.PATH}"
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
            npm run test:coverage
          '''
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
