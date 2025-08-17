const k8s = require('@kubernetes/client-node');

// Load kubeconfig (from ~/.kube/config or in-cluster)
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


// Define MySQL Pod
const mysqlPod = {
  metadata: {
    name: 'mysql-pod',
    labels: {
      app: 'mysql'
    }
  },
  spec: {
    containers: [
      {
        name: 'mysql',
        image: 'mysql:8.0',
        env: [
          { name: 'MYSQL_ROOT_PASSWORD', value: 'rootpassword' },
          { name: 'MYSQL_DATABASE', value: 'mydb' },
          { name: 'MYSQL_USER', value: 'user' },
          { name: 'MYSQL_PASSWORD', value: 'password' }
        ],
        ports: [
          { containerPort: 3306 }
        ],
        volumeMounts: [
          {
            name: 'mysql-persistent-storage',
            mountPath: '/var/lib/mysql'
          }
        ]
      }
    ],
    volumes: [
      {
        name: 'mysql-persistent-storage',
        emptyDir: {} // replace with PVC if needed
      }
    ]
  }
};

// Define MySQL Service
const mysqlService = {
  metadata: {
    name: 'mysql-service'
  },
  spec: {
    selector: {
      app: 'mysql'
    },
    ports: [
      {
        port: 3308,
        targetPort: 3306
      }
    ]
  }
};

// Create Pod and Service
(async () => {
  try {
    await k8sApi.createNamespacedPod({namespace:'default',body: mysqlPod})
    console.log('✅ MySQL pod created');

    await k8sApi.createNamespacedService({namespace:'default', body:mysqlService})
    console.log('✅ MySQL service created');
  } catch (err) {
    console.error('❌ Error creating resources:', err.response?.body || err);
  }
})();
