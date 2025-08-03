const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const http = require("http");
const { exec } = require("child_process");
const k8s = require('@kubernetes/client-node');

const WebSocket = require('ws');
const pty = require('node-pty');
const { log } = require("console");
const app = express();

const PORT = 5000;

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


// Updated directory structure
const BASE_DIR = path.join(__dirname, "workspace");
const INITIAL_SETUP_DIR = path.join(BASE_DIR, "initialsetup");
const EDITED_VERSION_DIR = path.join(BASE_DIR, "editedversion");
const PROJECT_DIR = path.join(__dirname, "projects"); // Keep for backward compatibility
const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
app.use(cors());
app.use(bodyParser.json());


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});


const createPod = async (template, projectName) => {
  console.log("called");
  
  if (  !template || !projectName) {
    return ;
  }

  console.log("hello")

  const projectId = `${projectName}`.toLowerCase();
  const image = template === 'react' ? 'react-app:latest' : 'backend-app:latest';
  const containerPort = template === 'react' ? 3000 : 5000;
  const mPath = '/app';
  
  const volumeHostPath = `/workspace/editedversion/${template}/${projectName}`;
  console.log("path: ",volumeHostPath);
  

  try {
    const deploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: `${projectId}-deployment` },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: projectId } },
        template: {
          metadata: { labels: { app: projectId } },
          spec: {
            containers: [{
              name: `${projectId}-container`,
              image:image,
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort }],
              volumeMounts: [{
                name: 'user-code',
                mountPath: mPath
              }]
            }],
            volumes: [{
              name: 'user-code',
              hostPath: {
                path: volumeHostPath,
                type: 'Directory'
              }
            }]
          }
        }
      }
    };

    await k8sApi.createNamespacedDeployment({namespace:'default', body:deploymentManifest});
    

    // 2. Create Service
    const serviceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `${projectId}-service` },
      spec: {
        selector: { app: projectId },
        ports: [{ port: 80, targetPort: containerPort }],
        type: 'ClusterIP'
      }
    };

    await coreApi.createNamespacedService({namespace:'default', body:serviceManifest});


    // 3. Create Ingress
    const ingressManifest = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: `${projectId}-ingress`,
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
        }
      },
      spec: {
        rules: [{
          host: `${projectId}.192.168.49.2.nip.io`, // You must set DNS or /etc/hosts
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: {
                  name: `${projectId}-service`,
                  port: { number: 80 }
                }
              }
            }]
          }
        }]
      }
    };

    await networkingApi.createNamespacedIngress({namespace:'default',body: ingressManifest});

    console.log({
      message: 'Environment created successfully',
      url: `http://${projectId}.192.168.49.2.nip.io`
    });

  } catch (error) {
    console.error('K8s Creation Error:', error.body || error);
    console.log({ error: 'Failed to create environment' });
  }
  return;
}
// Initialize directory structure
const initializeDirectories = () => {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
  if (!fs.existsSync(INITIAL_SETUP_DIR)) fs.mkdirSync(INITIAL_SETUP_DIR, { recursive: true });
  if (!fs.existsSync(EDITED_VERSION_DIR)) fs.mkdirSync(EDITED_VERSION_DIR, { recursive: true });
  
  // Create template directories
  const templates = ['react', 'python', 'cpp'];
  templates.forEach(template => {
    const initialPath = path.join(INITIAL_SETUP_DIR, template);
    const editedPath = path.join(EDITED_VERSION_DIR, template);
    if (!fs.existsSync(initialPath)) fs.mkdirSync(initialPath, { recursive: true });
    if (!fs.existsSync(editedPath)) fs.mkdirSync(editedPath, { recursive: true });
  });

  // Create initial templates if they don't exist
  createInitialTemplates();
};

