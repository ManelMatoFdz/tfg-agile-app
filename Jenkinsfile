pipeline {
  agent any

  triggers {
    pollSCM('H/5 * * * *')
  }

  environment {
    SONAR_HOST_URL = 'http://localhost:9000'
    SONAR_TOKEN = credentials('sonar-token')
  }

  stages {
    stage('Backend · unitarias') {
      steps {
        sh 'mvn -B test'
      }
    }

    stage('Backend · integración') {
      steps {
        sh 'mvn -B verify -Dskip.unit.tests=true'
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

  post {
    always {
      node {
        junit allowEmptyResults: true, testResults: '**/target/*-reports/*.xml'
      }
    }
  }
}
