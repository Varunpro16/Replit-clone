const Docker = require('dockerode');
const docker = new Docker();

const poolSize = 2;
let containers = [];

async function createContainer(index) {
  const container = await docker.createContainer({
    Image: 'code-runner',
    Tty: true,
    Cmd: ['bash'],
    name: `demo_container_${index}`,
  });
  await container.start();
  return container;
}

async function main() {
  console.log(`Creating ${poolSize} containers...`);
  for (let i = 0; i < poolSize; i++) {
    const container = await createContainer(i);
    containers.push(container);
    console.log(`Container ${i} started: ${container.id}`);
  }

  // Write a file in the first container
  const firstContainer = containers[0];
  console.log(firstContainer.id);
  await firstContainer.exec({
    Cmd: ['bash', '-c', 'echo "hello from first" > /tmp/hello.txt'],
    AttachStdout: true,
    AttachStderr: true
  }).then(exec => exec.start({ hijack: true, stdin: false }));

  // Try to read the same file in the second container
  const secondContainer = containers[1];
  const exec = await secondContainer.exec({
    Cmd: ['cat', '/tmp/hello.txt'],
    AttachStdout: true,
    AttachStderr: true
  });

  exec.start((err, stream) => {
    docker.modem.demuxStream(stream, process.stdout, process.stderr);
  });
}

main().catch(console.error);