// Template structures
const TEMPLATES = {
  react: {
    'package.json': JSON.stringify({
      "name": "react-project",
      "version": "0.1.0",
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      }
    }, null, 2),
    'src/App.js': `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React!</h1>
        <p>Start editing to see changes.</p>
      </header>
    </div>
  );
}

export default App;`,
    'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    'src/App.css': `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`,
    'src/index.css': `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
}`,
    'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
    'README.md': `# React Project

This project was bootstrapped with Create React App.

## Available Scripts

- \`npm start\` - Runs the app in development mode
- \`npm run build\` - Builds the app for production
- \`npm test\` - Launches the test runner`
  },
  
  python: {
    'main.py': `#!/usr/bin/env python3
"""
Main Python application
"""

def main():
    print("Hello, Python!")
    print("Start coding your Python application here.")
    
    # Example usage
    from utils.helpers import helper_function
    result = helper_function()
    print(f"Helper result: {result}")

if __name__ == "__main__":
    main()`,
    'requirements.txt': `# Add your Python dependencies here
# requests==2.28.1
# flask==2.2.2
# numpy==1.24.0`,
    'README.md': `# Python Project

## Getting Started

1. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. Run the application:
   \`\`\`bash
   python main.py
   \`\`\`

## Project Structure

- \`main.py\` - Main application entry point
- \`utils/\` - Utility modules
- \`requirements.txt\` - Python dependencies`,
    'utils/__init__.py': '# Utils package',
    'utils/helpers.py': `"""
Utility functions for the application
"""

def helper_function():
    """Example helper function"""
    return "This is a helper function"

def calculate_sum(a, b):
    """Calculate sum of two numbers"""
    return a + b

def greet_user(name):
    """Greet a user"""
    return f"Hello, {name}! Welcome to Python."`
  },
  
  cpp: {
    'main.cpp': `#include <iostream>
#include "utils.h"

int main() {
    std::cout << "Hello, C++!" << std::endl;
    std::cout << "Start coding your C++ application here." << std::endl;
    
    // Example function calls
    greet("World");
    
    int result = add(5, 3);
    std::cout << "5 + 3 = " << result << std::endl;
    
    return 0;
}`,
    'utils.h': `#ifndef UTILS_H
#define UTILS_H

#include <string>

// Function declarations
void greet(const std::string& name);
int add(int a, int b);
int multiply(int a, int b);

#endif // UTILS_H`,
    'utils.cpp': `#include "utils.h"
#include <iostream>

void greet(const std::string& name) {
    std::cout << "Hello, " << name << "!" << std::endl;
}

int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}`,
    'Makefile': `CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
TARGET = main
SOURCES = main.cpp utils.cpp
OBJECTS = $(SOURCES:.cpp=.o)

$(TARGET): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJECTS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

.PHONY: clean`,
    'README.md': `# C++ Project

## Building and Running

1. Compile the project:
   \`\`\`bash
   make
   \`\`\`

2. Run the executable:
   \`\`\`bash
   ./main
   \`\`\`

3. Clean build files:
   \`\`\`bash
   make clean
   \`\`\`

## Project Structure

- \`main.cpp\` - Main application entry point
- \`utils.h\` - Header file with function declarations
- \`utils.cpp\` - Implementation of utility functions
- \`Makefile\` - Build configuration`
  }
};

// Create initial templates
const createInitialTemplates = () => {
  Object.keys(TEMPLATES).forEach(templateName => {
    const templatePath = path.join(INITIAL_SETUP_DIR, templateName);
    const template = TEMPLATES[templateName];
    
    Object.keys(template).forEach(filePath => {
      const fullPath = path.join(templatePath, filePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, template[filePath]);
      }
    });
  });
};

// Helper function to get file tree
function getFileTree(dir, base = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const relativePath = path.join(base, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push({ path: relativePath, isFolder: true });
      results = results.concat(getFileTree(fullPath, relativePath));
    } else {
      results.push({ path: relativePath, isFolder: false });
    }
  });
  return results;
}


// NEW API ENDPOINTS FOR TEMPLATE SYSTEM


app.post("/api/podcreation", async(req, res) => {
  let { language, projectName } = req.body;
  language = language.toLowerCase()

    await k8sApi.readNamespacedDeploymentStatus({name:"varun-deployment",namespace:"default"}).then(e => {
      
console.log("pod already there");
        
    }).catch((e)=>{
        
        createPod(language, projectName)
    })
    res.json({ message: 'pod created successfully' });

})

// Create new project from template
app.post("/api/project/create", (req, res) => {
  try {
    const { language, projectName } = req.body;

    
    if (!language || !projectName) {
      return res.status(400).json({ error: 'Language and project name are required' });
    }
    
    const templateKey = language.toLowerCase();
    if (!TEMPLATES[templateKey]) {
      return res.status(400).json({ error: 'Invalid template' });
    }
    
    const projectPath = path.join(EDITED_VERSION_DIR, templateKey, projectName);
    
    // Check if project already exists
    if (fs.existsSync(projectPath)) {
      return res.status(400).json({ error: 'Project already exists' });
    }
    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });
    
    // Copy template files
    const template = TEMPLATES[templateKey];
    Object.keys(template).forEach(filePath => {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, template[filePath]);
    });
    
    res.json({ message: 'Project created successfully', projectPath: `editedversion/${templateKey}/${projectName}` });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get list of existing projects for a language
app.get("/api/projects", (req, res) => {
  try {
    const { language } = req.query;

    
    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }
    
    const languagePath = path.join(EDITED_VERSION_DIR, language.toLowerCase());
    
    if (!fs.existsSync(languagePath)) {
      return res.json([]);
    }
    
    const projects = fs.readdirSync(languagePath);
    const projectList = projects
      .filter(project => {
        const projectPath = path.join(languagePath, project);
        return fs.statSync(projectPath).isDirectory();
      })
      .map(project => ({
        name: project,
        language: language,
        path: `editedversion/${language.toLowerCase()}/${project}`
      }));
    
    res.json(projectList);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// UPDATED EXISTING API ENDPOINTS

// Updated API to get file tree (supports both old and new structure)
app.get("/api/files", (req, res) => {
  try {
    const { project, projectPath } = req.query;
    
    let targetPath;
    if (projectPath) {
      // New template system
      targetPath = path.join(BASE_DIR, projectPath);
    } else if (project) {
      // Old system (backward compatibility)
      targetPath = path.join(PROJECT_DIR, project);
    } else {
      return res.status(400).json({ error: 'Project or projectPath is required' });
    }
    
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const tree = getFileTree(targetPath);
    res.json(tree);
  } catch (error) {
    console.error('Error fetching file tree:', error);
    res.status(500).json({ error: 'Failed to fetch file tree' });
  }
});

// Updated API to get file contents (supports both old and new structure)
app.get("/api/file", (req, res) => {
  try {
    const { project, projectPath, filePath } = req.query;
    
    let fullPath;
    if (projectPath && filePath) {
      // New template system
      fullPath = path.join(BASE_DIR, projectPath, filePath);
    } else if (project && filePath) {
      // Old system (backward compatibility)
      fullPath = path.join(PROJECT_DIR, project, filePath);
    } else {
      return res.status(400).json({ error: 'Required parameters missing' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(fullPath, "utf-8");
    res.send(content);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Updated API to save file contents (supports both old and new structure)
app.put("/api/file", (req, res) => {
  try {
    const { project, projectPath, filePath, content } = req.body;
    console.log("file update called");
    
    let fullPath;
    if (projectPath && filePath) {
      // New template system
      fullPath = path.join(BASE_DIR, projectPath, filePath);
    } else if (project && filePath) {
      // Old system (backward compatibility)
      fullPath = path.join(PROJECT_DIR, project, filePath);
    } else {
      return res.status(400).json({ error: 'Required parameters missing' });
    }
    
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    res.json({ message: 'File saved successfully' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Updated API to create folder (supports both old and new structure)
app.post("/api/folder", (req, res) => {
  try {
    const { project, projectPath, folderPath } = req.body;
    
    let fullPath;
    if (projectPath && folderPath) {
      // New template system
      fullPath = path.join(BASE_DIR, projectPath, folderPath);
    } else if (project && folderPath) {
      // Old system (backward compatibility)
      fullPath = path.join(PROJECT_DIR, project, folderPath);
    } else {
      return res.status(400).json({ error: 'Required parameters missing' });
    }
    
    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ message: 'Folder created successfully' });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Initialize directories on startup
initializeDirectories();

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Workspace directory: ${BASE_DIR}`);
  console.log(`📋 Initial templates: ${INITIAL_SETUP_DIR}`);
  console.log(`✏️  User projects: ${EDITED_VERSION_DIR}`);
});




// Socket.io connection for terminal (unchanged)
io.on("connection", (socket) => {
  let currentPath = "/home/devuser";

  socket.on("terminalInput", (input) => {
    input = input.trim();

    if (input.startsWith("cd")) {
      const parts = input.split(" ");
      if (parts.length > 1) {
        let targetPath = parts[1];

        if (targetPath === "..") {
          currentPath = path.posix.dirname(currentPath);
        } else if (targetPath.startsWith("/")) {
          currentPath = path.posix.normalize(targetPath);
        } else {
          currentPath = path.posix.join(currentPath, targetPath);
        }
      }

      socket.emit("terminalOutput", `Changed directory to: ${currentPath}`);
      socket.emit("updatePath", currentPath);
      return;
    }

    // const fullCommand = `docker exec bcc7d1499fa8 sh -c "cd ${currentPath} && ${input}"`;
    
    const fullCommand = `kubectl exec varun-deployment-7944f7d95f-bwh6f -- ${input}`
    exec(fullCommand, (err, stdout, stderr) => {
      if (err) {
        socket.emit("terminalOutput", stderr || err.message);
        return;
      }

      socket.emit("terminalOutput", stdout || stderr);
    });
  });
});




// const express = require("express");
// const fs = require("fs");
// const path = require("path");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const { Server } = require("socket.io");
// const http = require("http");
// const { exec } = require("child_process");
// const { log } = require("console");

// const app = express();
// const PORT = 5000;
// const PROJECT_DIR = path.join(__dirname, "projects");

// app.use(cors());
// app.use(bodyParser.json());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
// });
// io.on("connection", (socket) => {
//   let currentPath = "/home/devuser"; // ✅ now it's per user

//   socket.on("terminalInput", (input) => {
//     input = input.trim();

//     if (input.startsWith("cd")) {
//       const parts = input.split(" ");
//       if (parts.length > 1) {
//         let targetPath = parts[1];

//         if (targetPath === "..") {
//           currentPath = path.posix.dirname(currentPath); // use posix for Linux paths
//         } else if (targetPath.startsWith("/")) {
//           currentPath = path.posix.normalize(targetPath);
//         } else {
//           currentPath = path.posix.join(currentPath, targetPath);
//         }
//       }

//       socket.emit("terminalOutput", `Changed directory to: ${currentPath}`);
//       socket.emit("updatePath", currentPath); // useful for showing in UI
//       return;
//     }

//     const fullCommand = `docker exec bcc7d1499fa8 sh -c "cd ${currentPath} && ${input}"`;

//     exec(fullCommand, (err, stdout, stderr) => {
//       if (err) {
//         socket.emit("terminalOutput", stderr || err.message);
//         return;
//       }

//       socket.emit("terminalOutput", stdout || stderr);
//     });
//   });
// });

// // io.on("connection", (socket) => {
// //   console.log("Client connected");
// //   socket.on("terminalInput", (data) => {
// //     console.log("Command received:", data);

// //     exec(`docker exec ${CONTAINER_NAME} sh -c '${data}'`, (err, stdout, stderr) => {
// //       if (err) {
// //         socket.emit("terminalOutput", `Error: ${stderr || err.message}`);
// //         return;
// //       }

// //       socket.emit("terminalOutput", (stdout || stderr).replace(/\n/g, "\r\n"));
// //     });
// //   });


// //   socket.on("disconnect", () => {
// //     console.log("Client disconnected");
// //   });
// // });


// function getFileTree(dir, base = "") {
//   let results = [];
//   const list = fs.readdirSync(dir);
//   list.forEach((file) => {
//     const fullPath = path.join(dir, file);
//     const relativePath = path.join(base, file);
//     const stat = fs.statSync(fullPath);
//     if (stat && stat.isDirectory()) {
//       results.push({ path: relativePath, isFolder: true });
//       results = results.concat(getFileTree(fullPath, relativePath));
//     } else {
//       results.push({ path: relativePath, isFolder: false });
//     }
//   });
//   return results;
// }

// // API to get file tree
// app.get("/api/files", (req, res) => {
//   const { project } = req.query;
//   const projectPath = path.join(PROJECT_DIR, project);
//   if (!fs.existsSync(projectPath)) return res.status(404).send("Project not found");
//   const tree = getFileTree(projectPath);
//   res.json(tree);
// });

// // API to get file contents
// app.get("/api/file", (req, res) => {
//   const { project, filePath } = req.query;
//   const fullPath = path.join(PROJECT_DIR, project, filePath);
//   if (!fs.existsSync(fullPath)) return res.status(404).send("File not found");
//   const content = fs.readFileSync(fullPath, "utf-8");
//   res.send(content);
// });

// // API to save file contents
// app.put("/api/file", (req, res) => {
//   const { project, filePath, content } = req.body;
//   const fullPath = path.join(PROJECT_DIR, project, filePath);
//   fs.mkdirSync(path.dirname(fullPath), { recursive: true });
//   fs.writeFileSync(fullPath, content);
//   res.send("Saved");
// });

// // API to create folder
// app.post("/api/folder", (req, res) => {
//   const { project, folderPath } = req.body;
//   const fullPath = path.join(PROJECT_DIR, project, folderPath);
//   fs.mkdirSync(fullPath, { recursive: true });
//   res.send("Folder created");
// });

// server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
